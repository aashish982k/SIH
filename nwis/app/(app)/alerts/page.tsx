'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { AlertCard } from '@/components/cockpit/AlertCard';
import { Empty, Panel, Segmented, Spinner, Stat } from '@/components/kit';
import type { Alert } from '@/lib/types';

export default function AlertsPage() {
  const [status, setStatus] = useState<'open' | 'all' | 'false_alarm'>('all');
  const { data, reload } = useApi<Alert[]>(`/alerts?limit=300${status === 'all' ? '' : `&status=${status}`}`, { refreshMs: 5000 });
  const all = useApi<Alert[]>('/alerts?limit=500', { refreshMs: 10000 }).data;

  const stats = useMemo(() => {
    const list = all ?? [];
    const reviewed = list.filter((a) => a.status !== 'active');
    const fa = list.filter((a) => a.status === 'false_alarm').length;
    return {
      total: list.length, open: list.filter((a) => a.status === 'active' || a.status === 'acknowledged').length,
      lookahead: list.filter((a) => a.kind === 'lookahead').length, live: list.filter((a) => a.kind === 'live').length,
      faRate: reviewed.length ? Math.round((fa / reviewed.length) * 100) : 0,
    };
  }, [all]);

  async function respond(id: string, action: 'acknowledge' | 'false_alarm' | 'resolve', feedback?: string) {
    await api(`/alerts/${id}/respond`, { method: 'POST', json: { action, feedback } });
    await reload();
  }

  return (
    <div className="mx-auto grid max-w-[1000px] gap-4">
      <Panel className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
        <Stat label="Alerts raised" value={stats.total} />
        <Stat label="Open" value={stats.open} tone={stats.open ? 'var(--r-high)' : undefined} />
        <Stat label="Look-ahead" value={stats.lookahead} sub="from offset history" />
        <Stat label="Live" value={stats.live} sub="from eRTMAC trends" />
        <Stat label="False-alarm rate" value={`${stats.faRate}%`} sub="of reviewed alerts" />
      </Panel>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[22px] font-bold">Alert log</h1>
        <Segmented value={status} onChange={setStatus} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'false_alarm', label: 'False alarms' }]} />
      </div>
      {!data ? <Spinner /> : data.length === 0 ? <Panel><Empty title="No alerts here">Start the eRTMAC replay on the Live well page to generate look-ahead and live alerts.</Empty></Panel> : (
        <div className="grid gap-2.5">{data.map((a) => <AlertCard key={a.id} alert={a} compact showWell onRespond={respond} />)}</div>
      )}
      <p className="text-[12px] text-faint">Engineer feedback on every alert is stored with it, so thresholds can be recalibrated against what crews found on the rig.</p>
    </div>
  );
}
