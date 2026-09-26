'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { cn, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Droplets,
  Search,
  Filter,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Compass,
  Layers,
  Activity
} from 'lucide-react';

const BASIN_TABS = [
  { id: 'all', label: 'All Indian Basins', fieldMatch: [] },
  { id: 'assam', label: 'Assam Shelf', fieldMatch: ['Duliajan North', 'Lakwa Central', 'Moran East', 'Naharkatiya', 'Baghjan', 'Naharkatia', 'Moran', 'Jorajan', 'Hugrijan', 'Lakwa', 'Geleki', 'Dikom', 'Sibsagar'] },
  { id: 'rajasthan', label: 'Barmer (RJ)', fieldMatch: ['Barmer Basin (Rajasthan)'] },
  { id: 'cambay', label: 'Cambay (GJ)', fieldMatch: ['Cambay Basin (Gujarat)'] },
  { id: 'mumbai', label: 'Mumbai High', fieldMatch: ['Mumbai High (Offshore)'] },
  { id: 'tripura', label: 'Tripura Gas', fieldMatch: ['Tripura Gas Fields'] },
  { id: 'kg', label: 'KG Deepwater', fieldMatch: ['KG Basin (Deepwater)'] },
  { id: 'cauvery', label: 'Cauvery (TN)', fieldMatch: ['Cauvery Basin'] },
];

export default function WellsDirectoryPage() {
  const router = useRouter();
  const { wells, isLoadingWells, fetchWells, setActiveWell, selectedBasin } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [selectedBasinTab, setSelectedBasinTab] = useState<string>('all');

  useEffect(() => {
    fetchWells();
  }, [fetchWells]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('basin');
      if (param && BASIN_TABS.some(b => b.id === param)) {
        setSelectedBasinTab(param);
        return;
      }
    }
    if (selectedBasin && selectedBasin !== 'all' && BASIN_TABS.some(b => b.id === selectedBasin)) {
      setSelectedBasinTab(selectedBasin);
    }
  }, [selectedBasin]);

  const fields = Array.from(new Set(wells.map((w) => w.field))).filter(Boolean);

  const filteredWells = wells.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((w as any).wellNumber && (w as any).wellNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.field && w.field.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || w.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesField = fieldFilter === 'all' || w.field === fieldFilter;

    const currentTab = BASIN_TABS.find(t => t.id === selectedBasinTab);
    const matchesBasin = selectedBasinTab === 'all' || (currentTab && currentTab.fieldMatch.includes(w.field));

    return matchesSearch && matchesStatus && matchesField && matchesBasin;
  });

  const activeTabObj = BASIN_TABS.find(t => t.id === selectedBasinTab);

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-8">
      {/* Top Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {selectedBasinTab === 'all' ? 'National Hydrocarbon Well Directory' : `${activeTabObj?.label} Well Directory`}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
              {filteredWells.length} of {wells.length} WELLS
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time telemetry, trajectory profiles, lithology formation intervals, and incident records across all 7 Indian basins.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchWells()}
          disabled={isLoadingWells}
          className="gap-2 text-xs self-start md:self-auto"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoadingWells && 'animate-spin')} />
          Sync Wells
        </Button>
      </motion.div>

      {/* Basin Quick Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {BASIN_TABS.map((tab) => {
          const count = tab.id === 'all' 
            ? wells.length 
            : wells.filter(w => tab.fieldMatch.includes(w.field)).length;
          const isActive = selectedBasinTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedBasinTab(tab.id);
                setFieldFilter('all');
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border",
                isActive
                  ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/50 font-bold shadow-sm"
                  : "bg-[#0C121B] text-[#8E9CAE] border-[#182332] hover:border-[#28384E] hover:text-white"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded text-[10px]",
                isActive ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "bg-white/5 text-[#64748B]"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <Card className="border-border/60 bg-card mb-6">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by well name (e.g. Duliajan-1, Baghjan-05, DJN-001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 bg-background"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Drilling</option>
              <option value="suspended">Suspended</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Fields ({fields.length})</option>
              {fields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Wells Grid */}
      {isLoadingWells ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-mono">Fetching database records...</p>
        </div>
      ) : filteredWells.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/60 rounded-xl bg-card">
          <Droplets className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">No wells match filter criteria</p>
          <p className="text-xs text-muted-foreground mt-1">Try resetting the status or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWells.map((well) => {
            const status = well.status.toLowerCase();
            const statusBadge = {
              active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            }[status] || 'bg-muted text-muted-foreground border-border';

            return (
              <Card
                key={well.id}
                className="border-border/60 bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col justify-between"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {well.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {well.field} · {(well as any).wellNumber || 'WELL-ID'}
                      </p>
                    </div>
                    <Badge className={cn('text-[10px] uppercase font-mono', statusBadge)}>
                      {well.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 my-2 border-y border-border/40 font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">Total Depth</span>
                      <span className="font-semibold text-foreground">{Number(well.totalDepthFt).toLocaleString()} ft</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">Coordinates</span>
                      <span className="text-[11px] text-muted-foreground">
                        {well.coordinates?.lat?.toFixed(3)}°N, {well.coordinates?.lng?.toFixed(3)}°E
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span className="text-[11px]">Operator: {well.operator || 'Oil India Limited'}</span>
                    {well.incidents && well.incidents.length > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold font-mono">
                        <AlertTriangle className="w-3 h-3" />
                        {well.incidents.length} Events
                      </span>
                    )}
                  </div>
                </CardContent>

                <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-primary hover:text-primary hover:bg-primary/10 gap-1.5 w-full justify-center"
                    onClick={() => {
                      setActiveWell(well.id);
                      router.push(`/wells/${well.id}`);
                    }}
                  >
                    View Telemetry & Formations
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
