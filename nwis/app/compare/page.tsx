'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { MOCK_WELLS } from '@/lib/mock/wells';
import { getIncidentsForWell } from '@/lib/mock/incidents';
import { cn, getRiskBgClass, getIncidentLabel, getIncidentColor, formatDepth, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

import { ArrowLeft, GitCompare, AlertTriangle, Layers } from 'lucide-react';
import type { Well } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';

// ─── Compare Panel ─────────────────────────────────────────────────────────────
function WellPanel({ well, label }: { well: Well; label: string }) {
  const incidents = getIncidentsForWell(well.id);
  const highRisk = incidents.filter(i => i.severity === 'high' || i.severity === 'critical');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-2 h-10 rounded-full bg-primary" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-bold text-lg text-foreground">{well.name}</p>
          <p className="text-xs text-muted-foreground">{well.field} · {well.block}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Total Depth', value: `${formatDepth(well.totalDepthFt)} ft` },
          { label: 'TVD', value: `${formatDepth(well.trueVerticalDepthFt)} ft` },
          { label: 'Inclination', value: `${well.inclination}°` },
          { label: 'Azimuth', value: `${well.azimuth}°` },
          { label: 'Status', value: well.status },
          { label: 'Spud Date', value: formatDate(well.spudDate) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted/40 rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="font-mono text-sm font-semibold text-foreground capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Formations */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          <Layers className="w-3 h-3 inline mr-1" />Formation Column
        </p>
        <div className="space-y-1">
          {well.formations.map(f => (
            <div key={f.id} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: f.color }} />
              <span className="text-xs text-foreground">{f.name}</span>
              <span className="text-xs text-muted-foreground ml-auto font-mono">
                {formatDepth(f.depthTopFt)} – {formatDepth(f.depthBaseFt)} ft
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Incidents */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          <AlertTriangle className="w-3 h-3 inline mr-1" />Incidents
          {incidents.length > 0 && (
            <span className={cn('ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold', getRiskBgClass(
              highRisk.length > 0 ? 'high' : 'medium'
            ))}>
              {incidents.length}
            </span>
          )}
        </p>
        {incidents.length === 0 ? (
          <p className="text-xs text-[var(--risk-low)] font-medium">No incidents recorded</p>
        ) : (
          <div className="space-y-1.5">
            {incidents.slice(0, 5).map(inc => (
              <div key={inc.id} className={cn(
                'flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/40 border-l-4',
                inc.severity === 'high' || inc.severity === 'critical' ? 'border-l-[var(--risk-high)]'
                  : inc.severity === 'medium' ? 'border-l-[var(--risk-medium)]'
                  : 'border-l-[var(--risk-low)]'
              )}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getIncidentColor(inc.type) }} />
                <span className="font-medium text-foreground">{getIncidentLabel(inc.type)}</span>
                <span className="text-muted-foreground ml-auto font-mono">{formatDepth(inc.depthFt)} ft</span>
              </div>
            ))}
            {incidents.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+{incidents.length - 5} more</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compare Content (inner) ──────────────────────────────────────────────────
function CompareContent() {
  const searchParams = useSearchParams();
  const [wellAId, setWellAId] = useState(searchParams.get('a') ?? MOCK_WELLS[0].id);
  const [wellBId, setWellBId] = useState(searchParams.get('b') ?? MOCK_WELLS[1].id);

  const wellA = MOCK_WELLS.find(w => w.id === wellAId) ?? MOCK_WELLS[0];
  const wellB = MOCK_WELLS.find(w => w.id === wellBId) ?? MOCK_WELLS[1];

  const incidentsA = getIncidentsForWell(wellA.id);
  const incidentsB = getIncidentsForWell(wellB.id);

  // Incident type comparison chart data
  const incidentTypes = ['mud_loss', 'kick', 'stuck_pipe', 'npt', 'washout'] as const;
  const chartData = incidentTypes.map(type => ({
    name: getIncidentLabel(type),
    [wellA.name]: incidentsA.filter(i => i.type === type).length,
    [wellB.name]: incidentsB.filter(i => i.type === type).length,
    color: getIncidentColor(type),
  }));

  type Better = 'none' | 'lower' | 'higher';
  const diffMetrics: Array<{
    label: string;
    a: number;
    b: number;
    format: (v: number) => string;
    better: Better;
  }> = [
    {
      label: 'Total Depth',
      a: wellA.totalDepthFt,
      b: wellB.totalDepthFt,
      format: (v: number) => `${formatDepth(v)} ft`,
      better: 'none',
    },
    {
      label: 'Inclination',
      a: wellA.inclination,
      b: wellB.inclination,
      format: (v: number) => `${v}°`,
      better: 'lower',
    },
    {
      label: 'Incidents',
      a: incidentsA.length,
      b: incidentsB.length,
      format: (v: number) => `${v}`,
      better: 'lower',
    },
    {
      label: 'High-Risk Incidents',
      a: incidentsA.filter(i => i.severity === 'high' || i.severity === 'critical').length,
      b: incidentsB.filter(i => i.severity === 'high' || i.severity === 'critical').length,
      format: (v: number) => `${v}`,
      better: 'lower',
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
      {/* Back */}
      <Link
        href="/map"
        className={cn(
          'inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring rounded outline-none'
        )}
      >
        <ArrowLeft aria-hidden="true" className="w-4 h-4" />Back to Map
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <GitCompare className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Compare Wells</h1>
      </div>

      {/* Well Selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Well A', value: wellAId, onChange: setWellAId },
          { label: 'Well B', value: wellBId, onChange: setWellBId },
        ].map(({ label, value, onChange }) => (
          <div key={label}>
            <Label htmlFor={`select-${label}`} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {label}
            </Label>
            <Select value={value} onValueChange={(v) => v && onChange(v as string)}>
              <SelectTrigger id={`select-${label}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOCK_WELLS.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Diff Metrics Band */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {diffMetrics.map(({ label, a, b, format, better }) => {
          // 'lower' = smaller value is better; 'higher' = larger is better.
          // Equal values: neither side is highlighted.
          const aIsBetter = better === 'lower' ? a < b : better === 'higher' ? a > b : false;
          const bIsBetter = better === 'lower' ? b < a : better === 'higher' ? b > a : false;
          return (
            <Card key={label} className="border-border/60">
              <CardContent className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-label={`Well A: ${format(a)}${aIsBetter ? ' (better)' : ''}`}
                    className={cn(
                      'font-mono text-sm font-bold tabular-nums',
                      aIsBetter ? 'text-[var(--risk-low)]' : 'text-foreground'
                    )}
                  >
                    {format(a)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">vs</span>
                  <span
                    aria-label={`Well B: ${format(b)}${bIsBetter ? ' (better)' : ''}`}
                    className={cn(
                      'font-mono text-sm font-bold tabular-nums',
                      bIsBetter ? 'text-[var(--risk-low)]' : 'text-foreground'
                    )}
                  >
                    {format(b)}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Compare Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">{wellA.name}</CardTitle></CardHeader>
          <CardContent><WellPanel well={wellA} label="Well A" /></CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">{wellB.name}</CardTitle></CardHeader>
          <CardContent><WellPanel well={wellB} label="Well B" /></CardContent>
        </Card>
      </div>

      {/* Incident Comparison Chart */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Incident Type Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name" tick={{ fontSize: 10 }}
                  tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  content={({ payload, label }) => (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                      <p className="font-semibold mb-1">{label}</p>
                      {payload?.map(p => (
                        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
                      ))}
                    </div>
                  )}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={wellA.name} fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey={wellB.name} fill="var(--secondary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Compare Page (wrapped in Suspense for useSearchParams) ───────────────────
export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading…</div>}>
      <CompareContent />
    </Suspense>
  );
}
