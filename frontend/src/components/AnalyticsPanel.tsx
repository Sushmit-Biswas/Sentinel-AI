'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface AnalyticsProps {
  temporalData: any;
}

export default function AnalyticsPanel({ temporalData }: AnalyticsProps) {
  if (!temporalData) return <div className="glass-panel p-6">Loading Analytics...</div>;

  const { hourly, daily } = temporalData;

  const formattedHourly = hourly.map((d: any) => ({
    time: `${d.hour}:00`,
    violations: d.count,
    impact: d.mean_cis
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.9)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)', 
          padding: '12px', 
          borderRadius: '12px', 
          color: '#fff',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 600, fontSize: '0.85rem', color: '#94a3b8' }}>{label}</p>
          <p style={{ margin: 0, color: '#60a5fa', fontSize: '1.2rem', fontWeight: 700 }}>
            {payload[0].value.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>violations</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
      
      {/* Hourly Trend Chart */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>Hourly Violation Density (IST)</h3>
        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedHourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v > 1000 ? `${(v/1000).toFixed(0)}k` : v} dx={-10} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="violations" stroke="#60a5fa" strokeWidth={3} fillOpacity={1} fill="url(#colorViolations)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day of Week Chart */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>Violations by Day</h3>
        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradientBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6}/>
                </linearGradient>
                <linearGradient id="barGradientPurple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#9333ea" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v.substring(0,3)} dy={10} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v > 1000 ? `${(v/1000).toFixed(0)}k` : v} dx={-10} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {daily.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.day === 'Sunday' || entry.day === 'Saturday' ? 'url(#barGradientPurple)' : 'url(#barGradientBlue)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', borderRadius: '50%' }}></div> Weekday
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', background: 'linear-gradient(135deg, #c084fc, #9333ea)', borderRadius: '50%' }}></div> Weekend
          </div>
        </div>
      </div>

    </div>
  );
}
