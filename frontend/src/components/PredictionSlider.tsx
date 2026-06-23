'use client';

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, AlertTriangle, ChevronRight, Brain } from 'lucide-react';
import { fetchPredictedHeatmap, fetchPredictionTimeline } from '../lib/api';

interface PredictionSliderProps {
  onPredictedPoints?: (points: any[]) => void;
  onModeChange?: (isPredicting: boolean) => void;
}

interface TimelineStep {
  offset_hours: number;
  target_hour: number;
  target_day: number;
  target_day_name: string;
  label: string;
  time_label: string;
  expected_violations: number;
  avg_cis: number;
  risk_level: string;
}

const RISK_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export default function PredictionSlider({ onPredictedPoints, onModeChange }: PredictionSliderProps) {
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [selectedStep, setSelectedStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [isPredictionMode, setIsPredictionMode] = useState(false);

  // Load timeline on mount
  useEffect(() => {
    fetchPredictionTimeline()
      .then(data => {
        if (data.timeline) setTimeline(data.timeline);
      })
      .catch(err => {
        console.error('Failed to load timeline:', err);
        // Generate fallback timeline
        const now = new Date();
        const fallback: TimelineStep[] = [0, 2, 4, 6, 8].map(offset => {
          const target = new Date(now.getTime() + offset * 3600000);
          return {
            offset_hours: offset,
            target_hour: target.getHours(),
            target_day: target.getDay() === 0 ? 6 : target.getDay() - 1,
            target_day_name: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][target.getDay()],
            label: offset === 0 ? 'NOW' : `+${offset}h`,
            time_label: `${target.getHours().toString().padStart(2, '0')}:00`,
            expected_violations: Math.floor(100 + Math.random() * 200),
            avg_cis: 2 + Math.random() * 5,
            risk_level: offset > 4 ? 'high' : 'medium',
          };
        });
        setTimeline(fallback);
      });
  }, []);

  const handleStepSelect = async (index: number) => {
    if (index === selectedStep && isPredictionMode) return;
    
    setSelectedStep(index);
    const step = timeline[index];
    
    if (index === 0) {
      // "NOW" - switch back to live data
      setIsPredictionMode(false);
      onModeChange?.(false);
      onPredictedPoints?.([]);
      setPrediction(null);
      return;
    }

    setLoading(true);
    setIsPredictionMode(true);
    onModeChange?.(true);

    try {
      const data = await fetchPredictedHeatmap(step.target_hour, step.target_day);
      setPrediction(data);
      onPredictedPoints?.(data.points || []);
    } catch (err) {
      console.error('Prediction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (timeline.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <Brain size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Predictive Forecasting Engine
              {isPredictionMode && (
                <span style={{ fontSize: '0.65rem', background: '#a78bfa', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                  FORECASTING
                </span>
              )}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Statistical time-series model • Slide to see future hotspot predictions
            </p>
          </div>
        </div>
        {prediction && (
          <div style={{ 
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)',
            padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem',
          }}>
            Confidence: <strong style={{ color: '#a78bfa' }}>{(prediction.prediction_confidence * 100).toFixed(0)}%</strong>
          </div>
        )}
      </div>

      {/* Timeline Slider */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        {/* Progress bar background */}
        <div style={{ 
          position: 'absolute', top: '20px', left: '10%', right: '10%', height: '3px',
          background: 'rgba(255,255,255,0.1)', borderRadius: '2px',
        }}>
          <div style={{ 
            width: `${(selectedStep / (timeline.length - 1)) * 100}%`,
            height: '100%', background: 'linear-gradient(90deg, #3b82f6, #a78bfa)',
            borderRadius: '2px', transition: 'width 0.4s ease',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {timeline.map((step, i) => {
            const isSelected = i === selectedStep;
            const riskColor = RISK_COLORS[step.risk_level] || '#94a3b8';
            return (
              <button
                key={i}
                onClick={() => handleStepSelect(i)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  flex: 1,
                }}
              >
                {/* Dot */}
                <div style={{
                  width: isSelected ? '18px' : '12px',
                  height: isSelected ? '18px' : '12px',
                  borderRadius: '50%',
                  background: isSelected ? riskColor : 'rgba(255,255,255,0.2)',
                  border: isSelected ? `3px solid ${riskColor}40` : '2px solid transparent',
                  boxShadow: isSelected ? `0 0 12px ${riskColor}60` : 'none',
                  transition: 'all 0.3s ease',
                }} />

                {/* Label */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                  }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {step.time_label}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: riskColor, marginTop: '2px' }}>
                    {step.target_day_name}
                  </div>
                </div>

                {/* Stats under selected */}
                {isSelected && i > 0 && (
                  <div style={{ 
                    background: `${riskColor}15`, border: `1px solid ${riskColor}30`,
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem',
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ color: riskColor }}>~{step.expected_violations} violations</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prediction Details */}
      {isPredictionMode && prediction && !loading && (
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem',
          padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
          border: '1px solid rgba(167,139,250,0.15)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#a78bfa' }}>
              {prediction.expected_violations}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Expected Violations</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444' }}>
              {prediction.risk_summary?.critical || 0}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Critical Zones</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f97316' }}>
              {prediction.risk_summary?.high || 0}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>High Risk Zones</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#22c55e' }}>
              {(prediction.prediction_confidence * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Model Confidence</div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ 
          textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', 
          fontSize: '0.875rem', fontStyle: 'italic'
        }}>
          <div className="gradient-text" style={{ fontWeight: 600 }}>Computing prediction model...</div>
        </div>
      )}
    </div>
  );
}
