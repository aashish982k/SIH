'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MOCK_WELLS } from '@/lib/mock/wells';
import { getIncidentsForWell } from '@/lib/mock/incidents';
import { MOCK_REPORTS } from '@/lib/mock/knowledge';
import { cn, getRiskBgClass, getRiskLabel, getRiskBorderClass, getIncidentLabel, getIncidentColor, formatDepth, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, MapPin, Calendar, Layers, AlertTriangle,
  FileText, GitCompare, ChevronRight, Clock, Ruler, Zap
} from 'lucide-react';
import type { Incident } from '@/lib/types';
import { useAppStore } from '@/store/appStore';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── Formation Depth Log (custom SVG) ────────────────────────────────────────
function FormationLog({ formations }: { formations: typeof MOCK_WELLS[0]['formations'] }) {
  const maxDepth = formations[formations.length - 1]?.depthBaseFt ?? 12000;
  const svgHeight = 360;

  return (
    <div className="flex gap-4">
      {/* Depth axis */}
      <div className="flex flex-col justify-between text-right py-1" style={{ height: svgHeight }}>
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <span key={frac} className="text-[10px] font-mono text-muted-foreground">
            {formatDepth(maxDepth * frac)} ft
          </span>
        ))}
      </div>

      {/* Formation column */}
      <div className="relative flex-1 rounded-lg overflow-hidden border border-border/60" style={{ height: svgHeight }}>
        <svg width="100%" height={svgHeight} viewBox={`0 0 200 ${svgHeight}`} preserveAspectRatio="none">
          {formations.map((f, i) => {
            const y1 = (f.depthTopFt / maxDepth) * svgHeight;
            const y2 = (f.depthBaseFt / maxDepth) * svgHeight;
            const height = y2 - y1;
            return (
              <g key={f.id}>
                <motion.rect
                  x={0} y={y1} width={200} height={height}
                  fill={f.color}
                  fillOpacity={0.7}
                  initial={{ scaleY: 0, originY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
                />
                {height > 20 && (
                  <text
                    x={100} y={y1 + height / 2 + 4}
                    textAnchor="middle"
                    fontSize={height > 35 ? 10 : 8}
                    fill="rgba(255,255,255,0.9)"
                    fontWeight="600"
                    fontFamily="Inter, sans-serif"
                  >
                    {f.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 justify-start pt-1">
        {formations.map(f => (
          <div key={f.id} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: f.color }} />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{f.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Incident Timeline (depth chart) ─────────────────────────────────────────
function IncidentTimeline({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <div className="py-10 text-center">
        <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No incidents recorded</p>
      </div>
    );
  }

  const data = incidents.map((inc, i) => ({
    depth: inc.depthFt,
    index: i + 1,
    severity: inc.severity,
    type: inc.type,
    id: inc.id,
    color: getIncidentColor(inc.type),
  }));

  return (
    <div>
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 20, left: 40 }}>
            <XAxis
              dataKey="index" type="number"
              label={{ value: 'Incident #', position: 'insideBottom', offset: -10, fontSize: 10 }}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              dataKey="depth" type="number" reversed
              label={{ value: 'Depth (ft)', angle: -90, position: 'insideLeft', fontSize: 10 }}
              tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tickFormatter={v => `${(v/1000).toFixed(1)}k`}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
                    <p className="font-semibold">{getIncidentLabel(d.type)}</p>
                    <p className="text-muted-foreground">{formatDepth(d.depth)} ft</p>
                    <p className={cn('capitalize font-medium', `risk-${d.severity}`)}>{d.severity}</p>
                  </div>
                );
              }}
            />
            <Scatter data={data}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Incident list */}
      <div className="space-y-2">
        {incidents.map(inc => (
          <div key={inc.id} className={cn(
            'flex items-start gap-3 p-3 rounded-lg border-l-4',
            getRiskBorderClass(inc.severity), 'bg-muted/30'
          )}>
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
              style={{ backgroundColor: getIncidentColor(inc.type) }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{getIncidentLabel(inc.type)}</span>
                <Badge className={cn('text-[10px] h-4 px-1.5', getRiskBgClass(inc.severity))}>
                  {getRiskLabel(inc.severity)}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">{formatDepth(inc.depthFt)} ft</span>
              </div>
              <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{inc.description}</p>
              <Accordion className="mt-1">
                <AccordionItem value="mitigation" className="border-none">
                  <AccordionTrigger className="py-0.5 text-xs text-primary hover:no-underline">
                    Mitigation & Lessons Learned
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-0">
                    <p className="text-xs text-muted-foreground"><strong>Mitigation:</strong> {inc.mitigation}</p>
                    <p className="text-xs text-muted-foreground mt-1"><strong>Lessons:</strong> {inc.lessonsLearned}</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground">{formatDate(inc.date)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{inc.durationHours}h NPT</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Well Detail Page ─────────────────────────────────────────────────────────
export default function WellDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { activeWell } = useAppStore();
  const [activeSection, setActiveSection] = useState('overview');

  const well = MOCK_WELLS.find(w => w.id === id);
  const incidents = well ? getIncidentsForWell(well.id) : [];
  const reports = MOCK_REPORTS.filter(r => r.wellId === id);

  if (!well) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="font-semibold text-foreground">Well not found</p>
          <Button variant="outline" className="mt-3" onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Map
      </button>

      {/* ── Well Header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 p-6 rounded-2xl bg-card border border-border/60"
      >
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{well.name}</h1>
            <Badge
              className={cn('text-xs', well.status === 'active'
                ? 'bg-risk-low text-[var(--risk-low)]'
                : well.status === 'suspended'
                ? 'bg-risk-medium text-[var(--risk-medium)]'
                : 'bg-muted text-muted-foreground'
              )}
            >
              {well.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{well.field}, {well.block}</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" />{well.operator}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Spud: {formatDate(well.spudDate)}</span>
            {well.completionDate && (
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />TD: {formatDate(well.completionDate)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push(`/compare?a=${activeWell?.id}&b=${well.id}`)}
          >
            <GitCompare className="w-4 h-4" />
            Compare with Active Well
          </Button>
        </div>
      </motion.div>

      {/* ── Trajectory Strip ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Depth (MD)', value: formatDepth(well.totalDepthFt), unit: 'ft' },
          { label: 'TVD', value: formatDepth(well.trueVerticalDepthFt), unit: 'ft' },
          { label: 'Inclination', value: `${well.inclination}°`, unit: '' },
          { label: 'Azimuth', value: `${well.azimuth}°`, unit: '' },
        ].map(({ label, value, unit }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
              <p className="font-mono text-xl font-bold text-foreground">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Tabs ───────────────────────────────────────────────────── */}
      <Tabs defaultValue="formations" className="space-y-4">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="formations" className="gap-2"><Layers className="w-3.5 h-3.5" />Formation Log</TabsTrigger>
          <TabsTrigger value="incidents" className="gap-2">
            <AlertTriangle className="w-3.5 h-3.5" />Incidents
            {incidents.length > 0 && <Badge variant="outline" className="h-4 text-[10px] px-1.5">{incidents.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="casing" className="gap-2"><Ruler className="w-3.5 h-3.5" />Casing Program</TabsTrigger>
          <TabsTrigger value="reports" className="gap-2"><FileText className="w-3.5 h-3.5" />Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="formations">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Stratigraphy Log</CardTitle></CardHeader>
            <CardContent>
              <FormationLog formations={well.formations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Incident Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <IncidentTimeline incidents={incidents} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="casing">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Casing & Cementing Program</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Casing', 'Size', 'Set Depth', 'Cement Top', 'Cement Bottom', 'Grade', 'Weight'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2 px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {well.casingProgram.map(c => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-foreground">{c.name}</td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">{c.sizeinches}"</td>
                        <td className="py-2.5 px-3 font-mono text-foreground">{formatDepth(c.setDepthFt)} ft</td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">{formatDepth(c.cementTopFt)} ft</td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">{formatDepth(c.cementBottomFt)} ft</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{c.grade}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{c.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Source Reports</CardTitle></CardHeader>
            <CardContent>
              {reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.type} · {formatDate(r.uploadedAt)} · {(r.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{r.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No reports uploaded for this well</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
