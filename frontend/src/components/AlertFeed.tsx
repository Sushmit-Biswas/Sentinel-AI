'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, MessageSquare, ExternalLink, Volume2, VolumeX, Phone, AlertCircle, MapPin, Car, IndianRupee, CheckSquare, User } from 'lucide-react';
import { type FieldAlert, getPriorityColor, getPriorityBg } from '../lib/alert-engine';

interface AlertFeedProps {
  alerts: FieldAlert[];
  onAcknowledge?: (alertId: string) => void;
}

export default function AlertFeed({ alerts, onAcknowledge }: AlertFeedProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Auto-scroll on new alert
  useEffect(() => {
    if (alerts.length > prevCountRef.current && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
    prevCountRef.current = alerts.length;
  }, [alerts.length]);

  // Simple notification sound
  useEffect(() => {
    if (alerts.length > 0 && soundEnabled && alerts.length > prevCountRef.current - 1) {
      // We'd play a sound here in production
    }
  }, [alerts.length, soundEnabled]);

  const p0Alerts = alerts.filter(a => a.priority === 'P0' && !a.acknowledged);
  const activeAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '10px', 
            background: p0Alerts.length > 0 
              ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
              : 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: p0Alerts.length > 0 ? 'pulse 1.5s infinite' : 'none',
          }}>
            <Bell size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Field Alert System
              {p0Alerts.length > 0 && (
                <span style={{ 
                  fontSize: '0.65rem', background: '#ef4444', color: '#fff', 
                  padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                  animation: 'pulse 1.5s infinite',
                }}>
                  {p0Alerts.length} CRITICAL
                </span>
              )}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Real-time notifications to field officers • WhatsApp Business API Integration
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            padding: '4px 12px', borderRadius: '6px', fontSize: '0.7rem',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            Active: <strong style={{ color: '#f97316' }}>{activeAlerts.length}</strong> / {alerts.length}
          </div>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: soundEnabled ? '#22c55e' : '#94a3b8' }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Alert Feed */}
      <div 
        ref={feedRef}
        style={{ 
          maxHeight: '380px', overflowY: 'auto', 
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
        }}
      >
        {alerts.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)',
            fontSize: '0.875rem',
          }}>
            <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <div>No alerts yet. Enable CCTV Vision Engine to start receiving field alerts.</div>
          </div>
        ) : (
          alerts.slice(0, 15).map((alert, idx) => {
            const priorityColor = getPriorityColor(alert.priority);
            const priorityBg = getPriorityBg(alert.priority);
            const isExpanded = expanded === alert.id;
            
            return (
              <div 
                key={alert.id}
                style={{ 
                  background: priorityBg,
                  borderRadius: '10px', 
                  border: `1px solid ${priorityColor}25`,
                  overflow: 'hidden',
                  animation: idx === 0 ? 'fadeInSlide 0.4s ease' : 'none',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                }}
              >
                {/* Alert Header */}
                <div 
                  onClick={() => setExpanded(isExpanded ? null : alert.id)}
                  style={{ 
                    padding: '0.75rem 1rem', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                      <span style={{ 
                        fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                        background: priorityColor, padding: '1px 6px', borderRadius: '3px',
                      }}>
                        {alert.priority}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{alert.title}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {alert.message}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', marginLeft: '1rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {alert.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>
                    {!alert.acknowledged ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onAcknowledge?.(alert.id); }}
                        style={{ 
                          background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                          color: '#22c55e', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer',
                          fontSize: '0.6rem', fontWeight: 600, whiteSpace: 'nowrap',
                        }}
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.6rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <CheckCircle size={10} /> Done
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details — WhatsApp Preview */}
                {isExpanded && (
                  <div style={{ 
                    padding: '0 1rem 0.75rem 1rem',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ 
                      marginTop: '0.75rem', background: '#1a2e1a', borderRadius: '8px',
                      border: '1px solid rgba(34,197,94,0.2)', padding: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <MessageSquare size={12} color="#22c55e" />
                        <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600 }}>
                          WhatsApp Business • Field Officer Notification
                        </span>
                      </div>
                      <div style={{ 
                        background: '#0a1a0a', borderRadius: '6px', padding: '10px',
                        fontSize: '0.72rem', lineHeight: 1.6,
                        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, marginBottom: '4px' }}>
                          <AlertCircle size={12} color="#ef4444" /> *BTP Gridlock Alert — {alert.priority}*
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ddd' }}>
                          <MapPin size={12} /> *Location:* {alert.location}
                        </div>
                        {alert.vehiclePlate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ddd' }}>
                            <Car size={12} /> *Vehicle:* {alert.vehiclePlate}
                          </div>
                        )}
                        {alert.suggestedFine && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ddd' }}>
                            <IndianRupee size={12} /> *Surge Fine:* ₹{alert.suggestedFine?.toLocaleString()}
                          </div>
                        )}
                        {alert.flowImpact && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                            <AlertTriangle size={12} color="#ef4444" /> *Flow Impact:* -{alert.flowImpact}% lane capacity
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                          <CheckSquare size={12} /> *Action:* {alert.actionRequired}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', marginTop: '4px' }}>
                          <User size={12} /> *Assigned:* {alert.officer}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '8px' }}>
                        <button style={{ 
                          flex: 1, background: '#22c55e', color: '#fff', border: 'none',
                          padding: '6px', borderRadius: '4px', cursor: 'pointer',
                          fontSize: '0.65rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}>
                          <Phone size={10} /> Call Officer
                        </button>
                        <button 
                          onClick={() => window.alert('Map panning is simulated in this prototype. Live GPS tracking integration pending for production.')}
                          style={{ 
                          flex: 1, background: 'rgba(59,130,246,0.2)', color: '#3b82f6', 
                          border: '1px solid rgba(59,130,246,0.3)',
                          padding: '6px', borderRadius: '4px', cursor: 'pointer',
                          fontSize: '0.65rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}>
                          <ExternalLink size={10} /> View on Map
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
