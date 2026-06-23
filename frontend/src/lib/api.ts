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
    { lat: 12.9716, lon: 77.5946, intensity: 80 }, 
    { lat: 12.9352, lon: 77.6245, intensity: 70 }, 
    { lat: 12.9121, lon: 77.6446, intensity: 90 },
    { lat: 12.9569, lon: 77.7011, intensity: 65 }, 
    { lat: 12.9279, lon: 77.6271, intensity: 85 }, 
    { lat: 13.0285, lon: 77.5895, intensity: 95 },
    { lat: 12.9304, lon: 77.5838, intensity: 75 }, 
    { lat: 12.9781, lon: 77.5753, intensity: 60 }
  ]
};

const MOCK_HOTSPOTS = {
  hotspots: [
    { id: "HS-01", dominant_junction: "Trinity Circle", location_name: "MG Road", center_lat: 12.9716, center_lon: 77.5946, risk_level: "critical", cis_score: 4.8, violation_count: 1450, total_cis: 3450, mean_cis: 4.8, peak_hour: 18 },
    { id: "HS-02", dominant_junction: "Koramangala 80ft", location_name: "Sony Signal", center_lat: 12.9352, center_lon: 77.6245, risk_level: "high", cis_score: 4.2, violation_count: 850, total_cis: 2100, mean_cis: 4.2, peak_hour: 20 },
    { id: "HS-03", dominant_junction: "Silk Board", location_name: "ORR", center_lat: 12.9121, center_lon: 77.6446, risk_level: "critical", cis_score: 4.9, violation_count: 2200, total_cis: 5100, mean_cis: 4.9, peak_hour: 9 },
    { id: "HS-04", dominant_junction: "Hebbal Flyover", location_name: "Bellary Rd", center_lat: 13.0285, center_lon: 77.5895, risk_level: "high", cis_score: 4.5, violation_count: 1100, total_cis: 2800, mean_cis: 4.5, peak_hour: 17 }
  ]
};

const MOCK_ROUTE = {
  route: MOCK_HOTSPOTS.hotspots,
  metrics: { total_distance_km: 18.5, estimated_time_mins: 65, cis_mitigated: 18.4 }
};

export async function fetchKPIs() {
  return MOCK_KPI;
}

export async function fetchHeatmap(hour?: number) {
  return MOCK_HEATMAP;
}

export async function fetchHotspots(limit: number = 50, riskLevel?: string) {
  return MOCK_HOTSPOTS;
}

export async function fetchTemporalAnalytics() {
  return MOCK_TEMPORAL;
}

export async function optimizePatrolRoute(data: { max_stops: number, start_lat?: number, start_lon?: number, risk_filter?: string, hour_filter?: number }) {
  return MOCK_ROUTE;
}

export async function fetchPredictedHeatmap(targetHour: number, targetDay: number) {
  return MOCK_HEATMAP;
}

export async function fetchPredictionTimeline() {
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

export async function fetchCCTVLocations() {
  return [
    { id: "CAM-001", lat: 12.9716, lng: 77.5946, name: "Trinity Circle" },
    { id: "CAM-002", lat: 12.9352, lng: 77.6245, name: "KR Market" }
  ];
}
