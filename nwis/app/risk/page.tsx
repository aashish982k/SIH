'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { MOCK_THREAT_MATRIX, HISTORICAL_ALERTS } from '@/lib/mock/alerts';
import { cn, getRiskBgClass, getRiskBorderClass, getRiskLabel, getIncidentLabel, formatDepth, timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle, Activity, Map, ChevronDown, ChevronRight,
  Clock, Zap, CheckCircle, Eye
} from 'lucide-react';
import type { Alert, RiskLevel } from '@/lib/types';

// ─── Animated SVG Arc Gauge ───────────────────────────────────────────────────
function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const r = 72;
  const cx = 90;
  const cy = 90;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const circumference = (2 * Math.PI * r * totalAngle) / 360;
  const filled = (score / 100) * circumference;
  const dashArray = `${circumference}`;
  const [animatedFill, setAnimatedFill] = useState(0);

  const color =
    level === 'low' ? 'var(--risk-low)' :
    level === 'medium' ? 'var(--risk-medium)' :
    level === 'critical' ? 'var(--risk-critical)' :
    'var(--risk-high)';

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedFill(filled), 200);
    return () => clearTimeout(timer);
  }, [filled]);

  // Convert polar to cartesian
  function polarToXY(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  // Arc path (start → end)
  function arcPath(fromDeg: number, toDeg: number) {
    const start = polarToXY(fromDeg);
    const end = polarToXY(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
  }

  const bgPath = arcPath(startAngle, endAngle);
  const fillPath = arcPath(startAngle, startAngle + (score / 100) * totalAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width={180} height={130} viewBox="0 0 180 130">
        {/* Background arc */}
        <path d={bgPath} fill="none" stroke="var(--muted)" strokeWidth={12} strokeLinecap="round" />
        {/* Filled arc */}
        <motion.path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
        />
        {/* Score text */}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={32} fontWeight="700"
          fontFamily="JetBrains Mono, monospace" fill="var(--foreground)"
        >
          {score}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={11}
          fontFamily="Inter, sans-serif" fill="var(--muted-foreground)"
        >
          Risk Score
        </text>
        {/* Range labels */}
        <text x={27} y={105} fontSize={9} fill="var(--muted-foreground)" fontFamily="Inter, sans-serif">0</text>
        <text x={148} y={105} fontSize={9} fill="var(--muted-foreground)" fontFamily="Inter, sans-serif">100</text>
      </svg>
      <span
        className="text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-full -mt-4"
        style={{ color, backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)` }}
      >
        {getRiskLabel(level)} Risk
      </span>
    </div>
  );
}

// ─── Depth Tape ───────────────────────────────────────────────────────────────
function DepthTape({ depth }: { depth: number }) {
  const ticks = Array.from({ length: 7 }, (_, i) => depth - 300 + i * 100);
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-14 h-36 rounded-lg overflow-hidden bg-muted/50 border border-border/60">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
          {ticks.map((tick, i) => (
            <div key={tick} className={cn(
              'w-full flex items-center',
              i === 3 ? 'bg-primary/15 border-y border-primary/30' : ''
            )}>
              <div className={cn('w-3 h-px', tick % 200 === 0 ? 'bg-foreground/30' : 'bg-muted-foreground/30')} />
              {tick % 200 === 0 && (
                <span className="text-[8px] font-mono text-muted-foreground ml-1 leading-4">
                  {(tick / 1000).toFixed(1)}k
                </span>
              )}
            </div>
          ))}
        </div>
        {/* Center needle */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-primary" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full" />
      </div>
      <p className="font-mono text-base font-bold text-foreground mt-2">{formatDepth(depth)}<span className="text-xs text-muted-foreground font-normal ml-1">ft</span></p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">MD</p>
    </div>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, isNew }: { alert: Alert; isNew: boolean }) {
  const router = useRouter();
  const { acknowledgeAlert } = useAppStore();

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -16, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'rounded-xl border-l-4 p-4 bg-card border border-border/60',
        getRiskBorderClass(alert.riskLevel),
        isNew && 'alert-flash'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge className={cn('text-[10px] h-4 px-1.5', getRiskBgClass(alert.riskLevel))}>
              {getRiskLabel(alert.riskLevel)}
            </Badge>
            <span className="text-xs text-muted-foreground">{getIncidentLabel(alert.incidentType)}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-mono text-muted-foreground">{formatDepth(alert.depthFt)} ft</span>
            {isNew && (
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">New</span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">{alert.message}</p>
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(alert.timestamp)}
          </p>
        </div>
        {alert.status === 'new' && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs h-7"
            onClick={() => acknowledgeAlert(alert.id)}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />Ack
          </Button>
        )}
      </div>

      {/* Recommended Action */}
      <Accordion className="mt-2">
        <AccordionItem value="action" className="border-none">
          <AccordionTrigger className="py-1 text-xs text-primary hover:no-underline font-medium">
            <Zap className="w-3 h-3 mr-1" />Recommended Action
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-0">
            <p className="text-xs text-muted-foreground leading-relaxed">{alert.recommendedAction}</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex gap-2 mt-2">
        {alert.relatedWellIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => router.push('/map')}
          >
            <Map className="w-3 h-3" />View on Map
          </Button>
        )}
        {alert.relatedWellIds.slice(0, 2).map(wid => (
          <Button
            key={wid}
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => router.push(`/wells/${wid}`)}
          >
            <Eye className="w-3 h-3" />{wid.replace('well-', 'W-')}
          </Button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Risk & Alerts Page ───────────────────────────────────────────────────────
export default function RiskPage() {
  const { liveDepthFt, liveRiskScore, liveRiskLevel, alerts, liveRtmacData, acknowledgeAlert } = useAppStore();
  const newAlerts = alerts.filter(a => a.status === 'new');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Risk & Alerts</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live risk assessment and alert monitoring for the active well
        </p>
      </motion.div>

      {/* ── Top Band: Depth Tape + Gauge + Stats ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        {/* Depth Tape */}
        <Card className="border-border/60">
          <CardContent className="p-5 flex flex-col items-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 self-start">
              Live Depth
            </p>
            <DepthTape depth={liveDepthFt} />
          </CardContent>
        </Card>

        {/* Risk Gauge */}
        <Card className={cn(
          'border-2 transition-colors',
          liveRiskLevel === 'high' || liveRiskLevel === 'critical'
            ? 'border-risk-high bg-risk-high'
            : liveRiskLevel === 'medium'
            ? 'border-risk-medium bg-risk-medium'
            : 'border-border/60'
        )}>
          <CardContent className="p-5 flex flex-col items-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 self-start">
              AI Risk Index
            </p>
            <RiskGauge score={liveRiskScore} level={liveRiskLevel} />
          </CardContent>
        </Card>

        {/* Drilling params */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Drilling Parameters
            </p>
            {liveRtmacData ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'ROP', value: `${liveRtmacData.rateOfPenetrationFtHr.toFixed(1)}`, unit: 'ft/hr' },
                  { label: 'WOB', value: `${liveRtmacData.weightOnBitKlbs.toFixed(1)}`, unit: 'klbs' },
                  { label: 'RPM', value: `${liveRtmacData.rotarySpeedRpm}`, unit: '' },
                  { label: 'Mud Wt', value: `${liveRtmacData.mudWeightPpg.toFixed(2)}`, unit: 'ppg' },
                  { label: 'SPP', value: `${liveRtmacData.standpipePressurePsi}`, unit: 'psi' },
                  { label: 'Updated', value: timeAgo(liveRtmacData.timestamp), unit: '' },
                ].map(({ label, value, unit }) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                    <p className="font-mono text-sm font-bold text-foreground">
                      {value}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Connecting to eRTMAC…</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Main Content: Threat Matrix + Alerts ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Threat Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Threat Matrix
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Risk Factor', 'Prob.', 'Severity', 'Confidence', 'Wells'].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2 px-3 first:pl-5 last:pr-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {MOCK_THREAT_MATRIX.map((row, i) => (
                    <motion.tr
                      key={row.riskFactor}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 pl-5 pr-3">
                        <p className="font-medium text-foreground text-[11px]">{row.riskFactor}</p>
                        <p className="text-muted-foreground text-[10px] line-clamp-1 mt-0.5">{row.description}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', getRiskBgClass(row.probability))}>
                          {getRiskLabel(row.probability)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', getRiskBgClass(row.severity))}>
                          {getRiskLabel(row.severity)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${row.confidence}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground">{row.confidence}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 pr-5 font-mono text-muted-foreground">{row.relatedWellCount}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Active Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-border/60 h-full">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Active Alerts
                {newAlerts.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{newAlerts.length} new</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
              <AnimatePresence>
                {[...newAlerts, ...acknowledgedAlerts].map(alert => (
                  <AlertCard key={alert.id} alert={alert} isNew={alert.status === 'new'} />
                ))}
              </AnimatePresence>
              {newAlerts.length === 0 && acknowledgedAlerts.length === 0 && (
                <div className="py-12 text-center">
                  <CheckCircle className="w-10 h-10 text-[var(--risk-low)] mx-auto mb-2" />
                  <p className="font-semibold text-foreground">All clear</p>
                  <p className="text-sm text-muted-foreground mt-1">No active alerts for the current well</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Historical Alert Log ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6"
      >
        <Accordion>
          <AccordionItem value="history" className="border border-border/60 rounded-xl px-5 bg-card">
            <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline">
              Historical Alert Log ({HISTORICAL_ALERTS.length})
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              {HISTORICAL_ALERTS.map(alert => (
                <AlertCard key={alert.id} alert={alert} isNew={false} />
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>
    </div>
  );
}
