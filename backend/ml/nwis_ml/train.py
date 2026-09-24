"""Random Forest training pipeline.

Reproducible offline process (never run in the API request path):
    generate/collect data -> clean -> engineer features -> well-level split
    -> train RF (class weights) -> calibrate -> evaluate -> save artifact.

Well-level splitting avoids leakage between correlated readings from the same
well (READEME #22). Class weights handle imbalance (READEME #24).
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from .features import CATEGORICAL_FEATURES, FEATURE_COLUMNS, NUMERIC_FEATURES, compute_stats

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"


def load_dataset(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    # Basic cleaning: drop rows without a label or with NaN numeric features.
    df = df.dropna(subset=["label"])
    df = df.dropna(subset=NUMERIC_FEATURES, how="any")
    df["label"] = df["label"].astype(str)
    return df


def well_level_split(df: pd.DataFrame, test_size: float = 0.25, seed: int = 42):
    splitter = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=seed)
    train_idx, test_idx = next(splitter.split(df, groups=df["well_id"]))
    return df.iloc[train_idx], df.iloc[test_idx]


def build_pipeline(seed: int = 42) -> Pipeline:
    rf = RandomForestClassifier(
        n_estimators=300,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        random_state=seed,
        n_jobs=-1,
    )
    # CalibratedClassifierCV gives more honest probabilities for thresholding
    # (sigmoid calibration keeps latency low and avoids extra CV folds for RF).
    calibrated = CalibratedClassifierCV(rf, method="sigmoid", cv=3)
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
            ("num", "passthrough", NUMERIC_FEATURES),
        ]
    )
    return Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("clf", calibrated),
        ]
    )


def evaluate(pipeline: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    y_pred = pipeline.predict(X_test)
    labels = sorted(y_test.unique())

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "f1_macro": round(float(f1_score(y_test, y_pred, average="macro")), 4),
        "precision_macro": round(float(precision_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "recall_macro": round(float(recall_score(y_test, y_pred, average="macro", zero_division=0)), 4),
    }

    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    metrics["per_class"] = {
        label: {
            "precision": round(float(report[label]["precision"]), 4),
            "recall": round(float(report[label]["recall"]), 4),
            "f1": round(float(report[label]["f1-score"]), 4),
            "support": int(report[label]["support"]),
        }
        for label in labels
    }
    metrics["confusion_matrix"] = {
        "labels": labels,
        "matrix": confusion_matrix(y_test, y_pred, labels=labels).tolist(),
    }
    return metrics


def feature_importances(pipeline: Pipeline) -> dict[str, float]:
    """Model-derived permutation-free importance (mean impurity decrease).

    NOTE: this is *model-derived importance*, not causal evidence (READEME #30).
    """
    preprocessor = pipeline.named_steps["preprocess"]
    clf = pipeline.named_steps["clf"]
    forest = clf.calibrated_classifiers_[0].estimator
    names = preprocessor.get_feature_names_out().tolist()
    importances = forest.feature_importances_
    pairs = sorted(zip(names, importances), key=lambda kv: kv[1], reverse=True)
    return {name: round(float(imp), 4) for name, imp in pairs[:20]}


def train(
    csv_path: Path,
    version: str,
    seed: int = 42,
    out_dir: Path = MODEL_DIR,
) -> Path:
    df = load_dataset(csv_path)
    train_df, test_df = well_level_split(df, seed=seed)

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df["label"]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df["label"]

    pipeline = build_pipeline(seed=seed)
    pipeline.fit(X_train, y_train)

    metrics = evaluate(pipeline, X_test, y_test)

    version_dir = out_dir / f"random_forest_{version}"
    version_dir.mkdir(parents=True, exist_ok=True)

    model_path = version_dir / "model.joblib"
    joblib.dump(pipeline, model_path)

    stats = compute_stats(train_df)
    metadata = {
        "model_name": "random_forest",
        "model_version": version,
        "training_date": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "path": str(csv_path),
            "rows_total": int(len(df)),
            "rows_train": int(len(train_df)),
            "rows_test": int(len(test_df)),
            "wells_total": int(df["well_id"].nunique()),
            "wells_train": int(train_df["well_id"].nunique()),
            "wells_test": int(test_df["well_id"].nunique()),
            "split_strategy": "well_level_group_shuffle",
        },
        "features": FEATURE_COLUMNS,
        "classes": sorted(df["label"].unique().tolist()),
        "medians": stats.medians,
        "metrics": metrics,
        "feature_importance_model_derived": feature_importances(pipeline),
    }
    meta_path = version_dir / "metadata.json"
    meta_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    # 'latest' pointer for the prediction service.
    (out_dir / "latest.json").write_text(
        json.dumps({"model_version": version, "model_path": str(model_path)}, indent=2),
        encoding="utf-8",
    )

    print(f"Model saved -> {model_path}")
    print(json.dumps(metrics["per_class"], indent=2))
    print(f"accuracy={metrics['accuracy']} f1_macro={metrics['f1_macro']}")
    return version_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the NWIS Random Forest risk model")
    parser.add_argument(
        "--data", type=Path,
        default=Path(__file__).resolve().parent.parent / "datasets" / "drilling_readings.csv",
    )
    parser.add_argument("--version", type=str, default=None, help="Model version tag")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if not args.data.exists():
        raise SystemExit(
            f"Dataset not found at {args.data}. Run: python -m nwis_ml.generate_dataset"
        )

    version = args.version or datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    train(args.data, version=version, seed=args.seed)


if __name__ == "__main__":
    main()
