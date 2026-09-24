"""Synthetic dataset generator for the NWIS Random Forest risk model.

The READEME explicitly allows fictional development data when real OIL data is
unavailable (rule #19). This generator produces a *physically motivated*
tabular dataset: each row is a drilling observation at a depth, and the label
is the drilling risk observed in the corresponding depth interval.

Label classes (must match what the Node backend expects):
    normal, mud_loss, kick, stuck_pipe, torque_spike

Generator logic (not the model) is the only place that "knows" ground truth;
the model must learn it from the data alone.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

RNG_SEED = 42
LABELS = ["normal", "mud_loss", "kick", "stuck_pipe", "torque_spike", "overpressure", "cementing_issue", "casing_issue", "well_control"]

FEATURE_COLUMNS = [
    "well_id",
    "depth_ft",
    "tvd_ft",
    "formation",
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

FORMATION_LIST = [
    "Alluvium", "Tipam Sandstone", "Girujan Clay", "Barail Sandstone",
    "Kopili Shale", "Sylhet Limestone", "Langpar Formation",
]

# Formations associated with higher kick probability in the fictional geology.
KICK_PRONE = {"Sylhet Limestone", "Barail Sandstone"}
# Formations associated with higher mud-loss probability.
LOSS_PRONE = {"Barail Sandstone", "Tipam Sandstone"}
# Reactive shales -> hole instability / stuck pipe.
STUCK_PRONE = {"Kopili Shale", "Girujan Clay"}


def _formations_for_depth(depth_ft: float, rng: np.random.Generator) -> str:
    """Pick a plausible formation for a depth (deeper -> deeper formations)."""
    # upperAssamFormations() in the frontend spans roughly 0..11,200 ft.
    idx = min(int(depth_ft // 1600), len(FORMATION_LIST) - 1)
    # Small chance of adjacent formation to create natural overlap.
    if rng.random() < 0.15:
        idx += rng.integers(-1, 2)
    idx = int(np.clip(idx, 0, len(FORMATION_LIST) - 1))
    return FORMATION_LIST[idx]


def _sample_normal_conditions(rng: np.random.Generator, depth: float, formation: str) -> dict:
    """Baseline 'everything nominal' drilling signature."""
    return {
        "depth_ft": depth,
        "tvd_ft": depth * 0.968,
        "formation": formation,
        "rop_ft_hr": rng.normal(35, 8),
        "wob_klbs": rng.normal(28, 4),
        "rpm": rng.normal(85, 10),
        "torque_klb_ft": rng.normal(18, 3),
        "standpipe_pressure_psi": rng.normal(2800, 150),
        "mud_weight_ppg": rng.normal(10.8, 0.2),
        "flow_rate_gpm": rng.normal(400, 40),
        "temperature_f": 70 + depth * 0.015 + rng.normal(0, 2),
        "historical_hazards_in_radius": int(rng.integers(0, 4)),
    }


def _perturb(row: dict, rng: np.random.Generator, label: str) -> dict:
    """Apply label-specific physical anomalies to otherwise normal conditions."""
    if label == "mud_loss":
        # Loss of returns -> lower standpipe pressure, higher flow into hole,
        # mud weight usually reduced to avoid aggravating losses.
        row["standpipe_pressure_psi"] = rng.normal(1400, 350)
        row["flow_rate_gpm"] = rng.normal(520, 60)
        row["mud_weight_ppg"] = rng.normal(9.9, 0.25)
        row["rop_ft_hr"] = rng.normal(45, 10)
    elif label == "kick":
        # Formation fluid influx -> elevated SPP fluctuations, pit gain,
        # lower apparent mud weight (gas cut), typically kick-prone zones.
        row["standpipe_pressure_psi"] = rng.normal(3300, 300)
        row["mud_weight_ppg"] = rng.normal(10.2, 0.3)
        row["flow_rate_gpm"] = rng.normal(460, 50)
        row["temperature_f"] += rng.normal(8, 3)  # influx warmer
    elif label == "stuck_pipe":
        # Differential sticking / packoff: torque & drag increase, ROP drop.
        row["torque_klb_ft"] = rng.normal(34, 6)
        row["rop_ft_hr"] = rng.normal(12, 5)
        row["wob_klbs"] = rng.normal(22, 5)
    elif label == "torque_spike":
        # Bit balling / BHA wear: violent torque oscillations.
        row["torque_klb_ft"] = rng.normal(45, 8)
        row["rpm"] = rng.normal(70, 15)
        row["wob_klbs"] = rng.normal(32, 6)
    elif label == "overpressure":
        row["standpipe_pressure_psi"] = rng.normal(4000, 200)
        row["rop_ft_hr"] = rng.normal(20, 5)
    elif label == "cementing_issue":
        row["flow_rate_gpm"] = rng.normal(200, 80)
        row["standpipe_pressure_psi"] = rng.normal(1500, 400)
    elif label == "casing_issue":
        row["torque_klb_ft"] = rng.normal(30, 10)
        row["rop_ft_hr"] = rng.normal(5, 2)
    elif label == "well_control":
        row["standpipe_pressure_psi"] = rng.normal(4500, 300)
        row["mud_weight_ppg"] = rng.normal(12.0, 0.5)
    return row


def _label_for_interval(rng: np.random.Generator, formation: str, depth: float) -> str:
    """Choose the risk observed in a depth interval based on 'geology'."""
    r = rng.random()
    if formation in KICK_PRONE and r < 0.20:
        return "kick"
    if formation in LOSS_PRONE and r < 0.18:
        return "mud_loss"
    if formation in STUCK_PRONE and r < 0.15:
        return "stuck_pipe"
    if r < 0.08:  # sporadic torque spikes anywhere
        return "torque_spike"
    if r < 0.10:
        return "overpressure"
    if r < 0.12:
        return "cementing_issue"
    if r < 0.14:
        return "casing_issue"
    if r < 0.16:
        return "well_control"
    return "normal"


def generate(n_wells: int = 25, seed: int = RNG_SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows: list[dict] = []

    for w in range(n_wells):
        well_id = f"syn-well-{w + 1:02d}"
        depth = float(rng.uniform(500, 1000))
        n_readings = int(rng.integers(180, 320))
        for _ in range(n_readings):
            depth += float(rng.uniform(8, 45))
            formation = _formations_for_depth(depth, rng)
            label = _label_for_interval(rng, formation, depth)
            row = _sample_normal_conditions(rng, depth, formation)
            row = _perturb(row, rng, label)
            row["well_id"] = well_id
            row["label"] = label
            rows.append(row)

    df = pd.DataFrame(rows)
    df["label"] = pd.Categorical(df["label"], categories=LABELS)
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic drilling dataset")
    parser.add_argument("--wells", type=int, default=25, help="Number of synthetic wells")
    parser.add_argument("--seed", type=int, default=RNG_SEED)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "datasets")
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    df = generate(n_wells=args.wells, seed=args.seed)
    out_path = args.out / "drilling_readings.csv"
    df.to_csv(out_path, index=False)
    print(f"Wrote {len(df)} rows across {args.wells} wells -> {out_path}")
    print(df["label"].value_counts().to_string())


if __name__ == "__main__":
    main()
