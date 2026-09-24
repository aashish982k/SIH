'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  ChevronRight, 
  Radar, 
  Compass, 
  Clock, 
  ArrowUpRight,
  Maximize2
} from 'lucide-react';
import Link from 'next/link';
import { TacticalSidebar } from '@/components/layout/Sidebar';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Wells list matching the screenshot
const WELLS_IN_MOTION = [
  {
    id: 'AA-17H',
    name: 'AA-17H',
    field: 'Lakwa Central',
    depth: '2,414 m',
    status: 'Drilling',
    statusColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
    riskLabel: 'High risk',
    riskColor: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
    dotColor: 'bg-[#EF4444]'
  },
  {
    id: 'AA-092',
    name: 'AA-092',
    field: 'Duliajan North',
    depth: '1,950 m',
    status: 'Drilling',
    statusColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
    riskLabel: 'Watch risk',
    riskColor: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
    dotColor: 'bg-[#F59E0B]'
  },
  {
    id: 'AA-037',
    name: 'AA-037',
    field: 'Moran East',
    depth: '3,120 m',
    status: 'Completed',
    statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
    riskLabel: 'Nominal risk',
    riskColor: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
    dotColor: 'bg-[#10B981]'
  },
  {
    id: 'AA-701',
    name: 'AA-701',
    field: 'Naharkatiya',
    depth: '650 m',
    status: 'Drilling',
    statusColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
    riskLabel: 'Nominal risk',
    riskColor: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30',
    dotColor: 'bg-[#10B981]'
  }
];

