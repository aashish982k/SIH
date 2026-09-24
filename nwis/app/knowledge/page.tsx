'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MOCK_KNOWLEDGE } from '@/lib/mock/knowledge';
import { cn, getRiskBgClass, getRiskLabel, getIncidentLabel, getIncidentColor, formatDepth, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Search, Filter, X, BookOpen, AlertTriangle,
  FileText, ArrowRight, ChevronDown, Sparkles
} from 'lucide-react';
import type { KnowledgeEntry, IncidentType, RiskLevel } from '@/lib/types';
import { TacticalSidebar } from '@/components/layout/Sidebar';

const PAGE_SIZE = 8;

const fadeUp: any = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ entry, onClick }: { entry: KnowledgeEntry; onClick: () => void }) {
  return (
    <motion.div variants={fadeUp}>
      <Card
        onClick={onClick}
        className={cn(
          'border-border/60 card-hover cursor-pointer group',
          'hover:border-primary/30 transition-colors',
          `border-l-4 border-l-[${getIncidentColor(entry.incidentType)}]`
        )}
        style={{ borderLeftColor: getIncidentColor(entry.incidentType) }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${getIncidentColor(entry.incidentType)}20`,
                    color: getIncidentColor(entry.incidentType),
                  }}
                >
                  {getIncidentLabel(entry.incidentType)}
                </span>
                <Badge className={cn('text-[10px] h-4 px-1.5', getRiskBgClass(entry.severity))}>
                  {getRiskLabel(entry.severity)}
                </Badge>
                <span className="text-xs text-muted-foreground font-semibold">{entry.wellName}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-mono text-muted-foreground">{formatDepth(entry.depthFt)} ft</span>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground font-medium line-clamp-2 leading-snug mb-2">
                {entry.shortDescription}
              </p>

              {/* Mitigation preview */}
              <p className="text-xs text-muted-foreground line-clamp-1">
                <strong>Mitigation:</strong> {entry.mitigation}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
            <span className="text-[10px] text-muted-foreground">{entry.formation}</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="text-[10px] text-muted-foreground">{formatDate(entry.date)}</span>
            {entry.sourceReportTitle && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-[10px] text-primary flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {entry.sourceReportTitle}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Active Filter Chip ───────────────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
      {label}
      <button onClick={onRemove} className="hover:text-destructive transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ─── Knowledge Repository Page ────────────────────────────────────────────────
export default function KnowledgePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [incidentFilter, setIncidentFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [formationFilter, setFormationFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Filter + search logic
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return MOCK_KNOWLEDGE.filter(entry => {
      if (incidentFilter !== 'all' && entry.incidentType !== incidentFilter) return false;
      if (severityFilter !== 'all' && entry.severity !== severityFilter) return false;
      if (formationFilter !== 'all' && !entry.formation.toLowerCase().includes(formationFilter.toLowerCase())) return false;
      if (!q) return true;
      return (
        entry.shortDescription.toLowerCase().includes(q) ||
        entry.mitigation.toLowerCase().includes(q) ||
        entry.lessonsLearned.toLowerCase().includes(q) ||
        entry.wellName.toLowerCase().includes(q) ||
        entry.formation.toLowerCase().includes(q) ||
        getIncidentLabel(entry.incidentType).toLowerCase().includes(q)
      );
    });
  }, [query, incidentFilter, severityFilter, formationFilter]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [query, incidentFilter, severityFilter, formationFilter]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPage(p => p + 1);
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore]);

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (incidentFilter !== 'all') activeFilters.push({ label: getIncidentLabel(incidentFilter as IncidentType), clear: () => setIncidentFilter('all') });
  if (severityFilter !== 'all') activeFilters.push({ label: `${severityFilter} risk`, clear: () => setSeverityFilter('all') });
  if (formationFilter !== 'all') activeFilters.push({ label: formationFilter, clear: () => setFormationFilter('all') });

  return (
    <div className="flex min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white">
      {/* Tactical Left Sidebar */}
      <TacticalSidebar />

      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1500px]">
        {/* ── Page Header ──────────────────────────────────────────────── */}
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
            Searchable institutional memory of offset-well incidents, proven mitigations, and lessons learned across Assam Basin.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Filter Sidebar ────────────────────────────────────────── */}
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:w-64 shrink-0"
          >
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-3">
              <Filter className="w-3.5 h-3.5 inline mr-1.5" />Filters
            </p>

            <Accordion className="space-y-1">
              <AccordionItem value="incident" className="border border-border/60 rounded-lg bg-card px-3">
                <AccordionTrigger className="text-xs font-medium py-3 hover:no-underline">Incident Type</AccordionTrigger>
                <AccordionContent className="pb-3 space-y-1.5">
                  {[
                    { value: 'all', label: 'All types' },
                    { value: 'mud_loss', label: 'Lost Circulation' },
                    { value: 'kick', label: 'Well Kick' },
                    { value: 'stuck_pipe', label: 'Stuck Pipe' },
                    { value: 'npt', label: 'NPT Event' },
                    { value: 'washout', label: 'Washout' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setIncidentFilter(opt.value)}
                      className={cn(
                        'w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors',
                        incidentFilter === opt.value
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="severity" className="border border-border/60 rounded-lg bg-card px-3">
                <AccordionTrigger className="text-xs font-medium py-3 hover:no-underline">Risk Severity</AccordionTrigger>
                <AccordionContent className="pb-3 space-y-1.5">
                  {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSeverityFilter(s)}
                      className={cn(
                        'w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors capitalize',
                        severityFilter === s
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {s === 'all' ? 'All severities' : `${s} risk`}
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="formation" className="border border-border/60 rounded-lg bg-card px-3">
                <AccordionTrigger className="text-xs font-medium py-3 hover:no-underline">Formation</AccordionTrigger>
                <AccordionContent className="pb-3 space-y-1.5">
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
                        'w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors',
                        formationFilter === opt.value
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {activeFilters.length > 0 && (
              <button
                onClick={() => { setIncidentFilter('all'); setSeverityFilter('all'); setFormationFilter('all'); }}
                className="text-xs text-destructive hover:underline flex items-center gap-1 px-1 mt-2"
              >
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        </motion.aside>

        {/* ── Main: Search + Results ─────────────────────────────────── */}
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
              placeholder="Search incidents, mitigations, formations, wells…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-10 pr-10 h-11 text-sm bg-card border-border/60 focus:border-primary"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" />AI Search
              </span>
            </div>
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-16 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> results
              {query && <> for "<span className="text-primary">{query}</span>"</>}
            </p>
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {filtered.length > 0 ? (
              <motion.div
                key={`${query}-${incidentFilter}-${severityFilter}-${formationFilter}`}
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {paginated.map(entry => (
                  <ResultCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => router.push(`/wells/${entry.wellId}`)}
                  />
                ))}
                {/* Infinite scroll trigger */}
                {hasMore && (
                  <div ref={loaderRef} className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-20 text-center"
              >
                <BookOpen className="w-12 h-12 text-muted-foreground/25 mx-auto mb-4" />
                <p className="font-semibold text-foreground mb-1">No matching records found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  No drilling events match your search or filters.
                  Try adjusting your query or clearing filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setQuery(''); setIncidentFilter('all'); setSeverityFilter('all'); setFormationFilter('all'); }}
                >
                  Clear all filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
  );
}
