'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  ShieldCheck, 
  Flame, 
  Droplet, 
  Layers, 
  Compass, 
  Crosshair, 
  Radio
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

interface BasinItem {
  id: string;
  name: string;
  type: string;
  subRegion: string;
  fields: string;
  status: 'active' | 'standby';
  color: string;
  mapCoords: { x: number; y: number };
  leaderLine: {
    cardX: number;
    cardY: number;
    elbowX: number;
    elbowY: number;
    anchorSide: 'left' | 'right' | 'top' | 'bottom';
  };
  wellsCount: number;
  tag?: string;
  operator: string;
}

const BASINS: BasinItem[] = [
  {
    id: 'rajasthan',
    name: 'Barmer Basin',
    type: 'Oil',
    subRegion: 'Western Rajasthan',
    fields: 'Mangala · Bhagyam · Aishwarya · Raageshwari',
    status: 'active',
    color: '#F97316',
    mapCoords: { x: 145, y: 245 },
    leaderLine: { cardX: 18, cardY: 130, elbowX: 85, elbowY: 175, anchorSide: 'left' },
    wellsCount: 4,
    operator: 'Vedanta / Cairn',
  },
  {
    id: 'cambay',
    name: 'Cambay Basin',
    type: 'Oil + Gas',
    subRegion: 'Gujarat (Ankleshwar, Mehsana, Kalol)',
    fields: 'Ankleshwar · Kalol · Mehsana · Sanand',
    status: 'active',
    color: '#F59E0B',
    mapCoords: { x: 142, y: 355 },
    leaderLine: { cardX: 18, cardY: 340, elbowX: 95, elbowY: 355, anchorSide: 'left' },
    wellsCount: 4,
    operator: 'ONGC',
  },
  {
    id: 'mumbai',
    name: 'Mumbai High',
    type: 'Oil + Gas',
    subRegion: 'Arabian Sea (160 km West of Mumbai)',
    fields: 'MH-North · MH-South · Heera · Neelam',
    status: 'active',
    color: '#EF4444',
    mapCoords: { x: 120, y: 410 },
    leaderLine: { cardX: 18, cardY: 480, elbowX: 90, elbowY: 440, anchorSide: 'left' },
    wellsCount: 4,
    operator: 'ONGC Offshore',
  },
  {
    id: 'assam',
    name: 'Assam Fields',
    type: 'Oil + Gas',
    subRegion: 'Upper Assam (Brahmaputra Valley)',
    fields: 'Duliajan · Lakwa · Moran · Naharkatia · Baghjan',
    status: 'active',
    color: '#10B981',
    mapCoords: { x: 520, y: 220 },
    leaderLine: { cardX: 470, cardY: 105, elbowX: 485, elbowY: 175, anchorSide: 'right' },
    wellsCount: 18,
    tag: 'OIL Headquarters Hub',
    operator: 'Oil India Limited',
  },
  {
    id: 'tripura',
    name: 'Tripura Gas Fields',
    type: 'Natural Gas',
    subRegion: 'Tripura (Northeast India Fold Belt)',
    fields: 'Agartala Dome · Rokhia · KUB',
    status: 'active',
    color: '#EAB308',
    mapCoords: { x: 475, y: 320 },
    leaderLine: { cardX: 475, cardY: 260, elbowX: 495, elbowY: 300, anchorSide: 'right' },
    wellsCount: 3,
    operator: 'ONGC / GAIL',
  },
  {
    id: 'kg',
    name: 'KG Basin',
    type: 'Deepwater Gas',
    subRegion: 'Offshore Andhra Pradesh (Bay of Bengal)',
    fields: 'Godavari Deepwater · KG-D6 · Ravva',
    status: 'active',
    color: '#A855F7',
    mapCoords: { x: 335, y: 450 },
    leaderLine: { cardX: 470, cardY: 460, elbowX: 415, elbowY: 475, anchorSide: 'right' },
    wellsCount: 3,
    operator: 'RIL / ONGC',
  },
  {
    id: 'cauvery',
    name: 'Cauvery Basin',
    type: 'Oil + Gas',
    subRegion: 'Tamil Nadu (Narimanam, Kovilkalappal)',
    fields: 'Narimanam · Kovilkalappal · Bhuvanagiri',
    status: 'active',
    color: '#06B6D4',
    mapCoords: { x: 265, y: 565 },
    leaderLine: { cardX: 340, cardY: 595, elbowX: 305, elbowY: 585, anchorSide: 'right' },
    wellsCount: 3,
    operator: 'ONGC',
  },
];

