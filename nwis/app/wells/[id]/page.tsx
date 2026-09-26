'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
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
  FileText, GitCompare, ChevronRight, Clock, Ruler, Zap, CheckCircle2, Download,
  ShieldAlert, Loader2
} from 'lucide-react';
import type { Incident } from '@/lib/types';
import { useAppStore } from '@/store/appStore';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import MitigationModal, { IncidentMitigationData } from '@/components/incidents/MitigationModal';

// ─── Basin & Geological Helpers ──────────────────────────────────────────────
function getLithologyColor(name: string, litho: string = ''): string {
  const text = (name + ' ' + litho).toLowerCase();
  if (text.includes('shale') || text.includes('clay') || text.includes('gumbo') || text.includes('bentonite')) return '#5A6B7A'; // Slate / Gray
  if (text.includes('lime') || text.includes('carbonate') || text.includes('chalk')) return '#68D391'; // Green Limestone
  if (text.includes('sand') || text.includes('silt') || text.includes('turbidite')) return '#ECC94B'; // Sandstone Amber
  if (text.includes('volcanic') || text.includes('basement')) return '#ED8936'; // Warm Bronze
  return '#D4A76A';
}

function getBasinKeyFromWell(wellOrId: any): string {
  const idStr = typeof wellOrId === 'string' ? wellOrId : (wellOrId?.id || '');
  const fieldStr = (typeof wellOrId === 'object' ? (wellOrId?.field || wellOrId?.field_name || '') : '').toLowerCase();
  const combined = (idStr + ' ' + fieldStr).toLowerCase();

  if (combined.includes('brm') || combined.includes('barmer') || combined.includes('rajasthan')) return 'rajasthan';
  if (combined.includes('cby') || combined.includes('cambay') || combined.includes('gujarat')) return 'cambay';
  if (combined.includes('mbh') || combined.includes('mumbai') || combined.includes('offshore')) return 'mumbai';
  if (combined.includes('trp') || combined.includes('tripura')) return 'tripura';
  if (combined.includes('kgb') || combined.includes('kg') || combined.includes('godavari') || combined.includes('deepwater')) return 'kg';
  if (combined.includes('cvy') || combined.includes('cauvery') || combined.includes('narimanam')) return 'cauvery';
  return 'assam';
}

