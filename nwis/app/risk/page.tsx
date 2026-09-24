'use client';

import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  Check, 
  ChevronRight, 
  Compass, 
  Sliders, 
  TrendingUp, 
  Layers, 
  Info,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  X
} from 'lucide-react';
import { TacticalSidebar } from '@/components/layout/Sidebar';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Geological formations matching Assam Shelf / Reference Image 4
const FORMATIONS = [
  { name: 'Recent Alluvium', top: 0, base: 600, color: '#3A483E', desc: 'Loose gravel and sandy clay' },
  { name: 'Dhekiajuli Formation', top: 600, base: 1400, color: '#4A5B52', desc: 'Coarse sandstones with clay bands' },
  { name: 'Tipam Sandstone', top: 1400, base: 2442, color: '#856A41', desc: 'Porous reservoir sand, high fluid mobility' },
  { name: 'Girujan Clay', top: 2442, base: 2850, color: '#4D5866', desc: 'Overpressured reactive shale zone' },
  { name: 'Disang Shale', top: 2850, base: 3400, color: '#353D4A', desc: 'Hard compact shale, wellbore collapse risk' },
  { name: 'Basement', top: 3400, base: 4000, color: '#222834', desc: 'Granitic metamorphic basement' }
];

interface LiveSignalAlert {
  id: string;
  severity: 'critical' | 'watch' | 'normal';
  title: string;
  offsetWell: string;
  depth: string;
  confidence: string;
  timeAgo: string;
  reason: string;
  mitigation: string;
  fieldSteps: string[];
  youtubeId: string;
  youtubeTitle: string;
  incidentPhotos: { url: string; caption: string }[];
  acknowledged: boolean;
}

