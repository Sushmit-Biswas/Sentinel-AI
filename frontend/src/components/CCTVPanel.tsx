'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Eye, Radio, MapPin, Car, Truck, Bike } from 'lucide-react';
import { generateDetectionEvent, formatTimestamp, formatCurrency, type DetectionEvent } from '../lib/cctv-simulator';
import { createAlertFromDetection, type FieldAlert } from '../lib/alert-engine';

interface CCTVPanelProps {
  onAlert?: (alert: FieldAlert) => void;
  onDetectionCount?: (count: number) => void;
}

// Each camera has a unique location and VIDEO feed (looping MP4)
const CAMERA_FEEDS = [
  { id: 'CAM-001', location: 'MG Road / Trinity Circle', junction: 'Trinity Circle', video: '/cctv/traffic1.mp4', poster: '/cctv/cam2.png' },
  { id: 'CAM-002', location: 'KR Market Main Gate', junction: 'KR Market', video: '/cctv/traffic2.mp4', poster: '/cctv/cam1.png' },
  { id: 'CAM-003', location: 'Silk Board Junction', junction: 'Silk Board', video: '/cctv/traffic3.mp4', poster: '/cctv/cam3.png' },
  { id: 'CAM-004', location: 'Indiranagar Metro Station', junction: 'CMH Road', video: '/cctv/traffic4.mp4', poster: '/cctv/cam4.png' },
  { id: 'CAM-005', location: 'Koramangala 80ft Road', junction: 'Sony Signal', video: '/cctv/traffic5.mp4', poster: '/cctv/cam5.png' },
  { id: 'CAM-006', location: 'Hebbal Flyover Entry', junction: 'Hebbal', video: '/cctv/traffic6.mp4', poster: '/cctv/cam6.png' },
];

// Per-camera violation counts (start different so they look independent)
const cameraViolationCounts: Record<string, number> = {};
CAMERA_FEEDS.forEach((c, i) => { cameraViolationCounts[c.id] = Math.floor(3 + i * 2 + Math.random() * 5); });

