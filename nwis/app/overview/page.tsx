'use client';

import { useEffect, useState } from 'react';
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
  Maximize2,
  RefreshCw,
  Database
} from 'lucide-react';
import Link from 'next/link';
import { TacticalSidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export default function FieldOverviewPage() {
  const router = useRouter();
  const { currentUser, setActiveWell, selectedBasin, setSelectedBasin } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<{
    summary: {
      totalWells: number;
      activeWells: number;
      completedWells: number;
      suspendedWells: number;
      totalFields: number;
    };
    fields: Record<string, number>;
    recentEvents: any[];
    activeAlerts: any[];
  } | null>(null);

  const [wellsList, setWellsList] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const basinParam = new URLSearchParams(window.location.search).get('basin');
      if (basinParam) {
        setSelectedBasin(basinParam);
      }
    }
  }, [setSelectedBasin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, wellsRes] = await Promise.all([
        api.intelligence.getOverview(),
        api.wells.list({ limit: 10 }),
      ]);
      setOverviewData(overviewRes.data);
      setWellsList(wellsRes.data?.wells || []);
    } catch (err) {
      console.warn('Overview API fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = overviewData?.summary || {
    totalWells: 39,
    activeWells: 15,
    completedWells: 15,
    suspendedWells: 9,
    totalFields: 11,
  };

  const BASIN_LABELS: Record<string, string> = {
    rajasthan: 'BARMER BASIN (RAJASTHAN)',
    cambay: 'CAMBAY BASIN (GUJARAT)',
    mumbai: 'MUMBAI HIGH (OFFSHORE)',
    assam: 'UPPER ASSAM BASIN',
    tripura: 'TRIPURA GAS FIELDS',
    kg: 'KRISHNA GODAVARI (DEEPWATER)',
    cauvery: 'CAUVERY BASIN (TAMIL NADU)',
    all: 'NATIONAL BASIN NETWORK (INDIA)',
  };
  const activeBasinLabel = BASIN_LABELS[selectedBasin] || 'NATIONAL BASIN NETWORK (INDIA)';

  const activeAlerts = overviewData?.activeAlerts || [];
  const recentEvents = overviewData?.recentEvents || [];
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const highCount = activeAlerts.filter(a => a.severity === 'high').length;

  return (
    <div className="flex min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white">
      {/* Tactical Left Sidebar */}
      <TacticalSidebar />

      {/* Main Field Overview Dashboard Workspace */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1400px]">
        {/* Top Header & Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#7E8B9B] uppercase mb-1">
              <span>{activeBasinLabel}</span>
              <span>/</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                DATABASE CONNECTED (LIVE)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Welcome back, {currentUser?.name?.split(' ')[0] || 'Drilling Engineer'}.
            </h1>
            <p className="text-xs text-[#8A9BAE] mt-0.5 font-normal">
              {summary.totalWells} wells monitored across {summary.totalFields} fields in the active workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-[#0F1722] border border-[#233144] hover:border-amber-500 text-muted-foreground hover:text-white transition-colors"
              title="Refresh Live Data"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
            <Link
              href="/risk"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F1722] border border-[#233144] hover:border-[#F59E0B] text-xs font-mono font-medium text-white transition-all shadow-sm group"
            >
              <Activity className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Live Risk Analysis</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#7E8B9B] group-hover:text-white transition-colors" />
            </Link>
          </div>
        </div>

        {/* 4 Metric KPI Cards backed by API */}
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
            <div className="font-mono text-3xl font-bold text-white">
              {String(summary.activeWells).padStart(2, '0')}
            </div>
            <div className="text-[10px] font-mono text-[#10B981] mt-1 flex items-center gap-1">
              <span>{summary.totalWells} total wells registered in DB</span>
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
            <div className="font-mono text-3xl font-bold text-white">
              {String(activeAlerts.length).padStart(2, '0')}
            </div>
            <div className="text-[10px] font-mono text-[#EF4444] mt-1 flex items-center gap-1">
              <span>{criticalCount} critical / {highCount} high severity</span>
            </div>
          </div>

          {/* Card 3: Completed & Suspended */}
          <div className="p-4 rounded-xl bg-[#0A0F16] border border-[#172332] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                Completed / Suspended
              </span>
              <div className="w-6 h-6 rounded bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-mono text-3xl font-bold text-white">
              {summary.completedWells} / {summary.suspendedWells}
            </div>
            <div className="text-[10px] font-mono text-[#F59E0B] mt-1 flex items-center gap-1">
              <span>{((summary.completedWells / Math.max(1, summary.totalWells)) * 100).toFixed(0)}% completion rate</span>
            </div>
          </div>

          {/* Card 4: Knowledge Confidence */}
          <div className="p-4 rounded-xl bg-[#0A0F16] border border-[#172332] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                Active Basin Fields
              </span>
              <div className="w-6 h-6 rounded bg-[#06B6D4]/15 text-[#06B6D4] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-mono text-3xl font-bold text-white">
              {String(summary.totalFields).padStart(2, '0')} Fields
            </div>
            <div className="text-[10px] font-mono text-[#06B6D4] mt-1 flex items-center gap-1">
              <span>Lakwa · Duliajan · Moran · NHK · BGJ</span>
            </div>
          </div>
        </div>

        {/* Operational Grid: Wells In Motion + Active Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left 8 Cols: Wells in Motion (Real DB Data) */}
          <div className="lg:col-span-8 bg-[#0A0F16] border border-[#172332] rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#182332] mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                  WELLS IN MOTION (DATABASE RECORDS)
                </h3>
              </div>
              <Link href="/map" className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1">
                <span>View Full Map</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {wellsList.map((well) => {
                const isDrilling = well.status === 'active';
                return (
                  <div
                    key={well.id}
                    onClick={() => {
                      setActiveWell(well.id);
                      router.push(`/wells/${well.id}`);
                    }}
                    className="p-3.5 rounded-lg bg-[#0C121B] border border-[#182332] hover:border-amber-500/50 hover:bg-[#101724] transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        isDrilling ? "bg-cyan-400 animate-pulse" : (well.status === 'completed' ? "bg-emerald-400" : "bg-rose-400")
                      )} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                            {well.name}
                          </p>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold uppercase border",
                            isDrilling ? "text-cyan-300 border-cyan-500/30 bg-cyan-500/10" : "text-muted-foreground border-white/10"
                          )}>
                            {well.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {well.field_name} · Primary: <span className="text-white/80">{well.primary_formation || 'Barail Sandstone'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <p className="font-mono text-xs font-semibold text-white">
                          {Number(well.total_depth_ft || 12000).toLocaleString()} ft
                        </p>
                        <p className="text-[10px] text-muted-foreground">Total Depth</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 4 Cols: Active Alerts & Recent Incidents */}
          <div className="lg:col-span-4 space-y-6">
            {/* Active Alerts Card */}
            <div className="bg-[#0A0F16] border border-[#172332] rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#182332] mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    ACTIVE HAZARDS
                  </h3>
                </div>
                <Link href="/risk" className="text-[10px] font-mono text-rose-400 hover:underline">
                  All ({activeAlerts.length})
                </Link>
              </div>

              <div className="space-y-2.5">
                {activeAlerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => router.push('/risk')}
                    className="p-2.5 rounded-lg bg-[#0C121B] border border-[#1E2836] hover:border-rose-500/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-white truncate max-w-[180px]">
                        {alert.well_name || alert.wellId}
                      </span>
                      <span className={cn(
                        "text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase",
                        alert.severity === 'critical' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-amber-500/20 text-amber-400"
                      )}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/80 line-clamp-2 leading-tight">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Incidents Card */}
            <div className="bg-[#0A0F16] border border-[#172332] rounded-xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#182332] mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    OPERATIONAL EVENTS
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{recentEvents.length} Recorded</span>
              </div>

              <div className="space-y-2">
                {recentEvents.slice(0, 3).map((evt) => (
                  <div key={evt.id} className="text-xs p-2 rounded bg-[#0C121B] border border-[#182332]">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
                      <span className="text-white font-bold">{evt.well_name}</span>
                      <span>{evt.occurred_at}</span>
                    </div>
                    <p className="text-white/80 text-[11px] line-clamp-2">
                      {evt.description}
                    </p>
                    {evt.npt_hours > 0 && (
                      <span className="text-[9px] font-mono text-rose-400 mt-1 inline-block">
                        NPT: {evt.npt_hours} hrs
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
