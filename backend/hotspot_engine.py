"""
Hotspot Detection Engine — Uses DBSCAN spatial clustering to identify
illegal parking hotspots, then ranks them by aggregate Congestion Impact Score.
"""

import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from collections import Counter


# ── DBSCAN parameters ─────────────────────────────────────────────────────────
# eps=0.001 radians ≈ ~110m radius (good for street-level clustering)
# min_samples=5 → at least 5 violations to form a cluster
EPS_RADIANS = 0.001
MIN_SAMPLES = 5


def detect_hotspots(df: pd.DataFrame, eps: float = EPS_RADIANS,
                    min_samples: int = MIN_SAMPLES) -> pd.DataFrame:
    """
    Find spatial violation clusters using grid aggregation (memory-efficient).
    """
    print(f"[Hotspot] Aggregating {len(df):,} points into spatial grid...")
    
    df = df.copy()
    # 0.001 degrees is ~110 meters. We snap coordinates to this grid.
    df["lat_grid"] = (df["latitude"] / 0.001).round() * 0.001
    df["lon_grid"] = (df["longitude"] / 0.001).round() * 0.001
    
    # Group by the grid cell
    df["cluster_id"] = df.groupby(["lat_grid", "lon_grid"]).ngroup()
    
    # Filter out cells with too few violations
    cluster_counts = df["cluster_id"].value_counts()
    valid_clusters = cluster_counts[cluster_counts >= min_samples].index
    clustered = df[df["cluster_id"].isin(valid_clusters)]
    
    n_clusters = len(valid_clusters)
    print(f"[Hotspot] Found {n_clusters} grid clusters")
    
    # ── Aggregate per cluster ─────────────────────────────────────────────
    hotspots = []
    
    # To make this fast, we can aggregate using Pandas instead of a slow loop
    # But a loop over e.g. 500 top clusters is fine.
    # Let's take the top 500 clusters by violation count to speed up the loop
    top_clusters = cluster_counts[cluster_counts >= min_samples].head(500).index
    clustered_top = clustered[clustered["cluster_id"].isin(top_clusters)]
    
    for cid, group in clustered_top.groupby("cluster_id"):
        # Flatten violation lists
        all_violations = []
        for vlist in group["violation_list"]:
            if isinstance(vlist, list):
                all_violations.extend(vlist)
            elif isinstance(vlist, str):
                try:
                    import json
                    all_violations.extend(json.loads(vlist))
                except:
                    all_violations.append(vlist)
        
        violation_counts = Counter(all_violations)
        top_violations = [v for v, _ in violation_counts.most_common(3)]
        
        vehicle_counts = group["vehicle_type"].value_counts()
        top_vehicles = vehicle_counts.head(3).index.tolist()
        
        # Peak hour (mode)
        peak_hour = int(group["hour_ist"].mode().iloc[0]) if len(group["hour_ist"].mode()) > 0 else 0
        peak_day = group["day_name"].mode().iloc[0] if len(group["day_name"].mode()) > 0 else "Unknown"
        
        # Dominant station & junction
        station = group["police_station"].mode().iloc[0] if len(group["police_station"].mode()) > 0 else "Unknown"
        junction = group["junction_name"].mode().iloc[0] if len(group["junction_name"].mode()) > 0 else "No Junction"
        
        # Location string (most common)
        location = group["location"].mode().iloc[0] if "location" in group.columns and len(group["location"].dropna()) > 0 else ""
        
        total_cis = group["congestion_impact_score"].sum()
        mean_cis = group["congestion_impact_score"].mean()
        
        hotspots.append({
            "cluster_id": int(cid),
            "center_lat": round(group["lat_grid"].iloc[0], 6),
            "center_lon": round(group["lon_grid"].iloc[0], 6),
            "violation_count": len(group),
            "total_cis": round(total_cis, 1),
            "mean_cis": round(mean_cis, 2),
            "top_violations": top_violations,
            "top_vehicles": top_vehicles,
            "dominant_station": station,
            "dominant_junction": junction,
            "location_name": location[:120] if location else "",
            "peak_hour": peak_hour,
            "peak_day": peak_day,
            "unique_dates": group["date"].nunique() if "date" in group.columns else 0,
            "avg_daily_violations": round(len(group) / max(group["date"].nunique(), 1), 1) if "date" in group.columns else 0,
        })
    
    hotspot_df = pd.DataFrame(hotspots)
    
    if len(hotspot_df) == 0:
        print("[Hotspot] Warning: No clusters found!")
        return hotspot_df
    
    # ── Risk level classification ─────────────────────────────────────────
    cis_q75 = hotspot_df["total_cis"].quantile(0.75)
    cis_q90 = hotspot_df["total_cis"].quantile(0.90)
    cis_q95 = hotspot_df["total_cis"].quantile(0.95)
    
    def _risk_level(total_cis):
        if total_cis >= cis_q95:
            return "critical"
        elif total_cis >= cis_q90:
            return "high"
        elif total_cis >= cis_q75:
            return "medium"
        else:
            return "low"
    
    hotspot_df["risk_level"] = hotspot_df["total_cis"].apply(_risk_level)
    
    # Sort by total CIS descending
    hotspot_df = hotspot_df.sort_values("total_cis", ascending=False).reset_index(drop=True)
    hotspot_df["rank"] = range(1, len(hotspot_df) + 1)
    
    print(f"[Hotspot] Risk distribution: "
          f"Critical={len(hotspot_df[hotspot_df['risk_level']=='critical'])}, "
          f"High={len(hotspot_df[hotspot_df['risk_level']=='high'])}, "
          f"Medium={len(hotspot_df[hotspot_df['risk_level']=='medium'])}, "
          f"Low={len(hotspot_df[hotspot_df['risk_level']=='low'])}")
    
    return hotspot_df


