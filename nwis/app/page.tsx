'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  Play, 
  Database, 
  ShieldAlert, 
  Radar, 
  Layers, 
  Activity, 
  Compass, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function HeroLandingPage() {
  const router = useRouter();
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  return (
    <div className="relative min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white flex flex-col justify-between overflow-hidden subsurface-grid select-none">
      {/* Background Ambience: Subtle Subsurface Seismic Wave Vector */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" preserveAspectRatio="none">
          <path
            d="M-100 480 C 200 420, 450 560, 750 480 C 1050 400, 1250 520, 1600 460"
            stroke="#10B981"
            strokeWidth="1.2"
            strokeDasharray="4 6"
            className="opacity-40"
          />
          <path
            d="M-100 520 C 250 590, 500 430, 800 530 C 1100 630, 1300 470, 1600 510"
            stroke="#F59E0B"
            strokeWidth="1"
            className="opacity-30"
          />
          <path
            d="M-100 580 C 300 510, 600 620, 900 560 C 1200 500, 1350 580, 1600 550"
            stroke="#0EA5E9"
            strokeWidth="0.8"
            strokeDasharray="2 4"
            className="opacity-30"
          />
        </svg>
      </div>

      {/* Decorative Grid Marker Ticks */}
      <div className="absolute top-10 left-12 font-mono text-[9px] text-[#2A3749] tracking-widest hidden md:block">
        LOC: 27°21&apos;42&quot;N 95°19&apos;08&quot;E · OIL_FIELD_ASSAM_SHELF
      </div>
      <div className="absolute top-10 right-12 font-mono text-[9px] text-[#2A3749] tracking-widest hidden md:block">
        GRID: 100m² MATRIX · DATUM: WGS84
      </div>

      {/* Main Hero Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 md:pt-28 pb-12 w-full flex-1 flex flex-col justify-center">
        {/* Step Indicator / Category */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <span className="font-mono text-xs font-bold text-[#F59E0B] tracking-wider">01</span>
          <span className="w-8 h-[1px] bg-[#2E3C4E]" />
          <span className="font-mono text-xs tracking-widest uppercase text-[#8899AC]">
            DECISION SUPPORT FOR THE SUBSURFACE
          </span>
        </motion.div>

        {/* Cinematic Headline Matching Reference Image 1 */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-7xl md:text-8xl font-normal tracking-tight text-[#E2E8F0] font-sans leading-[1.04] max-w-4xl"
        >
          Institutional<br />
          memory <br />
          <span className="text-[#F59E0B] font-medium tracking-tight">
            for every well
          </span><br />
          you drill.
        </motion.h1>

        {/* Narrative Description matching OIL context */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 text-base sm:text-lg text-[#94A3B8] max-w-xl leading-relaxed font-normal"
        >
          Turn decades of drilling history into the next right decision. NWIS connects live well behavior with the hard-won lessons buried in every offset report.
        </motion.p>

        {/* Action Call To Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center gap-4 sm:gap-6"
        >
          <Link
            href="/basin"
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#F59E0B]/20"
          >
            <span>Launch platform</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={() => setVideoModalOpen(true)}
            className="flex items-center gap-2.5 px-5 py-3.5 rounded-lg bg-[#0F1622]/80 hover:bg-[#162232] text-white border border-[#233144] font-medium text-sm transition-all group"
          >
            <div className="w-6 h-6 rounded-full bg-[#1F2B3B] group-hover:bg-[#F59E0B] group-hover:text-black text-[#F59E0B] flex items-center justify-center transition-colors">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
            <span>Watch 01:42 overview</span>
          </button>
        </motion.div>
      </div>

      {/* Bottom KPI Bar matching Reference Image 1 */}
      <div className="relative z-10 border-t border-[#141C26] bg-[#070A0E]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Key Metrics */}
          <div className="flex items-center gap-10 md:gap-16">
            <div>
              <div className="font-mono text-2xl md:text-3xl font-bold text-white tracking-tight">14</div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-[#64748B] mt-0.5">
                Wells Monitored
              </div>
            </div>

            <div>
              <div className="font-mono text-2xl md:text-3xl font-bold text-white tracking-tight">300<span className="text-[#F59E0B]">+</span></div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-[#64748B] mt-0.5">
                Reports Digitized
              </div>
            </div>

            <div>
              <div className="font-mono text-2xl md:text-3xl font-bold text-white tracking-tight flex items-baseline">
                24<span className="text-[#F59E0B]">/</span>7
              </div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-[#64748B] mt-0.5">
                Offset-Well Alerts
              </div>
            </div>
          </div>

          {/* Quick Basin Navigation Direct Links */}
          <div className="flex items-center gap-3">
            <Link 
              href="/basin"
              className="text-xs font-mono text-[#F59E0B] hover:text-[#FBBF24] flex items-center gap-1.5 transition-colors group"
            >
              <span>EXPLORE OPERATING BASINS</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Video / Concept Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0C121B] border border-[#1E2C3E] rounded-xl p-6 max-w-xl w-full text-white shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              NWIS Architecture & Operational Overview
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
              eRTMAC live drilling streams are continuously correlated with institutional knowledge from offset wells.
              Using formation-normalized depth and geological proximity, historical stuck-pipe and lost-circulation mitigations are surfaced proactively before drilling into hazard horizons.
            </p>
            <div className="p-4 rounded-lg bg-[#070A0E] border border-[#1A2636] font-mono text-xs text-[#38BDF8] space-y-1 mb-6">
              <div>✓ Normalized Depth: Depth below formation top, accounting for dip.</div>
              <div>✓ Multi-Well Agreement: Scored confidence based on offset history.</div>
              <div>✓ Proven Action: Human-readable mitigation from previous DDR/WCR.</div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setVideoModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#141F2D] text-xs font-mono text-[#94A3B8] hover:text-white"
              >
                Close
              </button>
              <Link
                href="/basin"
                className="px-4 py-2 rounded-lg bg-[#F59E0B] text-xs font-mono font-bold text-black flex items-center gap-1.5"
              >
                Enter Field Workspace
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
