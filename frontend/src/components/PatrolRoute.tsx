'use client';

import React, { useState } from 'react';
import { optimizePatrolRoute } from '../lib/api';
import { Navigation, Clock, Search, Download } from 'lucide-react';

export default function PatrolRoute() {
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [stops, setStops] = useState(10);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const data = await optimizePatrolRoute({
        max_stops: stops,
        risk_filter: 'critical' // default to critical for now
      });
      setRouteData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!routeData) return;
    const headers = ['Order', 'Junction', 'Location', 'Risk Level', 'Violations', 'CIS Score'];
    const rows = routeData.route.map((stop: any) => [
      stop.visit_order,
      `"${stop.dominant_junction}"`,
      `"${stop.location_name}"`,
      stop.risk_level.toUpperCase(),
      stop.violation_count,
      stop.total_cis
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map((r: any) => r.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `astram_patrol_schedule_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="glass-panel p-6" style={{ marginTop: '1.5rem' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Navigation size={20} color="var(--accent-primary)" />
            AI Patrol Route Optimizer
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Generates the most efficient route through high-risk congestion zones using TSP heuristics.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Stops:
            <select 
              value={stops} 
              onChange={(e) => setStops(Number(e.target.value))}
              style={{ marginLeft: '0.5rem', background: '#1e2235', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}
            >
              <option value={5}>5 Zones</option>
              <option value={10}>10 Zones</option>
              <option value={15}>15 Zones</option>
            </select>
          </label>
          <button 
            onClick={handleOptimize}
            disabled={loading}
            style={{
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Optimizing...' : 'Generate Route Plan'}
          </button>
        </div>
      </div>

      {routeData && (
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Navigation size={18} color="var(--text-secondary)" />
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{routeData.total_distance_km} km</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={18} color="var(--text-secondary)" />
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>~{routeData.estimated_time_mins} mins</span>
              </div>
              <div className="flex items-center gap-2">
                <Search size={18} color="var(--text-secondary)" />
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{routeData.num_stops} Hotspots</span>
              </div>
            </div>
            
            <div style={{ marginTop: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', color: 'var(--low)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Causal Inference ROI</span>
                <span style={{ color: '#fff', fontSize: '0.875rem' }}>Est. Flow Delay Prevented: <strong style={{ color: 'var(--low)' }}>{Math.round(routeData.route.reduce((acc: any, stop: any) => acc + stop.total_cis, 0) * 0.15)} Hours</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleExportCSV}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={14} /> Export CSV
                </button>
                <button style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                  Dispatch Ghost Patrol
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
            {routeData.route.map((stop: any, idx: number) => (
              <div key={idx} className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid var(--${stop.risk_level === 'critical' ? 'critical' : 'high'})` }}>
                <div className="flex justify-between items-start">
                  <div style={{ background: 'rgba(255,255,255,0.1)', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    {stop.visit_order}
                  </div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: `var(--${stop.risk_level === 'critical' ? 'critical' : 'high'})`, fontWeight: 600, background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '10px' }}>
                    {stop.risk_level}
                  </span>
                </div>
                <h4 style={{ margin: '0.5rem 0', fontSize: '1rem' }}>{stop.dominant_junction}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stop.location_name}
                </p>
                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#60a5fa' }}>
                  <strong>{stop.violation_count}</strong> Violations (CIS: {stop.total_cis})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