export default function FieldOverviewPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white">
      {/* Tactical Left Sidebar */}
      <TacticalSidebar />

      {/* Main Field Overview Dashboard Workspace */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1400px]">
        {/* Top Header & Greeting matching Reference Image 3 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#7E8B9B] uppercase mb-1">
              <span>UPPER ASSAM BASIN</span>
              <span>/</span>
              <span className="text-[#94A3B8]">FIELD OVERVIEW</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Good morning, Aarav.
            </h1>
            <p className="text-xs text-[#8A9BAE] mt-0.5 font-normal">
              Here&apos;s what needs your attention across the basin today.
            </p>
          </div>

          <Link
            href="/risk"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F1722] border border-[#233144] hover:border-[#F59E0B] text-xs font-mono font-medium text-white transition-all shadow-sm group"
          >
            <Activity className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Open live simulation</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#7E8B9B] group-hover:text-white transition-colors" />
          </Link>
        </div>

        {/* 4 Metric KPI Cards matching Reference Image 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Wells Currently Drilling */}
          <div className="p-4 rounded-xl bg-[#0A0F16] border border-[#172332] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                Wells currently drilling
              </span>
              <div className="w-6 h-6 rounded bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-mono text-3xl font-bold text-white">04</div>
            <div className="text-[10px] font-mono text-[#10B981] mt-1 flex items-center gap-1">
              <span>+1 since yesterday</span>
            </div>
          </div>

          {/* Card 2: Active Alerts */}
          <div className="p-4 rounded-xl bg-[#0A0F16] border border-[#172332] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                Active alerts
              </span>
              <div className="w-6 h-6 rounded bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-mono text-3xl font-bold text-white">03</div>
            <div className="text-[10px] font-mono text-[#EF4444] mt-1 flex items-center gap-1">
              <span>1 critical / 2 watch</span>
            </div>
          </div>

          {/* Card 3: NPT Avoided This Month */}
          <div className="p-4 rounded-xl bg-[#0A0F16] border border-[#172332] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                NPT avoided this month
              </span>
              <div className="w-6 h-6 rounded bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-mono text-3xl font-bold text-white">₹18.4L</div>
            <div className="text-[10px] font-mono text-[#F59E0B] mt-1 flex items-center gap-1">
              <span>↑ 28% vs last month</span>
            </div>
          </div>

          {/* Card 4: Knowledge Confidence */}
          <div className="p-4 rounded-xl bg-[#0A0F16] border border-[#172332] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                Knowledge confidence
              </span>
              <div className="w-6 h-6 rounded bg-[#38BDF8]/15 text-[#38BDF8] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-mono text-3xl font-bold text-white">89.2%</div>
            <div className="text-[10px] font-mono text-[#38BDF8] mt-1 flex items-center gap-1">
              <span>↑ 4.2% from feedback</span>
            </div>
          </div>
        </div>

        {/* Dashboard 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Wells in Motion Table (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#0A0F16] border border-[#172332] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                    LIVE OPERATIONS
                  </div>
                  <h3 className="text-base font-semibold text-white">Wells in motion</h3>
                </div>
                <Link href="/risk" className="text-xs font-mono text-[#F59E0B] hover:underline flex items-center gap-1">
                  View all →
                </Link>
              </div>

              {/* Wells List */}
              <div className="space-y-2.5">
                {WELLS_IN_MOTION.map((well) => (
                  <div
                    key={well.id}
                    onClick={() => router.push('/risk')}
                    className="p-3.5 rounded-lg bg-[#070D13] border border-[#141F2D] hover:border-[#F59E0B]/50 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn("w-2 h-2 rounded-full shrink-0", well.dotColor)} />
                      <div>
                        <div className="font-mono text-sm font-bold text-white group-hover:text-[#F59E0B] transition-colors">
                          {well.name}
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono">{well.field}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] font-mono text-[#64748B] uppercase">Current depth</div>
                        <div className="font-mono text-xs font-bold text-white">{well.depth}</div>
                      </div>

                      <div className="text-right">
                        <div className={cn("text-[10px] font-mono px-2 py-0.5 rounded border inline-block", well.statusColor)}>
                          {well.status}
                        </div>
                        <div className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border mt-1 block", well.riskColor)}>
                          {well.riskLabel}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-[#475569] group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Incident Landscape Widget */}
            <div className="bg-[#0A0F16] border border-[#172332] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                    LAST 30 DAYS
                  </div>
                  <h3 className="text-base font-semibold text-white">Incident landscape</h3>
                </div>
                <span className="text-[10px] font-mono text-[#64748B]">FIELD OCCURRENCES</span>
              </div>

              {/* Progress bars representing historical incidents */}
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#94A3B8]">Lost circulation</span>
                    <span className="text-white">12 events (58%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#141F2D] overflow-hidden">
                    <div className="h-full bg-[#EF4444] rounded-full" style={{ width: '58%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#94A3B8]">Stuck pipe</span>
                    <span className="text-white">7 events (34%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#141F2D] overflow-hidden">
                    <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: '34%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#94A3B8]">Torque & drag</span>
                    <span className="text-white">4 events (19%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#141F2D] overflow-hidden">
                    <div className="h-full bg-[#06B6D4] rounded-full" style={{ width: '19%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#94A3B8]">Wellbore stability</span>
                    <span className="text-white">2 events (9%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#141F2D] overflow-hidden">
                    <div className="h-full bg-[#A855F7] rounded-full" style={{ width: '9%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Spatial Intelligence Radar & Cost Avoidance (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Spatial Intelligence Radar Card matching Reference Image 3 */}
            <div className="bg-[#0A0F16] border border-[#172332] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                    SPATIAL INTELLIGENCE
                  </div>
                  <h3 className="text-base font-semibold text-white">Field activity radar</h3>
                </div>
                <Link href="/risk" className="p-1 rounded bg-[#141F2D] text-[#8E9CAE] hover:text-white">
                  <Maximize2 className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Radar Graphic representation */}
              <div className="relative aspect-video w-full rounded-lg bg-[#070D13] border border-[#141E2C] flex items-center justify-center overflow-hidden">
                {/* Concentric distance rings */}
                <div className="absolute w-[220px] h-[220px] rounded-full border border-[#192738]/60" />
                <div className="absolute w-[150px] h-[150px] rounded-full border border-[#192738]/80" />
                <div className="absolute w-[80px] h-[80px] rounded-full border border-[#23384E]" />
                
                {/* Radial crosshairs */}
                <div className="absolute w-full h-[1px] bg-[#141E2C]" />
                <div className="absolute h-full w-[1px] bg-[#141E2C]" />

                {/* Radar sweep beam */}
                <div className="absolute w-full h-full radar-sweep pointer-events-none" />

                {/* Active Well AA-17H (Center Red) */}
                <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <span className="w-3 h-3 rounded-full bg-[#EF4444] animate-ping absolute" />
                  <span className="w-3 h-3 rounded-full bg-[#EF4444] border-2 border-white relative" />
                  <span className="font-mono text-[8px] text-white font-bold mt-1 bg-black/60 px-1 rounded">AA-17H</span>
                </div>

                {/* Offset Wells */}
                <div className="absolute top-[32%] left-[34%] flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] border border-black" />
                  <span className="font-mono text-[7px] text-[#94A3B8]">AA-092 (1.8km)</span>
                </div>

                <div className="absolute top-[65%] left-[28%] flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-black" />
                  <span className="font-mono text-[7px] text-[#94A3B8]">AA-037 (3.4km)</span>
                </div>

                <div className="absolute top-[38%] left-[72%] flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] border border-black" />
                  <span className="font-mono text-[7px] text-[#94A3B8]">AA-701 (4.1km)</span>
                </div>

                {/* Radar legend */}
                <div className="absolute bottom-2 left-2 flex items-center gap-3 font-mono text-[8px] text-[#64748B]">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" /> Active well</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Offset well</span>
                </div>

                <div className="absolute bottom-2 right-2 font-mono text-[8px] text-[#64748B]">
                  0 — 5 km
                </div>
              </div>
            </div>

            {/* NPT Cost Avoidance Financial Widget */}
            <div className="bg-gradient-to-br from-[#0F1824] to-[#0A1017] border border-[#1E2E42] rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#F59E0B] uppercase tracking-wider mb-2">
                <span>NPT COST AVOIDANCE</span>
                <span className="bg-[#F59E0B]/20 px-2 py-0.5 rounded font-bold">LIVE METRIC</span>
              </div>

              <div className="font-mono text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
                ₹18,40,000
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
                Estimated rig time and operational cost avoided by executing proactive mitigations from offset well history this month.
              </p>

              <div className="pt-3 border-t border-[#1C2B3E] flex items-center justify-between text-xs font-mono text-[#10B981]">
                <span>✓ 74 hrs drilling time saved</span>
                <span className="text-[#64748B]">Lakwa Block</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
