'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, ZoomOut, Maximize2, Crosshair, MapPin, 
  AlertTriangle, ArrowRight, X, Shield, Navigation, 
  Layers, Radio, Compass, Eye
} from 'lucide-react';
import { getIncidentsForWell } from '@/lib/mock/incidents';
import { formatDepth, formatDistance, cn } from '@/lib/utils';
import type { Well } from '@/lib/types';

// ─── Props ────────────────────────────────────────────────────────────────────
interface WellMapProps {
  activeWell: Well;
  nearbyWells: (Well & { distance: number })[];
  radius: number;
  selectedWellId: string | null;
  onWellClick: (wellId: string) => void;
  onViewDetails: (wellId: string) => void;
  liveDepthFt: number;
  onSelectBasin?: (basinKey: string) => void;
  selectedBasin?: string;
}

// ─── Geo projection for India Map (16:9 satellite frame) ─────────────────────
// Center of India: Lat ~22.5° N, Lng ~78.5° E -> (50%, 50%)
function projectCoords(lat: number, lng: number): { x: number; y: number } {
  const x = 50.0 + (lng - 78.5) * 1.38;
  const y = 50.0 - (lat - 22.5) * 2.52;
  return {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(5, Math.min(95, y)),
  };
}

// ─── Marker Color by incident history ─────────────────────────────────────────
function getMarkerColor(well: Well, isActive = false): { hex: string; bg: string; border: string; label: string } {
  if (isActive) {
    return { hex: '#06B6D4', bg: 'rgba(6, 182, 212, 0.2)', border: '#06B6D4', label: 'Active Drilling' };
  }
  const incidents = getIncidentsForWell(well.id);
  if (incidents.some(i => i.severity === 'critical' || i.severity === 'high')) {
    return { hex: '#EF4444', bg: 'rgba(239, 68, 68, 0.25)', border: '#EF4444', label: 'High Risk' };
  }
  if (incidents.some(i => i.severity === 'medium')) {
    return { hex: '#F59E0B', bg: 'rgba(245, 158, 11, 0.25)', border: '#F59E0B', label: 'Medium Risk' };
  }
  return { hex: '#10B981', bg: 'rgba(16, 185, 129, 0.25)', border: '#10B981', label: 'Nominal' };
}

// ─── Major National Petroleum Basins for Macro India View ─────────────────────
export const NATIONAL_BASINS = [
  { name: 'UPPER ASSAM', key: 'assam', sub: 'OIL Main Operations', lat: 27.36, lng: 95.32 },
  { name: 'BARMER BASIN', key: 'rajasthan', sub: 'Rajasthan Field', lat: 25.75, lng: 71.40 },
  { name: 'CAMBAY BASIN', key: 'cambay', sub: 'Gujarat Field', lat: 22.30, lng: 72.60 },
  { name: 'MUMBAI OFFSHORE', key: 'mumbai', sub: 'Arabian Sea Shelf', lat: 19.40, lng: 71.30 },
  { name: 'TRIPURA GAS', key: 'tripura', sub: 'Northeast Fields', lat: 23.86, lng: 91.32 },
  { name: 'KG BASIN', key: 'kg', sub: 'Krishna-Godavari Deepwater', lat: 16.50, lng: 82.20 },
  { name: 'CAUVERY BASIN', key: 'cauvery', sub: 'Tamil Nadu Field', lat: 10.80, lng: 79.80 },
];

