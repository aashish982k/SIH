'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Route } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useApi } from '@/hooks/useApi';
import { Btn, Depth, EventTag, ErrorNote, Panel, PanelHeader, Segmented, Spinner } from '@/components/kit';
import { cn } from '@/lib/format';
import type { DrillEvent, Offset, Well } from '@/lib/types';

const OffsetMap = dynamic(() => import('@/components/geo/OffsetMap').then((m) => m.OffsetMap), { ssr: false, loading: () => <Spinner label="Loading map" /> });

export default function OffsetsPage() {
  const { activeWellId, radiusKm, setRadius, theme } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const { data, error, reload } = useApi<{ active: Well; offsets: Offset[]; radiusKm: number }>(activeWellId ? `/wells/${activeWellId}/offsets?radius=${radiusKm}` : null);
  const { data: wells } = useApi<Well[]>('/wells');
  const { data: events } = useApi<DrillEvent[]>('/events');

  const byWell = useMemo(() => {
    const m = new Map<string, DrillEvent[]>();
    for (const e of events ?? []) m.set(e.wellId, [...(m.get(e.wellId) ?? []), e]);
    return m;
  }, [events]);

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data || !wells) return <Spinner label="Finding offset wells" />;
  const sel = data.offsets.find((o) => o.id === selected);
  const deviated = data.offsets.filter((o) => o.profile === 'deviated').length;

  return (
    <div className="grid gap-4 xl:h-[calc(100vh-110px)] xl:grid-cols-[minmax(0,1fr)_420px]">
      <Panel className="relative min-h-[520px] overflow-hidden">
        <OffsetMap active={data.active} offsets={data.offsets} others={wells} radiusKm={radiusKm} theme={theme} selectedId={selected} onSelect={setSelected} showPaths={showPaths} />
        <div className="absolute left-3 top-3 grid gap-2 rounded-xl border border-line bg-[color-mix(in_oklab,var(--panel)_92%,transparent)] p-3 backdrop-blur">
          <div className="label-caps">Search radius</div>
          <Segmented value={radiusKm} onChange={setRadius} options={[3, 5, 10, 15, 25].map((v) => ({ value: v, label: `${v} km` }))} />
          <label className="flex items-center gap-2 text-[12.5px] text-muted-fg">
            <input type="checkbox" checked={showPaths} onChange={(e) => setShowPaths(e.target.checked)} className="accent-[var(--accent)]" />
            Show deviated well paths ({deviated})
          </label>
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-2 text-[11.5px] text-muted-fg">
            <Legend color="#5b9dff" label="Active well" ring />
            <Legend color="#3cc58e" label="No NPT" />
            <Legend color="#e9b73d" label="< 75 h" />
            <Legend color="#f58a4b" label="75–150 h" />
            <Legend color="#ff5a61" label="> 150 h NPT" />
          </div>
        </div>
      </Panel>

      <Panel className="flex min-h-0 flex-col">
        <PanelHeader eyebrow={`${data.offsets.length} wells within ${radiusKm} km`} title={`Offsets for ${data.active.name}`} />
        <p className="-mt-1 px-4 pb-3 text-[12px] leading-snug text-muted-fg">
          Distance is measured along each wellbore at the same formation, so a deviated well from a shared pad is placed where it actually reached the reservoir.
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line scroll-thin">
          {data.offsets.map((o) => {
            const evs = byWell.get(o.id) ?? [];
            const types = [...new Set(evs.map((e) => e.type))];
            const deepest = Object.entries(o.distanceByFormation).slice(-1)[0];
            return (
              <button key={o.id} onClick={() => setSelected(o.id === selected ? null : o.id)}
                className={cn('grid w-full gap-1.5 border-b border-line px-4 py-3 text-left transition-colors hover:bg-panel-2', o.id === selected && 'bg-accent-soft')}>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[15px] font-semibold">{o.name}</span>
                  {o.profile === 'deviated' && <span className="inline-flex items-center gap-1 rounded bg-panel-2 px-1.5 text-[11px] text-muted-fg"><Route className="size-3" />deviated · {o.pad}</span>}
                  <span className="readout ml-auto text-[13px]">{o.nearestDistanceKm.toFixed(2)} km</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-fg">
                  <span>TD <Depth ft={o.totalDepthFt} /></span>
                  <span className="readout">{o.totalNptHours} h NPT</span>
                  <span>surface {o.surfaceDistanceKm.toFixed(2)} km{deepest ? ` · ${deepest[0].split(' ')[0]} ${deepest[1].toFixed(2)} km` : ''}</span>
                </div>
                {types.length > 0 && <div className="flex flex-wrap gap-1">{types.map((t) => <EventTag key={t} type={t} count={evs.filter((e) => e.type === t).length} />)}</div>}
              </button>
            );
          })}
        </div>
        {sel && (
          <div className="border-t border-line bg-panel-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="font-display text-[15px] font-semibold">{sel.name} · distance by formation</div>
              <Link href={`/wells/${sel.id}`}><Btn size="sm">Open well</Btn></Link>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(sel.distanceByFormation).map(([f, d]) => (
                <div key={f} className="flex justify-between text-[12px]"><span className="text-muted-fg">{f}</span><span className="readout">{d.toFixed(2)} km</span></div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Legend({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: color, boxShadow: ring ? '0 0 0 2px #fff' : undefined }} />{label}</span>;
}
