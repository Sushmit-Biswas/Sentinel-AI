"""
Data Pipeline — Cleans, enriches, and scores the raw BTP violation CSV.
Produces a processed DataFrame ready for hotspot detection and analytics.
"""

import pandas as pd
import numpy as np
import json
import os
import re
from datetime import timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

# ── Violation severity weights (core of the Congestion Impact Score) ──────────
VIOLATION_WEIGHTS = {
    "PARKING IN A MAIN ROAD": 3.0,
    "DOUBLE PARKING": 2.5,
    "PARKING ON FOOTPATH": 2.0,
    "PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC": 2.0,
    "PARKING NEAR ROAD CROSSING": 2.0,
    "PARKING OPPOSITE TO ANOTHER PARKED VEHICLE": 2.0,
    "PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS": 2.5,
    "WRONG PARKING": 1.5,
    "NO PARKING": 1.0,
    "PARKING OTHER THAN BUS STOP": 1.0,
}

# ── Vehicle size multipliers (larger vehicles block more road) ────────────────
VEHICLE_SIZE = {
    "HGV": 3.0, "LORRY/GOODS VEHICLE": 3.0, "PRIVATE BUS": 3.0,
    "BUS (BMTC/KSRTC)": 3.0, "TANKER": 3.0, "TRACTOR": 3.0,
    "MINI LORRY": 2.5,
    "LGV": 2.0, "TEMPO": 2.0, "MAXI-CAB": 2.0, "VAN": 2.0,
    "CAR": 1.5, "JEEP": 1.5,
    "PASSENGER AUTO": 1.2, "GOODS AUTO": 1.2,
    "MOTOR CYCLE": 1.0, "SCOOTER": 1.0, "MOPED": 1.0,
}

# ── Rush hour windows (IST) ──────────────────────────────────────────────────
MORNING_RUSH = (8, 11)   # 8 AM – 11 AM IST
EVENING_RUSH = (17, 21)  # 5 PM – 9 PM IST


def _parse_violation_types(raw: str) -> list[str]:
    """Parse the JSON-encoded violation_type column."""
    if pd.isna(raw):
        return []
    try:
        cleaned = raw.replace('""', '"')
        # Handle edge cases in the CSV quoting
        if cleaned.startswith('"[') and cleaned.endswith(']"'):
            cleaned = cleaned[1:-1]
        items = json.loads(cleaned)
        if isinstance(items, list):
            return [str(i).strip() for i in items]
        return [str(items).strip()]
    except (json.JSONDecodeError, ValueError):
        # Fallback: regex extraction
        matches = re.findall(r'"([A-Z][A-Z /\(\)]+)"', raw)
        return matches if matches else []


def _compute_violation_severity(violations: list[str]) -> float:
    """Max severity across all violation types for a single record."""
    if not violations:
        return 1.0
    return max(VIOLATION_WEIGHTS.get(v, 1.0) for v in violations)


def _rush_hour_multiplier(hour_ist: int) -> float:
    """2× during rush hours, 1× otherwise."""
    if MORNING_RUSH[0] <= hour_ist < MORNING_RUSH[1]:
        return 2.0
    if EVENING_RUSH[0] <= hour_ist < EVENING_RUSH[1]:
        return 2.0
    return 1.0


def _junction_multiplier(junction_name: str) -> float:
    """Near a named junction = higher congestion impact."""
    if pd.isna(junction_name) or junction_name == "No Junction":
        return 1.0
    return 2.0