function generateBasinFormations(well: any) {
  const basin = getBasinKeyFromWell(well);
  const td = Number(well?.total_depth_ft || well?.totalDepthFt || 8500);

  const stratTemplates: Record<string, Array<{ name: string; litho: string; topFrac: number; botFrac: number }>> = {
    rajasthan: [
      { name: 'Sand Dunes & Alluvium', litho: 'Loose Sand', topFrac: 0, botFrac: 0.10 },
      { name: 'Akli Bentonite Clay', litho: 'Swelling Bentonite Shale', topFrac: 0.10, botFrac: 0.38 },
      { name: 'Barmer Hill Formation', litho: 'Siliceous Diatomite Shale', topFrac: 0.38, botFrac: 0.72 },
      { name: 'Fatehgarh Sandstone', litho: 'Fluvial Braided Sandstone', topFrac: 0.72, botFrac: 1.0 },
    ],
    cambay: [
      { name: 'Post-Eocene Clay', litho: 'Soft Claystone', topFrac: 0, botFrac: 0.18 },
      { name: 'Tarapur Shale', litho: 'Sloughing Gray Shale', topFrac: 0.18, botFrac: 0.48 },
      { name: 'Hazad Sandstone', litho: 'Deltaic Quartz Sand', topFrac: 0.48, botFrac: 0.85 },
      { name: 'Cambay Black Shale', litho: 'Overpressured Organic Shale', topFrac: 0.85, botFrac: 1.0 },
    ],
    mumbai: [
      { name: 'Seabed Soft Clays', litho: 'Marine Calcareous Silt', topFrac: 0, botFrac: 0.14 },
      { name: 'Chinchini Formation', litho: 'Calcareous Claystone', topFrac: 0.14, botFrac: 0.45 },
      { name: 'L-II Limestone', litho: 'Chalky Packstone Limestone', topFrac: 0.45, botFrac: 0.65 },
      { name: 'L-III Main Limestone', litho: 'Vuggy Biomicritic Limestone', topFrac: 0.65, botFrac: 1.0 },
    ],
    tripura: [
      { name: 'Tipam Sandstone', litho: 'Massive Friable Sandstone', topFrac: 0, botFrac: 0.35 },
      { name: 'Bokabil Formation', litho: 'Interbedded Shale & Silt', topFrac: 0.35, botFrac: 0.65 },
      { name: 'Upper Bhuban Sand', litho: 'Tectonically Stressed Gas Sand', topFrac: 0.65, botFrac: 1.0 },
    ],
    kg: [
      { name: 'Deepwater Marine Gumbo', litho: 'Expansive Smectite Clay', topFrac: 0, botFrac: 0.22 },
      { name: 'Godavari Siltstone', litho: 'Soft Silt & Silty Shale', topFrac: 0.22, botFrac: 0.50 },
      { name: 'Ravva Sandstone', litho: 'Deltaic Oil Sandstone', topFrac: 0.50, botFrac: 0.72 },
      { name: 'Pliocene Turbidites', litho: 'Deepwater Channel Gas Sand', topFrac: 0.72, botFrac: 1.0 },
    ],
    cauvery: [
      { name: 'Cuddalore Sandstone', litho: 'Coarse Friable Sand', topFrac: 0, botFrac: 0.16 },
      { name: 'Kamalapuram Formation', litho: 'Marine Swelling Shale', topFrac: 0.16, botFrac: 0.55 },
      { name: 'Bhuvanagiri Sandstone', litho: 'Subarkosic Gas Condensate Sand', topFrac: 0.55, botFrac: 1.0 },
    ],
    assam: [
      { name: 'Alluvium & Dhekiajuli', litho: 'Pebbly Sandstone', topFrac: 0, botFrac: 0.15 },
      { name: 'Girujan Clay', litho: 'Variegated Claystone', topFrac: 0.15, botFrac: 0.40 },
      { name: 'Tipam Sandstone', litho: 'Fluvial Sandstone', topFrac: 0.40, botFrac: 0.68 },
      { name: 'Barail Sandstone', litho: 'Main Reservoir Sand', topFrac: 0.68, botFrac: 0.90 },
      { name: 'Kopili Shale', litho: 'Overpressured Marine Shale', topFrac: 0.90, botFrac: 1.0 },
    ],
  };

  const list = stratTemplates[basin] || stratTemplates.assam;
  return list.map((item, idx) => ({
    id: `fmt-${well?.id || 'w'}-${idx + 1}`,
    name: item.name,
    depthTopFt: Math.round(td * item.topFrac),
    depthBaseFt: Math.round(td * item.botFrac),
    lithology: item.litho,
    color: getLithologyColor(item.name, item.litho),
  }));
}

function generateBasinCasingProgram(td: number) {
  const surfaceDepth = Math.round(td * 0.22);
  const interDepth = Math.round(td * 0.68);
  const prodDepth = Math.round(td * 0.96);

  return [
    {
      id: 'csg-1',
      name: 'Conductor Casing',
      sizeinches: 30,
      setDepthFt: 160,
      cementTopFt: 0,
      cementBottomFt: 160,
      grade: 'K-55',
      weight: '95 lb/ft',
    },
    {
      id: 'csg-2',
      name: 'Surface Casing',
      sizeinches: 20,
      setDepthFt: surfaceDepth,
      cementTopFt: 0,
      cementBottomFt: surfaceDepth,
      grade: 'K-55',
      weight: '133 lb/ft',
    },
    {
      id: 'csg-3',
      name: 'Intermediate Casing',
      sizeinches: 13.375,
      setDepthFt: interDepth,
      cementTopFt: Math.max(0, surfaceDepth - 400),
      cementBottomFt: interDepth,
      grade: 'N-80',
      weight: '68 lb/ft',
    },
    {
      id: 'csg-4',
      name: 'Production Casing',
      sizeinches: 9.625,
      setDepthFt: prodDepth,
      cementTopFt: Math.max(0, interDepth - 600),
      cementBottomFt: prodDepth,
      grade: 'P-110',
      weight: '47 lb/ft',
    },
  ];
}

