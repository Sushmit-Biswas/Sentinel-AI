'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface ScoutReport {
  id: string;
  location: string;
  timestamp: string;
  reporterId: string;
  trustScore: number;
  imageUrl: string;
  status: 'verifying' | 'verified' | 'rejected';
}

const MOCK_REPORTS: ScoutReport[] = [
  { id: 'SCT-891', location: 'Indiranagar 100ft Rd', timestamp: 'Just now', reporterId: 'FK-Scout-442', trustScore: 94, imageUrl: 'https://images.unsplash.com/photo-1566311894981-67808269557b?auto=format&fit=crop&q=80&w=200&h=150', status: 'verifying' },
  { id: 'SCT-890', location: 'Koramangala 80ft Rd', timestamp: '5m ago', reporterId: 'FK-Scout-109', trustScore: 88, imageUrl: 'https://images.unsplash.com/photo-1616428784180-2d8ebdf394e2?auto=format&fit=crop&q=80&w=200&h=150', status: 'verified' },
  { id: 'SCT-889', location: 'MG Road Metro', timestamp: '12m ago', reporterId: 'FK-Scout-771', trustScore: 99, imageUrl: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&q=80&w=200&h=150', status: 'verified' },
];

export default function CitizenReportsFeed() {
  const [reports, setReports] = useState<ScoutReport[]>(MOCK_REPORTS);

  useEffect(() => {
    // Simulate incoming scout reports
    const interval = setInterval(() => {
      setReports(prev => {
        const newReport = { ...prev[prev.length - 1], id: `SCT-${Math.floor(Math.random() * 1000)}`, timestamp: 'Just now', status: 'verifying' as const };
        const updatedPrev = prev.map(p => p.timestamp === 'Just now' ? { ...p, timestamp: '1m ago', status: 'verified' as const } : p);
        return [newReport, ...updatedPrev].slice(0, 4);
      });
    }, 45000); // New report every 45s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserCheck size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Flipkart Scout Feed</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Crowdsourced Violation Reports</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', animation: 'pulse 2s infinite' }} />
          Live Sync
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
        {reports.map(report => (
          <div key={report.id} style={{ 
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px', padding: '1rem', display: 'flex', gap: '1rem',
            position: 'relative', overflow: 'hidden'
          }}>
            <img src={report.imageUrl} alt="Violation" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{report.location}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{report.timestamp}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><UserCheck size={12} /> {report.reporterId}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: report.trustScore > 90 ? '#22c55e' : '#eab308' }}>
                  <ShieldCheck size={12} /> Trust: {report.trustScore}%
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
                  background: report.status === 'verified' ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)',
                  color: report.status === 'verified' ? '#22c55e' : '#c084fc',
                  border: `1px solid ${report.status === 'verified' ? 'rgba(34,197,94,0.2)' : 'rgba(168,85,247,0.2)'}`
                }}>
                  {report.status === 'verified' ? 'YOLO Verified' : 'AI Verifying...'}
                </span>
                {report.status === 'verified' && (
                  <span style={{ fontSize: '0.65rem', color: '#3b82f6' }}>→ Added to Heatmap</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
