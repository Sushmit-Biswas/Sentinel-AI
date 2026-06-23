'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { EyeOff } from 'lucide-react';

interface HeatMapProps {
  points: { lat: number; lon: number; intensity: number }[];
  hotspots?: any[];
}

export default function HeatMap({ points, hotspots = [] }: HeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const heatLayer = useRef<any>(null);
  const markersLayer = useRef<any>(null);
  const blindSpotsLayer = useRef<any>(null);
  const [showBlindSpots, setShowBlindSpots] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Initialize map only once
    if (!mapInstance.current) {
      const L = require('leaflet');
      require('leaflet.heat');

      // Fix Leaflet default icon path issues in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Default center: Bengaluru
      mapInstance.current = L.map(mapRef.current).setView([12.9716, 77.5946], 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapInstance.current);

      // Fix for IndexSizeError on 0-width canvas
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 250);
    }

    const L = require('leaflet');

    // Update Heatmap
    if (points && points.length > 0) {
      const heatData = points.map(p => [p.lat, p.lon, p.intensity / 100 * 3]); // amplify intensity
      
      if (heatLayer.current) {
        mapInstance.current.removeLayer(heatLayer.current);
      }
      
      heatLayer.current = (L as any).heatLayer(heatData, {
        radius: 15,
        blur: 20,
        maxZoom: 15,
        gradient: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
      }).addTo(mapInstance.current);
    }

    // Update Hotspot Markers
    if (markersLayer.current) {
      mapInstance.current.removeLayer(markersLayer.current);
    }
    
    markersLayer.current = L.layerGroup().addTo(mapInstance.current);
    
    if (hotspots && hotspots.length > 0) {
      hotspots.forEach(hs => {
        if (!hs.center_lat || !hs.center_lon) return; // Prevent Invalid LatLng Error
        
        const color = hs.risk_level === 'critical' ? '#ef4444' : 
                      hs.risk_level === 'high' ? '#f97316' : 
                      hs.risk_level === 'medium' ? '#eab308' : '#3b82f6';
                      
        const circle = L.circleMarker([hs.center_lat, hs.center_lon], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });

        circle.bindPopup(`
          <div style="font-family: inherit;">
            <h4 style="margin: 0 0 5px 0; color: ${color}; text-transform: uppercase;">${hs.risk_level} HOTSPOT</h4>
            <strong style="font-size: 14px;">${hs.dominant_junction}</strong><br/>
            <span style="color: #94a3b8; font-size: 12px;">${hs.location_name}</span>
            <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 8px 0;" />
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Violations:</span> <strong>${hs.violation_count}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Impact Score (CIS):</span> <strong>${hs.total_cis}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #f97316;">Surge Fine Multiplier:</span> <strong style="color: #f97316;">${Math.max(1, Math.round((hs.mean_cis / 2) * 10) / 10)}x</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Peak Hour:</span> <strong>${hs.peak_hour}:00 IST</strong>
            </div>
          </div>
        `);

        circle.addTo(markersLayer.current);
      });
    }

    // Action 2: Blind-Spot Detector
    if (blindSpotsLayer.current) {
      mapInstance.current.removeLayer(blindSpotsLayer.current);
    }

    if (showBlindSpots && hotspots && hotspots.length > 0) {
      blindSpotsLayer.current = L.layerGroup().addTo(mapInstance.current);
      
      // Filter for 'blind spots' - high violations, low patrol approval rate (simulated)
      const blindSpots = hotspots.filter((hs, i) => i % 3 === 0 && hs.violation_count > 30);
      
      blindSpots.forEach(bs => {
        // Draw a hashed/pulsing polygon area
        const bounds = [
          [bs.center_lat - 0.002, bs.center_lon - 0.002],
          [bs.center_lat + 0.002, bs.center_lon - 0.002],
          [bs.center_lat + 0.002, bs.center_lon + 0.002],
          [bs.center_lat - 0.002, bs.center_lon + 0.002],
        ];
        
        const polygon = L.polygon(bounds, {
          color: '#a855f7', // purple
          fillColor: '#a855f7',
          fillOpacity: 0.3,
          weight: 2,
          dashArray: '5, 5'
        });

        polygon.bindPopup(`
          <div style="font-family: inherit;">
            <h4 style="margin: 0 0 5px 0; color: #a855f7; text-transform: uppercase;">ENFORCEMENT BLIND SPOT</h4>
            <strong style="font-size: 14px;">${bs.dominant_junction}</strong>
            <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 8px 0;" />
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Violations Density:</span> <strong style="color: #ef4444;">HIGH (${bs.violation_count})</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Patrol Approval Rate:</span> <strong style="color: #ef4444;">LOW (42%)</strong>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
              Action: Increase ASTraM patrol route frequency by 2x.
            </div>
          </div>
        `);
        
        polygon.addTo(blindSpotsLayer.current);
      });
    }

  }, [points, hotspots, showBlindSpots]);

  return (
    <div className="glass-panel" style={{ height: '500px', width: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
      
      {/* Top Left: Actions (moved down to avoid zoom controls) */}
      <div style={{ position: 'absolute', top: 80, left: 10, zIndex: 1000, display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setShowBlindSpots(!showBlindSpots)}
          className="glass-panel"
          style={{ 
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            background: showBlindSpots ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0,0,0,0.6)',
            border: `1px solid ${showBlindSpots ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
            color: showBlindSpots ? '#d8b4fe' : '#fff',
            transition: 'all 0.2s',
            fontSize: '12px', fontWeight: 600,
          }}
        >
          <EyeOff size={16} color={showBlindSpots ? '#d8b4fe' : '#fff'} />
          {showBlindSpots ? 'Hide Blind Spots' : 'Show Enforcement Gaps'}
        </button>
      </div>

      {/* Top Right: Legend */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}>
        <strong>Heatmap Intensity</strong>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', background: 'blue', borderRadius: '50%' }}></div> Low
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', background: 'yellow', borderRadius: '50%' }}></div> Medium
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', background: 'red', borderRadius: '50%' }}></div> Critical
        </div>
      </div>
    </div>
  );
}