export default function WellMap({
  activeWell,
  nearbyWells,
  radius,
  selectedWellId,
  onWellClick,
  onViewDetails,
  liveDepthFt,
  onSelectBasin,
  selectedBasin,
}: WellMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── View Transformation State (Pan & Zoom) ─────────────────────────────────
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  // ─── HUD Toggles ────────────────────────────────────────────────────────────
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showReticle, setShowReticle] = useState<boolean>(true);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(true);
  const [showRadarSweep, setShowRadarSweep] = useState<boolean>(true);
  const [hoveredWellId, setHoveredWellId] = useState<string | null>(null);

  // Base coordinates of active well in percent
  const activePos = useMemo(() => {
    return projectCoords(activeWell.coordinates.lat, activeWell.coordinates.lng);
  }, [activeWell.coordinates]);

  // Selected well object
  const selectedWell = useMemo(() => {
    if (!selectedWellId) return null;
    if (selectedWellId === activeWell.id) return { ...activeWell, distance: 0 };
    return nearbyWells.find(w => w.id === selectedWellId) || null;
  }, [selectedWellId, activeWell, nearbyWells]);

  // Auto-focus on active well when it changes across basins
  useEffect(() => {
    if (activeWell) {
      const pos = projectCoords(activeWell.coordinates.lat, activeWell.coordinates.lng);
      const targetX = -(pos.x - 50) * 11;
      const targetY = -(pos.y - 50) * 11;
      setZoom(3.2);
      setPan({ x: targetX, y: targetY });
    }
  }, [activeWell?.id]);

  // ─── Zoom Controls ──────────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(6, prev * 1.35));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const next = Math.max(1, prev / 1.35);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetIndiaView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFocusField = useCallback(() => {
    // Center on active well in current basin
    const targetX = -(activePos.x - 50) * 11;
    const targetY = -(activePos.y - 50) * 11;
    setZoom(3.2);
    setPan({ x: targetX, y: targetY });
  }, [activePos]);

  // ─── Pan Drag Handlers ──────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, .interactive-card, input')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom(prev => {
      const next = Math.max(1, Math.min(6, prev * factor));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // When selectedWellId changes from outside, focus slightly if desired
  useEffect(() => {
    if (!selectedWellId) return;
    const target = selectedWellId === activeWell.id ? activeWell : nearbyWells.find(w => w.id === selectedWellId);
    if (target && zoom > 1.5) {
      const pos = projectCoords(target.coordinates.lat, target.coordinates.lng);
      setPan({
        x: -(pos.x - 50) * (zoom * 3),
        y: -(pos.y - 50) * (zoom * 3),
      });
    }
  }, [selectedWellId, activeWell, nearbyWells, zoom]);

  // Spread local well coordinates when zoomed in so nearby wells don't overlap
  const wellsWithRenderPositions = useMemo(() => {
    return nearbyWells.map((well, index) => {
      const basePos = projectCoords(well.coordinates.lat, well.coordinates.lng);
      // When zoomed in, amplify local difference from active well slightly for crisp distinction
      const dLat = well.coordinates.lat - activeWell.coordinates.lat;
      const dLng = well.coordinates.lng - activeWell.coordinates.lng;
      const zoomExpansion = zoom >= 2.5 ? (zoom - 1) * 2.2 : 1;
      
      const renderX = activePos.x + (basePos.x - activePos.x) * zoomExpansion;
      const renderY = activePos.y + (basePos.y - activePos.y) * zoomExpansion;

      // Deterministic angle for leader line tag offset
      const angle = (index * (360 / Math.max(1, nearbyWells.length))) * (Math.PI / 180);
      const tagOffsetDist = zoom > 2.5 ? 42 : 32;
      const tagX = Math.cos(angle) * tagOffsetDist;
      const tagY = Math.sin(angle) * tagOffsetDist;

      return {
        ...well,
        pos: { x: renderX, y: renderY },
        tagOffset: { x: tagX, y: tagY },
        style: getMarkerColor(well),
      };
    });
  }, [nearbyWells, activeWell, activePos, zoom]);

  // Pixel radius for search circle based on radius in km and current zoom
  const radiusPx = useMemo(() => {
    // 50 km ≈ 35px at zoom 1, scales with zoom
    return Math.max(20, (radius / 1.5) * (zoom * 0.95));
  }, [radius, zoom]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className={cn(
        "relative w-full h-full bg-[#05080C] overflow-hidden select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{ touchAction: 'none' }}
    >
      {/* ── 1. MAP TRANSFORM CONTAINER (Scale & Pan) ────────────────────────── */}
      <div
        className="absolute inset-0 transition-transform duration-100 ease-out origin-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* ── High-Fidelity Satellite Reconnaissance Map ────────────────────── */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/images/india_satellite_clean.jpg')`,
            filter: 'contrast(1.08) brightness(1.02)',
          }}
        />

        {/* Subtle glowing vignette around India */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(225,29,72,0.06)_0%,rgba(5,8,12,0.4)_75%,rgba(5,8,12,0.85)_100%)] pointer-events-none" />

        {/* ── Tactical Grid Overlay (in map coordinate space) ───────────────── */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none opacity-25">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="tacticalGridMap" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#64FFB4" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.6" />
                  <circle cx="80" cy="0" r="1.5" fill="#64FFB4" opacity="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tacticalGridMap)" />
            </svg>
          </div>
        )}

        {/* ── 2. EXACT HUD TARGETING RETICLE OVER INDIA (from reference image) ── */}
        {showReticle && (
          <div 
            className="absolute pointer-events-none"
            style={{
              left: '49.8%',
              top: '49.8%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* Outer faint circle */}
              <div className="absolute inset-0 rounded-full border border-white/30" />
              
              {/* Inner target circle */}
              <div className="w-28 h-28 rounded-full border border-white/50 relative flex items-center justify-center">
                {/* Center crosshair */}
                <div className="absolute w-full h-[1px] bg-white/60" />
                <div className="absolute h-full w-[1px] bg-white/60" />
                <div className="w-2.5 h-2.5 rounded-full border border-white/80 bg-white/10" />
              </div>

              {/* Tick marks on 4 axes */}
              <div className="absolute -top-3 w-1.5 h-3 bg-white/70" />
              <div className="absolute -bottom-3 w-1.5 h-3 bg-white/70" />
              <div className="absolute -left-3 h-1.5 w-3 bg-white/70" />
              <div className="absolute -right-3 h-1.5 w-3 bg-white/70" />

              {/* ── Technical Pointer Line to "INDIA" (Exact match) ─────────── */}
              <svg 
                className="absolute overflow-visible pointer-events-none"
                style={{ top: '38%', left: '50%', width: '130px', height: '60px' }}
              >
                {/* Horizontal line from center to right, small notch */}
                <path
                  d="M 0 0 L 52 0 L 62 -14 L 115 -14"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.85)"
                  strokeWidth="1.2"
                />
                {/* Indicator circle anchor */}
                <circle cx="115" cy="-14" r="3.5" fill="#E11D48" stroke="white" strokeWidth="1.2" />
              </svg>

              {/* "INDIA" Label matching image */}
              <div 
                className="absolute font-mono text-[13px] font-extrabold tracking-widest text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] px-1.5 py-0.5 rounded border border-white/40 bg-black/40 backdrop-blur-xs flex items-center gap-1.5"
                style={{ top: '14%', left: '88%' }}
              >
                <span>INDIA</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48] animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* ── 3. SEARCH RADIUS ZONE & RADAR SWEEP (around active well) ────────── */}
        <div
          className="absolute pointer-events-none transition-all duration-300"
          style={{
            left: `${activePos.x}%`,
            top: `${activePos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Radius perimeter ring */}
          <div
            className="rounded-full border border-cyan-400/60 bg-cyan-500/5 relative flex items-center justify-center transition-all duration-300"
            style={{
              width: `${radiusPx * 2}px`,
              height: `${radiusPx * 2}px`,
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.15), inset 0 0 20px rgba(6, 182, 212, 0.1)',
            }}
          >
            {/* Dashed outer boundary */}
            <div className="absolute inset-0 rounded-full border border-dashed border-cyan-300/40" />

            {/* Radar beam rotation */}
            {showRadarSweep && (
              <div 
                className="absolute inset-0 rounded-full animate-spin pointer-events-none"
                style={{
                  animationDuration: '6s',
                  background: 'conic-gradient(from 0deg, transparent 0deg, transparent 310deg, rgba(6, 182, 212, 0.25) 360deg)',
                }}
              />
            )}

            {/* Radius label badge */}
            <div className="absolute -bottom-6 px-1.5 py-0.5 rounded bg-black/80 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 tracking-wider whitespace-nowrap shadow-md">
              OFFSET RADIUS: {radius} KM
            </div>
          </div>
        </div>

        {/* ── 4. WELL MARKERS POINTING ON INDIA ─────────────────────────────── */}
        
        {/* Active Well Marker (Primary Target) */}
        <div
          className="absolute z-30 transition-transform duration-150"
          style={{
            left: `${activePos.x}%`,
            top: `${activePos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <button
            onClick={() => onWellClick(activeWell.id)}
            className="relative flex items-center justify-center group cursor-pointer focus:outline-hidden"
            title={`${activeWell.name} (Active Well)`}
          >
            {/* Outer radar pulse rings */}
            <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-cyan-400 opacity-40" />
            <span className="animate-pulse absolute inline-flex h-6 w-6 rounded-full bg-cyan-500/30" />
            
            {/* Core Beacon */}
            <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-[#070A0E] border-2 border-cyan-400 shadow-[0_0_12px_#06B6D4]">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            </span>

            {/* Leader line pointing to Active Well Callout */}
            <div className="absolute top-1/2 left-full pointer-events-none flex items-center">
              <svg width="34" height="24" className="overflow-visible">
                <path
                  d="M 0 0 L 16 -12 L 32 -12"
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="1.5"
                />
                <circle cx="32" cy="-12" r="2" fill="#06B6D4" />
              </svg>

              <div className="ml-1 -translate-y-3 px-2 py-1 rounded bg-[#070B11]/90 border border-cyan-400/70 shadow-lg backdrop-blur-xs flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <div className="text-left font-mono">
                  <p className="text-[11px] font-bold text-white tracking-wide leading-none">{activeWell.name}</p>
                  <p className="text-[9px] text-cyan-300 mt-0.5 leading-none">ACTIVE DRILL · {liveDepthFt.toLocaleString()} ft</p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Nearby / Offset Wells */}
        {wellsWithRenderPositions.map((well) => {
          const isSelected = selectedWellId === well.id;
          const isHovered = hoveredWellId === well.id;

          return (
            <div
              key={well.id}
              className="absolute z-20"
              style={{
                left: `${well.pos.x}%`,
                top: `${well.pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="relative flex items-center justify-center">
                {/* Marker Button */}
                <button
                  onClick={() => onWellClick(well.id)}
                  onMouseEnter={() => setHoveredWellId(well.id)}
                  onMouseLeave={() => setHoveredWellId(null)}
                  className="relative group p-1 cursor-pointer focus:outline-hidden"
                >
                  {/* Selected / Hover highlight rings */}
                  {(isSelected || isHovered) && (
                    <span 
                      className="absolute inset-0 -m-2 rounded-full border border-dashed animate-spin-slow opacity-80"
                      style={{ borderColor: well.style.hex }}
                    />
                  )}
                  {isSelected && (
                    <span 
                      className="animate-ping absolute inset-0 rounded-full opacity-60"
                      style={{ backgroundColor: well.style.hex }}
                    />
                  )}

                  {/* Marker Pin */}
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all duration-150",
                      isSelected ? "w-4 h-4 border-2" : "w-3 h-3 border"
                    )}
                    style={{
                      backgroundColor: well.style.hex,
                      borderColor: '#FFFFFF',
                      boxShadow: `0 0 8px ${well.style.hex}`,
                      transform: isHovered || isSelected ? 'scale(1.25)' : 'scale(1)',
                    }}
                  >
                    <span className="w-1 h-1 rounded-full bg-white" />
                  </span>
                </button>

                {/* Sleek Leader Callout Line & Tag */}
                <div
                  className="absolute pointer-events-none transition-opacity duration-150"
                  style={{
                    left: `${well.tagOffset.x > 0 ? '100%' : 'auto'}`,
                    right: `${well.tagOffset.x <= 0 ? '100%' : 'auto'}`,
                    top: `${well.tagOffset.y > 0 ? '100%' : 'auto'}`,
                    bottom: `${well.tagOffset.y <= 0 ? '100%' : 'auto'}`,
                    transform: `translate(${well.tagOffset.x > 0 ? '4px' : '-4px'}, ${well.tagOffset.y > 0 ? '4px' : '-4px'})`,
                    opacity: zoom >= 1.8 || isSelected || isHovered ? 1 : 0.75,
                  }}
                >
                  <div
                    onClick={() => onWellClick(well.id)}
                    className={cn(
                      "pointer-events-auto cursor-pointer px-1.5 py-0.5 rounded font-mono text-[9px] whitespace-nowrap border backdrop-blur-xs transition-all",
                      isSelected
                        ? "bg-[#091019] text-white border-white shadow-[0_0_10px_rgba(255,255,255,0.3)] font-bold"
                        : "bg-[#070A0E]/85 text-[#C8D3DF] border-[#1C2836] hover:border-white/50 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: well.style.hex }} />
                      <span>{well.name}</span>
                      <span className="text-[8px] text-muted-foreground">({formatDistance(well.distance)})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Macro Basins Label Nodes (shown on full India view to orient user) */}
        {zoom < 2.5 && NATIONAL_BASINS.map((b) => {
          const pos = projectCoords(b.lat, b.lng);
          const isSelected = selectedBasin === b.key || (!selectedBasin && b.key === 'assam');
          return (
            <div
              key={b.name}
              className="absolute z-25 transition-all"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectBasin) onSelectBasin(b.key);
                }}
                className="group flex flex-col items-center cursor-pointer focus:outline-hidden p-1"
                title={`Switch to ${b.name}`}
              >
                <span className={cn(
                  "w-2 h-2 rounded-full mb-1 transition-all",
                  isSelected
                    ? "bg-cyan-400 ring-4 ring-cyan-400/40 animate-ping"
                    : "bg-emerald-400/80 group-hover:bg-cyan-300 group-hover:scale-125"
                )} />
                <span className={cn(
                  "font-mono text-[8px] tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap shadow-md backdrop-blur-xs transition-all",
                  isSelected
                    ? "bg-cyan-950/90 text-cyan-200 border-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                    : "bg-black/75 text-white/80 border-white/20 group-hover:border-cyan-400 group-hover:text-white"
                )}>
                  {b.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── 5. STATIC HUD CHROME (Fixed on top of map, does not pan) ───────── */}

      {/* Surveillance Camera Framing Brackets */}
      <div className="absolute inset-3 pointer-events-none border border-white/10 rounded-sm">
        {/* Corner Brackets */}
        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-white/80" />
        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-white/80" />
        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-white/80" />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-white/80" />

        {/* Corner Coordinate Crosses */}
        <div className="absolute top-2 left-2 text-white/50 font-mono text-[10px]">+</div>
        <div className="absolute top-2 right-2 text-white/50 font-mono text-[10px]">+</div>
        <div className="absolute bottom-2 left-2 text-white/50 font-mono text-[10px]">+</div>
        <div className="absolute bottom-2 right-2 text-white/50 font-mono text-[10px]">+</div>
      </div>

      {/* Scanline CRT overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Top-Left Telemetry Box */}
      {showTelemetry && (
        <div className="absolute top-5 left-5 pointer-events-none bg-[#070D14]/80 border border-white/15 backdrop-blur-md px-3 py-2 rounded font-mono text-[10px] text-white/80 space-y-0.5 shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SAT-SURV // INDIA SECTOR</span>
          </div>
          <p className="text-white/60">LAT: {activeWell.coordinates.lat.toFixed(2)}°N · LON: {activeWell.coordinates.lng.toFixed(2)}°E</p>
          <p className="text-white/60">SENSOR: NVD/RADAR · ALT: 412.5 KM</p>
          <div className="text-[9px] text-cyan-400 font-semibold pt-0.5 border-t border-white/10 mt-1">
            {activeWell.operator?.toUpperCase() || 'OPERATOR'} · {activeWell.field?.toUpperCase() || 'HYDROCARBON SECTOR'}
          </div>
        </div>
      )}

      {/* Top-Right Telemetry Badge */}
      {showTelemetry && (
        <div className="absolute top-5 right-5 pointer-events-none bg-[#070D14]/80 border border-white/15 backdrop-blur-md px-3 py-2 rounded font-mono text-[10px] text-right text-white/80 space-y-0.5 shadow-xl">
          <div className="text-rose-400 font-bold tracking-wider">
            RED: TARGET REGION [INDIA]
          </div>
          <p className="text-emerald-400/80">GREEN: SURVEILLANCE ZONE</p>
          <p className="text-white/50">OFFSET WELLS: {nearbyWells.length} TRACKED</p>
        </div>
      )}

      {/* Bottom-Left Status Bar */}
      <div className="absolute bottom-5 left-5 pointer-events-none flex items-center gap-3">
        <div className="bg-[#070D14]/85 border border-white/15 backdrop-blur-md px-3 py-1.5 rounded font-mono text-[10px] text-white/70 flex items-center gap-2.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>ZOOM: {zoom.toFixed(1)}x</span>
          <span className="text-white/20">|</span>
          <span>RADIUS: {radius} KM</span>
          <span className="text-white/20">|</span>
          <span className="text-emerald-400">ACTIVE: {activeWell.name}</span>
        </div>
      </div>

      {/* ── 6. TACTICAL MAP CONTROLS (Top-Right / Bottom-Right) ─────────────── */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 z-40">
        <div className="flex items-center gap-1 bg-[#0A1017]/90 border border-white/15 p-1 rounded-lg backdrop-blur-md shadow-2xl">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
            title="Zoom Out (−)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-4 w-[1px] bg-white/20 mx-0.5" />
          <button
            onClick={handleResetIndiaView}
            className={cn(
              "px-2 py-1 rounded text-xs font-mono font-medium transition-colors flex items-center gap-1.5",
              zoom === 1 ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "hover:bg-white/10 text-white/80"
            )}
            title="Full India Tactical Satellite View"
          >
            <Maximize2 className="w-3 h-3" />
            <span>All India</span>
          </button>
          <button
            onClick={handleFocusField}
            className="px-2 py-1 rounded text-xs font-mono font-medium hover:bg-white/10 text-cyan-300 transition-colors flex items-center gap-1.5"
            title="Focus on Active Well Field"
          >
            <Crosshair className="w-3 h-3 text-cyan-400" />
            <span>Focus Field</span>
          </button>
        </div>

        {/* Secondary View Toggles */}
        <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono text-white/60">
          <button
            onClick={() => setShowReticle(prev => !prev)}
            className={cn(
              "px-1.5 py-0.5 rounded border transition-colors",
              showReticle ? "bg-white/10 border-white/30 text-white" : "border-white/10 text-white/40"
            )}
          >
            Reticle
          </button>
          <button
            onClick={() => setShowGrid(prev => !prev)}
            className={cn(
              "px-1.5 py-0.5 rounded border transition-colors",
              showGrid ? "bg-white/10 border-white/30 text-white" : "border-white/10 text-white/40"
            )}
          >
            Grid
          </button>
          <button
            onClick={() => setShowRadarSweep(prev => !prev)}
            className={cn(
              "px-1.5 py-0.5 rounded border transition-colors",
              showRadarSweep ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "border-white/10 text-white/40"
            )}
          >
            Sweep
          </button>
        </div>
      </div>

      {/* ── 7. SELECTED WELL DETAIL INSPECTION POPUP ────────────────────────── */}
      <AnimatePresence>
        {selectedWell && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-20 right-6 z-50 w-80 bg-[#0A1017]/95 border border-cyan-500/30 rounded-xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl interactive-card text-white font-sans"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: getMarkerColor(selectedWell, selectedWell.id === activeWell.id).hex }}
                />
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">{selectedWell.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedWell.field} · {selectedWell.block}</p>
                </div>
              </div>
              <button
                onClick={() => onWellClick('')}
                className="text-white/40 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 my-3 font-mono text-xs">
              <div className="bg-[#101722]/80 border border-white/5 rounded-lg p-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Status</span>
                <span className="font-semibold text-white capitalize">{selectedWell.status}</span>
              </div>
              <div className="bg-[#101722]/80 border border-white/5 rounded-lg p-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Total Depth</span>
                <span className="font-semibold text-cyan-300">{formatDepth(selectedWell.totalDepthFt)} ft</span>
              </div>
              <div className="bg-[#101722]/80 border border-white/5 rounded-lg p-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Offset Distance</span>
                <span className="font-semibold text-white">
                  {selectedWell.id === activeWell.id ? 'Active Reference' : formatDistance(selectedWell.distance)}
                </span>
              </div>
              <div className="bg-[#101722]/80 border border-white/5 rounded-lg p-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Incidents</span>
                {(() => {
                  const incs = getIncidentsForWell(selectedWell.id);
                  const high = incs.filter(i => i.severity === 'high' || i.severity === 'critical');
                  return (
                    <span className={cn(
                      "font-semibold",
                      high.length > 0 ? "text-rose-400" : (incs.length > 0 ? "text-amber-400" : "text-emerald-400")
                    )}>
                      {incs.length} recorded {high.length > 0 && `(${high.length} high)`}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* High risk alert badge if exists */}
            {(() => {
              const incs = getIncidentsForWell(selectedWell.id);
              const high = incs.find(i => i.severity === 'high' || i.severity === 'critical');
              if (!high) return null;
              return (
                <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{high.description} ({high.formation || 'Subsurface'})</span>
                </div>
              );
            })()}

            {/* Action Button */}
            <button
              onClick={() => onViewDetails(selectedWell.id)}
              className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-900/30 cursor-pointer"
            >
              <span>View Well Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
