"""Feature engineering shared by training and serving.

IMPORTANT: training and the prediction API must build features with the *same*
code. Any divergence silently degrades model quality. Both sides import this
module; the Node backend sends raw field values that map onto FEATURE_COLUMNS.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

# Numeric features fed to the model. well_id is used only for splitting;
# formation is one-hot encoded.
NUMERIC_FEATURES = [
    "depth_ft",
    "tvd_ft",
    "rop_ft_hr",
    "wob_klbs",
    "rpm",
    "torque_klb_ft",
    "standpipe_pressure_psi",
    "mud_weight_ppg",
    "flow_rate_gpm",
    "temperature_f",
    "historical_hazards_in_radius",
]

CATEGORICAL_FEATURES = ["formation"]

FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# Column name mapping: Node backend field names -> internal feature names.
NODE_FIELD_MAP = {
    "depth": "depth_ft",
    "current_depth": "depth_ft",
    "tvd": "tvd_ft",
    "rop": "rop_ft_hr",
    "wob": "wob_klbs",
    "rpm": "rpm",
    "torque": "torque_klb_ft",
    "standpipe_pressure": "standpipe_pressure_psi",
    "pump_pressure": "standpipe_pressure_psi",
    "mud_weight": "mud_weight_ppg",
    "flow_rate": "flow_rate_gpm",
    "temperature": "temperature_f",
    "historical_hazards_in_radius": "historical_hazards_in_radius",
    "formation": "formation",
}


@dataclass
class FeatureStats:
    """Training-set statistics stored alongside the model for imputation."""

    medians: dict[str, float]


def compute_stats(df: pd.DataFrame) -> FeatureStats:
    medians = {c: float(df[c].median()) for c in NUMERIC_FEATURES}
    return FeatureStats(medians=medians)


def build_features(raw: dict, stats: FeatureStats) -> dict:
    """Map a raw prediction request (Node field names) onto feature columns.

    Missing numeric fields are imputed with training medians; formation falls
    back to 'Unknown' (which the one-hot encoder handles via handle_unknown).
    """
    feats: dict[str, float | str] = {}
    for internal in NUMERIC_FEATURES:
        value = raw.get(internal)
        if value is None:
            # Allow Node-style names as well (e.g. pump_pressure, wob).
            node_name = next(
                (k for k, v in NODE_FIELD_MAP.items() if v == internal and k != internal), None
            )
            value = raw.get(node_name) if node_name else None
        if value is None:
            value = stats.medians.get(internal, 0.0)
        feats[internal] = float(value)

    formation = raw.get("formation")
    feats["formation"] = str(formation) if formation else "Unknown"
    return feats


def features_to_frame(rows: list[dict]) -> pd.DataFrame:
    """Convert feature dicts into a DataFrame with proper dtypes."""
    df = pd.DataFrame(rows)
    for c in NUMERIC_FEATURES:
        df[c] = pd.to_numeric(df[c], errors="coerce").replace([np.inf, -np.inf], np.nan)
    for c in CATEGORICAL_FEATURES:
        df[c] = df[c].astype(str)
    return df
