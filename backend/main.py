"""
FastAPI Backend — Serves the processed violation data, hotspot analysis,
temporal analytics, and patrol route optimization to the Next.js frontend.
"""

import os
import json
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data_pipeline import load_and_process
from hotspot_engine import (
    detect_hotspots,
    get_station_analytics,
    get_temporal_analytics,
    get_heatmap_points,
    get_heatmap_by_hour,
)
from patrol_optimizer import optimize_patrol_route
from prediction_engine import predict_heatmap, get_prediction_timeline


# ── Global state ──────────────────────────────────────────────────────────────
_state = {
    "df": None,
    "hotspots": None,
    "station_analytics": None,
    "temporal_analytics": None,
    "heatmap_points": None,
}

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "jan_to_may_police_violation.csv")
CACHE_DIR = os.path.join(os.path.dirname(__file__), "processed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load and process data on startup."""
    print("[Server] Starting up — loading data pipeline...")
    
    df = load_and_process(DATA_PATH, CACHE_DIR)
    _state["df"] = df
    
    print("[Server] Running hotspot detection...")
    _state["hotspots"] = detect_hotspots(df)
    
    print("[Server] Computing station analytics...")
    _state["station_analytics"] = get_station_analytics(df)
    
    print("[Server] Computing temporal analytics...")
    _state["temporal_analytics"] = get_temporal_analytics(df)
    
    print("[Server] Pre-computing heatmap points...")
    _state["heatmap_points"] = get_heatmap_points(df, sample_size=50000)
    
    print("[Server] Ready to serve!")
    yield
    print("[Server] Shutting down.")


app = FastAPI(
    title="Gridlock Parking Intelligence API",
    description="AI-driven parking violation analytics for Bengaluru Traffic Police",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for local Next.js dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ──────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "records": len(_state["df"]) if _state["df"] is not None else 0,
        "hotspots": len(_state["hotspots"]) if _state["hotspots"] is not None else 0,
    }


# ── KPI Summary ──────────────────────────────────────────────────────────────

@app.get("/api/kpi")
async def get_kpis():
    """Top-level KPI metrics for the dashboard cards."""
    df = _state["df"]
    hotspots = _state["hotspots"]
    
    if df is None:
        return {"error": "Data not loaded"}
    
    critical_count = len(hotspots[hotspots["risk_level"] == "critical"]) if hotspots is not None else 0
    high_count = len(hotspots[hotspots["risk_level"] == "high"]) if hotspots is not None else 0
    
    return {
        "total_violations": int(len(df)),
        "total_hotspots": int(len(hotspots)) if hotspots is not None else 0,
        "critical_zones": int(critical_count),
        "high_risk_zones": int(high_count),
        "avg_daily_violations": round(len(df) / df["date"].nunique(), 0) if "date" in df.columns else 0,
        "top_station": df["police_station"].value_counts().index[0] if len(df) > 0 else "N/A",
        "top_junction": df[df["junction_name"] != "No Junction"]["junction_name"].value_counts().index[0] if len(df) > 0 else "N/A",
        "mean_cis": round(df["congestion_impact_score"].mean(), 2),
        "date_range": {
            "start": str(df["date"].min()) if "date" in df.columns else "",
            "end": str(df["date"].max()) if "date" in df.columns else "",
        },
        "police_stations_count": df["police_station"].nunique(),
        "junctions_count": df[df["junction_name"] != "No Junction"]["junction_name"].nunique(),
    }


# ── Heatmap Data ──────────────────────────────────────────────────────────────

@app.get("/api/heatmap")
async def get_heatmap(hour: Optional[int] = None, limit: int = 50000):
    """
    Get heatmap points. Optional hour filter (0-23 IST).
    Returns [{lat, lon, intensity}, ...]
    """
    df = _state["df"]
    if df is None:
        return {"error": "Data not loaded"}
    
    if hour is not None and 0 <= hour <= 23:
        points = get_heatmap_by_hour(df, hour, sample_size=limit)
    else:
        points = _state["heatmap_points"] if _state["heatmap_points"] else get_heatmap_points(df, limit)
    
    return {"points": points, "count": len(points)}


# ── Hotspots ──────────────────────────────────────────────────────────────────

@app.get("/api/hotspots")
async def get_hotspots(
    limit: int = Query(50, ge=1, le=500),
    risk_level: Optional[str] = None,
):
    """Get ranked hotspot zones."""
    hotspots = _state["hotspots"]
    if hotspots is None or len(hotspots) == 0:
        return {"hotspots": [], "count": 0}
    
    result = hotspots.copy()
    if risk_level:
        result = result[result["risk_level"] == risk_level]
    
    result = result.head(limit)
    
    # Convert to records, handling list columns
    records = []
    for _, row in result.iterrows():
        record = row.to_dict()
        # Ensure lists are JSON-serializable
        for key in ["top_violations", "top_vehicles"]:
            if key in record and not isinstance(record[key], list):
                try:
                    record[key] = json.loads(record[key])
                except:
                    record[key] = []
        records.append(record)
    
    return {"hotspots": records, "count": len(records)}


# ── Station Analytics ─────────────────────────────────────────────────────────

@app.get("/api/stations")
async def get_stations(limit: int = Query(20, ge=1, le=100)):
    """Get per-station violation analytics."""
    stations = _state["station_analytics"]
    if stations is None:
        return {"stations": [], "count": 0}
    
    result = stations.head(limit).to_dict(orient="records")
    return {"stations": result, "count": len(result)}


# ── Temporal Analytics ────────────────────────────────────────────────────────

@app.get("/api/analytics/temporal")
async def get_temporal():
    """Get all temporal distribution data for charts."""
    analytics = _state["temporal_analytics"]
    if analytics is None:
        return {"error": "Analytics not computed"}
    return analytics


# ── Patrol Route ──────────────────────────────────────────────────────────────

class PatrolRequest(BaseModel):
    max_stops: int = 10
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    risk_filter: Optional[str] = None  # "critical", "high", etc.
    hour_filter: Optional[int] = None  # Filter hotspots by peak hour


@app.post("/api/patrol/optimize")
async def optimize_patrol(req: PatrolRequest):
    """Compute an optimized patrol route through top hotspots."""
    hotspots = _state["hotspots"]
    if hotspots is None or len(hotspots) == 0:
        return {"error": "No hotspots available"}
    
    # Convert to list of dicts
    hs_list = hotspots.to_dict(orient="records")
    
    # Apply filters
    if req.risk_filter:
        hs_list = [h for h in hs_list if h["risk_level"] == req.risk_filter]
    
    if req.hour_filter is not None:
        hs_list = [h for h in hs_list if h["peak_hour"] == req.hour_filter]
    
    # Ensure lists are proper Python lists
    for h in hs_list:
        for key in ["top_violations", "top_vehicles"]:
            if key in h and isinstance(h[key], str):
                try:
                    h[key] = json.loads(h[key])
                except:
                    h[key] = []
    
    result = optimize_patrol_route(
        hs_list,
        max_stops=req.max_stops,
        start_lat=req.start_lat,
        start_lon=req.start_lon,
    )
    
    return result


# ── Violation Trends by Station ───────────────────────────────────────────────

@app.get("/api/analytics/station/{station_name}")
async def get_station_detail(station_name: str):
    """Get detailed violation trends for a specific police station."""
    df = _state["df"]
    if df is None:
        return {"error": "Data not loaded"}
    
    station_df = df[df["police_station"] == station_name]
    if len(station_df) == 0:
        return {"error": f"Station '{station_name}' not found"}
    
    # Daily trend
    daily_trend = station_df.groupby("date").agg(
        count=("id", "count"),
        mean_cis=("congestion_impact_score", "mean"),
    ).reset_index()
    daily_trend["date"] = daily_trend["date"].astype(str)
    daily_trend["mean_cis"] = daily_trend["mean_cis"].round(2)
    
    # Hourly pattern
    hourly = station_df.groupby("hour_ist").size().reset_index(name="count")
    hourly.columns = ["hour", "count"]
    
    # Vehicle breakdown
    vehicles = station_df["vehicle_type"].value_counts().head(8).reset_index()
    vehicles.columns = ["type", "count"]
    
    return {
        "station": station_name,
        "total_violations": int(len(station_df)),
        "mean_cis": round(station_df["congestion_impact_score"].mean(), 2),
        "daily_trend": daily_trend.to_dict(orient="records"),
        "hourly_pattern": hourly.to_dict(orient="records"),
        "vehicle_breakdown": vehicles.to_dict(orient="records"),
    }


# ── Predictive Forecasting ────────────────────────────────────────────────────

@app.get("/api/predict/heatmap")
async def get_predicted_heatmap(
    target_hour: int = Query(..., ge=0, le=23),
    target_day: int = Query(..., ge=0, le=6),
    limit: int = Query(15000, ge=100, le=50000),
):
    """Get predicted heatmap for a future hour and day of week."""
    df = _state["df"]
    if df is None:
        return {"error": "Data not loaded"}
    
    result = predict_heatmap(df, target_hour, target_day, sample_size=limit)
    return result


@app.get("/api/predict/timeline")
async def get_timeline():
    """Get prediction timeline for the next 8 hours."""
    df = _state["df"]
    if df is None:
        return {"error": "Data not loaded"}
    
    timeline = get_prediction_timeline(df)
    return {"timeline": timeline}


# ── CCTV Simulation Data ─────────────────────────────────────────────────────

@app.get("/api/cctv/hotspot-locations")
async def get_cctv_locations():
    """Get top hotspot locations for CCTV camera placement simulation."""
    hotspots = _state["hotspots"]
    if hotspots is None or len(hotspots) == 0:
        return {"cameras": []}
    
    # Top 6 critical/high hotspots as camera locations
    top = hotspots.head(6)
    cameras = []
    for _, row in top.iterrows():
        cameras.append({
            "id": f"CAM-{int(row['rank']):03d}",
            "lat": row["center_lat"],
            "lon": row["center_lon"],
            "location": row["location_name"][:60] if row["location_name"] else row["dominant_junction"],
            "junction": row["dominant_junction"],
            "risk_level": row["risk_level"],
            "avg_violations_per_day": row["avg_daily_violations"],
            "peak_hour": row["peak_hour"],
        })
    
    return {"cameras": cameras}


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
