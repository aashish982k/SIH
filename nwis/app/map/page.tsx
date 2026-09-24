'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
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
  Layers, Circle, Navigation, Info
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
  const { activeWell, mapCenter, setMapCenter, mapRadius, setMapRadius, liveDepthFt } = useAppStore();

  const [formationFilter, setFormationFilter] = useState<string>('all');
  const [incidentFilter, setIncidentFilter] = useState<string>('all');
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [backendWells, setBackendWells] = useState<Well[]>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('nwis_location');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Number.isFinite(Number(parsed.lat)) && Number.isFinite(Number(parsed.lng))) {
        setMapCenter({ lat: Number(parsed.lat), lng: Number(parsed.lng) });
      }
    } catch {
      localStorage.removeItem('nwis_location');
    }
  }, [setMapCenter]);

  useEffect(() => {
    fetch('/api/wells', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => {
        const rows = payload.data?.wells ?? [];
        setBackendWells(rows.map((well: Record<string, unknown>) => ({
          ...well,
          field: String(well.field_name ?? ''),
          coordinates: { lat: Number(well.latitude), lng: Number(well.longitude) },
          spudDate: String(well.spud_date ?? ''),
          totalDepthFt: Number(well.total_depth_ft ?? 0),
          measuredDepthFt: Number(well.total_depth_ft ?? 0),
          trueVerticalDepthFt: Number(well.total_depth_ft ?? 0),
          inclination: 0, azimuth: 0, casingProgram: [], formations: [], incidents: [],
        })));
      })
      .catch(() => setBackendWells([]));
  }, []);

  async function searchLocation() {
    if (!locationQuery.trim()) return;
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(locationQuery)}`);
    if (response.ok) setLocationResults(await response.json());
  }

  function useCurrentLocation() {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const center = { lat: coords.latitude, lng: coords.longitude };
        setMapCenter(center);
        localStorage.setItem('nwis_location', JSON.stringify(center));
      },
      () => setLocationError('Unable to access your location. Check browser permissions.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const handleMapClick = useCallback((coordinates: { lat: number; lng: number }) => {
    setMapCenter(coordinates);
    localStorage.setItem('nwis_location', JSON.stringify(coordinates));
  }, [setMapCenter]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reports', { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || payload.error || 'Unable to load reports');
        return payload.data?.reports ?? [];
      })
      .then((reports: Array<{ well_id?: string }>) => {
        if (cancelled) return;
        const counts: Record<string, number> = {};
        reports.forEach(report => {
          if (report.well_id) counts[report.well_id] = (counts[report.well_id] ?? 0) + 1;
        });
        setReportCounts(counts);
      })
      .catch(error => console.error('Unable to load report map data:', error));
    return () => { cancelled = true; };
  }, []);

  // Nearby wells within radius
  const nearbyWells = useMemo(() => {
    if (!activeWell || !mapCenter) return [];
    const sourceWells = backendWells.length ? backendWells : MOCK_WELLS;
    return sourceWells
      .filter(w => w.id !== activeWell.id)
      .map(w => ({
        ...w,
        reportCount: reportCounts[w.id] ?? 0,
        distance: getDistanceKm(
          mapCenter.lat, mapCenter.lng,
          w.coordinates.lat, w.coordinates.lng
        ),
        incidents: getIncidentsForWell(w.id),
      }))
      .filter(w => w.distance <= mapRadius)
      .filter(w => {
        if (formationFilter === 'all') return true;
        return w.formations.some(f => f.name.toLowerCase().includes(formationFilter.toLowerCase()));
      })
      .filter(w => {
        if (incidentFilter === 'all') return true;
        return w.incidents.some(i => i.type === incidentFilter);
      })
      .sort((a, b) => a.distance - b.distance);
  }, [activeWell, mapCenter, backendWells, mapRadius, formationFilter, incidentFilter, reportCounts]);

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
        {activeWell ? (
          <WellMap
            activeWell={activeWell}
            mapCenter={mapCenter ?? activeWell.coordinates}
            nearbyWells={nearbyWells}
            radius={mapRadius}
            selectedWellId={selectedWellId}
            onWellClick={handleWellClick}
            onViewDetails={handleViewDetails}
            liveDepthFt={liveDepthFt}
            activeReportCount={reportCounts[activeWell.id] ?? 0}
            onMapClick={handleMapClick}
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
              <h2 className="font-semibold text-foreground">Offset Wells</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {nearbyWells.length} within {mapRadius} km
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              <Circle className="w-2 h-2 mr-1 fill-current text-primary" />
              {mapRadius} km
            </Badge>
          </div>
        </div>

        {/* Controls */}
        <div className="px-4 py-4 border-b border-border space-y-4">
          {/* Radius slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Search Radius
              </Label>
              <span className="font-mono text-sm font-semibold text-foreground">{mapRadius} km</span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Map location</Label>
              <div className="flex gap-2">
                <input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void searchLocation()} placeholder="Search location" className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-xs" />
                <Button size="sm" variant="outline" onClick={() => void searchLocation()}>Search</Button>
                <Button size="sm" variant="outline" onClick={useCurrentLocation} title="Use current location"><Navigation className="h-3.5 w-3.5" /></Button>
              </div>
              {locationError && <p className="text-xs text-destructive">{locationError}</p>}
              {locationResults.length > 0 && <div className="space-y-1">{locationResults.map((result) => <button key={`${result.lat}-${result.lon}`} onClick={() => { const center = { lat: Number(result.lat), lng: Number(result.lon) }; setMapCenter(center); localStorage.setItem('nwis_location', JSON.stringify({ ...center, label: result.display_name })); setLocationResults([]); }} className="block w-full rounded p-1 text-left text-xs hover:bg-muted">{result.display_name}</button>)}</div>}
            </div>
            <Slider
              aria-label="Search radius in kilometers"
              min={2} max={50} step={1}
              value={[mapRadius]}
              onValueChange={(vals) => setMapRadius(Array.isArray(vals) ? (vals[0] as number) : (vals as unknown as number))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>2 km</span><span>50 km</span>
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
              { colorVar: 'var(--map-low)', label: 'No / low-risk incidents' },
              { colorVar: 'var(--map-medium)', label: 'Medium-risk incidents' },
              { colorVar: 'var(--map-high)', label: 'High-risk incidents' },
              { colorVar: 'var(--map-active)', label: 'Active well (drilling)' },
            ].map(({ colorVar, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-3 h-3 rounded-full shrink-0 border-2 border-white/20 shadow-sm"
                  style={{ backgroundColor: colorVar }} />
                <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
