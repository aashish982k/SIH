"""NWIS ML prediction service (FastAPI).

Endpoints consumed by the Node backend:
    POST /predict  -> Random Forest risk prediction
    POST /rerank   -> cross-encoder reranking with BM25 fallback
    GET  /health   -> liveness + loaded model info

Design notes (per READEME/implementation.md):
- The model is loaded ONCE at startup (latest.json pointer) and reused. No
  training ever happens here.
- /rerank uses a cross-encoder when sentence-transformers is installed
  (RERANKER_MODEL env), and otherwise falls back to a lexical BM25 reranker so
  the Node pipeline can treat reranking as optional.
- The service never controls equipment; it only returns probabilities and
  scores (decision-support only).
"""

from __future__ import annotations

import json
import math
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .features import FeatureStats, build_features, features_to_frame

try:
    from paddleocr import PaddleOCR
    import fitz  # PyMuPDF
except ImportError:
    PaddleOCR = None
    fitz = None

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"

# ── Severity thresholds (config-driven, READEME #26) ──────────────────────────
THRESHOLDS = {
    "high": float(os.getenv("ML_THRESHOLD_HIGH", "0.70")),
    "medium": float(os.getenv("ML_THRESHOLD_MEDIUM", "0.40")),
}

RERANKER_MODEL = os.getenv("RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2")


def severity_for(probability: float) -> str:
    if probability >= THRESHOLDS["high"]:
        return "HIGH"
    if probability >= THRESHOLDS["medium"]:
        return "MEDIUM"
    return "LOW"


# ── Schemas ────────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    features: dict[str, Any] = Field(..., description="Raw drilling parameters (Node field names accepted)")
    well_id: Optional[str] = None


class PredictedRisk(BaseModel):
    type: str
    probability: float
    severity: str


class PredictResponse(BaseModel):
    risks: list[PredictedRisk]
    top_risk: PredictedRisk
    model: str
    model_version: str


class RerankItem(BaseModel):
    id: str
    text: str


class RerankRequest(BaseModel):
    query: str
    candidates: list[RerankItem] = Field(..., max_length=200)


class RerankedItem(BaseModel):
    id: str
    score: float
    rank: int


class RerankResponse(BaseModel):
    results: list[RerankedItem]
    method: str  # "cross_encoder" | "bm25"

class OCRRequest(BaseModel):
    file_base64: str
    file_type: str
    max_pages: int = 20


class HydeRequest(BaseModel):
    query: str = Field(..., min_length=1)


# ── Model loading ──────────────────────────────────────────────────────────────

class ModelBundle:
    """Holds the loaded pipeline, metadata, and imputation stats."""

    def __init__(self) -> None:
        self.pipeline = None
        self.metadata: dict[str, Any] = {}
        self.stats: Optional[FeatureStats] = None
        self.classes: list[str] = []

    def load(self) -> None:
        import joblib

        latest_path = MODEL_DIR / "latest.json"
        if not latest_path.exists():
            raise FileNotFoundError(
                f"No trained model found ({latest_path} missing). "
                "Run: python -m nwis_ml.generate_dataset && python -m nwis_ml.train"
            )
        pointer = json.loads(latest_path.read_text(encoding="utf-8"))
        model_path = Path(pointer["model_path"])
        self.pipeline = joblib.load(model_path)

        meta_path = model_path.parent / "metadata.json"
        self.metadata = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
        medians = self.metadata.get("medians", {})
        self.stats = FeatureStats(medians=medians)
        self.classes = self.metadata.get("classes", [])


@lru_cache(maxsize=1)
def get_bundle() -> ModelBundle:
    bundle = ModelBundle()
    bundle.load()
    return bundle


# ── Cross-encoder (optional) ───────────────────────────────────────────────────

_cross_encoder: Any = None
_cross_encoder_checked = False


def get_cross_encoder() -> Any:
    """Lazily load a cross-encoder if sentence-transformers is available."""
    global _cross_encoder, _cross_encoder_checked
    if not _cross_encoder_checked:
        _cross_encoder_checked = True
        try:
            from sentence_transformers import CrossEncoder  # type: ignore

            _cross_encoder = CrossEncoder(RERANKER_MODEL)
        except Exception:
            _cross_encoder = None
    return _cross_encoder


# ── BM25 reranker (always-available fallback) ──────────────────────────────────

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


