'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import { useApi } from '@/hooks/useApi';
import { useSize } from '@/hooks/useSize';
import { Depth, EventTag, ErrorNote, Panel, PanelHeader, Segmented, Spinner } from '@/components/kit';
import { cn, depth, EVENT_LABEL, eventColor, FT_PER_M, OUTCOME_COLOR, OUTCOME_LABEL, textOn } from '@/lib/format';
import type { DrillEvent, Formation } from '@/lib/types';

interface Column {
  id: string; name: string; field: string; status: string; profile: string; distanceKm: number;
  totalDepthFt: number | null; currentDepthFt: number | null; formations: Formation[]; events: DrillEvent[];
}
interface Correlation { radiusKm: number; available: Array<{ id: string; name: string; nearestDistanceKm: number; eventCount?: number }>; columns: Column[]; }

const WINDOWS = {
  full: { label: 'Full well', from: null as string | null, to: null as string | null },
  upper: { label: 'Girujan → Tipam', from: 'Girujan Clay', to: 'Tipam Sandstone' },
  barail: { label: 'Tipam → Barail', from: 'Tipam Sandstone', to: 'Barail Arenaceous' },
  deep: { label: 'Barail → Sylhet', from: 'Barail Arenaceous', to: 'Sylhet Limestone' },
};
type WindowKey = keyof typeof WINDOWS;

