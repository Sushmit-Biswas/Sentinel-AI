'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Target, BarChart2, Cpu, Sparkles, Map } from 'lucide-react';
import { fetchKPIs, fetchHeatmap, fetchHotspots, fetchTemporalAnalytics } from '../lib/api';
import { type FieldAlert } from '../lib/alert-engine';
import KPICards from '../components/KPICards';
import AnalyticsPanel from '../components/AnalyticsPanel';
import PatrolRoute from '../components/PatrolRoute';
import CCTVPanel from '../components/CCTVPanel';
import PredictionSlider from '../components/PredictionSlider';
import ResourceSimulator from '../components/ResourceSimulator';
import AlertFeed from '../components/AlertFeed';
import CitizenReportsFeed from '../components/CitizenReportsFeed';

// Dynamically import HeatMap to avoid SSR issues with Leaflet
const HeatMap = dynamic(() => import('../components/HeatMap'), { ssr: false });

export default function Dashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [liveHeatmapPoints, setLiveHeatmapPoints] = useState<any[]>([]); // Store original for switching back
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [temporalData, setTemporalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<FieldAlert[]>([]);
  const [detectionCount, setDetectionCount] = useState(0);
  const [isPredictionMode, setIsPredictionMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'simulator'>('overview');

  useEffect(() => {
    async function loadData() {
      try {
        const [kpiData, heatData, hotspotData, temporal] = await Promise.all([
          fetchKPIs(),
          fetchHeatmap(undefined), // all hours
          fetchHotspots(50),       // top 50
          fetchTemporalAnalytics()
        ]);
        
        setKpis(kpiData);
        setHeatmapPoints(heatData.points);
        setLiveHeatmapPoints(heatData.points);
        setHotspots(hotspotData.hotspots);
        setTemporalData(temporal);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Handlers for CCTV → Alert integration
  const handleNewAlert = useCallback((alert: FieldAlert) => {
    setAlerts(prev => [alert, ...prev].slice(0, 50));
  }, []);

  const handleAcknowledge = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  }, []);

  // Handler for prediction mode
  const handlePredictedPoints = useCallback((points: any[]) => {
    if (points.length > 0) {
      setHeatmapPoints(points);
    } else {
      setHeatmapPoints(liveHeatmapPoints);
    }
  }, [liveHeatmapPoints]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '1.5rem' }}>
        <div style={{ 
          width: '60px', height: '60px', borderRadius: '50%',
          border: '3px solid rgba(59,130,246,0.2)',
          borderTop: '3px solid #3b82f6',
          animation: 'spin 1s linear infinite',
        }} />
        <div className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
          Initializing Command Center...
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Processing 298,000+ violation records
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
      
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem',
      }}>
        {[
          { id: 'overview' as const, label: 'Command Center', icon: Target, desc: 'Live monitoring & CCTV' },
          { id: 'analytics' as const, label: 'Deep Analytics', icon: BarChart2, desc: 'Patterns & predictions' },
          { id: 'simulator' as const, label: 'Digital Twin', icon: Cpu, desc: 'Resource simulation' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
              border: `1px solid ${activeTab === tab.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '10px', padding: '0.75rem 1.25rem',
              cursor: 'pointer', color: activeTab === tab.id ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <tab.icon size={16} color={activeTab === tab.id ? '#fff' : 'var(--text-secondary)'} />
              {tab.label}
            </div>
            <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '2px', paddingLeft: '1.5rem' }}>{tab.desc}</div>
          </button>
        ))}
        
        {/* Live stats in tab bar */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {detectionCount > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>AI Detections</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{detectionCount}</div>
            </div>
          )}
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Active Alerts</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f97316' }}>
                {alerts.filter(a => !a.acknowledged).length}
              </div>
            </div>
          )}
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px',
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 500 }}>System Online</span>
          </div>
        </div>
      </div>

      {/* ═══ TAB: COMMAND CENTER ═══ */}
      {activeTab === 'overview' && (
        <>
          {/* 1. KPIs */}
          <KPICards data={kpis} />
          
          {/* 2. CCTV Vision Engine */}
          <CCTVPanel 
            onAlert={handleNewAlert}
            onDetectionCount={setDetectionCount}
          />

          {/* 3. Map & Prediction */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isPredictionMode ? (
                  <><Sparkles size={20} color="#a78bfa" /> Predicted Congestion Heatmap</>
                ) : (
                  <><Map size={20} color="var(--accent-primary)" /> Live Congestion Heatmap</>
                )}
                {isPredictionMode && (
                  <span style={{ 
                    fontSize: '0.65rem', background: '#a78bfa', color: '#fff', 
                    padding: '2px 8px', borderRadius: '10px', fontWeight: 600 
                  }}>
                    FORECAST MODE
                  </span>
                )}
              </h2>
            </div>
            <PredictionSlider 
              onPredictedPoints={handlePredictedPoints}
              onModeChange={setIsPredictionMode}
            />
            <HeatMap points={heatmapPoints} hotspots={hotspots} />
          </div>

          {/* 4. Feeds Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <AlertFeed alerts={alerts} onAcknowledge={handleAcknowledge} />
            <CitizenReportsFeed />
          </div>
        </>
      )}

      {/* ═══ TAB: ANALYTICS ═══ */}
      {activeTab === 'analytics' && (
        <>
          <KPICards data={kpis} />
          <AnalyticsPanel temporalData={temporalData} />
          <PatrolRoute />
        </>
      )}

      {/* ═══ TAB: DIGITAL TWIN ═══ */}
      {activeTab === 'simulator' && (
        <>
          <KPICards data={kpis} />
          <ResourceSimulator hotspots={hotspots} />
          <PatrolRoute />
        </>
      )}

    </div>
  );
}