export default function CCTVPanel({ onAlert, onDetectionCount }: CCTVPanelProps) {
  const [selectedCamera, setSelectedCamera] = useState(0);
  const [detections, setDetections] = useState<DetectionEvent[]>([]);
  const [totalDetections, setTotalDetections] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [scanLine, setScanLine] = useState(0);
  const [camCounts, setCamCounts] = useState<Record<string, number>>({ ...cameraViolationCounts });
  const [activeCams, setActiveCams] = useState<Set<string>>(new Set());
  const [boundingBoxes, setBoundingBoxes] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set playback speed and smooth bounding boxes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = selectedCamera === 1 ? 0.4 : 0.75;
    }

    const boxInterval = setInterval(() => {
      const numBoxes = Math.floor(Math.random() * 3) + 2; // 2 to 4 boxes
      const boxes = [];
      for(let i=0; i<numBoxes; i++) {
        // Keep them smaller and in the lower-mid region
        boxes.push({
          id: i, // Use stable IDs for smooth CSS transitions
          x: 20 + Math.random() * 60, // 20% to 80% left
          y: 50 + Math.random() * 30, // 50% to 80% top
          w: 4 + Math.random() * 8, // 4% to 12% width
          h: 6 + Math.random() * 12, // 6% to 18% height
          label: Math.random() > 0.8 ? 'TRUCK' : (Math.random() > 0.6 ? 'M-CYCLE' : 'CAR'),
          conf: (0.7 + Math.random() * 0.29).toFixed(2)
        });
      }
      setBoundingBoxes(boxes);
    }, 2000);

    return () => clearInterval(boxInterval);
  }, [selectedCamera]);

  // Generate detections from ROTATING cameras (not just selected one)
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Pick a camera — 60% chance it's the selected one, 40% chance another
      const useSelected = Math.random() < 0.6;
      const camIdx = useSelected ? selectedCamera : Math.floor(Math.random() * CAMERA_FEEDS.length);
      const cam = CAMERA_FEEDS[camIdx];
      const event = generateDetectionEvent(cam.id, cam.location);

      setDetections(prev => [event, ...prev].slice(0, 30));
      setTotalDetections(prev => {
        const newCount = prev + 1;
        onDetectionCount?.(newCount);
        return newCount;
      });

      // Update per-camera count
      setCamCounts(prev => ({ ...prev, [cam.id]: (prev[cam.id] || 0) + 1 }));

      // Flash the camera as "active"
      setActiveCams(prev => {
        const next = new Set(prev);
        next.add(cam.id);
        return next;
      });
      setTimeout(() => {
        setActiveCams(prev => {
          const next = new Set(prev);
          next.delete(cam.id);
          return next;
        });
      }, 2000);

      // Generate alert for high severity — but less frequently
      if ((event.severity.level === 'CRITICAL' && Math.random() < 0.5) || 
          (event.severity.level === 'HIGH' && Math.random() < 0.25)) {
        const alert = createAlertFromDetection(event);
        onAlert?.(alert);
      }
    }, 4000 + Math.random() * 2000); // 4-6 seconds between detections

    return () => clearInterval(interval);
  }, [isLive, selectedCamera, onAlert, onDetectionCount]);

  const cam = CAMERA_FEEDS[selectedCamera];
  const selectedCamDetections = detections.filter(d => d.cameraId === cam.id);



  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <Eye size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              AI Vision Engine
              <span style={{ 
                fontSize: '0.6rem', background: isLive ? '#22c55e' : '#94a3b8', 
                color: '#fff', padding: '2px 8px', borderRadius: '10px',
                animation: isLive ? 'pulse 2s infinite' : 'none',
                fontWeight: 600
              }}>
                {isLive ? '● LIVE' : '○ PAUSED'}
              </span>
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
              YOLOv8 Parking Violation Detection • {CAMERA_FEEDS.length} Camera Feeds
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>{totalDetections}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Total Detections</div>
          </div>
          <button 
            onClick={() => setIsLive(!isLive)}
            style={{ 
              background: isLive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              border: `1px solid ${isLive ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              color: isLive ? '#ef4444' : '#22c55e',
              padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 600,
            }}
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem' }}>
        {/* ——— LEFT: Camera Feed ——— */}
        <div>
          {/* Main video feed */}
          <div style={{ 
            position: 'relative', borderRadius: '10px', overflow: 'hidden', 
            border: '1px solid rgba(255,255,255,0.1)',
            height: '300px',
          }}>
            <video 
              ref={videoRef}
              key={cam.video}
              src={cam.video}
              poster={cam.poster}
              autoPlay
              loop
              muted
              playsInline
              style={{ 
                width: '100%', height: '100%', objectFit: 'cover',
                filter: 'brightness(0.85) contrast(1.1) saturate(0.9)',
              }} 
            />
            {/* Futuristic YOLO Bounding Boxes Overlay */}
            {isLive && boundingBoxes.map(box => (
              <div key={box.id} style={{
                position: 'absolute',
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}%`,
                height: `${box.h}%`,
                border: '1px solid rgba(34, 197, 94, 0.4)',
                boxShadow: 'inset 0 0 10px rgba(34,197,94,0.1), 0 0 5px rgba(34,197,94,0.2)',
                transition: 'all 2s cubic-bezier(0.4, 0, 0.2, 1)', // very smooth gliding
                pointerEvents: 'none'
              }}>
                {/* Corner brackets for sleek look */}
                <div style={{ position: 'absolute', top: -1, left: -1, width: 8, height: 8, borderTop: '2px solid #22c55e', borderLeft: '2px solid #22c55e' }} />
                <div style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderTop: '2px solid #22c55e', borderRight: '2px solid #22c55e' }} />
                <div style={{ position: 'absolute', bottom: -1, left: -1, width: 8, height: 8, borderBottom: '2px solid #22c55e', borderLeft: '2px solid #22c55e' }} />
                <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderBottom: '2px solid #22c55e', borderRight: '2px solid #22c55e' }} />
                
                <div style={{
                  position: 'absolute',
                  top: '-16px',
                  left: '0',
                  background: 'rgba(20, 24, 38, 0.8)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  fontSize: '8px',
                  fontWeight: 600,
                  padding: '1px 4px',
                  borderRadius: '2px',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(4px)'
                }}>
                  {box.label} {box.conf}
                </div>
              </div>
            ))}
            {/* Dark vignette overlay for realism */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
              pointerEvents: 'none',
            }} />

            {/* Camera HUD - top left */}
            <div style={{ 
              position: 'absolute', top: '8px', left: '8px', 
              fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.8)',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}>
              <div style={{ color: '#22c55e', fontWeight: 700 }}>● REC</div>
              <div>{cam.id} — {cam.junction}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)' }}>
                {new Date().toLocaleTimeString('en-IN', { hour12: false })} IST
              </div>
            </div>

            {/* Camera HUD - top right */}
            <div style={{ 
              position: 'absolute', top: '8px', right: '8px', 
              fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.5)',
              textAlign: 'right', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}>
              <div>MODEL: YOLOv8-L</div>
              <div>FPS: {isLive ? '28.4' : '0.0'}</div>
              <div>INFER: 12.3ms</div>
            </div>

            {/* Bottom bar */}
            <div style={{ 
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              padding: '20px 10px 8px 10px',
            }}>
              <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: 'monospace', fontSize: '10px',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={10} /> {cam.location}
                </span>
                <span style={{ 
                  color: camCounts[cam.id] > 10 ? '#ef4444' : '#22c55e',
                  fontWeight: 600,
                }}>
                  {camCounts[cam.id]} VIOLATIONS LOGGED
                </span>
              </div>
            </div>
          </div>

          {/* Camera thumbnail grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginTop: '8px' }}>
            {CAMERA_FEEDS.map((c, i) => {
              const isSelected = i === selectedCamera;
              const isActive = activeCams.has(c.id);
              return (
                <button 
                  key={c.id}
                  onClick={() => setSelectedCamera(i)}
                  style={{
                    position: 'relative', borderRadius: '6px', overflow: 'hidden',
                    border: `2px solid ${isSelected ? '#3b82f6' : isActive ? '#22c55e' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer', padding: 0, height: '52px',
                    transition: 'border-color 0.3s ease',
                    background: '#000',
                  }}
                >
                  <video
                    src={c.video}
                    poster={c.poster}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ 
                      width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                      filter: isSelected ? 'brightness(1)' : 'brightness(0.45)',
                    }}
                  />
                  <div style={{ 
                    position: 'absolute', bottom: '2px', left: '2px', right: '2px',
                    fontSize: '7px', fontWeight: 600, textAlign: 'center',
                    color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                  }}>
                    {c.junction}
                  </div>
                  {isActive && (
                    <div style={{ 
                      position: 'absolute', top: '2px', right: '2px',
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#22c55e', boxShadow: '0 0 6px #22c55e',
                    }} />
                  )}
                  <div style={{
                    position: 'absolute', top: '2px', left: '2px',
                    fontSize: '6px', fontWeight: 700, color: '#fff',
                    background: 'rgba(0,0,0,0.6)', padding: '1px 3px', borderRadius: '2px',
                  }}>
                    {camCounts[c.id]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ——— RIGHT: Detection Stream ——— */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Processing Pipeline Status */}
          <div style={{ 
            padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px',
            fontSize: '0.65rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pipeline Status</span>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>OPERATIONAL</span>
            </div>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '4px',
              color: 'var(--text-secondary)',
            }}>
              <span style={{ color: '#3b82f6' }}>Camera</span>
              <span>→</span>
              <span style={{ color: '#a78bfa' }}>Frame Extract</span>
              <span>→</span>
              <span style={{ color: '#f97316' }}>YOLOv8</span>
              <span>→</span>
              <span style={{ color: '#22c55e' }}>Classify</span>
              <span>→</span>
              <span style={{ color: '#ef4444' }}>Alert</span>
            </div>
          </div>

          {/* Detection Log */}
          <div style={{ 
            flex: 1, overflowY: 'auto', 
            background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)',
            maxHeight: '290px',
          }}>
            <div style={{ 
              padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', 
              position: 'sticky', top: 0, background: 'rgba(15,17,26,0.95)', zIndex: 1,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>LIVE DETECTION STREAM</span>
              <span style={{ color: '#22c55e' }}>{isLive ? 'STREAMING' : 'PAUSED'}</span>
            </div>
            {detections.slice(0, 12).map((det, i) => (
              <div key={det.id} style={{ 
                padding: '8px 10px', 
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                animation: i === 0 ? 'fadeInSlide 0.3s ease' : 'none',
                background: i === 0 ? 'rgba(59,130,246,0.05)' : 'transparent',
              }}>
                {/* Row 1: severity + vehicle + time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ 
                      fontSize: '8px', fontWeight: 700, color: '#fff',
                      background: det.severity.color, padding: '1px 5px', borderRadius: '3px',
                    }}>
                      {det.severity.level}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{det.vehicleType}</span>
                  </div>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {formatTimestamp(det.timestamp)}
                  </span>
                </div>
                {/* Row 2: violation + fine */}
                <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                  {det.violation} • <span style={{ color: '#f97316', fontWeight: 600 }}>{formatCurrency(det.surgeFine)}</span>
                </div>
                {/* Row 3: camera + plate */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'rgba(255,255,255,0.35)' }}>
                  <span>{det.cameraId} — {CAMERA_FEEDS.find(c => c.id === det.cameraId)?.junction || ''}</span>
                  <span style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{det.vehiclePlate}</span>
                </div>
              </div>
            ))}
            {detections.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                Waiting for detections...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
