'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Users, Shield, TrendingDown, Minus, Plus, Zap, IndianRupee } from 'lucide-react';

interface ResourceSimulatorProps {
  hotspots?: any[];
}

interface ResourceAllocation {
  towTrucks: number;
  patrolUnits: number;
  trafficWardens: number;
}

interface ZoneSimulation {
  hotspot: any;
  allocation: ResourceAllocation;
  cisReduction: number; // percentage
  flowImprovement: number; // percentage
  estimatedFinesCollected: number;
  congestionHoursSaved: number;
}

const RESOURCE_COSTS = {
  towTruck: 5000, // ₹/day operational cost
  patrolUnit: 3000,
  trafficWarden: 1500,
};

const RESOURCE_EFFECTIVENESS = {
  towTruck: { cisReduction: 18, flowImprovement: 12 },
  patrolUnit: { cisReduction: 12, flowImprovement: 8 },
  trafficWarden: { cisReduction: 6, flowImprovement: 4 },
};

export default function ResourceSimulator({ hotspots = [] }: ResourceSimulatorProps) {
  const [selectedZones, setSelectedZones] = useState<ZoneSimulation[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [animatedReductions, setAnimatedReductions] = useState<Record<number, number>>({});

  // Initialize with top 5 critical hotspots
  useEffect(() => {
    if (hotspots.length > 0 && selectedZones.length === 0) {
      const criticalZones = hotspots
        .filter((h: any) => h.risk_level === 'critical' || h.risk_level === 'high')
        .slice(0, 5)
        .map((h: any) => ({
          hotspot: h,
          allocation: { towTrucks: 0, patrolUnits: 0, trafficWardens: 0 },
          cisReduction: 0,
          flowImprovement: 0,
          estimatedFinesCollected: 0,
          congestionHoursSaved: 0,
        }));
      setSelectedZones(criticalZones);
    }
  }, [hotspots]);

  const updateAllocation = (zoneIdx: number, resource: keyof ResourceAllocation, delta: number) => {
    setSelectedZones(prev => {
      const updated = [...prev];
      const zone = { ...updated[zoneIdx] };
      const allocation = { ...zone.allocation };
      
      allocation[resource] = Math.max(0, Math.min(5, allocation[resource] + delta));
      
      // Calculate impact
      const totalCisReduction = 
        allocation.towTrucks * RESOURCE_EFFECTIVENESS.towTruck.cisReduction +
        allocation.patrolUnits * RESOURCE_EFFECTIVENESS.patrolUnit.cisReduction +
        allocation.trafficWardens * RESOURCE_EFFECTIVENESS.trafficWarden.cisReduction;
      
      const totalFlowImprovement = 
        allocation.towTrucks * RESOURCE_EFFECTIVENESS.towTruck.flowImprovement +
        allocation.patrolUnits * RESOURCE_EFFECTIVENESS.patrolUnit.flowImprovement +
        allocation.trafficWardens * RESOURCE_EFFECTIVENESS.trafficWarden.flowImprovement;
      
      // Diminishing returns (logarithmic cap at 85%)
      zone.cisReduction = Math.min(85, Math.round(totalCisReduction * (1 - totalCisReduction / 200)));
      zone.flowImprovement = Math.min(65, Math.round(totalFlowImprovement * (1 - totalFlowImprovement / 150)));
      
      // Estimated fines = violations × avg fine × enforcement probability
      const violationsPerDay = zone.hotspot.avg_daily_violations || 10;
      const enforcementProbability = Math.min(0.9, (allocation.towTrucks * 0.2 + allocation.patrolUnits * 0.15 + allocation.trafficWardens * 0.1));
      zone.estimatedFinesCollected = Math.round(violationsPerDay * 750 * enforcementProbability);
      
      // Congestion hours saved
      zone.congestionHoursSaved = Math.round(zone.flowImprovement * 0.8);
      
      zone.allocation = allocation;
      updated[zoneIdx] = zone;
      return updated;
    });
  };

  const runSimulation = () => {
    setIsSimulating(true);
    // Animate the CIS reductions
    selectedZones.forEach((zone, idx) => {
      let current = 0;
      const target = zone.cisReduction;
      const step = target / 20;
      const interval = setInterval(() => {
        current = Math.min(target, current + step);
        setAnimatedReductions(prev => ({ ...prev, [idx]: Math.round(current) }));
        if (current >= target) clearInterval(interval);
      }, 50);
    });
    setTimeout(() => setIsSimulating(false), 1200);
  };

  // Totals
  const totalCost = selectedZones.reduce((acc, z) => {
    return acc + 
      z.allocation.towTrucks * RESOURCE_COSTS.towTruck +
      z.allocation.patrolUnits * RESOURCE_COSTS.patrolUnit +
      z.allocation.trafficWardens * RESOURCE_COSTS.trafficWarden;
  }, 0);

  const totalFines = selectedZones.reduce((acc, z) => acc + z.estimatedFinesCollected, 0);
  const totalHoursSaved = selectedZones.reduce((acc, z) => acc + z.congestionHoursSaved, 0);
  const avgCisReduction = selectedZones.length > 0 
    ? Math.round(selectedZones.reduce((acc, z) => acc + z.cisReduction, 0) / selectedZones.length)
    : 0;
  const roi = totalCost > 0 ? ((totalFines / totalCost) * 100).toFixed(0) : '0';
  const hasAnyAllocation = selectedZones.some(z => 
    z.allocation.towTrucks > 0 || z.allocation.patrolUnits > 0 || z.allocation.trafficWardens > 0
  );

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '36px', height: '36px', borderRadius: '10px', 
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
              Digital Twin — Resource Allocation Simulator
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Deploy enforcement assets to zones and simulate congestion impact reduction
            </p>
          </div>
        </div>
        <button
          onClick={runSimulation}
          disabled={!hasAnyAllocation || isSimulating}
          style={{
            background: hasAnyAllocation ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.1)',
            color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px',
            cursor: hasAnyAllocation ? 'pointer' : 'not-allowed',
            fontWeight: 600, fontSize: '0.8rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            opacity: hasAnyAllocation ? 1 : 0.5,
            transition: 'all 0.3s ease',
          }}
        >
          <Zap size={14} />
          {isSimulating ? 'Simulating...' : 'Run What-If Simulation'}
        </button>
      </div>

      {/* Resource Legend */}
      <div style={{ 
        display: 'flex', gap: '1.5rem', marginBottom: '1rem', padding: '0.75rem 1rem',
        background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.7rem',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Truck size={14} color="#3b82f6" />
          <span style={{ color: 'var(--text-secondary)' }}>Tow Truck: ₹{RESOURCE_COSTS.towTruck.toLocaleString()}/day • CIS -18% each</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={14} color="#a78bfa" />
          <span style={{ color: 'var(--text-secondary)' }}>Patrol: ₹{RESOURCE_COSTS.patrolUnit.toLocaleString()}/day • CIS -12% each</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={14} color="#22c55e" />
          <span style={{ color: 'var(--text-secondary)' }}>Warden: ₹{RESOURCE_COSTS.trafficWarden.toLocaleString()}/day • CIS -6% each</span>
        </div>
      </div>

      {/* Zone Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {selectedZones.map((zone, idx) => {
          const riskColor = zone.hotspot.risk_level === 'critical' ? '#ef4444' : '#f97316';
          const animatedValue = animatedReductions[idx] ?? 0;
          
          return (
            <div key={idx} style={{ 
              background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '1rem',
              border: `1px solid ${zone.cisReduction > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'}`,
              transition: 'border-color 0.5s ease',
            }}>
              {/* Zone header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{zone.hotspot.dominant_junction}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    CIS: {zone.hotspot.total_cis} • {zone.hotspot.violation_count} violations
                  </div>
                </div>
                <span style={{ 
                  fontSize: '0.6rem', fontWeight: 700, color: riskColor,
                  background: `${riskColor}20`, padding: '2px 6px', borderRadius: '4px',
                  textTransform: 'uppercase',
                }}>
                  {zone.hotspot.risk_level}
                </span>
              </div>

              {/* Resource controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0.75rem' }}>
                {/* Tow Trucks */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#3b82f6' }}>
                    <Truck size={12} /> Tow Trucks
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => updateAllocation(idx, 'towTrucks', -1)} style={btnStyle}>
                      <Minus size={10} />
                    </button>
                    <span style={{ width: '20px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                      {zone.allocation.towTrucks}
                    </span>
                    <button onClick={() => updateAllocation(idx, 'towTrucks', 1)} style={btnStyle}>
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
                {/* Patrol Units */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#a78bfa' }}>
                    <Users size={12} /> Patrol Units
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => updateAllocation(idx, 'patrolUnits', -1)} style={btnStyle}>
                      <Minus size={10} />
                    </button>
                    <span style={{ width: '20px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                      {zone.allocation.patrolUnits}
                    </span>
                    <button onClick={() => updateAllocation(idx, 'patrolUnits', 1)} style={btnStyle}>
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
                {/* Wardens */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#22c55e' }}>
                    <Shield size={12} /> Wardens
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => updateAllocation(idx, 'trafficWardens', -1)} style={btnStyle}>
                      <Minus size={10} />
                    </button>
                    <span style={{ width: '20px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                      {zone.allocation.trafficWardens}
                    </span>
                    <button onClick={() => updateAllocation(idx, 'trafficWardens', 1)} style={btnStyle}>
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Impact bar */}
              {zone.cisReduction > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>CIS Reduction</span>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>-{animatedValue || zone.cisReduction}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${animatedValue || zone.cisReduction}%`, height: '100%', 
                      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                      borderRadius: '2px', transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                    <span>Flow: +{zone.flowImprovement}%</span>
                    <span style={{ color: '#22c55e' }}>₹{zone.estimatedFinesCollected.toLocaleString()} fines/day</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ROI Summary */}
      {hasAnyAllocation && (
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem',
          padding: '1rem', background: 'rgba(34,197,94,0.05)', borderRadius: '10px',
          border: '1px solid rgba(34,197,94,0.15)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>
              ₹{totalCost.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Daily Deployment Cost</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#22c55e' }}>
              ₹{totalFines.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Est. Daily Fines</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#a78bfa' }}>
              {avgCisReduction}%
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Avg CIS Reduction</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#60a5fa' }}>
              {totalHoursSaved}h
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Congestion Hours Saved</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: Number(roi) >= 100 ? '#22c55e' : '#f97316' }}>
              {roi}%
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>Enforcement ROI</div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: '22px', height: '22px', borderRadius: '4px',
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0,
};
