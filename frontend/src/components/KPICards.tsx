import React from 'react';
import { AlertOctagon, Car, Activity, MapPin, Clock, Download, Leaf } from 'lucide-react';

interface KPIProps {
  data: any;
}

export default function KPICards({ data }: KPIProps) {
  if (!data) return <div className="glass-panel p-6">Loading KPIs...</div>;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Real-time Intelligence</h3>
          <span style={{ 
            fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', 
            padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' 
          }}>
            Dynamic Surge Fining Active
          </span>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
          color: '#3b82f6', padding: '0.5rem 1rem', borderRadius: '8px',
          fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} onClick={() => alert('Exporting Daily BTP Briefing (PDF) & ASTraM Data Sync...')}>
          <Download size={16} />
          Export BTP Briefing
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1.5rem' }}>
      <div className="glass-card p-4 flex flex-col justify-between" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Total Violations</span>
          <Car size={20} color="var(--accent-primary)" />
        </div>
        <div>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>{data.total_violations.toLocaleString()}</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Across {data.police_stations_count} stations
          </div>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col justify-between" style={{ borderLeft: '4px solid var(--critical)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Critical Hotspots</span>
          <AlertOctagon size={20} color="var(--critical)" />
        </div>
        <div>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>{data.critical_zones}</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--critical)', marginTop: '0.5rem' }}>
            Requires immediate attention
          </div>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col justify-between" style={{ borderLeft: '4px solid var(--medium)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Avg. Impact Score</span>
          <Activity size={20} color="var(--medium)" />
        </div>
        <div className="tooltip-container">
          <h2 style={{ fontSize: '2rem', margin: 0 }}>{data.mean_cis}</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Congestion Impact Score (CIS)
          </div>
          {/* Action 5: CIS Score Breakdown Tooltip */}
          <div className="tooltip-content glass-panel" style={{ width: '220px', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '10px', fontSize: '0.8rem', zIndex: 10 }}>
            <div style={{ fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '4px' }}>CIS Formula Breakdown</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Violation Load (VLS)</span><span>30%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Obstruction (COS)</span><span>20%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Excess Delay (ECS)</span><span>35%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Recurrence (RPS)</span><span>15%</span></div>
          </div>
        </div>
      </div>

      {/* Action 1: Vehicle-Hours Delay KPI */}
      <div className="glass-card p-4 flex flex-col justify-between" style={{ borderLeft: '4px solid var(--high)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Vehicle-Hours Lost</span>
          <Clock size={20} color="var(--high)" />
        </div>
        <div>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>{Math.floor(data.total_violations * 0.45).toLocaleString()}h</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Cumulative delay impact today
          </div>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col justify-between" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Worst Junction</span>
          <MapPin size={20} color="var(--accent-primary)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: '0.5rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={data.top_junction}>
            {data.top_junction}
          </h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Highest violation density
          </div>
        </div>
      </div>

      {/* New Environmental KPI */}
      <div className="glass-card p-4 flex flex-col justify-between" style={{ borderLeft: '4px solid #10b981' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>CO₂ Emissions</span>
          <Leaf size={20} color="#10b981" />
        </div>
        <div>
          <h2 style={{ fontSize: '2rem', margin: 0 }}>{Math.floor(data.total_violations * 0.45 * 2.3).toLocaleString()} <span style={{fontSize: '1rem'}}>kg</span></h2>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.5rem' }}>
            Excess idling emissions
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