const INITIAL_ALERTS: LiveSignalAlert[] = [
  {
    id: 'sig-01',
    severity: 'critical',
    title: 'Lost circulation pattern detected',
    offsetWell: 'AA-12Y',
    depth: '2,430 m',
    confidence: '92% confidence',
    timeAgo: 'NOW',
    reason: 'Formation match + depth proximity',
    mitigation: 'Pre-treat active system with 20 ppb coarse fiber LCM pill. Reduce pump flow to 420 gpm to keep ECD below fracture gradient.',
    fieldSteps: [
      'Spot 30 bbl high-viscosity pill with mica & calcium carbonate',
      'Reduce pump rate from 650 to 420 gpm before boundary',
      'Monitor pit volume on 1-minute interval'
    ],
    youtubeId: 'W3q8Od5qJio',
    youtubeTitle: 'Managing Lost Circulation in Upper Assam Reservoir Sands',
    incidentPhotos: [
      { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Pit volume monitor — sudden total loss event' },
      { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80', caption: 'LCM pill being mixed on rig floor, AA-12Y' },
    ],
    acknowledged: false
  },
  {
    id: 'sig-02',
    severity: 'watch',
    title: 'Torque increase above offset median',
    offsetWell: 'AA-092',
    depth: '1,954 m',
    confidence: '78% confidence',
    timeAgo: '-14 MIN',
    reason: 'Spatial distance + recency',
    mitigation: 'Add 3% liquid lubricant to active mud system to reduce frictional drag. Maintain string rotation during connections.',
    fieldSteps: [
      'Add 3% bio-lubricant to suction pit',
      'Control rotary table at 60 RPM to mitigate stick-slip',
      'Perform reaming passes if torque exceeds 14,000 ft-lbs'
    ],
    youtubeId: '9Gk5fL2Esq4',
    youtubeTitle: 'Torque & Drag Optimization in Directional Drilling',
    incidentPhotos: [
      { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Weight indicator — torque oscillation event at AA-092' },
      { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Shale cuttings indicating reactive formation contact' },
    ],
    acknowledged: false
  },
  {
    id: 'sig-03',
    severity: 'normal',
    title: 'Predicted formation boundary',
    offsetWell: 'AA-037',
    depth: '1,910 m',
    confidence: '88% confidence',
    timeAgo: '-1.2 HR',
    reason: 'Formation sequence match',
    mitigation: 'Prepare mud weight increase of 0.2 SG prior to penetrating overpressured Girujan Clay transition.',
    fieldSteps: [
      'Condition mud weight to 1.18 SG',
      'Verify shale shaker screen sizes (API 140/170)',
      'Circulate bottoms up before drilling deeper'
    ],
    youtubeId: 'W3q8Od5qJio',
    youtubeTitle: 'Formation Pressure Prediction & Casing Seat Selection',
    incidentPhotos: [
      { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Mud weight adjustment board — AA-037 field record' },
    ],
    acknowledged: false
  }
];

export default function LiveSimulationPage() {
  const [currentDepth, setCurrentDepth] = useState<number>(2414);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [alerts, setAlerts] = useState<LiveSignalAlert[]>(INITIAL_ALERTS);
  const [selectedAlertForMitigation, setSelectedAlertForMitigation] = useState<LiveSignalAlert | null>(null);

  const handleAcknowledge = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    // Also update the modal state so the button reflects ACK immediately
    setSelectedAlertForMitigation(prev => prev && prev.id === id ? { ...prev, acknowledged: true } : prev);
  };

  // Active Formation based on depth
  const currentFormation = FORMATIONS.find(f => currentDepth >= f.top && currentDepth < f.base) || FORMATIONS[2];
  const nextBoundaryDistance = currentFormation.base - currentDepth;

  // Live simulation play loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentDepth(prev => {
          if (prev >= 3200) return 1800; // loop simulation
          return prev + 1 * speed;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  return (
    <div className="flex min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white">
      {/* Tactical Left Sidebar */}
      <TacticalSidebar />

      {/* Main Live Drill Simulation Workspace */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1500px]">
        {/* Top Well Header matching Reference Image 4 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#141F2D] mb-6">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#7E8B9B] uppercase mb-1">
              LIVE SIMULATION · AA-17H / LAKWA CENTRAL
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight flex items-baseline gap-3">
              Well AA-17H
              <span className="text-xs font-mono font-normal text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
                Simulation Live
              </span>
            </h1>
            <p className="text-xs text-[#8A9BAE] mt-0.5 font-mono">
              Real-time offset intelligence at <span className="text-[#F59E0B] font-bold">{currentDepth.toLocaleString()} m</span> measured depth.
            </p>
          </div>

          {/* Simulation Depth Control Toolbar */}
          <div className="flex items-center gap-3">
            {/* Play/Pause & Speed */}
            <div className="flex items-center gap-1 bg-[#0A0F16] p-1 rounded-lg border border-[#1A2634]">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded hover:bg-[#1E293B] text-white transition-colors"
                title={isPlaying ? "Pause" : "Play Drill Feed"}
              >
                {isPlaying ? <Pause className="w-4 h-4 text-[#F59E0B]" /> : <Play className="w-4 h-4 text-[#10B981]" />}
              </button>
              <button
                onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                className="px-2 py-1 rounded text-[11px] font-mono font-bold text-[#94A3B8] hover:text-white"
              >
                {speed}x speed
              </button>
              <button
                onClick={() => setCurrentDepth(2414)}
                className="p-1.5 rounded hover:bg-[#1E293B] text-[#64748B] hover:text-white"
                title="Reset to 2,414m"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Depth Scrubber Input */}
            <div className="flex items-center gap-2 bg-[#0A0F16] px-3 py-1.5 rounded-lg border border-[#1A2634]">
              <span className="text-[10px] font-mono text-[#64748B] uppercase">Depth</span>
              <input
                type="range"
                min={1000}
                max={3500}
                value={currentDepth}
                onChange={(e) => setCurrentDepth(Number(e.target.value))}
                className="w-32 accent-[#F59E0B] cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-white min-w-[55px] text-right">
                {currentDepth} m
              </span>
            </div>
          </div>
        </div>

        {/* 3-Column Tactical Display matching Reference Image 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Subsurface Stratigraphic Window (3 cols) */}
          <div className="lg:col-span-3 bg-[#0A0F16] border border-[#172332] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#7E8B9B]">
              <span className="uppercase tracking-wider">FORMATION COLUMN</span>
              <span className="text-[#38BDF8]">SUBSURFACE WINDOW</span>
            </div>

            {/* Geological Vertical Strata Stack */}
            <div className="relative w-full h-[460px] rounded-lg border border-[#172334] overflow-hidden flex flex-col">
              {FORMATIONS.map((f) => {
                const heightPercent = ((f.base - f.top) / 4000) * 100;
                const isCurrent = currentFormation.name === f.name;

                return (
                  <div
                    key={f.name}
                    style={{ height: `${heightPercent}%`, backgroundColor: f.color }}
                    className={cn(
                      "w-full relative px-2.5 py-1.5 border-b border-black/40 flex flex-col justify-between transition-all",
                      isCurrent ? "ring-2 ring-inset ring-[#F59E0B]" : "opacity-90"
                    )}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-white font-medium drop-shadow-sm">{f.name}</span>
                      <span className="text-white/70 text-[9px]">{f.top} m</span>
                    </div>

                    {isCurrent && (
                      <div className="text-[9px] text-[#F59E0B] font-mono font-bold drop-shadow">
                        ACTIVE INTERVAL
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Live Drill Bit Depth Marker Line */}
              <div
                style={{ top: `${(currentDepth / 4000) * 100}%` }}
                className="absolute left-0 right-0 z-20 flex items-center -translate-y-1/2 pointer-events-none transition-all duration-150"
              >
                <div className="w-full h-[2px] bg-[#EF4444] shadow-md shadow-[#EF4444]" />
                <div className="absolute right-1 px-1.5 py-0.5 rounded bg-[#EF4444] text-white text-[9px] font-mono font-bold whitespace-nowrap">
                  {currentDepth} m
                </div>
              </div>
            </div>

            {/* Formation boundary status badge */}
            <div className="mt-3 p-2.5 rounded-lg bg-[#070D13] border border-[#141F2D] text-xs font-mono">
              <div className="text-[#64748B] text-[10px] uppercase">Next formation boundary</div>
              <div className="text-white font-bold flex items-center justify-between mt-0.5">
                <span>{currentFormation.name} Base</span>
                <span className="text-[#F59E0B]">-{nextBoundaryDistance} m</span>
              </div>
            </div>
          </div>

          {/* Column 2: Offset Intelligence Radar Map (5 cols) */}
          <div className="lg:col-span-5 bg-[#0A0F16] border border-[#172332] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#7E8B9B]">
              <span className="uppercase tracking-wider">OFFSET INTELLIGENCE / 7 KM RANGE</span>
              <div className="flex items-center gap-1">
                <button className="px-2 py-0.5 rounded bg-[#162232] text-white text-[9px] font-mono">All</button>
                <button className="px-2 py-0.5 rounded text-[#64748B] hover:text-white text-[9px] font-mono">Selected</button>
              </div>
            </div>

            {/* Radar View Container */}
            <div className="relative aspect-square w-full rounded-lg bg-[#070D13] border border-[#141E2C] flex items-center justify-center overflow-hidden">
              {/* Distance Rings */}
              <div className="absolute w-[80%] h-[80%] rounded-full border border-[#162334]" />
              <div className="absolute w-[55%] h-[55%] rounded-full border border-[#162334]" />
              <div className="absolute w-[30%] h-[30%] rounded-full border border-[#1F3148]" />

              {/* Crosshair Lines */}
              <div className="absolute w-full h-[1px] bg-[#141E2C]" />
              <div className="absolute h-full w-[1px] bg-[#141E2C]" />

              {/* Radar Sweep Animation */}
              <div className="absolute w-full h-full radar-sweep pointer-events-none" />

              {/* Center Active Well AA-17H */}
              <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <span className="w-3.5 h-3.5 rounded-full bg-[#EF4444] animate-ping absolute" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#EF4444] border-2 border-white relative shadow-lg shadow-[#EF4444]" />
                <span className="font-mono text-[9px] text-white font-bold mt-1 bg-black/80 px-1 rounded border border-[#EF4444]/40">
                  AA-17H (Active)
                </span>
              </div>

              {/* Offset Wells with distance markers */}
              {/* AA-12Y (Critical Offset) */}
              <div className="absolute top-[28%] left-[72%] flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] border border-white" />
                <span className="font-mono text-[8px] text-[#EF4444] font-bold mt-0.5 bg-black/70 px-1 rounded">
                  AA-12Y (1.2 km)
                </span>
              </div>

              {/* AA-092 (Watch Offset) */}
              <div className="absolute top-[35%] left-[24%] flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] border border-white" />
                <span className="font-mono text-[8px] text-[#F59E0B] mt-0.5 bg-black/70 px-1 rounded">
                  AA-092 (2.4 km)
                </span>
              </div>

              {/* AA-037 */}
              <div className="absolute top-[72%] left-[32%] flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-white" />
                <span className="font-mono text-[8px] text-[#10B981] mt-0.5 bg-black/70 px-1 rounded">
                  AA-037 (3.8 km)
                </span>
              </div>

              {/* AA-701 */}
              <div className="absolute top-[68%] left-[78%] flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-white" />
                <span className="font-mono text-[8px] text-[#10B981] mt-0.5 bg-black/70 px-1 rounded">
                  AA-701 (5.2 km)
                </span>
              </div>

              {/* Radar Scale Legend */}
              <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[#64748B]">
                Range: 7 km radius
              </div>
            </div>

            {/* Offset Well Summary Bar */}
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-[#7E8B9B]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> AA-17H Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> 2 Relevant Offsets
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" /> 5 Other Offsets
              </span>
            </div>
          </div>

          {/* Column 3: Live Offset Alerts & Lessons Learned (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#0A0F16] border border-[#172332] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#7E8B9B]">
                <span className="uppercase tracking-wider">LIVE SIGNALS · ALERT FEED (3)</span>
                <span className="text-[#F59E0B] font-bold">NEARBY →</span>
              </div>

              {/* Dynamic Alerts Stack */}
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    onClick={() => setSelectedAlertForMitigation(alert)}
                    className={cn(
                      "p-3 rounded-lg border relative transition-all cursor-pointer group",
                      alert.acknowledged 
                        ? "bg-[#0A0E14] border-[#162230] opacity-60" 
                        : alert.severity === 'critical'
                        ? "bg-[#140D10] border-[#EF4444]/40 hover:border-[#EF4444]"
                        : alert.severity === 'watch'
                        ? "bg-[#14120D] border-[#F59E0B]/40 hover:border-[#F59E0B]"
                        : "bg-[#0C141E] border-[#0284C7]/40 hover:border-[#38BDF8]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn(
                        "text-[9px] font-mono uppercase font-bold flex items-center gap-1",
                        alert.severity === 'critical' ? "text-[#EF4444]" : alert.severity === 'watch' ? "text-[#F59E0B]" : "text-[#38BDF8]"
                      )}>
                        {!alert.acknowledged && alert.severity === 'critical' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
                        )}
                        {alert.severity === 'critical' ? 'CRITICAL RISK' : alert.severity === 'watch' ? 'WATCH RISK' : 'NORMAL BOUNDARY'}
                        {alert.acknowledged && (
                          <span className="text-[9px] bg-[#10B981]/20 text-[#10B981] px-1 rounded ml-1 font-mono">
                            ACKNOWLEDGED
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] font-mono text-[#64748B]">{alert.timeAgo}</span>
                    </div>

                    <div className="text-xs font-semibold text-white mb-1 group-hover:text-[#F59E0B] transition-colors">
                      {alert.title}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] font-mono mb-2">
                      {alert.offsetWell} · {alert.depth} · <span className={cn(
                        "font-bold",
                        alert.severity === 'critical' ? "text-[#EF4444]" : alert.severity === 'watch' ? "text-[#F59E0B]" : "text-[#38BDF8]"
                      )}>{alert.confidence}</span>
                    </div>

                    <div className="pt-2 border-t border-[#1C2634] flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[#8E9CAE] flex items-center gap-1">
                        <span>{alert.reason}</span>
                        <span className="text-[#F59E0B] opacity-0 group-hover:opacity-100 transition-opacity">· View Video Guide →</span>
                      </span>

                      <button 
                        onClick={(e) => handleAcknowledge(alert.id, e)}
                        className={cn(
                          "px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all",
                          alert.acknowledged
                            ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                            : alert.severity === 'critical'
                            ? "bg-[#EF4444]/20 hover:bg-[#EF4444]/40 text-[#EF4444]"
                            : alert.severity === 'watch'
                            ? "bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 text-[#F59E0B]"
                            : "bg-[#0284C7]/20 hover:bg-[#0284C7]/40 text-[#38BDF8]"
                        )}
                      >
                        <Check className="w-3 h-3" />
                        <span>{alert.acknowledged ? 'ACKED' : 'ACK'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Signal Mitigation & YouTube Video Modal Popup */}
            {selectedAlertForMitigation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-[#0B1119] border border-[#23354C] rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl relative overflow-hidden">
                  {/* Modal Header */}
                  <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-[#1A283A]">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        selectedAlertForMitigation.severity === 'critical' 
                          ? "bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]" 
                          : "bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]"
                      )}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded",
                            selectedAlertForMitigation.severity === 'critical' 
                              ? "bg-[#EF4444]/20 text-[#EF4444]" 
                              : "bg-[#F59E0B]/20 text-[#F59E0B]"
                          )}>
                            {selectedAlertForMitigation.severity === 'critical' ? 'CRITICAL SIGNAL MITIGATION' : 'OPERATIONAL WATCH PROTOCOL'}
                          </span>
                          <span className="text-[11px] font-mono text-[#64748B]">
                            {selectedAlertForMitigation.depth} · {selectedAlertForMitigation.offsetWell}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1">
                          {selectedAlertForMitigation.title}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedAlertForMitigation(null)}
                      className="p-1.5 rounded-lg bg-[#141F2D] hover:bg-[#1E2E42] text-[#94A3B8] hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Proven Mitigation Protocol */}
                  <div className="mb-4 p-4 rounded-xl bg-[#091512] border border-[#10B981]/30">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#10B981] font-bold mb-1.5 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      PROVEN MITIGATION RECOMMENDATION
                    </div>
                    <p className="text-xs text-white font-medium leading-relaxed mb-3">
                      {selectedAlertForMitigation.mitigation}
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-[#132A24]">
                      <div className="text-[10px] font-mono text-[#64748B] uppercase">Field Operating Steps:</div>
                      {selectedAlertForMitigation.fieldSteps.map((step, idx) => (
                        <div key={idx} className="text-[11px] font-mono text-[#34D399] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Incident Field Photos */}
                  {selectedAlertForMitigation.incidentPhotos && selectedAlertForMitigation.incidentPhotos.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold mb-2 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        INCIDENT FIELD PHOTOS
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selectedAlertForMitigation.incidentPhotos.map((photo, i) => (
                          <div key={i} className="shrink-0 rounded-lg overflow-hidden border border-[#1E2E42] w-[150px]">
                            <img
                              src={photo.url}
                              alt={photo.caption}
                              className="w-full h-[90px] object-cover"
                            />
                            <div className="px-1.5 py-1 bg-[#070D14] text-[9px] font-mono text-[#64748B] leading-tight">
                              {photo.caption}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Embedded YouTube Operational Guide Video */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-mono uppercase text-[#F59E0B] font-bold flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        TECHNICAL VIDEO DEMO
                      </div>
                      <a
                        href={`https://www.youtube.com/watch?v=${selectedAlertForMitigation.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1"
                      >
                        <span>Open on YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#1C2C3E] bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${selectedAlertForMitigation.youtubeId}?autoplay=0&rel=0`}
                        title={selectedAlertForMitigation.youtubeTitle}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Modal Footer with Acknowledge Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#162332] text-[10px] font-mono text-[#64748B]">
                    <span>Real-time correlation: {selectedAlertForMitigation.reason}</span>
                    <div className="flex items-center gap-2">
                      {!selectedAlertForMitigation.acknowledged ? (
                        <button
                          onClick={(e) => {
                            handleAcknowledge(selectedAlertForMitigation.id, e);
                          }}
                          className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors bg-[#EF4444] text-white hover:bg-[#DC2626]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Acknowledge Alert</span>
                        </button>
                      ) : (
                        <span className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-[#10B981]/20 text-[#10B981] border border-[#10B981]">
                          <Check className="w-3.5 h-3.5" />
                          Acknowledged
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedAlertForMitigation(null)}
                        className="px-3 py-1.5 rounded-lg bg-[#141F2D] hover:bg-[#1E2E42] text-white text-xs transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lessons Learned Highlight Card matching Reference Image 4 */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#0E1714] to-[#0A1210] border border-[#10B981]/40 text-xs">
              <div className="text-[10px] font-mono uppercase text-[#10B981] font-bold mb-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                LESSONS LEARNED / INSTITUTIONAL MEMORY
              </div>
              <p className="text-white font-medium leading-relaxed mb-2">
                3 of 4 offset wells saw mud losses at Tipam/Girujan contact (2,442 m).
              </p>
              <div className="p-2 rounded bg-black/40 border border-[#10B981]/30 font-mono text-[11px] text-[#34D399]">
                ✓ Recommended: reduce ECD by 0.3 ppg before entering.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Horizon Predictive Risk Bar matching Reference Image 4 */}
        <div className="mt-6 p-4 rounded-xl bg-[#0A0F16] border border-[#172332]">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#7E8B9B] mb-2">
            <span className="uppercase tracking-wider">FORMATION RISK HORIZON</span>
            <span className="text-[#EF4444] font-bold">Potential Risk at 2,442 m (92% confidence)</span>
          </div>

          <div className="w-full h-3 rounded-full bg-[#121B27] overflow-hidden relative">
            {/* Horizon Timeline Segments */}
            <div className="h-full bg-[#10B981] absolute left-0 w-[55%]" />
            <div className="h-full bg-[#F59E0B] absolute left-[55%] w-[15%]" />
            <div className="h-full bg-[#EF4444] absolute left-[70%] w-[10%]" />
            <div className="h-full bg-[#10B981] absolute left-[80%] w-[20%]" />
            
            {/* Current drill bit indicator on timeline */}
            <div
              style={{ left: `${(currentDepth / 3500) * 100}%` }}
              className="absolute top-0 bottom-0 w-2 bg-white shadow-md -translate-x-1/2"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] mt-2">
            <span>Next 250 m horizon</span>
            <span className="text-white font-bold">Current: {currentDepth} m</span>
            <span>Target: 3,500 m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