function generateBasinIncidents(well: any): Incident[] {
  const basin = getBasinKeyFromWell(well);
  const td = Number(well?.total_depth_ft || well?.totalDepthFt || 8500);
  const wellName = well?.name || 'Well';

  const basinIncidentList: Record<string, Incident[]> = {
    rajasthan: [
      {
        id: `inc-${well?.id}-1`,
        wellId: well?.id,
        type: 'torque_spike',
        severity: 'medium',
        depthFt: Math.round(td * 0.26),
        date: '2024-02-10',
        description: `Severe bit balling in Akli bentonite clay at ${wellName}. ROP dropped from 28 to 3 ft/hr with high rotary torque.`,
        mitigation: 'Pumped 40 bbl detergent glycol wash pill. Increased flow rate from 480 to 620 gpm to clear bit nozzles.',
        lessonsLearned: 'Pre-treat active system with 3% glycol shale inhibitor before entering Akli bentonite horizon.',
        durationHours: 14.5,
      },
      {
        id: `inc-${well?.id}-2`,
        wellId: well?.id,
        type: 'mud_loss',
        severity: 'high',
        depthFt: Math.round(td * 0.78),
        date: '2024-02-28',
        description: `Dynamic mud losses of 65 bbl/hr upon penetrating upper Fatehgarh sandstone reservoir at ${wellName}.`,
        mitigation: 'Spotted 35 bbl coarse calcium carbonate LCM pill (40 ppb). Reduced ECD from 10.4 to 9.8 ppg.',
        lessonsLearned: 'Fatehgarh unconsolidated sands require controlled surge margins and pre-blended fiber LCM.',
        durationHours: 22.0,
      },
    ],
    cambay: [
      {
        id: `inc-${well?.id}-1`,
        wellId: well?.id,
        type: 'stuck_pipe',
        severity: 'high',
        depthFt: Math.round(td * 0.42),
        date: '2024-01-22',
        description: `Drillstring stuck mechanically due to sloughing Tarapur shale during connection at ${wellName}.`,
        mitigation: 'Worked pipe with 60 klbs overpull and upward jarring. Spotted 25 bbl lubricating oil pill and restored rotation.',
        lessonsLearned: 'Tarapur shale requires potassium chloride (KCl) inhibition and mud weight >= 10.2 ppg to prevent sloughing.',
        durationHours: 31.0,
      },
      {
        id: `inc-${well?.id}-2`,
        wellId: well?.id,
        type: 'kick',
        severity: 'critical',
        depthFt: Math.round(td * 0.90),
        date: '2024-03-02',
        description: `14 bbl pit gain and 380 psi SIDPP observed upon drilling into overpressured Cambay Black Shale at ${wellName}.`,
        mitigation: 'Shut in well on annular preventer. Bullheaded 12.2 ppg kill mud using Wait and Weight method.',
        lessonsLearned: 'Cambay Black Shale overpressured zone requires continuous monitoring of Dxc exponent.',
        durationHours: 38.0,
      },
    ],
    mumbai: [
      {
        id: `inc-${well?.id}-1`,
        wellId: well?.id,
        type: 'mud_loss',
        severity: 'critical',
        depthFt: Math.round(td * 0.75),
        date: '2024-02-14',
        description: `Total lost circulation into vuggy L-III Limestone at ${wellName}. Zero mud returns to shale shakers.`,
        mitigation: 'Pumped 60 bbl diesel-bentonite-cement (DBC) gunk squeeze plug. Waited 8 hours on cement before resumption.',
        lessonsLearned: 'L-III cavernous limestone requires standby DBC gunk pills and floating mud cap drilling capability.',
        durationHours: 46.5,
      },
    ],
    tripura: [
      {
        id: `inc-${well?.id}-1`,
        wellId: well?.id,
        type: 'kick',
        severity: 'critical',
        depthFt: Math.round(td * 0.76),
        date: '2024-02-19',
        description: `High pressure gas kick in Upper Bhuban Sand at ${wellName}. Pit gain 22 bbls in 4 minutes, SICP 620 psi.`,
        mitigation: "Executed Driller's Method well kill. Raised active system mud weight from 11.8 to 13.6 ppg with barite.",
        lessonsLearned: 'Tripura overthrust faults create rapid pressure ramps. Weight up before penetrating top sand contact.',
        durationHours: 34.0,
      },
    ],
    kg: [
      {
        id: `inc-${well?.id}-1`,
        wellId: well?.id,
        type: 'stuck_pipe',
        severity: 'high',
        depthFt: Math.round(td * 0.35),
        date: '2024-01-30',
        description: `Shallow water flow and reactive gumbo shale packed off the BHA stabilizer blades at ${wellName}.`,
        mitigation: 'High pressure backreaming and continuous PHPA shale inhibitor injection in suction line.',
        lessonsLearned: 'Deepwater gumbo sections require high-yield-point synthetic mud and dual-density barrier control.',
        durationHours: 26.0,
      },
    ],
    cauvery: [
      {
        id: `inc-${well?.id}-1`,
        wellId: well?.id,
        type: 'stuck_pipe',
        severity: 'medium',
        depthFt: Math.round(td * 0.88),
        date: '2024-02-25',
        description: `Differential pipe sticking against depleted Bhuvanagiri sandstone face at ${wellName}.`,
        mitigation: 'Spotted acidic glycol pipe-freeing pill. Reduced hydrostatic pressure with lighter spacer.',
        lessonsLearned: 'Limit stationary pipe connection times to under 90 seconds across depleted Bhuvanagiri sands.',
        durationHours: 19.5,
      },
    ],
    assam: [
      {
        id: `inc-${well?.id}-1`,
        wellId: well?.id,
        type: 'mud_loss',
        severity: 'high',
        depthFt: Math.round(td * 0.70),
        date: '2024-01-18',
        description: `Severe lost circulation — 450 BBL mud lost over 6 hours in Barail Sandstone at ${wellName}.`,
        mitigation: 'LCM pill (walnut shells + CaCO3) + squeeze cement + mud weight adjustment to 11.2 ppg.',
        lessonsLearned: 'Pre-treat with LCM before entering Barail. Maintain mud weight within 0.3 ppg of pore pressure gradient.',
        durationHours: 28.0,
      },
      {
        id: `inc-${well?.id}-2`,
        wellId: well?.id,
        type: 'torque_spike',
        severity: 'medium',
        depthFt: Math.round(td * 0.50),
        date: '2024-02-04',
        description: `Intermittent torque spikes while rotating across hard carbonate stringers in Kopili transition at ${wellName}.`,
        mitigation: 'Pumped 25 bbl glycol-enhanced sweep. Reamed dogleg sections at reduced RPM (40 rpm).',
        lessonsLearned: 'Kopili shale transition has high abrasive stringers; adjust bit hydraulics and cutter structure.',
        durationHours: 12.0,
      },
    ],
  };

  return basinIncidentList[basin] || basinIncidentList.assam;
}

