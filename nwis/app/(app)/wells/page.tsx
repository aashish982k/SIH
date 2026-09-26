'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { Depth, Panel, Spinner, inputCls } from '@/components/kit';
import { cn, fmtDate } from '@/lib/format';
import type { Well } from '@/lib/types';

export default function WellsPage() {
  const { data } = useApi<Well[]>('/wells');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'name' | 'npt' | 'events'>('npt');
  const rows = useMemo(() => {
    const f = (data ?? []).filter((w) => `${w.name} ${w.field} ${w.pad ?? ''}`.toLowerCase().includes(q.toLowerCase()));
    return f.sort((a, b) => (a.status === 'drilling' ? -1 : 0) - (b.status === 'drilling' ? -1 : 0) || (sort === 'name' ? a.name.localeCompare(b.name) : sort === 'npt' ? b.totalNptHours - a.totalNptHours : (b.eventCount ?? 0) - (a.eventCount ?? 0)));
  }, [data, q, sort]);
  if (!data) return <Spinner />;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-caps">{data.length} wells · {data.filter((w) => w.status === 'drilling').length} drilling</div>
          <h1 className="font-display text-[24px] font-bold">Well register</h1>
        </div>
        <input id="well-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, field or pad" className={cn(inputCls, 'w-64')} />
      </div>
      <Panel className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left">
              {[['name', 'Well'], ['', 'Field'], ['', 'Type'], ['', 'Profile'], ['', 'Depth'], ['', 'Spud'], ['events', 'Problems'], ['npt', 'NPT']].map(([k, l]) => (
                <th key={l} className="px-4 py-2.5">
                  {k ? <button className={cn('label-caps hover:text-fg', sort === k && '!text-accent')} onClick={() => setSort(k as any)}>{l}</button> : <span className="label-caps">{l}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-b border-line last:border-b-0 hover:bg-panel-2">
                <td className="px-4 py-2"><Link href={`/wells/${w.id}`} className="font-semibold hover:text-accent">{w.name}</Link>{w.status === 'drilling' && <span className="ml-2 rounded bg-[color-mix(in_oklab,var(--r-low)_15%,transparent)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--r-low)]">DRILLING</span>}</td>
                <td className="px-4 py-2 text-muted-fg">{w.field}</td>
                <td className="px-4 py-2 capitalize text-muted-fg">{w.wellType}</td>
                <td className="px-4 py-2 text-muted-fg">{w.profile}{w.pad ? ` · ${w.pad}` : ''}</td>
                <td className="px-4 py-2"><Depth ft={w.status === 'drilling' ? w.currentDepthFt : w.totalDepthFt} /></td>
                <td className="px-4 py-2 text-muted-fg">{fmtDate(w.spudDate)}</td>
                <td className="px-4 py-2 readout">{w.eventCount ?? 0}{w.severeCount ? <span className="ml-1 text-[var(--r-high)]">({w.severeCount} severe)</span> : null}</td>
                <td className="px-4 py-2 readout">{w.totalNptHours} h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
