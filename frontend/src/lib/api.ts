const API_BASE = 'http://localhost:8000/api';

export async function fetchKPIs() {
  const res = await fetch(`${API_BASE}/kpi`);
  if (!res.ok) throw new Error('Failed to fetch KPIs');
  return res.json();
}

export async function fetchHeatmap(hour?: number) {
  const url = new URL(`${API_BASE}/heatmap`);
  if (hour !== undefined) url.searchParams.append('hour', hour.toString());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch heatmap data');
  return res.json();
}

export async function fetchHotspots(limit: number = 50, riskLevel?: string) {
  const url = new URL(`${API_BASE}/hotspots`);
  url.searchParams.append('limit', limit.toString());
  if (riskLevel) url.searchParams.append('risk_level', riskLevel);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch hotspots');
  return res.json();
}

export async function fetchTemporalAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/temporal`);
  if (!res.ok) throw new Error('Failed to fetch temporal analytics');
  return res.json();
}

export async function optimizePatrolRoute(data: { max_stops: number, start_lat?: number, start_lon?: number, risk_filter?: string, hour_filter?: number }) {
  const res = await fetch(`${API_BASE}/patrol/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to optimize patrol route');
  return res.json();
}

// ── New: Prediction API ──────────────────────────────────────────────────────

export async function fetchPredictedHeatmap(targetHour: number, targetDay: number) {
  const url = new URL(`${API_BASE}/predict/heatmap`);
  url.searchParams.append('target_hour', targetHour.toString());
  url.searchParams.append('target_day', targetDay.toString());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch predicted heatmap');
  return res.json();
}

export async function fetchPredictionTimeline() {
  const res = await fetch(`${API_BASE}/predict/timeline`);
  if (!res.ok) throw new Error('Failed to fetch prediction timeline');
  return res.json();
}

// ── New: CCTV Simulation API ─────────────────────────────────────────────────

export async function fetchCCTVLocations() {
  const res = await fetch(`${API_BASE}/cctv/hotspot-locations`);
  if (!res.ok) throw new Error('Failed to fetch CCTV locations');
  return res.json();
}
