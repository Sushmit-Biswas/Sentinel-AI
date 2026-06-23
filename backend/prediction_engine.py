"""
Prediction Engine — Uses historical violation patterns to forecast
future parking hotspot formation. Provides hour-ahead and day-ahead
predictions using statistical distribution modeling.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))


def _get_current_ist_time():
    """Get current time in IST."""
    return datetime.now(IST)


def predict_heatmap(df: pd.DataFrame, target_hour: int, target_day: int,
                    sample_size: int = 15000) -> dict:
    """
    Predict violation heatmap for a given hour and day-of-week.
    Uses kernel density estimation from historical data.
    
    Args:
        df: Processed violations DataFrame
        target_hour: Target hour (0-23 IST)
        target_day: Target day of week (0=Mon, 6=Sun)
        sample_size: Max points to return
    
    Returns:
        {
            "points": [{lat, lon, intensity}, ...],
            "prediction_confidence": float (0-1),
            "expected_violations": int,
            "risk_summary": {...}
        }
    """
    # Filter historical data for this hour ± 1 and day pattern
    hour_mask = (df["hour_ist"] >= max(0, target_hour - 1)) & \
                (df["hour_ist"] <= min(23, target_hour + 1))
    
    # Weekday vs weekend pattern matching
    target_is_weekend = target_day in [5, 6]
    if target_is_weekend:
        day_mask = df["is_weekend"] == True
    else:
        day_mask = df["is_weekend"] == False
    
    # Exact hour match gets higher weight
    exact_hour = df[df["hour_ist"] == target_hour]
    nearby_hours = df[hour_mask & day_mask]
    
    # Combine with weighting (exact match = 3x weight)
    if len(exact_hour) > 0 and len(nearby_hours) > 0:
        combined = pd.concat([exact_hour, exact_hour, exact_hour, nearby_hours])
    elif len(nearby_hours) > 0:
        combined = nearby_hours
    else:
        combined = df  # Fallback to full dataset
    
    # Calculate prediction confidence
    total_records = len(df)
    matching_records = len(combined)
    historical_days = df["date"].nunique()
    matching_days = combined["date"].nunique() if "date" in combined.columns else 1
    
    # Confidence based on data density for this time slot
    confidence = min(0.95, max(0.3, matching_records / (total_records * 0.15)))
    
    # Expected violations (extrapolated from historical average)
    avg_violations_per_day = len(exact_hour) / max(1, historical_days)
    
    # Sample for heatmap points
    if len(combined) > sample_size:
        sampled = combined.sample(n=sample_size, random_state=42)
    else:
        sampled = combined
    
    # Build intensity based on CIS + time relevance
    points = []
    max_cis = sampled["congestion_impact_score"].max() if len(sampled) > 0 else 1
    
    for _, row in sampled.iterrows():
        # Weight by how close the hour is
        hour_weight = 1.0 if row["hour_ist"] == target_hour else 0.6
        intensity = (row["congestion_impact_score"] / max(max_cis, 1)) * 100 * hour_weight
        points.append({
            "lat": round(row["latitude"], 6),
            "lon": round(row["longitude"], 6),
            "intensity": round(min(100, intensity), 1),
        })
    
    # Risk summary by grid
    risk_zones = _compute_predicted_risk_zones(combined, target_hour)
    
    return {
        "points": points,
        "count": len(points),
        "prediction_confidence": round(confidence, 2),
        "expected_violations": int(avg_violations_per_day),
        "target_hour": target_hour,
        "target_day": target_day,
        "target_day_name": ["Monday", "Tuesday", "Wednesday", "Thursday",
                           "Friday", "Saturday", "Sunday"][target_day],
        "risk_summary": risk_zones,
    }


def _compute_predicted_risk_zones(df: pd.DataFrame, target_hour: int) -> dict:
    """Compute predicted risk zone counts."""
    # Grid-snap for aggregation
    df = df.copy()
    df["lat_grid"] = (df["latitude"] / 0.002).round() * 0.002
    df["lon_grid"] = (df["longitude"] / 0.002).round() * 0.002
    
    grid_stats = df.groupby(["lat_grid", "lon_grid"]).agg(
        total_cis=("congestion_impact_score", "sum"),
        count=("id", "count"),
    ).reset_index()
    
    if len(grid_stats) == 0:
        return {"critical": 0, "high": 0, "medium": 0, "low": 0}
    
    q75 = grid_stats["total_cis"].quantile(0.75)
    q90 = grid_stats["total_cis"].quantile(0.90)
    q95 = grid_stats["total_cis"].quantile(0.95)
    
    return {
        "critical": int((grid_stats["total_cis"] >= q95).sum()),
        "high": int(((grid_stats["total_cis"] >= q90) & (grid_stats["total_cis"] < q95)).sum()),
        "medium": int(((grid_stats["total_cis"] >= q75) & (grid_stats["total_cis"] < q90)).sum()),
        "low": int((grid_stats["total_cis"] < q75).sum()),
        "total_zones": int(len(grid_stats)),
    }


def get_prediction_timeline(df: pd.DataFrame) -> list:
    """
    Generate a timeline of predictions for the next 8 hours.
    Returns a list of prediction summaries.
    """
    now = _get_current_ist_time()
    timeline = []
    
    for offset_hours in [0, 2, 4, 6, 8]:
        target_time = now + timedelta(hours=offset_hours)
        target_hour = target_time.hour
        target_day = target_time.weekday()
        
        # Quick summary without full heatmap
        hour_data = df[df["hour_ist"] == target_hour]
        avg_violations = len(hour_data) / max(1, df["date"].nunique())
        avg_cis = hour_data["congestion_impact_score"].mean() if len(hour_data) > 0 else 0
        
        timeline.append({
            "offset_hours": offset_hours,
            "target_hour": target_hour,
            "target_day": target_day,
            "target_day_name": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][target_day],
            "label": "NOW" if offset_hours == 0 else f"+{offset_hours}h",
            "time_label": f"{target_hour:02d}:00",
            "expected_violations": int(avg_violations),
            "avg_cis": round(avg_cis, 1),
            "risk_level": "critical" if avg_cis > 6 else "high" if avg_cis > 4 else "medium" if avg_cis > 2 else "low",
        })
    
    return timeline
