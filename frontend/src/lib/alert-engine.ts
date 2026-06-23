/**
 * Alert Engine — Manages field alerts triggered by CCTV detections
 * and critical hotspot events. Simulates push notifications to 
 * field officers via WhatsApp Business API format.
 */

import { DetectionEvent } from './cctv-simulator';

export interface FieldAlert {
  id: string;
  timestamp: Date;
  type: 'critical_violation' | 'hotspot_spike' | 'patrol_dispatch' | 'zone_clear';
  priority: 'P0' | 'P1' | 'P2';
  title: string;
  message: string;
  location: string;
  actionRequired: string;
  officer?: string;
  acknowledged: boolean;
  cameraId?: string;
  vehiclePlate?: string;
  suggestedFine?: number;
  flowImpact?: number;
}

const OFFICER_NAMES = [
  'ASI Rajesh Kumar',
  'HC Deepa Sharma',
  'SI Venkatesh R.',
  'ASI Priya N.',
  'HC Mohammed F.',
  'SI Kavitha B.',
];

const ZONE_NAMES = [
  'MG Road Zone', 'Indiranagar Sector', 'KR Market Zone',
  'Whitefield Sector', 'Koramangala Zone', 'Jayanagar Sector',
];

let alertCounter = 0;

export function createAlertFromDetection(detection: DetectionEvent): FieldAlert {
  alertCounter++;
  const isCritical = detection.severity.level === 'CRITICAL' || detection.flowImpact > 30;
  const officer = OFFICER_NAMES[Math.floor(Math.random() * OFFICER_NAMES.length)];
  
  // More descriptive, varied titles
  const titleParts = isCritical 
    ? [`${detection.vehicleType} — ${detection.violation}`, `Critical: ${detection.vehicleType} at ${detection.cameraLocation.split('/')[0].trim()}`]
    : [`${detection.vehicleType} — ${detection.violation}`, `${detection.violation} near ${detection.cameraLocation.split('/')[0].trim()}`];
  const title = titleParts[alertCounter % titleParts.length];

  // Varied action messages
  const actions = isCritical 
    ? ['IMMEDIATE: Dispatch tow truck. Traffic flow critically impacted.',
       'URGENT: Deploy patrol unit. Blocking main carriageway.',
       'IMMEDIATE: Issue e-challan + tow. Repeat offender zone.']
    : ['Standard: Issue e-challan. Monitor for escalation.',
       'Routine: Log violation. Issue warning notice.',
       'Standard: Photo-document and issue spot fine.'];
  const actionRequired = actions[Math.floor(Math.random() * actions.length)];

  return {
    id: `ALERT-${String(alertCounter).padStart(4, '0')}`,
    timestamp: new Date(),
    type: isCritical ? 'critical_violation' : 'hotspot_spike',
    priority: isCritical ? 'P0' : detection.severity.level === 'HIGH' ? 'P1' : 'P2',
    title,
    message: `${detection.vehicleType} (${detection.vehiclePlate}) detected at ${detection.cameraLocation}. Parked for ${Math.floor(detection.dwellTimeSeconds / 60)}m ${detection.dwellTimeSeconds % 60}s. Lane capacity reduced by ${detection.flowImpact}%.`,
    location: detection.cameraLocation,
    actionRequired,
    officer,
    acknowledged: false,
    cameraId: detection.cameraId,
    vehiclePlate: detection.vehiclePlate,
    suggestedFine: detection.surgeFine,
    flowImpact: detection.flowImpact,
  };
}

export function createPatrolDispatchAlert(zoneName: string, hotspotCount: number): FieldAlert {
  alertCounter++;
  const officer = OFFICER_NAMES[Math.floor(Math.random() * OFFICER_NAMES.length)];
  
  return {
    id: `ALERT-${String(alertCounter).padStart(4, '0')}`,
    timestamp: new Date(),
    type: 'patrol_dispatch',
    priority: 'P1',
    title: `Patrol Dispatched: ${zoneName}`,
    message: `Ghost patrol route generated through ${hotspotCount} active hotspots. Optimized route covers critical zones with estimated ROI of 2.3x.`,
    location: zoneName,
    actionRequired: `Follow optimized route. Priority: ${hotspotCount} enforcement stops.`,
    officer,
    acknowledged: false,
  };
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'P0': return '#ef4444';
    case 'P1': return '#f97316';
    case 'P2': return '#eab308';
    default: return '#94a3b8';
  }
}

export function getPriorityBg(priority: string): string {
  switch (priority) {
    case 'P0': return 'rgba(239, 68, 68, 0.15)';
    case 'P1': return 'rgba(249, 115, 22, 0.15)';
    case 'P2': return 'rgba(234, 179, 8, 0.15)';
    default: return 'rgba(148, 163, 184, 0.1)';
  }
}