def load_and_process(csv_path: str, cache_dir: str = None) -> pd.DataFrame:
    """
    Full pipeline: load CSV → clean → enrich → compute CIS.
    
    Returns a clean DataFrame with these added columns:
      - violation_list: parsed list of violation strings
      - hour_ist, day_of_week, month, is_weekend
      - violation_severity, vehicle_size_mult, rush_mult, junction_mult
      - congestion_impact_score (CIS)
    """
    # Check for cache
    if cache_dir:
        cache_path = os.path.join(cache_dir, "processed_violations.parquet")
        if os.path.exists(cache_path):
            print(f"[Pipeline] Loading cached data from {cache_path}")
            return pd.read_parquet(cache_path)

    print(f"[Pipeline] Loading raw CSV from {csv_path}...")
    df = pd.read_csv(csv_path, low_memory=False)
    original_len = len(df)
    print(f"[Pipeline] Loaded {original_len:,} rows")

    # ── 1. Drop rows without GPS ──────────────────────────────────────────
    df = df.dropna(subset=["latitude", "longitude"])
    
    # ── 2. Parse datetime to IST ──────────────────────────────────────────
    df["created_datetime"] = pd.to_datetime(df["created_datetime"], errors="coerce", utc=True)
    df = df.dropna(subset=["created_datetime"])
    df["created_datetime_ist"] = df["created_datetime"].dt.tz_convert("Asia/Kolkata")

    # ── 3. Time features ──────────────────────────────────────────────────
    df["hour_ist"] = df["created_datetime_ist"].dt.hour
    df["day_of_week"] = df["created_datetime_ist"].dt.dayofweek  # 0=Mon, 6=Sun
    df["day_name"] = df["created_datetime_ist"].dt.day_name()
    df["month"] = df["created_datetime_ist"].dt.month
    df["year_month"] = df["created_datetime_ist"].dt.to_period("M").astype(str)
    df["is_weekend"] = df["day_of_week"].isin([5, 6])
    df["date"] = df["created_datetime_ist"].dt.date

    # ── 4. Parse violation types ──────────────────────────────────────────
    df["violation_list"] = df["violation_type"].apply(_parse_violation_types)
    
    # Filter to only parking-related violations
    parking_keywords = {"PARKING", "WRONG PARKING", "NO PARKING", "DOUBLE PARKING"}
    def _is_parking_violation(vlist):
        return any("PARKING" in v for v in vlist) or any("WRONG" in v for v in vlist)
    
    df = df[df["violation_list"].apply(_is_parking_violation)].copy()
    print(f"[Pipeline] {len(df):,} parking-related violations (filtered from {original_len:,})")

    # ── 5. Compute CIS components ─────────────────────────────────────────
    df["violation_severity"] = df["violation_list"].apply(_compute_violation_severity)
    df["vehicle_size_mult"] = df["vehicle_type"].map(VEHICLE_SIZE).fillna(1.0)
    df["rush_mult"] = df["hour_ist"].apply(_rush_hour_multiplier)
    df["junction_mult"] = df["junction_name"].apply(_junction_multiplier)

    # ── 6. Congestion Impact Score ────────────────────────────────────────
    df["congestion_impact_score"] = (
        df["violation_severity"]
        * df["vehicle_size_mult"]
        * df["rush_mult"]
        * df["junction_mult"]
    )

    # ── 7. Normalize CIS to 0-100 scale ──────────────────────────────────
    max_cis = df["congestion_impact_score"].max()
    if max_cis > 0:
        df["cis_normalized"] = (df["congestion_impact_score"] / max_cis * 100).round(1)
    else:
        df["cis_normalized"] = 0.0

    # ── 8. Select and order columns ───────────────────────────────────────
    keep_cols = [
        "id", "latitude", "longitude", "location",
        "vehicle_number", "vehicle_type",
        "violation_type", "violation_list",
        "created_datetime_ist", "hour_ist", "day_of_week", "day_name",
        "month", "year_month", "date", "is_weekend",
        "device_id", "police_station", "junction_name", "center_code",
        "data_sent_to_scita", "validation_status",
        "violation_severity", "vehicle_size_mult", "rush_mult", "junction_mult",
        "congestion_impact_score", "cis_normalized",
    ]
    existing_cols = [c for c in keep_cols if c in df.columns]
    df = df[existing_cols].copy()

    # ── 9. Cache processed data ───────────────────────────────────────────
    if cache_dir:
        os.makedirs(cache_dir, exist_ok=True)
        # Convert violation_list to JSON string for parquet compatibility
        df_save = df.copy()
        df_save["violation_list"] = df_save["violation_list"].apply(json.dumps)
        df_save.to_parquet(cache_path, index=False)
        print(f"[Pipeline] Cached processed data to {cache_path}")

    print(f"[Pipeline] Final dataset: {len(df):,} rows, {len(df.columns)} columns")
    print(f"[Pipeline] CIS range: {df['congestion_impact_score'].min():.1f} – {df['congestion_impact_score'].max():.1f}")
    print(f"[Pipeline] Mean CIS: {df['congestion_impact_score'].mean():.2f}")
    
    return df


if __name__ == "__main__":
    DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "jan_to_may_police_violation.csv")
    CACHE_DIR = os.path.join(os.path.dirname(__file__), "processed")
    df = load_and_process(DATA_PATH, CACHE_DIR)
    print("\nSample CIS distribution:")
    print(df["congestion_impact_score"].describe())
    print("\nTop 10 locations by mean CIS:")
    top = df.groupby("junction_name").agg(
        count=("id", "count"),
        mean_cis=("congestion_impact_score", "mean"),
        total_cis=("congestion_impact_score", "sum"),
    ).sort_values("total_cis", ascending=False).head(10)
    print(top.to_string())
