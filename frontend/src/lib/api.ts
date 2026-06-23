const API_BASE = 'http://localhost:8000/api';

// --- MOCK DATA FALLBACKS FOR VERCEL DEMO ---
const MOCK_KPI = {
  total_violations: 298445,
  police_stations_count: 54,
  critical_zones: 25,
  mean_cis: 3.53,
  top_junction: "BTP051 - Safina Plaza"
};

const MOCK_TEMPORAL = {
  hourly: [
    { hour: 0, count: 1200, mean_cis: 1.2 },
    { hour: 4, count: 800, mean_cis: 1.1 },
    { hour: 8, count: 15000, mean_cis: 3.4 },
    { hour: 12, count: 22000, mean_cis: 3.8 },
    { hour: 16, count: 28000, mean_cis: 4.1 },
    { hour: 20, count: 18000, mean_cis: 3.6 },
    { hour: 23, count: 4000, mean_cis: 1.8 }
  ],
  daily: [
    { day: "Monday", count: 42000 },
    { day: "Tuesday", count: 43500 },
    { day: "Wednesday", count: 45000 },
    { day: "Thursday", count: 46000 },
    { day: "Friday", count: 51000 },
    { day: "Saturday", count: 39000 },
    { day: "Sunday", count: 31945 }
  ]
};

const MOCK_HEATMAP = {
  points: [
    [12.9716, 77.5946, 1], [12.9352, 77.6245, 0.9], [12.9121, 77.6446, 0.8],
    [12.9569, 77.7011, 0.7], [12.9279, 77.6271, 0.85], [13.0285, 77.5895, 0.95],
    [12.9304, 77.5838, 0.88], [12.9781, 77.5753, 0.75]
  ]
};

const MOCK_HOTSPOTS = {
  hotspots: [
    { id: "HS-01", name: "Trinity Circle", lat: 12.9716, lng: 77.5946, risk_level: "CRITICAL", cis_score: 4.8 },
    { id: "HS-02", name: "Koramangala 80ft", lat: 12.9352, lng: 77.6245, risk_level: "HIGH", cis_score: 4.2 },
    { id: "HS-03", name: "Silk Board", lat: 12.9121, lng: 77.6446, risk_level: "CRITICAL", cis_score: 4.9 },
    { id: "HS-04", name: "Hebbal Flyover", lat: 13.0285, lng: 77.5895, risk_level: "HIGH", cis_score: 4.5 }
  ]
};

const MOCK_ROUTE = {
  route: MOCK_HOTSPOTS.hotspots,
  metrics: { total_distance_km: 18.5, estimated_time_mins: 65, cis_mitigated: 18.4 }
};

export async function fetchKPIs() {
  try {
    const res = await fetch(`${API_BASE}/kpi`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (e) {
    return MOCK_KPI; // Fallback for Vercel demo
  }
}

export async function fetchHeatmap(hour?: number) {
  try {
    const url = new URL(`${API_BASE}/heatmap`);
    if (hour !== undefined) url.searchParams.append('hour', hour.toString());
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (e) {
    return MOCK_HEATMAP;
  }
}

export async function fetchHotspots(limit: number = 50, riskLevel?: string) {
  try {
    const url = new URL(`${API_BASE}/hotspots`);
    url.searchParams.append('limit', limit.toString());
    if (riskLevel) url.searchParams.append('risk_level', riskLevel);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (e) {
    return MOCK_HOTSPOTS;
  }
}

export async function fetchTemporalAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/analytics/temporal`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (e) {
    return MOCK_TEMPORAL;
  }
}

export async function optimizePatrolRoute(data: { max_stops: number, start_lat?: number, start_lon?: number, risk_filter?: string, hour_filter?: number }) {
  try {
    const res = await fetch(`${API_BASE}/patrol/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (e) {
    return MOCK_ROUTE;
  }
}

export async function fetchPredictedHeatmap(targetHour: number, targetDay: number) {
  try {
    const url = new URL(`${API_BASE}/predict/heatmap`);
    url.searchParams.append('target_hour', targetHour.toString());
    url.searchParams.append('target_day', targetDay.toString());
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (e) {
    return MOCK_HEATMAP;
  }
}

export async function fetchPredictionTimeline() {
  try {
    const res = await fetch(`${API_BASE}/predict/timeline`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (e) {
    return {
      timeline: [
        { offset_hours: 0, target_hour: 12, target_day: 1, target_day_name: 'Mon', label: 'NOW', time_label: '12:00', expected_violations: 24500, avg_cis: 3.5, risk_level: 'high' },
        { offset_hours: 2, target_hour: 14, target_day: 1, target_day_name: 'Mon', label: '+2h', time_label: '14:00', expected_violations: 26000, avg_cis: 3.8, risk_level: 'high' },
        { offset_hours: 4, target_hour: 16, target_day: 1, target_day_name: 'Mon', label: '+4h', time_label: '16:00', expected_violations: 28000, avg_cis: 4.1, risk_level: 'critical' },
        { offset_hours: 6, target_hour: 18, target_day: 1, target_day_name: 'Mon', label: '+6h', time_label: '18:00', expected_violations: 22000, avg_cis: 3.9, risk_level: 'high' },
        { offset_hours: 8, target_hour: 20, target_day: 1, target_day_name: 'Mon', label: '+8h', time_label: '20:00', expected_violations: 18000, avg_cis: 3.6, risk_level: 'medium' }
      ]
    };
  }
}

export async function fetchCCTVLocations() {
  try {
    const res = await fetch(`${API_BASE}/cctv/hotspot-locations`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch (e) {
    return [
      { id: "CAM-001", lat: 12.9716, lng: 77.5946, name: "Trinity Circle" },
      { id: "CAM-002", lat: 12.9352, lng: 77.6245, name: "KR Market" }
    ];
  }
}
