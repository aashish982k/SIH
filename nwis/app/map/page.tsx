'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useAppStore, BASIN_FIELD_MAPPING } from '@/store/appStore';
import { MOCK_WELLS } from '@/lib/mock/wells';
import { getIncidentsForWell } from '@/lib/mock/incidents';
import { getDistanceKm, cn, getRiskBgClass, getRiskLabel, getRiskBorderClass, getIncidentLabel, formatDepth, formatDistance } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  MapPin, Sliders, Filter, AlertTriangle, ArrowRight,
  Layers, Circle, Navigation, Info, Compass
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Well, IncidentType } from '@/lib/types';

// ── Dynamic import of map (no SSR — Mapbox only runs client-side) ──────────────
const WellMap = dynamic(() => import('@/components/map/WellMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted/30 flex items-center justify-center animate-pulse rounded-xl">
      <div className="text-center">
        <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    </div>
  ),
});

// ─── Well List Item ───────────────────────────────────────────────────────────
function WellListItem({ well, distance, onClick }: {
  well: Well;
  distance: number;
  onClick: () => void;
}) {
  const incidents = getIncidentsForWell(well.id);
  const highRiskIncidents = incidents.filter(i => i.severity === 'high' || i.severity === 'critical');
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-xl border transition-all group',
        'hover:border-primary/30 hover:bg-primary/5 border-border/60 bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-foreground truncate">{well.name}</p>
            {well.status === 'suspended' && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">Suspended</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{well.field} · {well.block}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-mono font-semibold text-foreground">{formatDistance(distance)}</p>
          <p className="text-[10px] text-muted-foreground">from active</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-muted-foreground font-mono">{formatDepth(well.totalDepthFt)} ft TD</span>
        <Separator orientation="vertical" className="h-3" />
        {incidents.length > 0 ? (
          <span className={cn(
            'text-[10px] font-semibold',
            highRiskIncidents.length > 0 ? 'text-[var(--risk-high)]' : 'text-[var(--risk-medium)]'
          )}>
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
            {highRiskIncidents.length > 0 && ` (${highRiskIncidents.length} high)`}
          </span>
        ) : (
          <span className="text-[10px] text-[var(--risk-low)] font-semibold">No incidents</span>
        )}
        <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}

// ─── Map View Page ────────────────────────────────────────────────────────────
export default function MapPage() {
  const router = useRouter();
  const { 
    activeWell, 
    setActiveWell,
    mapRadius, 
    setMapRadius, 
    liveDepthFt, 
    wells, 
    fetchWells,
    selectedBasin,
    setSelectedBasin
  } = useAppStore();

  const [formationFilter, setFormationFilter] = useState<string>('all');
  const [incidentFilter, setIncidentFilter] = useState<string>('all');
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);

  useEffect(() => {
    fetchWells();
  }, [fetchWells]);

  const sourceWells = useMemo(() => {
    return wells.length > 0 ? wells : MOCK_WELLS;
  }, [wells]);

  const basinConfig = selectedBasin !== 'all' ? BASIN_FIELD_MAPPING[selectedBasin] : null;

  // Nearby wells within basin or radius
  const nearbyWells = useMemo(() => {
    if (!activeWell) return [];
    return sourceWells
      .filter(w => w.id !== activeWell.id)
      .filter(w => {
        if (!basinConfig) return true;
        // In specific basin mode: keep wells that match fields or within regional cluster
        const isFieldMatch = basinConfig.fields.some(f => (w.field || '').toLowerCase().includes(f.toLowerCase()));
        if (isFieldMatch) return true;
        const dist = getDistanceKm(activeWell.coordinates.lat, activeWell.coordinates.lng, w.coordinates.lat, w.coordinates.lng);
        return dist <= 160;
      })
      .map(w => ({
        ...w,
        distance: getDistanceKm(
          activeWell.coordinates.lat, activeWell.coordinates.lng,
          w.coordinates.lat, w.coordinates.lng
        ),
        incidents: w.incidents?.length ? w.incidents : getIncidentsForWell(w.id),
      }))
      .filter(w => {
        return w.distance <= mapRadius;
      })
      .filter(w => {
        if (formationFilter === 'all') return true;
        return (w.formations || []).some(f => f.name.toLowerCase().includes(formationFilter.toLowerCase()));
      })
      .filter(w => {
        if (incidentFilter === 'all') return true;
        return (w.incidents || []).some(i => i.type === incidentFilter);
      })
      .sort((a, b) => a.distance - b.distance);
  }, [activeWell, sourceWells, mapRadius, formationFilter, incidentFilter, selectedBasin, basinConfig]);

  const handleWellClick = useCallback((wellId: string) => {
    setSelectedWellId(wellId);
  }, []);

  const handleViewDetails = useCallback((wellId: string) => {
    router.push(`/wells/${wellId}`);
  }, [router]);

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden">

      {/* ── Map Area (flex-1) ─────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {/* Floating Basin Quick Switcher Pill Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#0A1017]/90 border border-white/20 px-2 py-1.5 rounded-xl backdrop-blur-md shadow-2xl flex items-center gap-1.5 overflow-x-auto max-w-[94vw]">
          <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            BASIN:
          </span>
          {[
            { id: 'all', label: 'All Basins' },
            { id: 'assam', label: 'Upper Assam' },
            { id: 'rajasthan', label: 'Barmer (RJ)' },
            { id: 'cambay', label: 'Cambay (GJ)' },
            { id: 'mumbai', label: 'Mumbai High' },
            { id: 'tripura', label: 'Tripura Gas' },
            { id: 'kg', label: 'KG Deepwater' },
            { id: 'cauvery', label: 'Cauvery' },
          ].map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBasin(b.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer",
                selectedBasin === b.id
                  ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/40"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        {activeWell ? (
          <WellMap
            activeWell={activeWell}
            nearbyWells={nearbyWells}
            radius={mapRadius}
            selectedWellId={selectedWellId}
            onWellClick={handleWellClick}
            onViewDetails={handleViewDetails}
            liveDepthFt={liveDepthFt}
            onSelectBasin={setSelectedBasin}
            selectedBasin={selectedBasin}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <Navigation className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-foreground">No active well selected</p>
              <p className="text-sm text-muted-foreground mt-1">Select an active well from the dashboard</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Side Panel (380px) ───────────────────────────────────────── */}
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-[380px] shrink-0 border-l border-border bg-card flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-cyan-500 font-bold uppercase tracking-wider">
                {selectedBasin !== 'all' ? (BASIN_FIELD_MAPPING[selectedBasin]?.label || 'Selected Basin') : 'All Indian Basins'}
              </div>
              <h2 className="font-semibold text-foreground">Offset Wells</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {nearbyWells.length} wells monitored in sector
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              <Circle className="w-2 h-2 mr-1 fill-current text-primary" />
              {activeWell?.name || 'Active'}
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-4 border-b border-border space-y-4">
          {/* Active Reference Location Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Reference Location
              </Label>
              {activeWell && (
                <span className="text-[10px] font-mono text-cyan-400">
                  {activeWell.coordinates.lat.toFixed(2)}°N, {activeWell.coordinates.lng.toFixed(2)}°E
                </span>
              )}
            </div>
            <Select 
              value={activeWell?.id || ''} 
              onValueChange={(val) => {
                if (val) setActiveWell(val);
              }}
            >
              <SelectTrigger className="h-8 text-xs font-medium bg-muted/30">
                <SelectValue placeholder="Select reference well" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {sourceWells.map((w) => (
                  <SelectItem key={w.id} value={w.id} className="text-xs">
                    {w.name} ({w.field || 'Field'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Radius selector with quick presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Search Radius
              </Label>
              <span className="font-mono text-sm font-semibold text-cyan-400">{mapRadius} km</span>
            </div>

            {/* Quick Presets: 5 km, 10 km, 25 km, 50 km */}
            <div className="grid grid-cols-4 gap-1.5 mb-2.5">
              {[5, 10, 25, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMapRadius(preset)}
                  className={cn(
                    "px-2 py-1 text-xs font-mono font-medium rounded transition-all border cursor-pointer",
                    mapRadius === preset
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                  )}
                >
                  {preset} km
                </button>
              ))}
            </div>

            <Slider
              min={2} max={60} step={1}
              value={[mapRadius]}
              onValueChange={(vals) => setMapRadius(Array.isArray(vals) ? (vals[0] as number) : (vals as unknown as number))}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
              <span>2 km</span><span>60 km</span>
            </div>
          </div>

          {/* Filters */}
          <Accordion>
            <AccordionItem value="filters" className="border-none">
              <AccordionTrigger className="py-0 text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  Filters
                  {(formationFilter !== 'all' || incidentFilter !== 'all') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-0 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Incident Type</Label>
                  <Select value={incidentFilter} onValueChange={(v) => v && setIncidentFilter(v as string)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All incident types</SelectItem>
                      <SelectItem value="mud_loss">Lost Circulation</SelectItem>
                      <SelectItem value="kick">Well Kick</SelectItem>
                      <SelectItem value="stuck_pipe">Stuck Pipe</SelectItem>
                      <SelectItem value="npt">NPT Event</SelectItem>
                      <SelectItem value="washout">Washout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Formation</Label>
                  <Select value={formationFilter} onValueChange={(v) => v && setFormationFilter(v as string)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All formations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All formations</SelectItem>
                      <SelectItem value="Barail">Barail Sandstone</SelectItem>
                      <SelectItem value="Sylhet">Sylhet Limestone</SelectItem>
                      <SelectItem value="Kopili">Kopili Shale</SelectItem>
                      <SelectItem value="Tipam">Tipam Sandstone</SelectItem>
                      <SelectItem value="Girujan">Girujan Clay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Well List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {nearbyWells.length > 0 ? (
            nearbyWells.map(well => (
              <WellListItem
                key={well.id}
                well={well}
                distance={well.distance}
                onClick={() => handleWellClick(well.id)}
              />
            ))
          ) : (
            <div className="py-12 text-center px-4">
              <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-sm text-foreground">No offset wells found</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                No wells found within {mapRadius} km. Try increasing the search radius or adjusting filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => setMapRadius(30)}
              >
                Expand to 30 km
              </Button>
            </div>
          )}
        </div>

        {/* Map Legend */}
        <div className="px-4 py-3 border-t border-border bg-muted/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Legend</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { color: '#16A34A', label: 'No / low-risk incidents' },
              { color: '#D97706', label: 'Medium-risk incidents' },
              { color: '#DC2626', label: 'High-risk incidents' },
              { color: '#0F4C81', label: 'Active well (drilling)' },
            ].map(({ color, label }) => (
              <div key={color} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full shrink-0 border-2 border-white/80 shadow-sm"
                  style={{ backgroundColor: color }} />
                <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
