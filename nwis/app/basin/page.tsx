'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  ShieldCheck, 
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BasinItem {
  id: string;
  name: string;
  subRegion: string;
  fields: string;
  status: 'active' | 'standby';
  color: string;
  dotCoords: { top: string; left: string };
  wellsCount: number;
  tag?: string;
}

const BASINS: BasinItem[] = [
  {
    id: 'assam',
    name: 'ASSAM BASIN',
    subRegion: 'Upper Assam / Onshore',
    fields: 'Lakwa · Duliajan · Digboi',
    status: 'active',
    color: '#10B981',
    dotCoords: { top: '27%', left: '84%' },
    wellsCount: 14,
    tag: 'Primary Field',
  },
  {
    id: 'cambay',
    name: 'CAMBAY BASIN',
    subRegion: 'Gujarat / Onshore',
    fields: 'Ankleshwar · Kalol · Sobhasan',
    status: 'standby',
    color: '#F59E0B',
    dotCoords: { top: '46%', left: '27%' },
    wellsCount: 8,
  },
  {
    id: 'rajasthan',
    name: 'RAJASTHAN BASIN',
    subRegion: 'Barmer–Jaisalmer / Onshore',
    fields: 'Mangala · Aishwarya · Saraswati',
    status: 'standby',
    color: '#F97316',
    dotCoords: { top: '38%', left: '22%' },
    wellsCount: 5,
  },
  {
    id: 'mumbai',
    name: 'MUMBAI OFFSHORE',
    subRegion: 'Arabian Sea / Offshore',
    fields: 'Mumbai High · Heera · Neelam',
    status: 'standby',
    color: '#EF4444',
    dotCoords: { top: '60%', left: '17%' },
    wellsCount: 6,
  },
  {
    id: 'kg',
    name: 'KG BASIN',
    subRegion: 'Krishna–Godavari / Offshore',
    fields: 'Godavari · KG-D6 · Ravva',
    status: 'standby',
    color: '#A855F7',
    dotCoords: { top: '62%', left: '70%' },
    wellsCount: 4,
  },
  {
    id: 'cauvery',
    name: 'CAUVERY BASIN',
    subRegion: 'Tamil Nadu / Onshore–Offshore',
    fields: 'Narimanam · Kovilkalappal',
    status: 'standby',
    color: '#06B6D4',
    dotCoords: { top: '78%', left: '59%' },
    wellsCount: 3,
  },
];

