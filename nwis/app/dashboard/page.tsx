'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { MOCK_WELLS } from '@/lib/mock/wells';
import { getIncidentsForWell } from '@/lib/mock/incidents';
import { cn, getRiskBgClass, getRiskLabel, formatDepth, timeAgo, getIncidentLabel } from '@/lib/utils';
import { fadeUp, stagger } from '@/lib/motion';
import { HeadlineReveal } from '@/components/motion/HeadlineReveal';
import { AnimatedStat } from '@/components/motion/AnimatedStat';
import { DrillingParamsGrid } from '@/components/wells/DrillingParamsGrid';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Activity, AlertTriangle, Map, BookOpen, ArrowRight,
  TrendingUp, Layers, Gauge, ChevronRight, Clock, Wifi
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { RiskLevel, Alert } from '@/lib/types';

// ─── Risk Gauge Ring ──────────────────────────────────────────────────────────
function RiskGaugeSmall({ score, level }: { score: number; level: RiskLevel }) {
  const color = level === 'low' ? 'var(--risk-low)'
    : level === 'medium' ? 'var(--risk-medium)'
    : level === 'critical' ? 'var(--risk-critical)'
    : 'var(--risk-high)';
  const circumference = 2 * Math.PI * 28;
  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setOffset(circumference - (score / 100) * circumference); return; }
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 300);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  return (
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="var(--muted)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r="28" fill="none"
          stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({
  title, value, unit, icon: Icon, subtitle, accentColor, delay = 0
}: {
  title: string;
  value: React.ReactNode;
  unit?: string;
  icon: React.ElementType;
  subtitle?: string;
  accentColor?: string;
  delay?: number;
}) {
  return (
    <motion.div variants={fadeUp} transition={{ delay }}>
      <Card className="card-hover border-border/60 hover:border-primary/30 transition-colors">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: accentColor ? `color-mix(in oklch, ${accentColor} 12%, transparent)` : 'var(--muted)' }}
            >
              <Icon aria-hidden="true" className="w-4 h-4" style={{ color: accentColor ?? 'var(--muted-foreground)' }} />
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold text-foreground font-mono tabular-nums">{value}</span>
            {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Alert Row ────────────────────────────────────────────────────────────────
function AlertRow({ alert }: { alert: Alert }) {
  return (
    <motion.div
      variants={fadeUp}
      className="group"
    >
      <Link
        href="/risk"
        className={cn(
          'w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl transition-all',
          'hover:bg-muted border border-transparent hover:border-border/60 focus-visible:ring-2 focus-visible:ring-ring outline-none'
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            'mt-1 w-2 h-2 rounded-full shrink-0',
            alert.riskLevel === 'high' || alert.riskLevel === 'critical'
              ? 'bg-[var(--risk-high)] pulse-live'
              : alert.riskLevel === 'medium'
              ? 'bg-[var(--risk-medium)]'
              : 'bg-[var(--risk-low)]'
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-2 leading-snug font-medium">
            {alert.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
              getRiskBgClass(alert.riskLevel)
            )}>
              {getRiskLabel(alert.riskLevel)}
            </span>
            <span className="text-xs text-muted-foreground" suppressHydrationWarning>{timeAgo(alert.timestamp)}</span>
          </div>
        </div>
        <ChevronRight aria-hidden="true" className="w-4 h-4 text-muted-foreground mt-1 group-hover:text-primary transition-colors shrink-0" />
      </Link>
    </motion.div>
  );
}

// ─── Quick Link Card ──────────────────────────────────────────────────────────
function QuickLink({ href, icon: Icon, label, description, color }: {
  href: string; icon: React.ElementType; label: string; description: string; color: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <Link
        href={href}
        className={cn(
          'w-full text-left p-4 rounded-xl border border-border/60 bg-card block',
          'hover:border-primary/30 hover:shadow-sm transition-all group',
          'focus-visible:ring-2 focus-visible:ring-ring outline-none'
        )}
      >
        <div
          className="w-9 h-9 rounded-lg mb-3 flex items-center justify-center"
          style={{ backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)` }}
        >
          <Icon aria-hidden="true" className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <p className="font-semibold text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        <div className="flex items-center gap-1 mt-2 text-xs font-medium" style={{ color }}>
          Open <ArrowRight aria-hidden="true" className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const {
    activeWell, liveDepthFt, liveRiskScore, liveRiskLevel,
    alerts, unreadAlertCount, isRTMACConnected, liveRtmacData
  } = useAppStore();

  const rootRef = useRef<HTMLDivElement>(null);

  const nearbyWellCount = MOCK_WELLS.filter(w =>
    w.id !== activeWell?.id && w.status !== 'abandoned'
  ).length;

  const currentFormation = activeWell?.formations.find(f =>
    liveDepthFt >= f.depthTopFt && liveDepthFt <= f.depthBaseFt
  );

  const recentAlerts = alerts.slice(0, 6);
  const incidentsInArea = MOCK_WELLS
    .filter(w => w.id !== activeWell?.id)
    .flatMap(w => getIncidentsForWell(w.id))
    .length;

  // ── GSAP load choreography ──────────────────────────────────────────────────
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-animate="page-header"]', { opacity: 0, y: -16, duration: 0.5 })
        .from('[data-animate="kpi-card"]', { opacity: 0, y: 24, duration: 0.5, stagger: 0.08 }, '-=0.2')
        .from('[data-animate="panel"]', { opacity: 0, y: 24, duration: 0.5, stagger: 0.1 }, '-=0.25');
    });
  }, { scope: rootRef });

  return (
    <div ref={rootRef} className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div data-animate="page-header" className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <HeadlineReveal className="text-2xl font-bold text-foreground">Operations Dashboard</HeadlineReveal>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeWell?.name ?? 'No active well'} · {activeWell?.field}, {activeWell?.block}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className={cn(
                'w-2 h-2 rounded-full',
                isRTMACConnected ? 'bg-[var(--risk-low)] pulse-live' : 'bg-destructive'
              )}
            />
            <span>{isRTMACConnected ? 'eRTMAC Live' : 'Disconnected'}</span>
            {liveRtmacData && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span>Updated <span suppressHydrationWarning>{timeAgo(liveRtmacData.timestamp)}</span></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Cards (2×2 grid) ────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8"
      >
        {/* Card 1: Live Depth */}
        <div data-animate="kpi-card" className="contents">
        <SummaryCard
          title="Current Depth"
          value={<AnimatedStat value={liveDepthFt} />}
          unit="ft MD"
          icon={Activity}
          subtitle={`TVD: ~${formatDepth(liveDepthFt * 0.968)} ft`}
          accentColor="var(--primary)"
          delay={0}
        />
        </div>
        {/* Card 2: Formation */}
        <div data-animate="kpi-card" className="contents">
        <motion.div variants={fadeUp} transition={{ delay: 0.08 }}>
          <Card className="card-hover border-border/60 hover:border-secondary/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formation</p>
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Layers aria-hidden="true" className="w-4 h-4 text-secondary" />
                </div>
              </div>
              <p className="text-lg font-bold text-foreground leading-tight">
                {currentFormation?.name ?? 'Unknown'}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                {currentFormation && (
                  <span
                    aria-hidden="true"
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: currentFormation.color }}
                  />
                )}
                <span className="text-xs text-muted-foreground">{currentFormation?.lithology ?? '—'}</span>
                {currentFormation?.fluidType && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {currentFormation.fluidType}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>

        {/* Card 3: Risk Score */}
        <div data-animate="kpi-card" className="contents">
        <motion.div variants={fadeUp} transition={{ delay: 0.16 }}>
          <Card className={cn(
            'card-hover transition-colors border',
            liveRiskLevel === 'high' || liveRiskLevel === 'critical'
              ? 'border-risk-high bg-risk-high'
              : liveRiskLevel === 'medium'
              ? 'border-risk-medium bg-risk-medium'
              : 'border-border/60'
          )}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk Score</p>
                <Badge className={cn('text-[10px]', getRiskBgClass(liveRiskLevel))}>
                  {getRiskLabel(liveRiskLevel)}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <RiskGaugeSmall score={liveRiskScore} level={liveRiskLevel} />
                <div>
                  <p className="text-2xl font-bold font-mono text-foreground tabular-nums">
                    <AnimatedStat value={liveRiskScore} />
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </p>
                  <p className="text-xs text-muted-foreground">AI Risk Index</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>

        {/* Card 4: Nearby Wells */}
        <div data-animate="kpi-card" className="contents">
        <SummaryCard
          title="Offset Wells"
          value={<AnimatedStat value={nearbyWellCount} />}
          unit="in range"
          icon={Map}
          subtitle={`${incidentsInArea} historical incidents`}
          accentColor="var(--secondary)"
          delay={0.24}
        />
        </div>
      </motion.div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Alerts Panel ──────────────────────────────────────────────── */}
        <div data-animate="panel" className="xl:col-span-2">
          <Card className="border-border/60 h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Recent Alerts</CardTitle>
                {unreadAlertCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5 px-2">
                    {unreadAlertCount} new
                  </Badge>
                )}
              </div>
              <Link
                href="/risk"
                className="text-xs text-primary hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded outline-none"
              >
                View all <ArrowRight aria-hidden="true" className="w-3 h-3 ml-1 inline" />
              </Link>
            </CardHeader>
            <Separator />
            <CardContent className="p-3">
              {recentAlerts.length > 0 ? (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className="space-y-1"
                >
                  {recentAlerts.map(alert => (
                    <AlertRow key={alert.id} alert={alert} />
                  ))}
                </motion.div>
              ) : (
                <div className="py-12 text-center">
                  <AlertTriangle aria-hidden="true" className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No alerts — all clear</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Links + Live Feed ───────────────────────────────────── */}
        <div className="space-y-4">
          {/* Quick Links */}
          <div data-animate="panel">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-3"
            >
              <QuickLink
                href="/map"
                icon={Map}
                label="Map View"
                description="Explore offset wells geospatially with radius filtering"
                color="var(--primary)"
              />
              <QuickLink
                href="/knowledge"
                icon={BookOpen}
                label="Knowledge Repository"
                description="Search incidents, lessons learned, and mitigations"
                color="var(--secondary)"
              />
              <QuickLink
                href="/risk"
                icon={AlertTriangle}
                label="Risk & Alerts"
                description="Live risk score, threat matrix, and real-time alerts"
                color="var(--risk-high)"
              />
            </motion.div>
          </div>

          {/* Live Feed Card */}
          {liveRtmacData && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              data-animate="panel"
              aria-live="polite"
              aria-label="Live drilling parameters"
            >
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--risk-low)] pulse-live" />
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Live Drilling Parameters
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <DrillingParamsGrid data={liveRtmacData} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
