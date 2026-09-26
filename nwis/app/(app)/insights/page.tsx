'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { ErrorNote, EventTag, Panel, PanelHeader, Segmented, Spinner, Stat } from '@/components/kit';
import { EVENT_LABEL, eventColor, pct } from '@/lib/format';
import type { EventType, Meta } from '@/lib/types';

interface Overview {
  totals: { wells: number; events: number; nptHours: number; severe: number };
  formations: Array<{ name: string; color: string; wellsPenetrated: number }>;
  matrix: Array<{ formation: string; type: EventType; count: number; nptHours: number; wells: number; rate: number | null }>;
  byField: Array<{ field: string; wells: number; events: number; nptHours: number }>;
  mitigations: Array<{ type: EventType; key: string; uses: number; successRate: number; avgNptHours: number }>;
  worstWells: Array<{ id: string; name: string; field: string; nptHours: number; events: number }>;
}

const TYPES: EventType[] = ['mud_loss', 'stuck_pipe', 'tight_hole', 'wellbore_instability', 'kick', 'overpressure', 'cementing_issue', 'fishing'];

export default function InsightsPage() {
  const [field, setField] = useState('');
  const [metric, setMetric] = useState<'rate' | 'npt'>('rate');
  const { data, error, reload } = useApi<Overview>(`/analytics/overview${field ? `?field=${field}` : ''}`);
  const { data: meta } = useApi<Meta>('/meta');
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return <Spinner label="Crunching offset history" />;

  const cell = (f: string, t: EventType) => data.matrix.find((m) => m.formation === f && m.type === t);
  const maxNpt = Math.max(1, ...data.matrix.map((m) => m.nptHours));
  const maxFieldNpt = Math.max(1, ...data.byField.map((f) => f.nptHours));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-caps">Office view · offset history</div>
          <h1 className="font-display text-[24px] font-bold">Where the trouble is</h1>
        </div>
        <Segmented value={field} onChange={setField} options={[{ value: '', label: 'All fields' }, ...['Naharkatia', 'Jorajan', 'Hugrijan', 'Moran'].map((f) => ({ value: f, label: f }))]} />
      </div>

      <Panel className="grid grid-cols-2 gap-4 p-4 md:grid-cols-4">
        <Stat label="Offset wells" value={data.totals.wells} />
        <Stat label="Recorded problems" value={data.totals.events} sub={`${data.totals.severe} high or critical`} />
        <Stat label="Non-productive time" value={`${data.totals.nptHours.toLocaleString('en-IN')} h`} sub={`≈ ${Math.round(data.totals.nptHours / 24)} rig-days`} />
        <Stat label="NPT per well" value={`${Math.round(data.totals.nptHours / Math.max(1, data.totals.wells))} h`} />
      </Panel>

      <Panel>
        <PanelHeader eyebrow="Formation × problem" title={metric === 'rate' ? 'Share of wells through each formation that had the problem' : 'NPT hours by formation and problem'}
          right={<Segmented size="sm" value={metric} onChange={setMetric} options={[{ value: 'rate', label: 'Well rate' }, { value: 'npt', label: 'NPT hours' }]} />} />
        <div className="overflow-x-auto px-4 pb-4 scroll-thin">
          <div className="grid min-w-[860px]" style={{ gridTemplateColumns: `200px repeat(${TYPES.length}, minmax(0,1fr))` }}>
            <div />
            {TYPES.map((t) => <div key={t} className="px-1 pb-2 text-center"><EventTag type={t} /></div>)}
            {data.formations.map((f) => (
              <Fragment key={f.name}>
                <div className="flex items-center gap-2 border-t border-line py-2 pr-2">
                  <span className="h-6 w-2 rounded-sm" style={{ background: f.color }} />
                  <div className="leading-tight"><div className="text-[13px] font-medium">{f.name}</div><div className="text-[11px] text-faint">{f.wellsPenetrated} wells drilled it</div></div>
                </div>
                {TYPES.map((t) => {
                  const c = cell(f.name, t);
                  const v = !c ? 0 : metric === 'rate' ? (c.rate ?? 0) : c.nptHours / maxNpt;
                  return (
                    <div key={t} className="border-t border-line p-1">
                      <div className="grid h-10 place-items-center rounded-md text-[12px] readout"
                        title={c ? `${c.count} events in ${c.wells} wells · ${c.nptHours} h NPT` : 'No recorded events'}
                        style={{ background: c ? `color-mix(in oklab, ${eventColor(t)} ${Math.round(10 + v * 75)}%, transparent)` : 'var(--inset)', color: v > 0.45 ? '#fff' : 'var(--fg-muted)' }}>
                        {c ? (metric === 'rate' ? pct(c.rate) : `${Math.round(c.nptHours)} h`) : ''}
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel>
          <PanelHeader eyebrow="What worked" title="Mitigation success by problem" />
          <div className="grid gap-3 px-4 pb-4">
            {TYPES.filter((t) => data.mitigations.some((m) => m.type === t)).map((t) => (
              <div key={t}>
                <div className="mb-1 text-[12.5px] font-semibold" style={{ color: eventColor(t) }}>{EVENT_LABEL[t]}</div>
                <div className="grid gap-1">
                  {data.mitigations.filter((m) => m.type === t).map((m) => (
                    <div key={m.key} className="grid grid-cols-[180px_1fr_170px] items-center gap-3 text-[12.5px]">
                      <span className="truncate text-muted-fg">{meta?.mitigations[m.key] ?? m.key}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-inset"><span className="block h-full rounded-full" style={{ width: `${m.successRate * 100}%`, background: m.successRate >= 0.7 ? 'var(--r-low)' : m.successRate >= 0.45 ? 'var(--r-med)' : 'var(--r-crit)' }} /></span>
                      <span className="readout text-right text-[11.5px] text-faint">{pct(m.successRate)} · {m.uses} uses · {m.avgNptHours} h</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid content-start gap-4">
          <Panel>
            <PanelHeader eyebrow="By field" title="Non-productive time" />
            <div className="grid gap-2 px-4 pb-4">
              {data.byField.map((f) => (
                <div key={f.field} className="grid grid-cols-[100px_1fr_70px] items-center gap-3 text-[13px]">
                  <span>{f.field}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-inset"><span className="block h-full rounded-full bg-accent" style={{ width: `${(f.nptHours / maxFieldNpt) * 100}%` }} /></span>
                  <span className="readout text-right text-muted-fg">{f.nptHours} h</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHeader eyebrow="Most NPT" title="Wells to learn from" />
            <div className="border-t border-line">
              {data.worstWells.map((w) => (
                <Link key={w.id} href={`/wells/${w.id}`} className="flex items-center gap-3 border-b border-line px-4 py-2 text-[13px] last:border-b-0 hover:bg-panel-2">
                  <span className="font-semibold">{w.name}</span><span className="text-faint">{w.field}</span>
                  <span className="readout ml-auto">{w.nptHours} h</span><span className="readout w-16 text-right text-faint">{w.events} events</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