def get_station_analytics(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate analytics per police station."""
    station_stats = df.groupby("police_station").agg(
        violation_count=("id", "count"),
        total_cis=("congestion_impact_score", "sum"),
        mean_cis=("congestion_impact_score", "mean"),
        unique_locations=("location", "nunique"),
        lat=("latitude", "mean"),
        lon=("longitude", "mean"),
    ).reset_index()
    
    station_stats = station_stats.sort_values("total_cis", ascending=False)
    station_stats["total_cis"] = station_stats["total_cis"].round(1)
    station_stats["mean_cis"] = station_stats["mean_cis"].round(2)
    
    return station_stats


def get_temporal_analytics(df: pd.DataFrame) -> dict:
    """Generate temporal distribution data for charts."""
    # Hourly distribution
    hourly = df.groupby("hour_ist").agg(
        count=("id", "count"),
        mean_cis=("congestion_impact_score", "mean"),
    ).reset_index()
    hourly.columns = ["hour", "count", "mean_cis"]
    hourly["mean_cis"] = hourly["mean_cis"].round(2)
    
    # Day of week distribution
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    daily = df.groupby("day_name").agg(
        count=("id", "count"),
        mean_cis=("congestion_impact_score", "mean"),
    ).reset_index()
    daily.columns = ["day", "count", "mean_cis"]
    daily["mean_cis"] = daily["mean_cis"].round(2)
    daily["day_order"] = daily["day"].map({d: i for i, d in enumerate(day_order)})
    daily = daily.sort_values("day_order").drop("day_order", axis=1)
    
    # Monthly trend
    monthly = df.groupby("year_month").agg(
        count=("id", "count"),
        total_cis=("congestion_impact_score", "sum"),
    ).reset_index()
    monthly.columns = ["month", "count", "total_cis"]
    monthly["total_cis"] = monthly["total_cis"].round(1)
    monthly = monthly.sort_values("month")
    
    # Hour × Day heatmap matrix
    heatmap = df.groupby(["day_of_week", "hour_ist"]).size().reset_index(name="count")
    heatmap.columns = ["day", "hour", "count"]
    
    # Violation type distribution
    from collections import Counter
    all_violations = []
    for vlist in df["violation_list"]:
        if isinstance(vlist, list):
            all_violations.extend(vlist)
    violation_dist = [{"type": k, "count": v} for k, v in Counter(all_violations).most_common(10)]
    
    # Vehicle type distribution
    vehicle_dist = df["vehicle_type"].value_counts().head(10).reset_index()
    vehicle_dist.columns = ["type", "count"]
    
    return {
        "hourly": hourly.to_dict(orient="records"),
        "daily": daily.to_dict(orient="records"),
        "monthly": monthly.to_dict(orient="records"),
        "heatmap_matrix": heatmap.to_dict(orient="records"),
        "violation_distribution": violation_dist,
        "vehicle_distribution": vehicle_dist.to_dict(orient="records"),
    }


def get_heatmap_points(df: pd.DataFrame, sample_size: int = 50000) -> list[dict]:
    """
    Return lat/lon/intensity points for the frontend heatmap.
    Samples down to `sample_size` if the dataset is too large.
    """
    if len(df) > sample_size:
        sampled = df.sample(n=sample_size, random_state=42)
    else:
        sampled = df
    
    points = []
    for _, row in sampled.iterrows():
        points.append({
            "lat": round(row["latitude"], 6),
            "lon": round(row["longitude"], 6),
            "intensity": round(row["cis_normalized"], 1),
        })
    
    return points


def get_heatmap_by_hour(df: pd.DataFrame, hour: int, sample_size: int = 10000) -> list[dict]:
    """Return heatmap points filtered by hour of day (IST)."""
    filtered = df[df["hour_ist"] == hour]
    return get_heatmap_points(filtered, sample_size)


if __name__ == "__main__":
    from data_pipeline import load_and_process
    import os
    
    DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "jan_to_may_police_violation.csv")
    CACHE_DIR = os.path.join(os.path.dirname(__file__), "processed")
    
    df = load_and_process(DATA_PATH, CACHE_DIR)
    
    print("\n" + "="*60)
    print("HOTSPOT DETECTION")
    print("="*60)
    hotspots = detect_hotspots(df)
    print(f"\nTop 10 Hotspots:")
    print(hotspots[["rank", "dominant_junction", "violation_count", "total_cis", "risk_level"]].head(10).to_string())
    
    print("\n" + "="*60)
    print("STATION ANALYTICS")
    print("="*60)
    stations = get_station_analytics(df)
    print(stations.head(10).to_string())
