'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { Pause, Play, RotateCcw, Radio, ArrowDownToLine } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useApi } from '@/hooks/useApi';
import { useLiveWell } from '@/hooks/useLiveWell';
import { DepthTrack } from '@/components/cockpit/DepthTrack';
import { StripChart } from '@/components/cockpit/StripChart';
import { RiskPanel } from '@/components/cockpit/RiskPanel';
import { AlertCard } from '@/components/cockpit/AlertCard';
import { Btn, Depth, Empty, ErrorNote, Panel, PanelHeader, Segmented, Spinner } from '@/components/kit';
import { cn, depth, EVENT_LABEL, eventColor, pct } from '@/lib/format';
import type { HazardProfile, Well } from '@/lib/types';

const RIG_STATE_LABEL: Record<string, string> = { drilling: 'Drilling', connection: 'Connection', circulating: 'Circulating', tripping: 'Tripping', reaming: 'Reaming' };

export default function CockpitPage() {
  const { activeWellId, unit, radiusKm, setRadius, setActiveWell } = useApp();
  const { data: wells } = useApi<Well[]>('/wells');
  const well = wells?.find((w) => w.id === activeWellId);
  const isLive = well?.status === 'drilling';
  const live = useLiveWell(isLive ? activeWellId : null, isLive);
  const hazard = useApi<HazardProfile>(activeWellId && isLive ? `/wells/${activeWellId}/hazard?radius=${radiusKm}` : null);

  // Keep the server-side alerting radius in step with what the engineer is looking at
  useEffect(() => { if (isLive) void live.control('radius', radiusKm).catch(() => {}); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isLive, activeWellId, radiusKm]);

  const last = live.history[live.history.length - 1];
  const bitFt = last?.holeDepth ?? well?.currentDepthFt ?? 0;
  const openAlerts = useMemo(() => live.alerts.filter((a) => a.status === 'active' || a.status === 'acknowledged'), [live.alerts]);
  const closedAlerts = useMemo(() => live.alerts.filter((a) => a.status === 'resolved' || a.status === 'false_alarm').slice(0, 4), [live.alerts]);
  const recent = live.history.slice(-160);
  const reasonsFor = (k: string) => (live.risk?.byType as any)?.[k]?.live > 0.3;

  if (!wells) return <Spinner label="Loading wells" />;
  if (well && !isLive) {
    const liveWells = wells.filter((w) => w.status === 'drilling');
    return (
      <Panel className="mx-auto mt-10 max-w-xl">
        <Empty title={`${well.name} is a completed offset well`} icon={<Radio className="size-6" />}>
          The live view follows wells that are drilling now. Open {well.name}’s record, or switch to a live well.
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href={`/wells/${well.id}`}><Btn>Open {well.name}</Btn></Link>
            {liveWells.map((w) => <Btn key={w.id} variant="primary" onClick={() => setActiveWell(w.id)}>Go to {w.name}</Btn>)}
          </div>
        </Empty>
      </Panel>
    );
  }

  const next = live.risk?.nextZone;

  return (
    <div className="grid gap-4">
      {/* ── Header band ─────────────────────────────── */}
      <Panel className="grid gap-4 px-4 py-3.5 xl:grid-cols-[auto_1fr_auto] xl:items-center">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('live-dot size-2 rounded-full', live.running ? 'text-[var(--r-low)] bg-[var(--r-low)]' : 'bg-faint text-faint')} />
              <span className="label-caps">{live.running ? 'eRTMAC replay · streaming' : 'eRTMAC replay · paused'}</span>
            </div>
            <h1 className="font-display text-[26px] font-bold leading-tight tracking-wide">{well?.name}</h1>
            <div className="text-[12.5px] text-muted-fg">{well?.field} · {well?.block}</div>
          </div>
          <div className="h-12 w-px bg-line" />
          <div>
            <div className="label-caps">Bit depth</div>
            <div className="readout text-[30px] font-medium leading-none">{depth(bitFt, unit)}</div>
            <div className="readout mt-1 text-[11.5px] text-faint">{depth(bitFt, unit === 'm' ? 'ft' : 'm')} · TD plan {depth(well?.plannedTdFt, unit)}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 xl:justify-center">
          <Readout label="Formation" value={last?.formation ?? '—'} wide />
          <Readout label="Rig state" value={RIG_STATE_LABEL[last?.rigState ?? ''] ?? '—'} />
          <Readout label="ROP" value={last ? `${last.rop.toFixed(0)}` : '—'} unit="ft/h" />
          <Readout label="MW / ECD" value={last ? `${last.mw.toFixed(1)} / ${last.ecd.toFixed(2)}` : '—'} unit="ppg" />
          {next && (
            <div className="rounded-lg border px-3 py-1.5" style={{ borderColor: `color-mix(in oklab, ${eventColor(next.type)} 45%, transparent)`, background: `color-mix(in oklab, ${eventColor(next.type)} 8%, transparent)` }}>
              <div className="label-caps" style={{ color: eventColor(next.type) }}>Next hazard</div>
              <div className="text-[13.5px] font-semibold">
                {EVENT_LABEL[next.type]} {next.distanceFt > 0 ? <>in <Depth ft={next.distanceFt} /></> : 'at the bit'}
              </div>
              <div className="text-[11.5px] text-muted-fg">{next.offsetsWithEvent}/{next.offsetsPenetrated} offsets · {next.formation} · peak {pct(next.peakProbability)}</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Btn variant={live.running ? 'outline' : 'primary'} onClick={() => live.control(live.running ? 'pause' : 'start')} aria-label={live.running ? 'Pause replay' : 'Start replay'}>
            {live.running ? <Pause className="size-4" /> : <Play className="size-4" />}{live.running ? 'Pause' : 'Start replay'}
          </Btn>
          <Segmented size="sm" value={live.speed} onChange={(v) => live.control('speed', v)}
            options={[{ value: 60, label: '60×' }, { value: 240, label: '240×' }, { value: 600, label: '600×' }]} />
          <Btn variant="ghost" size="sm" onClick={() => live.control('reset')} title="Rewind to the start depth and clear alerts"><RotateCcw className="size-3.5" />Reset</Btn>
        </div>
      </Panel>

      <div className="grid gap-4 xl:h-[calc(100vh-252px)] xl:min-h-[680px] xl:grid-cols-[minmax(340px,380px)_minmax(0,1fr)_minmax(350px,410px)]">
        {/* ── Depth track ─────────────────────────────── */}
        <Panel className="flex min-h-0 flex-col">
          <PanelHeader eyebrow="Look-ahead" title="Offset hazard profile"
            right={<Segmented size="sm" value={radiusKm} onChange={setRadius} options={[5, 10, 15].map((v) => ({ value: v, label: `${v} km` }))} />} />
          <p className="-mt-1 px-4 pb-2 text-[12px] text-muted-fg">
            {hazard.data ? `${hazard.data.offsets.length} offset wells within ${radiusKm} km, aligned by formation. Lane shading = share of offsets with that problem at the equivalent depth.` : ' '}
          </p>
          <div className="min-h-[560px] flex-1 px-2 pb-2 xl:min-h-0">
            {hazard.error ? <ErrorNote message={hazard.error} onRetry={hazard.reload} /> : hazard.data && last ? (
              <DepthTrack profile={hazard.data} bitFt={bitFt} unit={unit} />
            ) : <Spinner label="Building hazard profile" />}
          </div>
        </Panel>

        {/* ── Live parameters ─────────────────────────── */}
        <Panel className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <PanelHeader eyebrow="eRTMAC · surface parameters" title="Live drilling data"
            right={<span className="flex items-center gap-1.5 text-[12px] text-muted-fg"><ArrowDownToLine className="size-3.5" />{recent.length} samples · drilling only</span>} />
          <div className="min-h-0 overflow-y-auto border-t border-line scroll-thin">
            <StripChart samples={recent} unit="kft·lb" decimals={1} series={[{ key: 'torque', label: 'Torque', color: 'var(--ev-stuck_pipe)' }]} warn={reasonsFor('stuck_pipe')} />
            <StripChart samples={recent} unit="gpm" series={[{ key: 'flowIn', label: 'Flow in', color: 'var(--fg-muted)', dashed: true }, { key: 'flowOut', label: 'Flow out', color: 'var(--ev-mud_loss)' }]} warn={reasonsFor('mud_loss') || reasonsFor('kick')} />
            <StripChart samples={recent} unit="bbl" decimals={1} series={[{ key: 'pit', label: 'Pit volume', color: 'var(--ev-kick)' }]} warn={reasonsFor('mud_loss') || reasonsFor('kick')} />
            <StripChart samples={recent} unit="units" series={[{ key: 'gas', label: 'Total gas', color: 'var(--ev-overpressure)' }]} warn={reasonsFor('overpressure')} />
            <StripChart samples={recent} unit="psi" series={[{ key: 'spp', label: 'Standpipe', color: 'var(--accent)' }]} />
            <StripChart samples={recent} unit="ft/h" series={[{ key: 'rop', label: 'ROP', color: 'var(--r-low)' }]} />
            <StripChart samples={recent} unit="—" decimals={2} series={[{ key: 'dxc', label: 'd-exp (corr.)', color: 'var(--ev-tight_hole)' }]} warn={reasonsFor('overpressure')} />
            <StripChart samples={recent} unit="klbs" series={[{ key: 'hookLoad', label: 'Hook load', color: 'var(--ev-wellbore_instability)' }]} />
          </div>
        </Panel>

        {/* ── Risk + alerts ───────────────────────────── */}
        <div className="flex min-h-0 flex-col gap-4">
          <Panel className="shrink-0">
            <PanelHeader eyebrow="Offset history × live signs" title="Risk now" />
            <RiskPanel risk={live.risk} />
          </Panel>
          <Panel className="flex min-h-[320px] min-w-0 flex-1 flex-col overflow-hidden">
            <PanelHeader eyebrow={`${openAlerts.length} open`} title="Alerts & recommendations" right={<Link href="/alerts" className="text-[12px] text-accent hover:underline">Alert log</Link>} />
            <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto px-3 pb-3 scroll-thin">
              {openAlerts.length === 0 && (
                <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-muted-fg">
                  No open alerts. Look-ahead warnings appear about {depth(400, unit)} before an offset hazard zone.
                </p>
              )}
              {openAlerts.map((a, i) => <AlertCard key={a.id} alert={a} defaultOpen={i === 0} fresh={a.id === live.freshAlertId} onRespond={live.respond} />)}
              {closedAlerts.length > 0 && <div className="label-caps mt-1 px-1">Earlier on this well</div>}
              {closedAlerts.map((a) => <AlertCard key={a.id} alert={a} compact onRespond={live.respond} />)}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Readout({ label, value, unit, wide }: { label: string; value: string; unit?: string; wide?: boolean }) {
  return (
    <div className={cn(wide && 'min-w-[140px]')}>
      <div className="label-caps">{label}</div>
      <div className={cn('text-[15px] font-semibold', !wide && 'readout font-medium')}>{value}{unit && <span className="ml-1 text-[11px] font-normal text-faint">{unit}</span>}</div>
    </div>
  );
}