function generateBasinReports(well: any) {
  const wellName = well?.name || 'Well';
  const wellId = well?.id || 'w-01';

  return [
    {
      id: `rep-${wellId}-wcr`,
      title: `${wellName} Well Completion Report (WCR)`,
      type: 'WCR',
      wellId: wellId,
      uploadedAt: '2024-02-20T10:00:00Z',
      status: 'saved',
      fileName: `${wellName}_WCR_2024.pdf`,
      fileSizeBytes: 5240192,
    },
    {
      id: `rep-${wellId}-ddr`,
      title: `${wellName} Daily Drilling Report (DDR) - Target Horizon`,
      type: 'DDR',
      wellId: wellId,
      uploadedAt: '2024-02-18T14:30:00Z',
      status: 'saved',
      fileName: `${wellName}_DDR_Log.pdf`,
      fileSizeBytes: 2184910,
    },
    {
      id: `rep-${wellId}-casing`,
      title: `${wellName} Casing & Cement Integrity Evaluation Log`,
      type: 'completion_report',
      wellId: wellId,
      uploadedAt: '2024-02-12T09:15:00Z',
      status: 'saved',
      fileName: `${wellName}_CBL_Integrity.pdf`,
      fileSizeBytes: 3840210,
    },
  ];
}

// ─── Formation Depth Log (custom SVG + crisp overlays) ───────────────────────
function FormationLog({ formations }: { formations: any[] }) {
  if (!formations || formations.length === 0) {
    return (
      <div className="py-10 text-center">
        <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No formation records available</p>
      </div>
    );
  }

  // Deduplicate formations by name so each unique layer appears once cleanly
  const uniqueFormations = formations.filter((f, i, arr) => 
    arr.findIndex(item => item.name?.toLowerCase().trim() === f.name?.toLowerCase().trim()) === i
  );

  const maxDepth = uniqueFormations[uniqueFormations.length - 1]?.depthBaseFt ?? 12000;
  const svgHeight = 360;

  return (
    <div className="flex gap-4">
      {/* Depth axis */}
      <div className="flex flex-col justify-between text-right py-1 min-w-[55px]" style={{ height: svgHeight }}>
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <span key={frac} className="text-[10px] font-mono text-muted-foreground">
            {formatDepth(maxDepth * frac)} ft
          </span>
        ))}
      </div>

      {/* Formation column */}
      <div className="relative flex-1 rounded-lg overflow-hidden border border-border/60 shadow-inner" style={{ height: svgHeight }}>
        <svg width="100%" height={svgHeight} viewBox={`0 0 100 ${svgHeight}`} preserveAspectRatio="none">
          {uniqueFormations.map((f, i) => {
            const y1 = (f.depthTopFt / maxDepth) * svgHeight;
            const y2 = (f.depthBaseFt / maxDepth) * svgHeight;
            const height = Math.max(2, y2 - y1);
            return (
              <motion.rect
                key={f.id || i}
                x={0} y={y1} width={100} height={height}
                fill={f.color || '#D4A76A'}
                fillOpacity={0.82}
                initial={{ scaleY: 0, originY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: 'easeOut' }}
              />
            );
          })}
        </svg>

        {/* Crisp, Non-Distorted HTML Text Labels Centered in each Stratum */}
        <div className="absolute inset-0 pointer-events-none">
          {uniqueFormations.map((f, i) => {
            const topPercent = (f.depthTopFt / maxDepth) * 100;
            const heightPercent = ((f.depthBaseFt - f.depthTopFt) / maxDepth) * 100;
            if (heightPercent < 6) return null;
            return (
              <div
                key={f.id || i}
                className="absolute left-0 right-0 flex items-center justify-center px-4 text-center font-bold text-xs text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide"
                style={{ top: `${topPercent}%`, height: `${heightPercent}%` }}
              >
                {f.name}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 justify-start pt-1 min-w-[150px]">
        {uniqueFormations.map((f, i) => (
          <div key={f.id || i} className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm shrink-0 shadow-sm border border-black/20" style={{ backgroundColor: f.color || '#D4A76A' }} />
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{f.name}</span>
              <span className="text-[9px] font-mono text-muted-foreground">{formatDepth(f.depthTopFt)} - {formatDepth(f.depthBaseFt)} ft</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Incident Timeline (depth chart) ─────────────────────────────────────────
function IncidentTimeline({ 
  incidents, 
  onSelectMitigation 
}: { 
  incidents: (Incident & { imageUrl?: string; videoUrl?: string })[];
  onSelectMitigation?: (inc: any) => void;
}) {
  if (incidents.length === 0) {
    return (
      <div className="py-10 text-center">
        <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground font-mono">No operational incidents recorded for this interval</p>
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
      <div className="space-y-2.5">
        {incidents.map(inc => (
          <div key={inc.id} className={cn(
            'flex items-start gap-3 p-3.5 rounded-lg border-l-4 transition-all',
            getRiskBorderClass(inc.severity), 'bg-muted/30 hover:bg-muted/50'
          )}>
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 shadow-sm"
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
              <p className="text-xs text-foreground/80 mt-1 line-clamp-2 leading-relaxed">{inc.description}</p>
              
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                {onSelectMitigation && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectMitigation(inc)}
                    className="h-6 text-[11px] font-mono border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldAlert className="w-3 h-3 text-cyan-400" />
                    <span>Review Mitigation (Photo & Video)</span>
                  </Button>
                )}
              </div>

              <Accordion className="mt-1">
                <AccordionItem value="mitigation" className="border-none">
                  <AccordionTrigger className="py-0.5 text-xs text-primary hover:no-underline font-medium">
                    Mitigation & Lessons Learned
                  </AccordionTrigger>
                  <AccordionContent className="pt-1.5 pb-0 text-xs text-muted-foreground space-y-1 bg-background/50 p-2.5 rounded border border-border/40 mt-1">
                    <p><strong className="text-foreground">Mitigation:</strong> {inc.mitigation}</p>
                    <p><strong className="text-foreground">Lessons:</strong> {inc.lessonsLearned}</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-mono text-muted-foreground">{formatDate(inc.date)}</p>
              <p className="text-[10px] font-semibold text-amber-500 mt-0.5">{inc.durationHours}h NPT</p>
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
  const { activeWell, activeWellId, setActiveWell, setSelectedBasin, wells } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [liveWell, setLiveWell] = useState<any>(null);
  const [liveReports, setLiveReports] = useState<any[]>([]);
  const [activatedSuccessToast, setActivatedSuccessToast] = useState(false);
  const [selectedIncidentForMitigation, setSelectedIncidentForMitigation] = useState<IncidentMitigationData | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleGenerateReport = async () => {
    const targetWell = liveWell || wells.find(w => w.id === id);
    if (!targetWell) return;
    try {
      setGeneratingReport(true);
      const res = await api.reports.generate({
        well_id: targetWell.id,
        title: `${targetWell.name} Technical Drilling Dossier`,
        report_type: 'WCR',
        summary: `Automated engineering dossier compiled from live wellbore sensors and offset database for ${targetWell.name}.`,
      });
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
        // Refresh reports
        const reportsRes = await api.reports.list({ well_id: targetWell.id });
        const fetchedDocs = reportsRes.data?.documents || reportsRes.data?.reports || [];
        if (fetchedDocs.length > 0) {
          setLiveReports(fetchedDocs.map((d: any) => ({
            id: d.id,
            title: d.file_name?.replace(/_/g, ' ').replace('.pdf', '') || d.title || d.description || 'Engineering Evaluation Report',
            type: d.document_type || 'WCR',
            wellId: d.well_id,
            uploadedAt: d.document_date || d.created_at || '2024-02-15',
            status: d.status || 'processed',
            fileName: d.file_name || d.fileName,
            fileSizeBytes: Number(d.file_size_bytes || 5500),
          })));
        }
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadWell() {
      try {
        const [wellRes, reportsRes] = await Promise.all([
          api.wells.getById(id),
          api.reports.list({ well_id: id }).catch(() => ({ data: { documents: [] } })),
        ]);

        if (isMounted && wellRes.data?.well) {
          const w = wellRes.data.well;

          // Determine casing program
          const casingProgram = (w.casing_sections && w.casing_sections.length > 0)
            ? w.casing_sections.map((c: any) => ({
                id: c.id,
                name: c.casing_type ? `${c.casing_type.charAt(0).toUpperCase() + c.casing_type.slice(1)} Casing` : 'Casing',
                sizeinches: Number(c.outer_dia_in || 9.625),
                setDepthFt: Number(c.shoe_depth_ft || 0),
                cementTopFt: Math.max(0, Number(c.shoe_depth_ft || 0) - Math.round(Number(c.shoe_depth_ft || 0) * 0.35)),
                cementBottomFt: Number(c.shoe_depth_ft || 0),
                grade: c.grade || 'P-110',
                weight: `${c.weight_lb_ft || 47} lb/ft`,
              }))
            : generateBasinCasingProgram(Number(w.total_depth_ft || 8000));

          // Determine formations
          const formations = (w.formations && w.formations.length > 0)
            ? w.formations.map((f: any) => ({
                id: f.id,
                name: f.formation_name,
                depthTopFt: Number(f.top_depth_ft),
                depthBaseFt: Number(f.bottom_depth_ft),
                lithology: f.lithology || 'sandstone',
                color: getLithologyColor(f.formation_name, f.lithology),
              }))
            : generateBasinFormations(w);

          // Determine operational incidents
          const incidents = (w.recent_events && w.recent_events.length > 0)
            ? w.recent_events.map((e: any) => ({
                id: e.id,
                wellId: e.well_id,
                type: e.event_type,
                severity: e.severity,
                depthFt: Number(e.start_depth_ft || e.depth_ft || 8000),
                date: e.occurred_at || e.created_at,
                description: e.description,
                mitigation: e.mitigation || e.recommended_mitigation || 'Standard API wellbore engineering protocol applied.',
                lessonsLearned: e.lessons_learned || 'Maintain real-time pressure and mud weight tracking across lithology transition.',
                durationHours: Number(e.duration_hours || e.npt_hours || 12),
                imageUrl: e.image_url,
                videoUrl: e.video_url,
              }))
            : generateBasinIncidents(w);

          // Surveys / Directional trajectory
          let inclination = 6.4;
          let azimuth = 142;
          let tvd = Number(w.total_depth_ft || 8000) * 0.98;
          if (w.surveys && w.surveys.length > 0) {
            const lastSurvey = w.surveys[w.surveys.length - 1];
            inclination = Number(lastSurvey.inclination_deg || 6.4);
            azimuth = Number(lastSurvey.azimuth_deg || 142);
            tvd = Number(lastSurvey.tvd_ft || tvd);
          }

          setLiveWell({
            id: w.id,
            name: w.name,
            block: w.block || 'Exploration Block',
            field: w.field_name || w.field || 'National Field',
            operator: w.operator || 'National Operator',
            status: w.status || 'active',
            coordinates: { lat: Number(w.latitude || 25.8), lng: Number(w.longitude || 71.4) },
            spudDate: w.spud_date || '2023-08-12',
            completionDate: w.completion_date,
            totalDepthFt: Number(w.total_depth_ft || 8000),
            currentDepthFt: w.status === 'active' ? Math.round(Number(w.total_depth_ft || 8000) * 0.85) : Number(w.total_depth_ft || 8000),
            measuredDepthFt: Number(w.total_depth_ft || 8000),
            trueVerticalDepthFt: tvd,
            inclination: inclination,
            azimuth: azimuth,
            riskScore: w.status === 'active' ? 62 : 15,
            riskLevel: w.status === 'active' ? 'medium' : 'low',
            casingProgram: casingProgram,
            formations: formations,
            incidents: incidents,
          });

          // Reports
          const fetchedDocs = reportsRes.data?.documents || [];
          if (fetchedDocs.length > 0) {
            setLiveReports(fetchedDocs.map((d: any) => ({
              id: d.id,
              title: d.file_name?.replace(/_/g, ' ').replace('.pdf', '') || d.description || 'Engineering Evaluation Report',
              type: d.document_type || 'WCR',
              wellId: d.well_id,
              uploadedAt: d.document_date || d.created_at || '2024-02-15',
              status: d.status || 'processed',
              fileName: d.file_name,
              fileSizeBytes: Number(d.file_size_bytes || 4194304),
            })));
          } else {
            setLiveReports(generateBasinReports(w));
          }
        }
      } catch (err) {
        console.warn('Could not fetch well details from API, using fallback:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadWell();
    return () => { isMounted = false; };
  }, [id]);

  // Construct well object if backend API failed or while loading
  const storeWell = wells.find(w => w.id === id);
  const fallbackMock = MOCK_WELLS.find(w => w.id === id);
  const baseFallback = storeWell || fallbackMock || {
    id: id,
    name: id.toUpperCase(),
    field: 'National Hydrocarbon Field',
    block: 'PEL Block',
    operator: 'Oil India Limited / ONGC',
    status: 'active',
    spudDate: '2023-08-12',
    totalDepthFt: 8500,
    currentDepthFt: 7200,
    measuredDepthFt: 8500,
    trueVerticalDepthFt: 8330,
    inclination: 6.4,
    azimuth: 142,
    formations: [],
    incidents: [],
    casingProgram: [],
  };

  const well = liveWell || {
    ...baseFallback,
    formations: baseFallback.formations?.length ? baseFallback.formations : generateBasinFormations(baseFallback),
    casingProgram: baseFallback.casingProgram?.length ? baseFallback.casingProgram : generateBasinCasingProgram(baseFallback.totalDepthFt || 8500),
    incidents: baseFallback.incidents?.length ? baseFallback.incidents : generateBasinIncidents(baseFallback),
  };

  const incidents = well.incidents && well.incidents.length > 0 ? well.incidents : generateBasinIncidents(well);
  const reports = liveReports.length > 0 ? liveReports : generateBasinReports(well);

  const isCurrentlyActive = (activeWellId === well?.id) || (activeWell?.id === well?.id);

  const handleSetActiveWell = () => {
    const basinKey = getBasinKeyFromWell(well);
    setSelectedBasin(basinKey);
    setActiveWell(well.id);
    setActivatedSuccessToast(true);
    setTimeout(() => setActivatedSuccessToast(false), 3500);
  };

  if (!well && loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-center font-mono text-sm text-muted-foreground animate-pulse">
          Loading well operational telemetry & engineering logs...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-6">
      {/* Toast Notification when activated */}
      {activatedSuccessToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-emerald-100">{well.name} is now the Active Monitoring Well</p>
            <p className="text-emerald-300/80">Basin telemetry, Map, Risk, and Comparison models updated.</p>
          </div>
        </motion.div>
      )}

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Basin Overview
      </button>

      {/* ── Well Header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6 p-6 rounded-2xl bg-card border border-border/60 shadow-sm"
      >
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{well.name}</h1>
            <Badge
              className={cn('text-xs font-semibold uppercase tracking-wider', well.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : well.status === 'suspended'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-muted text-muted-foreground'
              )}
            >
              {well.status}
            </Badge>

            {isCurrentlyActive && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 px-3 py-1 gap-1.5 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Monitoring Rig
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" />{well.field}, {well.block}</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400" />{well.operator}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Spud: {formatDate(well.spudDate)}</span>
            {well.completionDate && (
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />TD: {formatDate(well.completionDate)}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {!isCurrentlyActive ? (
            <Button
              onClick={handleSetActiveWell}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium shadow-sm transition-all"
            >
              <Zap className="w-4 h-4 fill-white" />
              Set as Active Well
            </Button>
          ) : (
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-3 py-2 text-xs font-semibold gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Active Monitoring Well
            </Badge>
          )}

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push(`/compare?a=${activeWellId}&b=${well.id}`)}
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
          <Card key={label} className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
              <p className="font-mono text-xl font-bold text-foreground">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Tabs ───────────────────────────────────────────────────── */}
      <Tabs defaultValue="formations" className="space-y-4">
        <TabsList className="w-full justify-start border-b border-border/60 pb-px bg-transparent p-0 gap-2">
          <TabsTrigger
            value="formations"
            className="gap-2 data-[state=active]:bg-card data-[state=active]:border-border/80 border border-transparent rounded-lg px-4 py-2"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />Formation Log
          </TabsTrigger>
          <TabsTrigger
            value="incidents"
            className="gap-2 data-[state=active]:bg-card data-[state=active]:border-border/80 border border-transparent rounded-lg px-4 py-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />Incidents
            {incidents.length > 0 && <Badge variant="outline" className="h-4 text-[10px] px-1.5 bg-amber-500/10 text-amber-400 border-amber-500/30">{incidents.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger
            value="casing"
            className="gap-2 data-[state=active]:bg-card data-[state=active]:border-border/80 border border-transparent rounded-lg px-4 py-2"
          >
            <Ruler className="w-3.5 h-3.5 text-blue-400" />Casing Program
            {well.casingProgram?.length > 0 && <Badge variant="outline" className="h-4 text-[10px] px-1.5">{well.casingProgram.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="gap-2 data-[state=active]:bg-card data-[state=active]:border-border/80 border border-transparent rounded-lg px-4 py-2"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />Reports
            {reports.length > 0 && <Badge variant="outline" className="h-4 text-[10px] px-1.5">{reports.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formations">
          <Card className="border-border/60 bg-card/60">
            <CardHeader><CardTitle className="text-base font-semibold">Stratigraphy & Formation Lithology</CardTitle></CardHeader>
            <CardContent>
              <FormationLog formations={well.formations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card className="border-border/60 bg-card/60">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Incident Timeline & Offset Hazards</CardTitle>
            </CardHeader>
            <CardContent>
              <IncidentTimeline 
                incidents={incidents} 
                onSelectMitigation={(inc) => setSelectedIncidentForMitigation({
                  id: inc.id,
                  wellName: well.name,
                  wellId: well.id,
                  incidentType: inc.type,
                  severity: inc.severity,
                  description: inc.description,
                  date: inc.date,
                  depthFt: inc.depthFt,
                  cause: inc.cause || 'Lithological formation pressure differential.',
                  mitigation: inc.mitigation,
                  imageUrl: inc.imageUrl,
                  videoUrl: inc.videoUrl,
                })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="casing">
          <Card className="border-border/60 bg-card/60">
            <CardHeader><CardTitle className="text-base font-semibold">Casing & Cementing Program</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      {['Casing Section', 'Outer Dia', 'Shoe Depth', 'Cement Top', 'Cement Bottom', 'Steel Grade', 'Nominal Weight'].map(h => (
                        <th key={h} className="text-left py-2.5 px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {(well.casingProgram || []).map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-foreground flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          {c.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">{c.sizeinches}"</td>
                        <td className="py-3 px-3 font-mono font-bold text-foreground">{formatDepth(c.setDepthFt)} ft</td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">{formatDepth(c.cementTopFt)} ft</td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">{formatDepth(c.cementBottomFt)} ft</td>
                        <td className="py-3 px-3 font-mono font-medium text-foreground">{c.grade}</td>
                        <td className="py-3 px-3 text-muted-foreground">{c.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Operational & Engineering Reports</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Verified technical dossiers and WCR/DDR documentation</p>
              </div>
              <Button
                size="sm"
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="h-8 text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Compiling PDF…</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Generate Technical Dossier (PDF)</span>
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-all">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            <span className="font-mono text-cyan-400 font-medium">{r.type}</span> · {formatDate(r.uploadedAt)} · {(r.fileSizeBytes / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          {r.status || 'Verified'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1 font-mono border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                          onClick={() => window.open(api.reports.getDownloadUrl(r.id), '_blank')}
                          title="Download PDF Dossier"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </Button>
                      </div>
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

      {/* Interactive Data-Driven Mitigation Modal */}
      <MitigationModal
        incident={selectedIncidentForMitigation}
        isOpen={!!selectedIncidentForMitigation}
        onClose={() => setSelectedIncidentForMitigation(null)}
      />
    </div>
  );
}
