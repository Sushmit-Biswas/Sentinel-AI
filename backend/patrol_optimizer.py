"""
Patrol Route Optimizer — Given the top-N predicted hotspots,
computes an optimized patrol route using nearest-neighbor TSP heuristic.
"""

import math
from typing import Optional


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance between two GPS points in kilometers."""
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _build_distance_matrix(hotspots: list[dict]) -> list[list[float]]:
    """Build a distance matrix between all hotspot centers."""
    n = len(hotspots)
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            d = _haversine_km(
                hotspots[i]["center_lat"], hotspots[i]["center_lon"],
                hotspots[j]["center_lat"], hotspots[j]["center_lon"],
            )
            matrix[i][j] = d
            matrix[j][i] = d
    return matrix


def _nearest_neighbor_tsp(dist_matrix: list[list[float]], start: int = 0) -> tuple[list[int], float]:
    """
    Simple nearest-neighbor heuristic for TSP.
    Returns (ordered indices, total distance in km).
    """
    n = len(dist_matrix)
    if n <= 1:
        return list(range(n)), 0.0
    
    visited = [False] * n
    route = [start]
    visited[start] = True
    total_dist = 0.0
    
    current = start
    for _ in range(n - 1):
        nearest = -1
        nearest_dist = float("inf")
        for j in range(n):
            if not visited[j] and dist_matrix[current][j] < nearest_dist:
                nearest = j
                nearest_dist = dist_matrix[current][j]
        if nearest == -1:
            break
        route.append(nearest)
        visited[nearest] = True
        total_dist += nearest_dist
        current = nearest
    
    return route, round(total_dist, 2)


def optimize_patrol_route(
    hotspots: list[dict],
    max_stops: int = 15,
    start_lat: Optional[float] = None,
    start_lon: Optional[float] = None,
) -> dict:
    """
    Given a list of hotspot dicts (with center_lat, center_lon, etc.),
    compute an optimized patrol route.
    
    Args:
        hotspots: List of hotspot dicts from hotspot_engine
        max_stops: Maximum number of stops in the route
        start_lat/lon: Optional starting position (e.g., police station)
    
    Returns:
        {
            "route": [ordered list of hotspot dicts with visit order],
            "total_distance_km": float,
            "estimated_time_mins": float,
            "waypoints": [[lat, lon], ...],  # for map polyline
        }
    """
    if not hotspots:
        return {"route": [], "total_distance_km": 0, "estimated_time_mins": 0, "waypoints": []}
    
    # Take top-N by total_cis (they're already sorted)
    stops = hotspots[:max_stops]
    
    # If start position is given, prepend it as a virtual stop
    if start_lat is not None and start_lon is not None:
        start_stop = {
            "cluster_id": -1,
            "center_lat": start_lat,
            "center_lon": start_lon,
            "violation_count": 0,
            "total_cis": 0,
            "risk_level": "start",
            "dominant_junction": "Patrol Start",
            "location_name": "Starting Position",
        }
        stops = [start_stop] + stops
        start_idx = 0
    else:
        start_idx = 0
    
    # Build distance matrix and solve TSP
    dist_matrix = _build_distance_matrix(stops)
    route_order, total_dist = _nearest_neighbor_tsp(dist_matrix, start_idx)
    
    # Build ordered route
    ordered_route = []
    waypoints = []
    for visit_num, idx in enumerate(route_order):
        stop = stops[idx].copy()
        stop["visit_order"] = visit_num + 1
        ordered_route.append(stop)
        waypoints.append([stop["center_lat"], stop["center_lon"]])
    
    # Estimate time: avg 20 km/h in Bengaluru traffic + 10 min per stop for enforcement
    avg_speed_kmh = 20.0
    travel_time_mins = (total_dist / avg_speed_kmh) * 60
    enforcement_time_mins = len(ordered_route) * 10
    total_time_mins = round(travel_time_mins + enforcement_time_mins, 0)
    
    return {
        "route": ordered_route,
        "total_distance_km": total_dist,
        "estimated_time_mins": total_time_mins,
        "num_stops": len(ordered_route),
        "waypoints": waypoints,
    }


if __name__ == "__main__":
    # Test with sample hotspots
    sample_hotspots = [
        {"cluster_id": 1, "center_lat": 12.9771, "center_lon": 77.5772, "violation_count": 500, "total_cis": 1200, "risk_level": "critical", "dominant_junction": "Elite Junction", "location_name": "Gandhi Nagar"},
        {"cluster_id": 2, "center_lat": 12.9816, "center_lon": 77.6081, "violation_count": 450, "total_cis": 1100, "risk_level": "critical", "dominant_junction": "Safina Plaza", "location_name": "Shivaji Nagar"},
        {"cluster_id": 3, "center_lat": 12.9637, "center_lon": 77.5767, "violation_count": 400, "total_cis": 900, "risk_level": "high", "dominant_junction": "KR Market", "location_name": "City Market"},
        {"cluster_id": 4, "center_lat": 12.9340, "center_lon": 77.6898, "violation_count": 350, "total_cis": 850, "risk_level": "high", "dominant_junction": "ORR Kadubisanahalli", "location_name": "Outer Ring Road"},
        {"cluster_id": 5, "center_lat": 13.0082, "center_lon": 77.6940, "violation_count": 300, "total_cis": 700, "risk_level": "medium", "dominant_junction": "KR Puram", "location_name": "Devasandra"},
    ]
    
    result = optimize_patrol_route(sample_hotspots, max_stops=5)
    print(f"Route: {len(result['route'])} stops")
    print(f"Distance: {result['total_distance_km']} km")
    print(f"Est. Time: {result['estimated_time_mins']} mins")
    for stop in result["route"]:
        print(f"  #{stop['visit_order']}: {stop['dominant_junction']} ({stop['risk_level']})")
