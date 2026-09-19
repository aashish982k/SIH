'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { MOCK_WELLS } from '@/lib/mock/wells';
import { getIncidentsForWell } from '@/lib/mock/incidents';
import { cn, getRiskBgClass, getRiskLabel, getRiskBorderClass, formatDepth, timeAgo, getIncidentLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Activity, AlertTriangle, Map, BookOpen, ArrowRight,
  TrendingUp, Layers, Gauge, ChevronRight, Clock, Wifi
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RiskLevel, Alert } from '@/lib/types';

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp: any = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const stagger: any = { visible: { transition: { staggerChildren: 0.08 } } };

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const duration = 800;
    const startTime = performance.now();
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(step);
      else prevRef.current = end;
    }
    requestAnimationFrame(step);
  }, [value]);
  return <>{display.toFixed(decimals)}</>;
}

// ─── Risk Gauge Ring ──────────────────────────────────────────────────────────
function RiskGaugeSmall({ score, level }: { score: number; level: RiskLevel }) {
  const color = level === 'low' ? 'var(--risk-low)'
    : level === 'medium' ? 'var(--risk-medium)'
    : level === 'critical' ? 'var(--risk-critical)'
    : 'var(--risk-high)';
  const circumference = 2 * Math.PI * 28;
  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(circumference - (score / 100) * circumference);
    }, 300);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  return (
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
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
        <span className="text-[11px] font-bold" style={{ color }}>{score}</span>
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
              <Icon className="w-4 h-4" style={{ color: accentColor ?? 'var(--muted-foreground)' }} />
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold text-foreground font-mono">{value}</span>
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
  const router = useRouter();
  return (
    <motion.button
      variants={fadeUp}
      onClick={() => router.push('/risk')}
      className={cn(
        'w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl transition-all',
        'hover:bg-muted border border-transparent hover:border-border/60 group'
      )}
    >
      <div className={cn(
        'mt-1 w-2 h-2 rounded-full shrink-0',
        alert.riskLevel === 'high' || alert.riskLevel === 'critical'
          ? 'bg-[var(--risk-high)] pulse-live'
          : alert.riskLevel === 'medium'
          ? 'bg-[var(--risk-medium)]'
          : 'bg-[var(--risk-low)]'
      )} />
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
          <span className="text-xs text-muted-foreground">{timeAgo(alert.timestamp)}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 group-hover:text-primary transition-colors shrink-0" />
    </motion.button>
  );
}

// ─── Quick Link Card ──────────────────────────────────────────────────────────
function QuickLink({ href, icon: Icon, label, description, color }: {
  href: string; icon: React.ElementType; label: string; description: string; color: string;
}) {
  const router = useRouter();
  return (
    <motion.button
      variants={fadeUp}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={() => router.push(href)}
      className={cn(
        'w-full text-left p-4 rounded-xl border border-border/60 bg-card',
        'hover:border-primary/30 hover:shadow-sm transition-all group'
      )}
    >
      <div
        className="w-9 h-9 rounded-lg mb-3 flex items-center justify-center"
        style={{ backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)` }}
      >
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <p className="font-semibold text-sm text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      <div className="flex items-center gap-1 mt-2 text-xs font-medium" style={{ color }}>
        Open <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </motion.button>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const {
    activeWell, liveDepthFt, liveRiskScore, liveRiskLevel,
    alerts, unreadAlertCount, isRTMACConnected, liveRtmacData
  } = useAppStore();

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

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeWell?.name ?? 'No active well'} · {activeWell?.field}, {activeWell?.block}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn(
              'w-2 h-2 rounded-full',
              isRTMACConnected ? 'bg-[var(--risk-low)] pulse-live' : 'bg-destructive'
            )} />
            <span>{isRTMACConnected ? 'eRTMAC Live' : 'Disconnected'}</span>
            {liveRtmacData && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span>Updated {timeAgo(liveRtmacData.timestamp)}</span>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Summary Cards (2×2 grid) ────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8"
      >
        {/* Card 1: Live Depth */}
        <SummaryCard
          title="Current Depth"
          value={<AnimatedNumber value={liveDepthFt} />}
          unit="ft MD"
          icon={Activity}
          subtitle={`TVD: ~${formatDepth(liveDepthFt * 0.968)} ft`}
          accentColor="var(--primary)"
          delay={0}
        />
        {/* Card 2: Formation */}
        <motion.div variants={fadeUp} transition={{ delay: 0.08 }}>
          <Card className="card-hover border-border/60 hover:border-secondary/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formation</p>
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-secondary" />
                </div>
              </div>
              <p className="text-lg font-bold text-foreground leading-tight">
                {currentFormation?.name ?? 'Unknown'}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                {currentFormation && (
                  <span
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

        {/* Card 3: Risk Score */}
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
                  <p className="text-2xl font-bold font-mono text-foreground">
                    <AnimatedNumber value={liveRiskScore} />
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </p>
                  <p className="text-xs text-muted-foreground">AI Risk Index</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 4: Nearby Wells */}
        <SummaryCard
          title="Offset Wells"
          value={<AnimatedNumber value={nearbyWellCount} />}
          unit="in range"
          icon={Map}
          subtitle={`${incidentsInArea} historical incidents`}
          accentColor="#2E86AB"
          delay={0.24}
        />
      </motion.div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Alerts Panel ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2">
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
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary hover:text-primary"
                onClick={() => router.push('/risk')}
              >
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
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
                  <AlertTriangle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No alerts — all clear</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Links + Live Feed ───────────────────────────────────── */}
        <div className="space-y-4">
          {/* Quick Links */}
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

          {/* Live Feed Card */}
          {liveRtmacData && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--risk-low)] pulse-live" />
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Live Drilling Parameters
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {[
                      { label: 'ROP', value: `${liveRtmacData.rateOfPenetrationFtHr.toFixed(1)}`, unit: 'ft/hr' },
                      { label: 'WOB', value: `${liveRtmacData.weightOnBitKlbs.toFixed(1)}`, unit: 'klbs' },
                      { label: 'RPM', value: `${liveRtmacData.rotarySpeedRpm}`, unit: 'rpm' },
                      { label: 'MW', value: `${liveRtmacData.mudWeightPpg.toFixed(2)}`, unit: 'ppg' },
                      { label: 'SPP', value: `${liveRtmacData.standpipePressurePsi}`, unit: 'psi' },
                    ].map(({ label, value, unit }) => (
                      <div key={label}>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase">{label}</p>
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {value} <span className="text-xs text-muted-foreground font-normal">{unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