export default function BasinSelectorPage() {
  const router = useRouter();
  const [selectedBasin, setSelectedBasin] = useState<string>('assam');

  const handleEnterBasin = (basinId: string) => {
    router.push('/overview');
  };

  return (
    <div className="relative min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white flex flex-col justify-between p-6 sm:p-10 subsurface-grid select-none">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between text-xs font-mono text-[#8E9CAE] mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#10B981] font-bold">●</span>
            <span className="uppercase tracking-wider">INDIA / BASIN SELECTOR</span>
          </div>
          <div className="text-[11px] text-[#64748B]">STEP 02 / 03</div>
        </div>

        {/* Step Title & Subtitle */}
        <div className="text-center my-6">
          <div className="text-[11px] font-mono tracking-widest text-[#F59E0B] uppercase mb-1">
            02 — NATIONAL SUBSURFACE INTELLIGENCE
          </div>
          <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-white mb-3">
            Select an operating basin.
          </h1>
          <p className="text-xs sm:text-sm text-[#8898AA] max-w-xl mx-auto leading-relaxed">
            Choose a region to enter its live field workspace. Every basin opens the same operational view with local wells, alerts, and formation intelligence.
          </p>
        </div>

        {/* Basin Map & Selector Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Map Display Card (Left 7 Cols) */}
          <div className="lg:col-span-7 bg-[#0A0F15] border border-[#172332] rounded-xl p-5 relative overflow-hidden shadow-2xl">
            {/* Top map status labels */}
            <div className="flex items-center justify-between font-mono text-[10px] text-[#64748B] mb-4">
              <div className="flex items-center gap-1.5 text-[#10B981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>LIVE GEOLOGY LAYER</span>
              </div>
              <div className="text-[#475569]">INDIA / SEDIMENTARY BASINS</div>
            </div>

            {/* Geological Map Container */}
            <div className="relative aspect-[4/3] w-full rounded-lg bg-[#070D13] border border-[#141E2C] flex items-center justify-center p-2 overflow-hidden">
              {/* Coordinate grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#15202E_1px,transparent_1px),linear-gradient(to_bottom,#15202E_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />

              {/* Accurate India SVG Map with Sedimentary Basins */}
              <svg viewBox="0 0 500 550" className="w-full h-full max-h-[420px] drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Basin fill gradients */}
                  <linearGradient id="assamGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.75"/>
                  </linearGradient>
                  <linearGradient id="cambayGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor="#B45309" stopOpacity="0.75"/>
                  </linearGradient>
                  <linearGradient id="rajGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F97316" stopOpacity="0.85"/>
                    <stop offset="100%" stopColor="#C2410C" stopOpacity="0.7"/>
                  </linearGradient>
                  <linearGradient id="mumbaiGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85"/>
                    <stop offset="100%" stopColor="#991B1B" stopOpacity="0.7"/>
                  </linearGradient>
                  <linearGradient id="kgGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.85"/>
                    <stop offset="100%" stopColor="#6B21A8" stopOpacity="0.7"/>
                  </linearGradient>
                  <linearGradient id="cauveryGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.85"/>
                    <stop offset="100%" stopColor="#0E7490" stopOpacity="0.7"/>
                  </linearGradient>
                  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                  <filter id="softglow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                </defs>

                {/* ── INDIA MAINLAND OUTLINE (accurate approximation) ── */}
                {/*
                  Key anchor points (viewBox 500x550):
                  Kashmir NW tip  ≈ (110, 35)
                  Ladakh/Pakistan ≈ (160, 25)
                  J&K east        ≈ (260, 38)
                  Arunachal       ≈ (420, 60)
                  Bengal / Assam  ≈ (390, 95)
                  Odisha coast    ≈ (360, 220)
                  Andhra coast    ≈ (355, 310)
                  Kanyakumari     ≈ (235, 500)
                  Kerala south    ≈ (200, 480)
                  Goa             ≈ (155, 330)
                  Mumbai          ≈ (140, 290)
                  Gujarat west    ≈ (95, 230)
                  Kutch           ≈ (60, 185)
                  Rajasthan NW    ≈ (110, 130)
                */}
                <path
                  d="
                    M 115,35
                    L 145,22 L 175,18 L 205,25 L 230,38 L 260,38 L 295,45
                    L 330,50 L 370,58 L 420,62
                    C 435,65 445,72 440,85
                    L 415,95 L 395,100 L 378,110
                    C 388,125 392,140 385,155
                    L 370,165 L 360,180 L 358,200
                    L 362,220 L 360,245 L 355,270
                    L 358,295 L 352,315 L 342,340
                    L 330,360 L 318,380 L 300,410
                    L 282,440 L 260,468 L 242,490
                    L 235,502 L 228,498
                    C 215,475 205,455 198,435
                    L 190,410 L 180,390 L 168,370
                    L 155,348 L 148,325 L 142,298
                    L 138,278 L 132,258 L 122,238
                    L 108,218 L 96,200 L 82,188
                    L 65,178 L 58,162 L 70,148
                    L 90,138 L 105,125 L 110,110
                    L 108,95 L 112,78 L 115,58 L 115,35
                    Z
                  "
                  fill="#0B131E"
                  stroke="#2A3F58"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />

                {/* Sri Lanka */}
                <ellipse cx="262" cy="518" rx="13" ry="20" fill="#0C141E" stroke="#1E2A38" strokeWidth="1.2"/>

                {/* Andaman Islands (hint) */}
                <rect x="445" y="210" width="6" height="22" rx="3" fill="#0C141E" stroke="#1E2A38" strokeWidth="0.8"/>
                <rect x="448" y="238" width="5" height="14" rx="2.5" fill="#0C141E" stroke="#1E2A38" strokeWidth="0.8"/>

                {/* ── HIMALAYAN FORELAND BELT ── */}
                <path
                  d="M 118,40 C 180,28 250,30 310,48 C 360,58 410,68 440,85 L 420,95 C 385,78 335,65 285,55 C 230,43 170,38 120,52 Z"
                  fill="#EAB308"
                  fillOpacity="0.55"
                  stroke="#FACC15"
                  strokeWidth="0.8"
                />

                {/* ── ASSAM BASIN (Upper Assam shelf) ── */}
                <path
                  d="M 370,80 C 395,72 425,75 435,90 C 440,100 430,115 412,118 C 395,120 375,110 368,98 Z"
                  fill="url(#assamGrad)"
                  stroke="#34D399"
                  strokeWidth="1.8"
                  filter="url(#glow)"
                />

                {/* ── RAJASTHAN BASIN (Barmer) ── */}
                <path
                  d="M 88,125 C 108,118 128,125 130,148 C 132,165 115,175 98,165 C 83,155 78,138 88,125 Z"
                  fill="url(#rajGrad)"
                  stroke="#FB923C"
                  strokeWidth="1.2"
                />

                {/* ── CAMBAY BASIN (Gujarat) ── */}
                <path
                  d="M 110,210 C 128,200 148,205 150,228 C 152,245 135,255 116,248 C 100,240 96,222 110,210 Z"
                  fill="url(#cambayGrad)"
                  stroke="#FCD34D"
                  strokeWidth="1.2"
                />

                {/* ── MUMBAI OFFSHORE ── (in the sea, west of India) */}
                <path
                  d="M 62,278 C 80,268 100,272 102,295 C 104,312 86,322 68,312 C 52,302 48,288 62,278 Z"
                  fill="url(#mumbaiGrad)"
                  stroke="#F87171"
                  strokeWidth="1.2"
                />

                {/* ── KG BASIN (Krishna-Godavari, east coast) ── */}
                <path
                  d="M 340,308 C 358,298 378,302 382,322 C 385,338 368,350 350,342 C 333,334 326,318 340,308 Z"
                  fill="url(#kgGrad)"
                  stroke="#C084FC"
                  strokeWidth="1.2"
                />

                {/* ── CAUVERY BASIN (Tamil Nadu) ── */}
                <path
                  d="M 262,415 C 278,406 296,410 298,428 C 300,442 284,452 268,444 C 252,436 248,424 262,415 Z"
                  fill="url(#cauveryGrad)"
                  stroke="#22D3EE"
                  strokeWidth="1.2"
                />

                {/* ── BASIN TEXT LABELS ── */}
                <text x="368" y="70" fill="#A7F3D0" fontSize="7" fontFamily="monospace" fontWeight="bold" letterSpacing="0.5">UPPER ASSAM (OIL)</text>
                <text x="62"  y="116" fill="#FED7AA" fontSize="6.5" fontFamily="monospace" fontWeight="bold">RAJASTHAN</text>
                <text x="96"  y="200" fill="#FDE68A" fontSize="6.5" fontFamily="monospace" fontWeight="bold">CAMBAY</text>
                <text x="28"  y="270" fill="#FCA5A5" fontSize="6.5" fontFamily="monospace" fontWeight="bold">MUMBAI</text>
                <text x="28"  y="279" fill="#FCA5A5" fontSize="6"   fontFamily="monospace">OFFSHORE</text>
                <text x="338" y="298" fill="#D8B4FE" fontSize="6.5" fontFamily="monospace" fontWeight="bold">KG BASIN</text>
                <text x="248" y="408" fill="#A5F3FC" fontSize="6.5" fontFamily="monospace" fontWeight="bold">CAUVERY</text>
                <text x="178" y="26"  fill="#E2E8F0" fontSize="7"   fontFamily="monospace" opacity="0.7" letterSpacing="1">HIMALAYAN FORELAND</text>

                {/* Assam sub-text */}
                <text x="370" y="127" fill="#6EE7B7" fontSize="5.5" fontFamily="monospace">Lakwa · Duliajan · Digboi</text>
              </svg>

              {/* Glowing Interactive Markers for each Basin */}
              {BASINS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBasin(b.id)}
                  style={{ top: b.dotCoords.top, left: b.dotCoords.left }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
                  title={b.name}
                >
                  <span className="relative flex h-6 w-6 items-center justify-center">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                      style={{ backgroundColor: b.color }}
                    />
                    <span
                      className={cn(
                        "relative inline-flex rounded-full border-2 border-white transition-all",
                        selectedBasin === b.id ? "h-4 w-4" : "h-3 w-3"
                      )}
                      style={{ backgroundColor: b.color }}
                    />
                  </span>
                </button>
              ))}

              {/* Map Compass */}
              <div className="absolute top-4 right-4 flex flex-col items-center text-[#475569] font-mono text-[9px]">
                <div className="w-5 h-5 rounded-full border border-[#2D3E54] flex items-center justify-center text-[#94A3B8] font-bold">
                  N
                </div>
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 mt-2 border-t border-[#141F2D] text-[10px] font-mono text-[#64748B]">
              {BASINS.map(b => (
                <span key={b.id} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: b.color }} />
                  {b.name.split(' ')[0]}
                </span>
              ))}
              <span className="ml-auto text-[#38BDF8] text-[9px]">Click marker or list to enter</span>
            </div>
          </div>

          {/* Active Markers Selection List (Right 5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center justify-between font-mono text-xs text-[#8E9CAE] pb-2 border-b border-[#182332]">
              <span className="font-semibold text-white uppercase tracking-wider">ACTIVE MARKERS</span>
              <span className="text-[#64748B]">{BASINS.length} BASINS</span>
            </div>

            <div className="space-y-2.5">
              {BASINS.map((basin) => {
                const isSelected = selectedBasin === basin.id;
                return (
                  <div
                    key={basin.id}
                    onClick={() => {
                      setSelectedBasin(basin.id);
                      handleEnterBasin(basin.id);
                    }}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                      isSelected
                        ? "bg-[#0E1724] border-[#F59E0B] shadow-lg shadow-[#F59E0B]/10"
                        : "bg-[#090E15] border-[#16212E] hover:border-[#28384E] hover:bg-[#0C131D]"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3 h-3 rounded-full mt-1 shrink-0 border-2 border-white/60"
                          style={{ backgroundColor: basin.color }}
                        />
                        <div>
                          <div className="font-mono text-xs font-bold text-white group-hover:text-[#F59E0B] transition-colors flex items-center gap-2 flex-wrap">
                            {basin.name}
                            {basin.tag && (
                              <span className="text-[9px] bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.5 rounded font-mono uppercase">
                                {basin.tag}
                              </span>
                            )}
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.5 rounded font-mono uppercase",
                              basin.status === 'active'
                                ? "bg-[#10B981]/20 text-[#10B981]"
                                : "bg-[#475569]/20 text-[#64748B]"
                            )}>
                              {basin.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">{basin.subRegion}</div>
                          <div className="text-[10px] text-[#64748B] font-mono mt-0.5">{basin.fields} · {basin.wellsCount} wells</div>
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
                className="w-full py-3.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#F59E0B]/20"
              >
                <span>Enter Upper Assam Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Ribbon */}
      <div className="max-w-6xl mx-auto w-full pt-6 flex items-center justify-between text-[10px] font-mono text-[#475569] border-t border-[#141C26]">
        <div>GEOLOGICAL BASINS / INDIA · {BASINS.length} SEDIMENTARY REGIONS PLOTTED</div>
        <div className="flex items-center gap-1.5 text-[#10B981]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Operational workspace secured</span>
        </div>
      </div>
    </div>
  );
}
