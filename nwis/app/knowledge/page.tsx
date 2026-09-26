'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { cn, getRiskBgClass, getRiskLabel, getIncidentLabel, getIncidentColor, formatDepth, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Filter, X, BookOpen, AlertTriangle,
  FileText, ArrowRight, Sparkles, ShieldAlert,
  Play, MapPin, CheckCircle2, RotateCcw, Video
} from 'lucide-react';
import type { IncidentType, RiskLevel } from '@/lib/types';
import { TacticalSidebar } from '@/components/layout/Sidebar';
import MitigationModal, { IncidentMitigationData } from '@/components/incidents/MitigationModal';

const PAGE_SIZE = 10;

const fadeUp: any = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};
const stagger = { visible: { transition: { staggerChildren: 0.04 } } };

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-mono font-medium border border-cyan-500/20">
      {label}
      <button onClick={onRemove} className="hover:text-destructive transition-colors ml-0.5 cursor-pointer">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ─── Result Card Component ────────────────────────────────────────────────────
function ResultCard({
  entry,
  onOpenMitigation,
  onViewWell
}: {
  entry: IncidentMitigationData;
  onOpenMitigation: () => void;
  onViewWell: () => void;
}) {
  const color = getIncidentColor(entry.incidentType as any);

  return (
    <motion.div variants={fadeUp}>
      <Card
        onClick={onOpenMitigation}
        className={cn(
          'border-border/60 bg-[#0B1119] card-hover group transition-all duration-200 cursor-pointer',
          'hover:border-cyan-500/40 relative overflow-hidden'
        )}
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              
              {/* Header metadata row */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-md font-mono"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  {getIncidentLabel(entry.incidentType as any)}
                </span>
                
                <Badge className={cn('text-[10px] h-4 px-1.5 font-mono', getRiskBgClass(entry.severity as any))}>
                  {getRiskLabel(entry.severity as any)}
                </Badge>

                {entry.status && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono text-cyan-400 border-cyan-500/40 uppercase">
                    {entry.status}
                  </Badge>
                )}

                <span className="text-xs text-white font-semibold font-mono flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  {entry.wellName}
                </span>

                {entry.depthFt && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-mono text-cyan-300">{formatDepth(entry.depthFt)} ft</span>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-foreground font-medium leading-snug mb-2 font-sans">
                {entry.description}
              </p>

              {/* Mitigation preview */}
              {entry.mitigation && (
                <div className="p-2.5 rounded-lg bg-[#091512] border border-[#10B981]/25 text-xs text-muted-foreground mb-3">
                  <span className="text-[#10B981] font-semibold font-mono uppercase tracking-wider mr-1.5">
                    Mitigation:
                  </span>
                  <span className="text-white/80">{entry.mitigation}</span>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/40 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMitigation();
                  }}
                  className="h-7 text-xs font-mono bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                  Review Mitigation Protocol
                  <Video className="w-3 h-3 ml-1.5 text-amber-400" />
                </Button>

                {entry.wellId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewWell();
                    }}
                    className="h-7 text-xs font-mono text-muted-foreground hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    Well Profile
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}

                <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  {entry.formation && <span>{entry.formation}</span>}
                  {entry.date && (
                    <>
                      <span>·</span>
                      <span>{formatDate(entry.date)}</span>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Knowledge Repository Main Component ──────────────────────────────────────
export default function KnowledgePage() {
  const router = useRouter();
  const { wells, fetchWells } = useAppStore();

  const [query, setQuery] = useState('');
  const [wellFilter, setWellFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [incidentFilter, setIncidentFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [formationFilter, setFormationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<IncidentMitigationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIncidentForMitigation, setSelectedIncidentForMitigation] = useState<IncidentMitigationData | null>(null);

  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWells();
  }, [fetchWells]);

  // Extract unique fields from wells database
  const availableFields = useMemo(() => {
    const set = new Set<string>();
    wells.forEach(w => {
      if (w.field) set.add(w.field);
    });
    return Array.from(set).sort();
  }, [wells]);

  // Execute backend search when query or any filter changes
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { api } = await import('@/lib/api');
        const filters: any = {};
        if (wellFilter !== 'all') filters.well_id = wellFilter;
        if (locationFilter !== 'all') filters.field = locationFilter;
        if (incidentFilter !== 'all') filters.event_type = incidentFilter;
        if (severityFilter !== 'all') filters.severity = severityFilter;
        if (formationFilter !== 'all') filters.formation = formationFilter;
        if (statusFilter !== 'all') filters.status = statusFilter;

        const res = await api.search.knowledge(query || '', 50, filters);
        if (active && res.data?.results) {
          const mapped: IncidentMitigationData[] = res.data.results.map((c: any) => ({
            id: c.id || c.event_id,
            incidentType: c.event_type || 'mud_loss',
            wellName: c.well_name || 'Drilling Well',
            wellId: c.well_id,
            severity: c.severity || 'high',
            description: c.description || c.chunk_text,
            date: c.created_at || '2024-02-14',
            depthFt: Number(c.depth_ft || 8000),
            formation: c.formation_name || 'Barail Sandstone',
            status: c.status || 'resolved',
            cause: c.possible_cause || 'Lithological formation pressure transition and mechanical friction.',
            mitigation: c.recommended_mitigation || 'Circulate heavy LCM pill and maintain continuous ECD monitoring.',
            imageUrl: c.image_url,
            videoUrl: c.video_url,
          }));
          setResults(mapped);
          setPage(1);
        }
      } catch (err) {
        console.warn('Backend search error:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, wellFilter, locationFilter, incidentFilter, severityFilter, formationFilter, statusFilter]);

  const paginated = results.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < results.length;

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPage(p => p + 1);
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore]);

  const clearAllFilters = () => {
    setQuery('');
    setWellFilter('all');
    setLocationFilter('all');
    setIncidentFilter('all');
    setSeverityFilter('all');
    setFormationFilter('all');
    setStatusFilter('all');
  };

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (wellFilter !== 'all') {
    const matched = wells.find(w => w.id === wellFilter);
    activeFilters.push({ label: `Well: ${matched?.name || wellFilter}`, clear: () => setWellFilter('all') });
  }
  if (locationFilter !== 'all') activeFilters.push({ label: `Field: ${locationFilter}`, clear: () => setLocationFilter('all') });
  if (incidentFilter !== 'all') activeFilters.push({ label: getIncidentLabel(incidentFilter as any), clear: () => setIncidentFilter('all') });
  if (severityFilter !== 'all') activeFilters.push({ label: `${severityFilter} risk`, clear: () => setSeverityFilter('all') });
  if (formationFilter !== 'all') activeFilters.push({ label: formationFilter, clear: () => setFormationFilter('all') });
  if (statusFilter !== 'all') activeFilters.push({ label: `Status: ${statusFilter}`, clear: () => setStatusFilter('all') });

  return (
    <div className="flex min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white">
      {/* Tactical Left Sidebar */}
      <TacticalSidebar />

      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1500px]">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-6 border-b border-[#141F2D] mb-6"
        >
          <div className="text-[10px] font-mono tracking-widest text-[#7E8B9B] uppercase mb-1">
            HISTORICAL DRILLING REPOSITORY · OIL INDIA LIMITED
          </div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#F59E0B]" />
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Knowledge Repository
            </h1>
          </div>
          <p className="text-xs text-[#8A9BAE] mt-0.5">
            Searchable institutional memory of offset-well incidents, proven mitigations, and video guides across all 39 monitored fields.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:w-72 shrink-0"
          >
            <div className="sticky top-24 space-y-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  DATABASE FILTERS
                </p>
                {activeFilters.length > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Specific Well Dropdown Filter */}
              <div className="bg-[#0B1119] border border-border/60 rounded-lg p-3 space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase block">Specific Well</label>
                <Select value={wellFilter} onValueChange={(val) => setWellFilter(val || 'all')}>
                  <SelectTrigger className="h-8 text-xs font-mono bg-muted/20 border-border/60">
                    <SelectValue placeholder="All Wells" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Wells (39)</SelectItem>
                    {wells.map(w => (
                      <SelectItem key={w.id} value={w.id} className="text-xs font-mono">
                        {w.name} ({w.field || 'Field'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location / Field Dropdown Filter */}
              <div className="bg-[#0B1119] border border-border/60 rounded-lg p-3 space-y-1.5">
                <label className="text-[11px] font-mono text-muted-foreground uppercase block">Field / Sector</label>
                <Select value={locationFilter} onValueChange={(val) => setLocationFilter(val || 'all')}>
                  <SelectTrigger className="h-8 text-xs font-mono bg-muted/20 border-border/60">
                    <SelectValue placeholder="All Fields" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Fields</SelectItem>
                    {availableFields.map(f => (
                      <SelectItem key={f} value={f} className="text-xs font-mono">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Incident Type Accordion */}
              <Accordion className="space-y-1">
                <AccordionItem value="incident" className="border border-border/60 rounded-lg bg-[#0B1119] px-3">
                  <AccordionTrigger className="text-xs font-medium py-2.5 hover:no-underline font-mono">
                    Incident Type {incidentFilter !== 'all' && <span className="text-cyan-400 font-bold ml-1">●</span>}
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 space-y-1">
                    {[
                      { value: 'all', label: 'All types' },
                      { value: 'mud_loss', label: 'Lost Circulation' },
                      { value: 'kick', label: 'Well Kick' },
                      { value: 'stuck_pipe', label: 'Stuck Pipe' },
                      { value: 'washout', label: 'Washout' },
                      { value: 'leakage', label: 'Pipeline Leakage' },
                      { value: 'corrosion', label: 'Casing Corrosion' },
                      { value: 'equipment_failure', label: 'Equipment Failure' },
                      { value: 'npt', label: 'NPT Event' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setIncidentFilter(opt.value)}
                        className={cn(
                          'w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors cursor-pointer font-mono',
                          incidentFilter === opt.value
                            ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* Risk Severity */}
                <AccordionItem value="severity" className="border border-border/60 rounded-lg bg-[#0B1119] px-3">
                  <AccordionTrigger className="text-xs font-medium py-2.5 hover:no-underline font-mono">
                    Severity {severityFilter !== 'all' && <span className="text-cyan-400 font-bold ml-1">●</span>}
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 space-y-1">
                    {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                      <button
                        key={s}
                        onClick={() => setSeverityFilter(s)}
                        className={cn(
                          'w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors capitalize cursor-pointer font-mono',
                          severityFilter === s
                            ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        )}
                      >
                        {s === 'all' ? 'All severities' : `${s} risk`}
                      </button>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* Formation */}
                <AccordionItem value="formation" className="border border-border/60 rounded-lg bg-[#0B1119] px-3">
                  <AccordionTrigger className="text-xs font-medium py-2.5 hover:no-underline font-mono">
                    Formation {formationFilter !== 'all' && <span className="text-cyan-400 font-bold ml-1">●</span>}
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 space-y-1">
                    {[
                      { value: 'all', label: 'All formations' },
                      { value: 'Barail', label: 'Barail Sandstone' },
                      { value: 'Sylhet', label: 'Sylhet Limestone' },
                      { value: 'Kopili', label: 'Kopili Shale' },
                      { value: 'Tipam', label: 'Tipam Sandstone' },
                      { value: 'Girujan', label: 'Girujan Clay' },
                      { value: 'Langpar', label: 'Langpar Formation' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFormationFilter(opt.value)}
                        className={cn(
                          'w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors cursor-pointer font-mono',
                          formationFilter === opt.value
                            ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* Status */}
                <AccordionItem value="status" className="border border-border/60 rounded-lg bg-[#0B1119] px-3">
                  <AccordionTrigger className="text-xs font-medium py-2.5 hover:no-underline font-mono">
                    Status {statusFilter !== 'all' && <span className="text-cyan-400 font-bold ml-1">●</span>}
                  </AccordionTrigger>
                  <AccordionContent className="pb-3 space-y-1">
                    {[
                      { value: 'all', label: 'All statuses' },
                      { value: 'resolved', label: 'Resolved' },
                      { value: 'active', label: 'Active' },
                      { value: 'investigating', label: 'Investigating' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value)}
                        className={cn(
                          'w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors cursor-pointer font-mono',
                          statusFilter === opt.value
                            ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </motion.aside>

          {/* Main: Search + Results */}
          <div className="flex-1 min-w-0">
            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="relative mb-4"
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents, mitigations, wells, formations, keywords…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-10 pr-10 h-11 text-sm bg-[#0B1119] border-border/60 focus:border-cyan-500 font-sans"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-muted-foreground hover:text-white cursor-pointer mr-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  LIVE REPO
                </span>
              </div>
            </motion.div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap gap-2 mb-4"
              >
                {activeFilters.map(f => (
                  <FilterChip key={f.label} label={f.label} onRemove={f.clear} />
                ))}
              </motion.div>
            )}

            {/* Results count header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-mono text-muted-foreground">
                FOUND <span className="font-bold text-cyan-300">{results.length}</span> RECORDED INCIDENTS
                {query && <> MATCHING "<span className="text-white">{query}</span>"</>}
              </p>
              {isSearching && (
                <span className="text-[11px] font-mono text-cyan-400 animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Querying SQLite Database…
                </span>
              )}
            </div>

            {/* Results List */}
            <AnimatePresence mode="wait">
              {results.length > 0 ? (
                <motion.div
                  key={`${query}-${wellFilter}-${locationFilter}-${incidentFilter}-${severityFilter}-${formationFilter}-${statusFilter}`}
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {paginated.map(entry => (
                    <ResultCard
                      key={entry.id}
                      entry={entry}
                      onOpenMitigation={() => setSelectedIncidentForMitigation(entry)}
                      onViewWell={() => router.push(`/wells/${entry.wellId}`)}
                    />
                  ))}

                  {/* Infinite scroll trigger */}
                  {hasMore && (
                    <div ref={loaderRef} className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-20 text-center bg-[#0B1119] border border-border/40 rounded-xl p-8"
                >
                  <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-semibold text-foreground mb-1 text-base">No matching drilling records found</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
                    No incident records match the selected combination of filters in the database.
                    Try broadening your search or resetting filters.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Interactive Data-Driven Mitigation Modal */}
      <MitigationModal
        incident={selectedIncidentForMitigation}
        isOpen={!!selectedIncidentForMitigation}
        onClose={() => setSelectedIncidentForMitigation(null)}
        onNavigateToWell={(wellId) => router.push(`/wells/${wellId}`)}
      />
    </div>
  );
}