export default function BasinSelectorPage() {
  const router = useRouter();
  const { setSelectedBasin: setStoreBasin } = useAppStore();
  const [selectedBasin, setSelectedBasin] = useState<string>('assam');
  const [hoveredBasin, setHoveredBasin] = useState<string | null>(null);

  const activeBasinObj = BASINS.find(b => b.id === selectedBasin) || BASINS[0];

  const handleEnterBasin = (basinId: string) => {
    setStoreBasin(basinId);
    router.push(`/overview?basin=${basinId}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white flex flex-col justify-between p-4 sm:p-8 subsurface-grid select-none">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between text-xs font-mono text-[#8E9CAE] mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[#10B981] font-bold">●</span>
            <span className="uppercase tracking-wider">INDIA / BASIN SELECTOR</span>
          </div>
          <div className="text-[11px] text-[#64748B]">STEP 02 / 03 · NATIONAL SUBSURFACE INTELLIGENCE</div>
        </div>

        {/* Step Title & Subtitle */}
        <div className="text-center my-4">
          <div className="text-[10px] font-mono tracking-widest text-[#F59E0B] uppercase mb-1">
            02 — NATIONAL SUBSURFACE INTELLIGENCE
          </div>
          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white mb-2">
            India — Major Oil & Gas Fields
          </h1>
          <p className="text-xs sm:text-sm text-[#8898AA] max-w-xl mx-auto leading-relaxed">
            Select an operating basin to enter its live field workspace with real-time well telemetry, risk models, and formation stratigraphy.
          </p>
        </div>

        {/* Basin Map & Selector Grid */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ── Left 7 Cols: Full Tactical India Map ─────────────────────────── */}
          <div className="lg:col-span-7 bg-[#0A0F15] border border-[#172332] rounded-xl p-4 relative overflow-hidden shadow-2xl">
            {/* Top map status labels */}
            <div className="flex items-center justify-between font-mono text-[10px] text-[#64748B] mb-2">
              <div className="flex items-center gap-1.5 text-[#10B981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>LIVE GEOLOGY LAYER</span>
              </div>
              <div className="text-[#475569] uppercase tracking-wider">INDIA / SEDIMENTARY BASINS</div>
            </div>

            {/* Geological Map Container */}
            <div className="relative aspect-[4/3.8] w-full rounded-lg bg-[#05080C] border border-[#141E2C] flex items-center justify-center p-1 overflow-hidden">
              
              {/* Tactical coordinate grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#15202E_1px,transparent_1px),linear-gradient(to_bottom,#15202E_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none" />

              {/* Water labels for surrounding seas */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-left">
                <span className="font-mono text-[11px] font-bold text-cyan-400/40 tracking-widest uppercase block">
                  Arabian
                </span>
                <span className="font-mono text-[11px] font-bold text-cyan-400/40 tracking-widest uppercase block">
                  Sea
                </span>
              </div>

              <div className="absolute right-12 bottom-28 pointer-events-none text-right">
                <span className="font-mono text-[11px] font-bold text-cyan-400/40 tracking-widest uppercase block">
                  Bay of
                </span>
                <span className="font-mono text-[11px] font-bold text-cyan-400/40 tracking-widest uppercase block">
                  Bengal
                </span>
              </div>

              {/* ── HIGH-PRECISION ACCURATE INDIA SVG MAP ───────────────────── */}
              <svg 
                viewBox="0 0 640 700" 
                className="w-full h-full max-h-[520px] drop-shadow-2xl overflow-visible select-none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Glowing Crimson Fill for India */}
                  <linearGradient id="indiaCrimsonGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#E11D48" stopOpacity="0.95" />
                    <stop offset="45%" stopColor="#BE123C" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#881337" stopOpacity="0.85" />
                  </linearGradient>

                  {/* Soft tactical glow filter */}
                  <filter id="indiaBorderGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* Water bathymetry pattern */}
                  <pattern id="waterRipple" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 0 15 Q 7.5 10 15 15 T 30 15" fill="none" stroke="#0EA5E9" strokeWidth="0.4" opacity="0.12" />
                  </pattern>
                </defs>

                {/* Surrounding Water Background */}
                <rect x="0" y="0" width="640" height="700" fill="url(#waterRipple)" pointerEvents="none" />

                {/* ── ACCURATE INDIA MAINLAND SILHOUETTE ── */}
                {/* 
                  Accurate Geo Path covering:
                  1. Northern Kashmir & Ladakh Crown (Indira Col, Siachen, Karakoram)
                  2. Punjab border
                  3. Rajasthan western desert bulge (Jaisalmer, Barmer)
                  4. Gujarat (Rann of Kutch, Gulf of Kutch, Saurashtra / Kathiawar peninsula, Gulf of Khambhat)
                  5. West Coast (Mumbai, Goa, Karnataka, Kerala)
                  6. Southernmost Tip (Kanyakumari / Cape Comorin)
                  7. East Coast (Tamil Nadu, Cauvery delta, Andhra coast / KG, Odisha, Bengal)
                  8. Northern border along Nepal & Uttarakhand
                  9. Sikkim Thumb
                  10. Bhutan border
                  11. Northeast corridor & Arunachal Pradesh crown loop
                  12. Nagaland, Manipur, Mizoram southern finger
                  13. Tripura notch
                  14. Meghalaya plateau & connection back to Bengal
                */}
                <path
                  d="
                    M 235,24
                    C 248,16 262,20 274,32
                    L 292,54
                    C 305,74 300,95 285,115
                    L 268,135
                    C 285,150 305,165 315,180
                    L 345,198 L 380,218 L 415,232
                    L 424,208 L 432,192 L 440,208 L 445,232
                    L 465,235 L 485,235
                    C 505,215 530,198 555,195
                    C 575,192 590,205 592,225
                    C 595,245 580,265 565,280
                    L 545,305 L 530,345
                    C 525,355 515,355 508,340
                    L 498,318
                    C 490,305 480,312 472,328
                    C 465,340 455,335 452,320
                    L 450,295 L 435,282 L 418,270
                    L 412,285 L 415,315
                    C 405,335 385,365 365,395
                    C 345,425 320,460 295,495
                    C 282,515 272,545 268,575
                    C 265,595 252,620 238,646
                    C 234,654 228,654 225,646
                    C 212,618 198,580 188,548
                    C 178,515 168,475 160,438
                    L 155,395 L 148,375
                    C 135,392 115,398 98,390
                    C 80,380 75,355 85,335
                    C 95,318 112,315 125,318
                    L 105,315
                    C 80,312 68,300 75,288
                    C 82,276 105,272 125,275
                    L 142,270
                    C 125,245 115,220 128,195
                    C 138,175 155,155 168,135
                    L 175,105
                    C 178,82 188,55 208,35
                    Z
                  "
                  fill="url(#indiaCrimsonGrad)"
                  stroke="#FDA4AF"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  filter="url(#indiaBorderGlow)"
                  className="transition-all duration-300"
                />

                {/* State outline highlights (tactical boundary hints) */}
                {/* Rajasthan */}
                <path
                  d="M 175,140 C 160,175 140,215 145,265 C 160,265 185,255 205,245 C 215,210 205,175 188,150 Z"
                  fill="#F97316"
                  fillOpacity="0.18"
                  stroke="#FB923C"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Gujarat */}
                <path
                  d="M 142,270 C 120,275 80,285 75,305 C 105,318 125,318 110,335 C 80,355 95,385 135,385 C 150,375 155,350 145,340 Z"
                  fill="#F59E0B"
                  fillOpacity="0.22"
                  stroke="#FBBF24"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Assam / Northeast Corridor */}
                <path
                  d="M 445,235 C 485,232 525,205 565,195 C 585,210 575,245 545,265 C 515,275 475,280 445,280 Z"
                  fill="#10B981"
                  fillOpacity="0.25"
                  stroke="#34D399"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />

                {/* Andhra Coast / KG Basin Shoreline */}
                <path
                  d="M 295,495 C 320,460 345,425 365,395 C 350,385 320,420 285,465 Z"
                  fill="#A855F7"
                  fillOpacity="0.2"
                  stroke="#C084FC"
                  strokeWidth="0.8"
                />

                {/* Sri Lanka */}
                <ellipse cx="265" cy="672" rx="14" ry="22" fill="#BE123C" stroke="#FDA4AF" strokeWidth="1.2" />

                {/* Andaman & Nicobar Islands (strategic shelf) */}
                <g opacity="0.75">
                  <ellipse cx="485" cy="460" rx="3.5" ry="12" fill="#BE123C" stroke="#FDA4AF" strokeWidth="0.8" />
                  <ellipse cx="492" cy="495" rx="3" ry="9" fill="#BE123C" stroke="#FDA4AF" strokeWidth="0.8" />
                  <ellipse cx="500" cy="535" rx="4" ry="15" fill="#BE123C" stroke="#FDA4AF" strokeWidth="0.8" />
                </g>

                {/* Lakshadweep */}
                <circle cx="168" cy="565" r="2.5" fill="#FDA4AF" />
                <circle cx="172" cy="585" r="2.5" fill="#FDA4AF" />

                {/* ── EXACT "INDIA" TARGET RETICLE FROM USER'S REFERENCE ── */}
                <g transform="translate(265, 345)" pointerEvents="none">
                  {/* Concentric targeting circles */}
                  <circle r="44" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  <circle r="30" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" />
                  
                  {/* Crosshairs */}
                  <line x1="-55" y1="0" x2="55" y2="0" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
                  <line x1="0" y1="-55" x2="0" y2="55" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
                  
                  {/* Technical Pointer Leader Line to "INDIA" */}
                  <path d="M 0,-14 L 32,-38 L 75,-38" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" />
                  <circle cx="75" cy="-38" r="3.5" fill="#E11D48" stroke="#FFFFFF" strokeWidth="1.2" />
                  
                  {/* INDIA HUD badge */}
                  <rect x="82" y="-48" width="52" height="20" rx="3" fill="rgba(0,0,0,0.7)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" />
                  <text x="89" y="-34" fill="#FFFFFF" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="2">INDIA</text>
                </g>

                {/* ── CALLOUT LEADER LINES & ARROWS (Matching Image 2) ── */}
                {BASINS.map((b) => {
                  const isSelected = selectedBasin === b.id;
                  const isHovered = hoveredBasin === b.id;
                  const strokeColor = isSelected ? '#FFFFFF' : (isHovered ? b.color : `${b.color}B3`);
                  const strokeW = isSelected ? 2 : (isHovered ? 1.8 : 1.2);

                  // Leader line path from card to marker pin
                  const pathD = `M ${b.leaderLine.cardX} ${b.leaderLine.cardY} L ${b.leaderLine.elbowX} ${b.leaderLine.elbowY} L ${b.mapCoords.x} ${b.mapCoords.y}`;

                  return (
                    <g key={`leader-${b.id}`} pointerEvents="none" className="transition-all duration-200">
                      {/* Leader Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeW}
                        strokeDasharray={isSelected ? 'none' : '4 2'}
                        filter={isSelected ? 'drop-shadow(0 0 4px rgba(255,255,255,0.8))' : 'none'}
                      />

                      {/* Small Terminal Circle on Leader Line */}
                      <circle cx={b.leaderLine.cardX} cy={b.leaderLine.cardY} r="2.5" fill={b.color} />
                    </g>
                  );
                })}

                {/* ── MAP MARKER PINS ON INDIA (Exact Locations) ── */}
                {BASINS.map((b) => {
                  const isSelected = selectedBasin === b.id;
                  const isHovered = hoveredBasin === b.id;

                  return (
                    <g
                      key={`pin-${b.id}`}
                      transform={`translate(${b.mapCoords.x}, ${b.mapCoords.y})`}
                      className="cursor-pointer"
                      onClick={() => setSelectedBasin(b.id)}
                      onMouseEnter={() => setHoveredBasin(b.id)}
                      onMouseLeave={() => setHoveredBasin(null)}
                    >
                      {/* Pulsing Radar Ring */}
                      <circle
                        r={isSelected ? 16 : 11}
                        fill={b.color}
                        fillOpacity="0.25"
                        stroke={b.color}
                        strokeWidth="1.2"
                        className="animate-ping"
                        style={{ transformOrigin: '0 0' }}
                      />

                      {/* Outer targeting crosshair */}
                      {(isSelected || isHovered) && (
                        <g stroke={b.color} strokeWidth="1">
                          <circle r="14" fill="none" strokeDasharray="3 3" />
                          <line x1="-18" y1="0" x2="18" y2="0" />
                          <line x1="0" y1="-18" x2="0" y2="18" />
                        </g>
                      )}

                      {/* Red / Accent Map Marker Pin (As in Image 2) */}
                      <circle
                        r={isSelected ? 6.5 : 5}
                        fill="#EF4444"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        filter="drop-shadow(0 2px 5px rgba(0,0,0,0.8))"
                      />

                      {/* Center Core Dot */}
                      <circle r="2" fill="#FFFFFF" />

                      {/* Field Name Label Tag */}
                      <text
                        x="0"
                        y={b.id === 'mumbai' || b.id === 'cauvery' ? 16 : -10}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                        filter="drop-shadow(0 1px 3px rgba(0,0,0,0.9))"
                      >
                        {b.name}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* ── HTML CALLOUT CARDS (Matching Image 2 Infographic) ── */}
              {/* Top-Left: Barmer Basin */}
              <div 
                onClick={() => setSelectedBasin('rajasthan')}
                onMouseEnter={() => setHoveredBasin('rajasthan')}
                onMouseLeave={() => setHoveredBasin(null)}
                className={cn(
                  "absolute left-3 top-8 w-44 p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer z-20 text-left",
                  selectedBasin === 'rajasthan' 
                    ? "bg-[#0E1724]/95 border-[#F97316] shadow-lg shadow-[#F97316]/20 scale-105" 
                    : "bg-[#080D14]/85 border-[#1A2634] hover:border-[#F97316]/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-white">Barmer Basin</span>
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-[#F97316]/20 text-[#F97316]">(Oil)</span>
                </div>
                <p className="text-[9.5px] text-[#94A3B8] mt-0.5 font-medium leading-tight">Western Rajasthan</p>
                <p className="text-[8.5px] text-[#64748B] font-mono mt-0.5 truncate">Mangala · Bhagyam · Aishwarya</p>
              </div>

              {/* Mid-Left: Cambay Basin */}
              <div 
                onClick={() => setSelectedBasin('cambay')}
                onMouseEnter={() => setHoveredBasin('cambay')}
                onMouseLeave={() => setHoveredBasin(null)}
                className={cn(
                  "absolute left-3 top-44 w-44 p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer z-20 text-left",
                  selectedBasin === 'cambay' 
                    ? "bg-[#0E1724]/95 border-[#F59E0B] shadow-lg shadow-[#F59E0B]/20 scale-105" 
                    : "bg-[#080D14]/85 border-[#1A2634] hover:border-[#F59E0B]/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-white">Cambay Basin</span>
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-[#F59E0B]/20 text-[#F59E0B]">(Oil + Gas)</span>
                </div>
                <p className="text-[9.5px] text-[#94A3B8] mt-0.5 font-medium leading-tight">Gujarat (Ankleshwar, Mehsana)</p>
                <p className="text-[8.5px] text-[#64748B] font-mono mt-0.5 truncate">Ankleshwar · Kalol · Mehsana</p>
              </div>

              {/* Bottom-Left: Mumbai High */}
              <div 
                onClick={() => setSelectedBasin('mumbai')}
                onMouseEnter={() => setHoveredBasin('mumbai')}
                onMouseLeave={() => setHoveredBasin(null)}
                className={cn(
                  "absolute left-3 bottom-12 w-44 p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer z-20 text-left",
                  selectedBasin === 'mumbai' 
                    ? "bg-[#0E1724]/95 border-[#EF4444] shadow-lg shadow-[#EF4444]/20 scale-105" 
                    : "bg-[#080D14]/85 border-[#1A2634] hover:border-[#EF4444]/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-white">Mumbai High</span>
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-[#EF4444]/20 text-[#EF4444]">(Oil + Gas)</span>
                </div>
                <p className="text-[9.5px] text-[#94A3B8] mt-0.5 font-medium leading-tight">Arabian Sea (160 km Offshore)</p>
                <p className="text-[8.5px] text-[#64748B] font-mono mt-0.5 truncate">Mumbai High · Heera · Neelam</p>
              </div>

              {/* Top-Right: Assam Fields */}
              <div 
                onClick={() => setSelectedBasin('assam')}
                onMouseEnter={() => setHoveredBasin('assam')}
                onMouseLeave={() => setHoveredBasin(null)}
                className={cn(
                  "absolute right-3 top-6 w-48 p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer z-20 text-left",
                  selectedBasin === 'assam' 
                    ? "bg-[#0E1724]/95 border-[#10B981] shadow-lg shadow-[#10B981]/20 scale-105" 
                    : "bg-[#080D14]/85 border-[#1A2634] hover:border-[#10B981]/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="font-bold text-[11px] text-white">Assam Fields</span>
                  </div>
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-[#10B981]/20 text-[#10B981]">(Oil + Gas)</span>
                </div>
                <p className="text-[9.5px] text-[#94A3B8] mt-0.5 font-medium leading-tight">Upper Assam (Brahmaputra Valley)</p>
                <p className="text-[8.5px] text-[#34D399] font-mono mt-0.5 font-semibold truncate">Digboi · Moran · Lakwa · Duliajan</p>
              </div>

              {/* Mid-Right: Tripura Gas Fields */}
              <div 
                onClick={() => setSelectedBasin('tripura')}
                onMouseEnter={() => setHoveredBasin('tripura')}
                onMouseLeave={() => setHoveredBasin(null)}
                className={cn(
                  "absolute right-3 top-36 w-48 p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer z-20 text-left",
                  selectedBasin === 'tripura' 
                    ? "bg-[#0E1724]/95 border-[#EAB308] shadow-lg shadow-[#EAB308]/20 scale-105" 
                    : "bg-[#080D14]/85 border-[#1A2634] hover:border-[#EAB308]/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-white">Tripura Gas Fields</span>
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-[#EAB308]/20 text-[#EAB308]">(Natural Gas)</span>
                </div>
                <p className="text-[9.5px] text-[#94A3B8] mt-0.5 font-medium leading-tight">Tripura (Northeast India)</p>
                <p className="text-[8.5px] text-[#64748B] font-mono mt-0.5 truncate">Agartala Dome · Rokhia · KUB</p>
              </div>

              {/* Bottom-Right: KG Basin */}
              <div 
                onClick={() => setSelectedBasin('kg')}
                onMouseEnter={() => setHoveredBasin('kg')}
                onMouseLeave={() => setHoveredBasin(null)}
                className={cn(
                  "absolute right-3 bottom-24 w-48 p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer z-20 text-left",
                  selectedBasin === 'kg' 
                    ? "bg-[#0E1724]/95 border-[#A855F7] shadow-lg shadow-[#A855F7]/20 scale-105" 
                    : "bg-[#080D14]/85 border-[#1A2634] hover:border-[#A855F7]/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-white">KG Basin</span>
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-[#A855F7]/20 text-[#A855F7]">(Natural Gas)</span>
                </div>
                <p className="text-[9.5px] text-[#94A3B8] mt-0.5 font-medium leading-tight">Offshore Andhra Pradesh (Bay of Bengal)</p>
                <p className="text-[8.5px] text-[#64748B] font-mono mt-0.5 truncate">KG-D6 · Ravva · Godavari</p>
              </div>

              {/* Bottom-Center-Right: Cauvery Basin */}
              <div 
                onClick={() => setSelectedBasin('cauvery')}
                onMouseEnter={() => setHoveredBasin('cauvery')}
                onMouseLeave={() => setHoveredBasin(null)}
                className={cn(
                  "absolute right-12 bottom-3 w-44 p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer z-20 text-left",
                  selectedBasin === 'cauvery' 
                    ? "bg-[#0E1724]/95 border-[#06B6D4] shadow-lg shadow-[#06B6D4]/20 scale-105" 
                    : "bg-[#080D14]/85 border-[#1A2634] hover:border-[#06B6D4]/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-white">Cauvery Basin</span>
                  <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-[#06B6D4]/20 text-[#06B6D4]">(Oil + Gas)</span>
                </div>
                <p className="text-[9.5px] text-[#94A3B8] mt-0.5 font-medium leading-tight">Tamil Nadu (Narimanam)</p>
                <p className="text-[8.5px] text-[#64748B] font-mono mt-0.5 truncate">Narimanam · Kovilkalappal</p>
              </div>

              {/* Tactical Camera Corner Brackets */}
              <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-white/60 pointer-events-none" />
              <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-white/60 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-white/60 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-white/60 pointer-events-none" />

              {/* Map Compass */}
              <div className="absolute top-3 right-3 flex flex-col items-center text-[#475569] font-mono text-[9px] pointer-events-none">
                <div className="w-5 h-5 rounded-full border border-[#2D3E54] flex items-center justify-center text-[#94A3B8] font-bold">
                  N
                </div>
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="flex flex-wrap items-center justify-between pt-2.5 mt-2 border-t border-[#141F2D] text-[10px] font-mono text-[#64748B]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-white/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] border border-white" />
                  Oil & Gas Wells
                </span>
                <span className="flex items-center gap-1.5 text-white/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
                  Mainland India
                </span>
              </div>
              <span className="text-[#38BDF8] text-[10px] font-semibold">
                Click any basin marker or card to select
              </span>
            </div>
          </div>

          {/* ── Right 5 Cols: Active Markers Selection List ──────────────────── */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between font-mono text-xs text-[#8E9CAE] pb-2 border-b border-[#182332]">
              <span className="font-semibold text-white uppercase tracking-wider">ACTIVE FIELD WORKSPACES</span>
              <span className="text-[#64748B]">{BASINS.length} BASINS PLOTTED</span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1">
              {BASINS.map((basin) => {
                const isSelected = selectedBasin === basin.id;
                return (
                  <div
                    key={basin.id}
                    onClick={() => setSelectedBasin(basin.id)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                      isSelected
                        ? "bg-[#0E1724] border-[#F59E0B] shadow-lg shadow-[#F59E0B]/10 ring-1 ring-[#F59E0B]/40"
                        : "bg-[#090E15] border-[#16212E] hover:border-[#28384E] hover:bg-[#0C131D]"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3.5 h-3.5 rounded-full mt-1 shrink-0 border-2 border-white/80 shadow-md"
                          style={{ backgroundColor: basin.color }}
                        />
                        <div>
                          <div className="font-mono text-xs font-bold text-white group-hover:text-[#F59E0B] transition-colors flex items-center gap-1.5 flex-wrap">
                            {basin.name}
                            <span className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-white/10 text-white/90">
                              {basin.type}
                            </span>
                            {basin.tag && (
                              <span className="text-[9px] bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                                {basin.tag}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">{basin.subRegion}</div>
                          <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                            {basin.fields} · <span className="text-white/80 font-semibold">{basin.wellsCount} wells</span> ({basin.operator})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-[#5A6878] group-hover:text-white group-hover:translate-x-1 transition-all">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct Quick Launch Action */}
            <div className="pt-2">
              <button
                onClick={() => handleEnterBasin(selectedBasin)}
                className="w-full py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#F59E0B]/25 cursor-pointer"
              >
                <span>Enter {activeBasinObj.name} Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Ribbon */}
      <div className="max-w-7xl mx-auto w-full pt-4 mt-4 flex items-center justify-between text-[10px] font-mono text-[#475569] border-t border-[#141C26]">
        <div>GEOLOGICAL BASINS / INDIA · {BASINS.length} SEDIMENTARY REGIONS · OIL INDIA LIMITED (OIL) / ONGC CALLOUTS</div>
        <div className="flex items-center gap-1.5 text-[#10B981]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Operational workspace secured</span>
        </div>
      </div>
    </div>
  );
}