def bm25_scores(query: str, docs: list[str]) -> list[float]:
    """Minimal BM25 (Okapi, k1=1.5 b=0.75) over the candidate set."""
    k1, b = 1.5, 0.75
    q_tokens = _tokenize(query)
    doc_tokens = [_tokenize(d) for d in docs]
    doc_lens = [len(t) or 1 for t in doc_tokens]
    avgdl = sum(doc_lens) / len(doc_lens)
    n_docs = len(docs)

    df: dict[str, int] = {}
    for tokens in doc_tokens:
        for term in set(tokens):
            df[term] = df.get(term, 0) + 1

    scores: list[float] = []
    for i, tokens in enumerate(doc_tokens):
        tf: dict[str, int] = {}
        for term in tokens:
            tf[term] = tf.get(term, 0) + 1
        score = 0.0
        for term in q_tokens:
            if term not in tf:
                continue
            idf = math.log(1 + (n_docs - df.get(term, 0) + 0.5) / (df.get(term, 0) + 0.5))
            score += idf * (tf[term] * (k1 + 1)) / (tf[term] + k1 * (1 - b + b * doc_lens[i] / avgdl))
        scores.append(score)
    return scores


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(title="NWIS ML Service", version="1.0.0")


@app.get("/health")
def health() -> dict[str, Any]:
    try:
        bundle = get_bundle()
        return {
            "status": "ok",
            "model": bundle.metadata.get("model_name", "random_forest"),
            "model_version": bundle.metadata.get("model_version"),
            "classes": bundle.classes,
            "reranker": "cross_encoder" if get_cross_encoder() is not None else "bm25_fallback",
        }
    except FileNotFoundError as exc:
        return {"status": "degraded", "error": str(exc)}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    try:
        bundle = get_bundle()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    feats = build_features(req.features, bundle.stats)
    frame = features_to_frame([feats])

    proba = bundle.pipeline.predict_proba(frame)[0]
    classes = [str(c) for c in bundle.pipeline.classes_]
    pairs = sorted(zip(classes, proba), key=lambda kv: kv[1], reverse=True)

    risks = [
        PredictedRisk(type=cls, probability=round(float(p), 4), severity=severity_for(float(p)))
        for cls, p in pairs
        if cls != "normal"
    ]

    top = risks[0] if risks else PredictedRisk(
        type="normal", probability=round(float(pairs[0][1]), 4), severity="LOW"
    )

    return PredictResponse(
        risks=risks,
        top_risk=top,
        model="random_forest",
        model_version=bundle.metadata.get("model_version", "unknown"),
    )


@app.post("/rerank", response_model=RerankResponse)
def rerank(req: RerankRequest) -> RerankResponse:
    if not req.candidates:
        return RerankResponse(results=[], method="bm25")

    encoder = get_cross_encoder()
    if encoder is not None:
        pairs = [(req.query, c.text) for c in req.candidates]
        scores = [float(s) for s in encoder.predict(pairs)]
        method = "cross_encoder"
    else:
        scores = bm25_scores(req.query, [c.text for c in req.candidates])
        method = "bm25"

    order = sorted(range(len(req.candidates)), key=lambda i: scores[i], reverse=True)
    results = [
        RerankedItem(id=req.candidates[i].id, score=round(scores[i], 6), rank=rank + 1)
        for rank, i in enumerate(order)
    ]
    return RerankResponse(results=results, method=method)


@app.post("/hyde")
def hyde(req: HydeRequest) -> dict[str, str]:
    """Return a hypothetical drilling-evidence document for dense retrieval.

    A hosted language model can replace this implementation later. The
    deterministic expansion keeps the endpoint useful in local development
    without making search depend on another provider.
    """
    query = req.query.strip()
    hypothetical = (
        "Historical drilling report evidence relevant to the following query: "
        f"{query}. Include comparable wells, formation, measured depth, "
        "drilling event, severity, causes, mitigation, and operational outcome."
    )
    return {"hypothetical_document": hypothetical}

ocr_engine = None

def get_ocr():
    global ocr_engine
    if ocr_engine is None and PaddleOCR is not None:
        ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
    return ocr_engine

@app.post("/ocr")
async def extract_text(req: OCRRequest) -> dict:
    if PaddleOCR is None or fitz is None:
        raise HTTPException(status_code=501, detail="OCR dependencies not installed")
        
    import base64
    raw = base64.b64decode(req.file_base64)
    if req.file_type == 'pdf':
        doc = fitz.open(stream=raw, filetype="pdf")
        pages_text = []
        for page_num in range(min(len(doc), req.max_pages)):
            page = doc[page_num]
            text = page.get_text().strip()
            if len(text) < 50:
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                engine = get_ocr()
                result = engine.ocr(img_bytes, cls=True) if engine else []
                text = " ".join(
                    line[1][0] for block in (result or [])
                    for line in (block or []) if line
                )
            pages_text.append(text)
        return {"text": "\n\n".join(pages_text), "pages": len(pages_text)}
    else:
        engine = get_ocr()
        result = engine.ocr(raw, cls=True) if engine else []
        text = " ".join(
            line[1][0] for block in (result or [])
            for line in (block or []) if line
        )
        return {"text": text, "pages": 1}
