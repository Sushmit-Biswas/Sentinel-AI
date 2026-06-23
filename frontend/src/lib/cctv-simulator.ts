/**
 * CCTV Vision Simulation Engine
 * Generates realistic detection events that simulate a YOLOv8 CV pipeline
 * detecting illegal parking in real-time CCTV feeds.
 */

// Bengaluru-specific vehicle types and violation patterns
const VEHICLE_TYPES = [
  { type: 'Sedan (White)', size: 'medium', blockage: 1.5 },
  { type: 'Sedan (Grey)', size: 'medium', blockage: 1.5 },
  { type: 'SUV (Black)', size: 'large', blockage: 2.0 },
  { type: 'SUV (White)', size: 'large', blockage: 2.0 },
  { type: 'Auto Rickshaw', size: 'small', blockage: 1.2 },
  { type: 'Tempo Traveller', size: 'large', blockage: 2.5 },
  { type: 'BMTC Bus', size: 'xlarge', blockage: 3.0 },
  { type: 'Goods Lorry', size: 'xlarge', blockage: 3.0 },
  { type: 'Hatchback (Red)', size: 'medium', blockage: 1.3 },
  { type: 'Hatchback (Silver)', size: 'medium', blockage: 1.3 },
  { type: 'Motorcycle', size: 'small', blockage: 1.0 },
  { type: 'Scooter', size: 'small', blockage: 1.0 },
  { type: 'Mini Truck', size: 'large', blockage: 2.5 },
  { type: 'Van (Delivery)', size: 'large', blockage: 2.0 },
  { type: 'Pickup Truck', size: 'large', blockage: 2.0 },
];

const VIOLATIONS = [
  'PARKING IN A MAIN ROAD',
  'DOUBLE PARKING',
  'PARKING ON FOOTPATH',
  'PARKING NEAR BUSTOP',
  'PARKING NEAR TRAFFIC LIGHT',
  'WRONG PARKING',
  'PARKING NEAR ROAD CROSSING',
  'NO PARKING ZONE',
  'BLOCKING PEDESTRIAN PATH',
  'UNAUTHORIZED COMMERCIAL PARKING',
];

const SEVERITY_MAP: Record<string, { level: string; color: string; score: number }> = {
  'PARKING IN A MAIN ROAD': { level: 'CRITICAL', color: '#ef4444', score: 3.0 },
  'DOUBLE PARKING': { level: 'HIGH', color: '#f97316', score: 2.5 },
  'PARKING ON FOOTPATH': { level: 'MEDIUM', color: '#eab308', score: 2.0 },
  'PARKING NEAR BUSTOP': { level: 'HIGH', color: '#f97316', score: 2.0 },
  'PARKING NEAR TRAFFIC LIGHT': { level: 'HIGH', color: '#f97316', score: 2.5 },
  'WRONG PARKING': { level: 'MEDIUM', color: '#eab308', score: 1.5 },
  'PARKING NEAR ROAD CROSSING': { level: 'HIGH', color: '#f97316', score: 2.0 },
  'NO PARKING ZONE': { level: 'CRITICAL', color: '#ef4444', score: 2.8 },
  'BLOCKING PEDESTRIAN PATH': { level: 'MEDIUM', color: '#eab308', score: 1.8 },
  'UNAUTHORIZED COMMERCIAL PARKING': { level: 'HIGH', color: '#f97316', score: 2.2 },
};

// Karnataka registration format
function generatePlate(): string {
  const districts = ['KA01', 'KA02', 'KA03', 'KA04', 'KA05', 'KA09', 'KA10',
                     'KA41', 'KA50', 'KA51', 'KA52', 'KA53'];
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const dist = districts[Math.floor(Math.random() * districts.length)];
  const letter1 = letters[Math.floor(Math.random() * letters.length)];
  const letter2 = letters[Math.floor(Math.random() * letters.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${dist} ${letter1}${letter2} ${num}`;
}

export interface DetectionEvent {
  id: string;
  timestamp: Date;
  cameraId: string;
  cameraLocation: string;
  vehicleType: string;
  vehiclePlate: string;
  violation: string;
  severity: { level: string; color: string; score: number };
  confidence: number;
  dwellTimeSeconds: number;
  surgeFine: number;
  flowImpact: number;
  isNew: boolean;
}

let eventCounter = 0;
// Track recent detections to avoid repetition
let recentVehicleIdx = -1;
let recentViolationIdx = -1;

export function generateDetectionEvent(cameraId: string, cameraLocation: string): DetectionEvent {
  // Pick a different vehicle type and violation each time
  let vehicleIdx = Math.floor(Math.random() * VEHICLE_TYPES.length);
  while (vehicleIdx === recentVehicleIdx) {
    vehicleIdx = Math.floor(Math.random() * VEHICLE_TYPES.length);
  }
  recentVehicleIdx = vehicleIdx;

  let violationIdx = Math.floor(Math.random() * VIOLATIONS.length);
  while (violationIdx === recentViolationIdx) {
    violationIdx = Math.floor(Math.random() * VIOLATIONS.length);
  }
  recentViolationIdx = violationIdx;

  const vehicle = VEHICLE_TYPES[vehicleIdx];
  const violation = VIOLATIONS[violationIdx];
  const severity = SEVERITY_MAP[violation];
  const confidence = 0.86 + Math.random() * 0.13; // 86-99%
  const dwellTime = Math.floor(30 + Math.random() * 570); // 30s to 10min
  
  // Surge fine calculation (base ₹500 × severity × dwell multiplier)
  const baseFine = 500;
  const dwellMultiplier = dwellTime > 300 ? 2.0 : dwellTime > 120 ? 1.5 : 1.0;
  const surgeFine = Math.round(baseFine * severity.score * dwellMultiplier);
  
  // Flow impact based on vehicle size and violation type
  const flowImpact = Math.round(vehicle.blockage * severity.score * 5);
  
  eventCounter++;
  
  return {
    id: `DET-${String(eventCounter).padStart(5, '0')}`,
    timestamp: new Date(),
    cameraId,
    cameraLocation,
    vehicleType: vehicle.type,
    vehiclePlate: generatePlate(),
    violation,
    severity,
    confidence: Math.round(confidence * 100) / 100,
    dwellTimeSeconds: dwellTime,
    surgeFine,
    flowImpact: Math.min(45, flowImpact),
    isNew: true,
  };
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