export default function CorrelationPage() {
  const { activeWellId, radiusKm, unit } = useApp();
  const [picked, setPicked] = useState<string[] | null>(null);
  const [win, setWin] = useState<WindowKey>('barail');
  const [focus, setFocus] = useState<DrillEvent | null>(null);
  const q = picked ? `&ids=${picked.join(',')}` : '';
  const { data, error, reload } = useApi<Correlation>(activeWellId ? `/wells/${activeWellId}/correlation?radius=${radiusKm}${q}` : null);

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <Spinner label="Correlating offset wells" />;
  const chosen = picked ?? data.columns.slice(1).map((c) => c.id);

  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id].slice(-6);
    setPicked(next);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Panel className="min-w-0">
        <PanelHeader eyebrow="Formation-aligned correlation · true vertical depth" title={`${data.columns[0]?.name} and ${data.columns.length - 1} offset wells`}
          right={<Segmented size="sm" value={win} onChange={setWin} options={(Object.keys(WINDOWS) as WindowKey[]).map((k) => ({ value: k, label: WINDOWS[k].label }))} />} />
        <div className="px-3 pb-3">
          <CorrelationSvg columns={data.columns} win={win} unit={unit} onPick={setFocus} focusId={focus?.id ?? null} />
        </div>
      </Panel>

      <div className="grid content-start gap-4">
        <Panel>
          <PanelHeader eyebrow={`Within ${radiusKm} km · pick up to 6`} title="Wells in the panel" />
          <div className="max-h-[340px] overflow-y-auto border-t border-line scroll-thin">
            {data.available.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-2.5 border-b border-line px-4 py-2 text-[13px] hover:bg-panel-2">
                <input type="checkbox" checked={chosen.includes(a.id)} onChange={() => toggle(a.id)} className="accent-[var(--accent)]" />
                <span className="font-medium">{a.name}</span>
                <span className="readout ml-auto text-[12px] text-muted-fg">{a.nearestDistanceKm.toFixed(2)} km</span>
              </label>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Selected event" title={focus ? `${focus.wellName} · ${EVENT_LABEL[focus.type]}` : 'Click a marker'} />
          <div className="grid gap-2 px-4 pb-4 text-[13px]">
            {focus ? (
              <>
                <div className="flex flex-wrap items-center gap-2"><EventTag type={focus.type} /><Depth ft={focus.depthMd} /><span className="text-muted-fg">{focus.formation}</span></div>
                <p className="leading-relaxed">{focus.description}</p>
                {focus.mitigation && <p className="text-muted-fg"><span className="label-caps mr-1">Did</span>{focus.mitigation}</p>}
                {focus.outcome && <p><span className="label-caps mr-1">Result</span><span style={{ color: focus.outcomeRating ? OUTCOME_COLOR[focus.outcomeRating] : undefined }}>{focus.outcome}</span></p>}
                {focus.lessons && <p className="rounded-lg bg-panel-2 p-2 text-[12.5px]"><span className="label-caps mr-1">Lesson</span>{focus.lessons}</p>}
                <Link className="text-[12.5px] text-accent hover:underline" href={`/wells/${focus.wellId}`}>Open {focus.wellName}</Link>
              </>
            ) : <p className="text-muted-fg">Each diamond is a recorded problem, placed at its true vertical depth. Bands connect the same formation across wells so you can see where the trouble sits relative to the tops.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function CorrelationSvg({ columns, win, unit, onPick, focusId }: { columns: Column[]; win: WindowKey; unit: 'm' | 'ft'; onPick: (e: DrillEvent) => void; focusId: string | null }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const H = 640;
  const active = columns[0];
  const range = useMemo(() => {
    const w = WINDOWS[win];
    const fmOf = (name: string | null, key: 'topTvd' | 'bottomTvd') => {
      if (!name) return null;
      const vals = columns.map((c) => c.formations.find((f) => f.name === name)?.[key]).filter((v): v is number => v != null);
      return vals.length ? (key === 'topTvd' ? Math.min(...vals) : Math.max(...vals)) : null;
    };
    const maxTd = Math.max(...columns.map((c) => c.totalDepthFt ?? 0));
    const top = fmOf(w.from, 'topTvd') ?? 0;
    const base = fmOf(w.to, 'bottomTvd') ?? maxTd;
    const pad = (base - top) * 0.04;
    return { top: Math.max(0, top - pad), base: base + pad };
  }, [columns, win]);

  const W = Math.max(640, width);
  const gutter = 52;
  const colW = Math.min(118, (W - gutter) / columns.length - 34);
  const gap = columns.length > 1 ? (W - gutter - colW * columns.length) / (columns.length - 1) : 0;
  const x = (i: number) => gutter + i * (colW + gap);
  const y = (ft: number) => 50 + ((ft - range.top) / (range.base - range.top)) * (H - 70);
  const clampY = (ft: number) => Math.max(50, Math.min(H - 20, y(ft)));
  const step = unit === 'm' ? (range.base - range.top > 6000 ? 250 : 100) * FT_PER_M : range.base - range.top > 6000 ? 1000 : 250;

  return (
    <div ref={ref} className="w-full overflow-x-auto scroll-thin">
      {width > 0 && (
        <svg width={W} height={H} role="img" aria-label="Correlation panel connecting formation tops across the active well and its offsets">
          {Array.from({ length: Math.ceil((range.base - range.top) / step) + 1 }, (_, i) => Math.ceil(range.top / step) * step + i * step).filter((d) => d <= range.base).map((d) => (
            <g key={d}>
              <line x1={gutter - 4} x2={W} y1={y(d)} y2={y(d)} stroke="var(--grid)" />
              <text x={gutter - 8} y={y(d) + 3.5} textAnchor="end" fontSize="10.5" fill="var(--fg-faint)" className="readout">{depth(d, unit, { suffix: false })}</text>
            </g>
          ))}
          <text x={gutter - 8} y={40} textAnchor="end" fontSize="10" fill="var(--fg-faint)" className="label-caps">TVD {unit}</text>

          {/* correlation fills between neighbours */}
          {columns.slice(0, -1).map((c, i) => {
            const n = columns[i + 1];
            return c.formations.map((f) => {
              const g = n.formations.find((ff) => ff.name === f.name);
              if (!g || f.bottomTvd == null || g.bottomTvd == null) return null;
              const x1 = x(i) + colW, x2 = x(i + 1);
              const pts = `${x1},${clampY(f.topTvd)} ${x2},${clampY(g.topTvd)} ${x2},${clampY(g.bottomTvd)} ${x1},${clampY(f.bottomTvd)}`;
              return (
                <g key={`${c.id}-${f.name}`}>
                  <polygon points={pts} fill={f.color} fillOpacity="0.16" />
                  <line x1={x1} y1={clampY(f.topTvd)} x2={x2} y2={clampY(g.topTvd)} stroke={f.color} strokeOpacity="0.7" strokeDasharray={f.predicted || g.predicted ? '4 3' : undefined} />
                </g>
              );
            });
          })}

          {columns.map((c, i) => {
            const td = c.status === 'drilling' ? (c.currentDepthFt ?? 0) : (c.totalDepthFt ?? 0);
            return (
              <g key={c.id}>
                <text x={x(i) + colW / 2} y={18} textAnchor="middle" fontSize="13.5" fontWeight="700" fill={i === 0 ? 'var(--accent)' : 'var(--fg)'} className="font-display">{c.name}</text>
                <text x={x(i) + colW / 2} y={33} textAnchor="middle" fontSize="10.5" fill="var(--fg-muted)">{i === 0 ? (c.status === 'drilling' ? 'drilling · prognosis' : 'selected well') : `${c.distanceKm.toFixed(2)} km${c.profile === 'deviated' ? ' · deviated' : ''}`}</text>
                {c.formations.map((f) => {
                  const t = Math.max(f.topTvd, range.top), b = Math.min(f.bottomTvd ?? range.base, range.base);
                  if (b <= t) return null;
                  const h = y(b) - y(t);
                  return (
                    <g key={f.name}>
                      <rect x={x(i)} y={y(t)} width={colW} height={h} fill={f.color} fillOpacity={f.predicted ? 0.72 : 0.9} stroke="var(--panel)" strokeWidth="0.5" />
                      {i === 0 && h > 18 && <text x={x(i) + 5} y={y(t) + 13} fontSize="10.5" fontWeight="600" fill={textOn(f.color)}>{f.name.replace(' Sandstone', ' Sst').replace(' Limestone', ' Lst')}</text>}
                    </g>
                  );
                })}
                {/* not drilled below TD */}
                {td < range.base && <rect x={x(i)} y={clampY(td)} width={colW} height={Math.max(0, y(range.base) - clampY(td))} fill="var(--panel)" fillOpacity="0.72" />}
                {c.status === 'drilling' && c.currentDepthFt && c.currentDepthFt > range.top && c.currentDepthFt < range.base && (
                  <g>
                    <line x1={x(i) - 6} x2={x(i) + colW + 6} y1={y(c.currentDepthFt)} y2={y(c.currentDepthFt)} stroke="var(--accent)" strokeWidth="2.5" />
                    <text x={x(i) + colW + 8} y={y(c.currentDepthFt) + 4} fontSize="10.5" fontWeight="600" fill="var(--accent)">BIT</text>
                  </g>
                )}
                {c.events.filter((e) => e.depthTvd >= range.top && e.depthTvd <= range.base).map((e, k) => {
                  const cx = x(i) + colW / 2 + ((k % 3) - 1) * 16, cy = y(e.depthTvd);
                  const on = focusId === e.id;
                  return (
                    <g key={e.id} onClick={() => onPick(e)} className="cursor-pointer" role="button" aria-label={`${EVENT_LABEL[e.type]} in ${c.name} at ${depth(e.depthTvd, unit)}`}>
                      <rect x={cx - (on ? 7 : 5.5)} y={cy - (on ? 7 : 5.5)} width={on ? 14 : 11} height={on ? 14 : 11} transform={`rotate(45 ${cx} ${cy})`} fill={eventColor(e.type)} stroke={on ? 'var(--fg)' : 'var(--panel)'} strokeWidth={on ? 2 : 1.5} />
                      <title>{`${EVENT_LABEL[e.type]} · ${depth(e.depthMd, unit)} · ${e.outcomeRating ? OUTCOME_LABEL[e.outcomeRating] : ''}`}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
      <div className={cn('mt-2 flex flex-wrap gap-2 px-1')}>
        {(['mud_loss', 'stuck_pipe', 'tight_hole', 'wellbore_instability', 'kick', 'overpressure', 'cementing_issue', 'fishing'] as const).map((t) => <EventTag key={t} type={t} />)}
      </div>
    </div>
  );
}
