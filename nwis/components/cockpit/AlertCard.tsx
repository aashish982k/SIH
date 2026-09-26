'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, FileText, Radar, ShieldAlert, X } from 'lucide-react';
import { Btn, Depth, EventTag, SeverityPill } from '@/components/kit';
import { cn, OUTCOME_COLOR, OUTCOME_LABEL, pct, SEVERITY_COLOR, timeAgo } from '@/lib/format';
import type { Alert } from '@/lib/types';

const STATUS_LABEL: Record<Alert['status'], string> = { active: 'Active', acknowledged: 'Acknowledged', resolved: 'Resolved', false_alarm: 'False alarm' };

export function AlertCard({ alert, fresh, onRespond, compact, showWell, defaultOpen }: {
  alert: Alert; fresh?: boolean; compact?: boolean; showWell?: boolean; defaultOpen?: boolean;
  onRespond?: (id: string, action: 'acknowledge' | 'false_alarm' | 'resolve', feedback?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(defaultOpen ?? (!compact && alert.status === 'active'));
  const [allEvidence, setAllEvidence] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const closed = alert.status === 'resolved' || alert.status === 'false_alarm';
  const color = SEVERITY_COLOR[alert.severity];

  async function act(action: 'acknowledge' | 'false_alarm' | 'resolve', feedback?: string) {
    if (!onRespond) return;
    setBusy(action);
    try { await onRespond(alert.id, action, feedback); setReasonOpen(false); } finally { setBusy(null); }
  }

  return (
    <article className={cn('relative shrink-0 overflow-hidden rounded-xl border bg-panel', fresh && 'alert-enter', closed && 'opacity-70')}
      style={{ borderColor: closed ? 'var(--line)' : `color-mix(in oklab, ${color} 45%, var(--line))` }}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: closed ? 'var(--line-strong)' : color }} />
      <button className="w-full px-4 pt-3 pb-2.5 pl-5 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold tracking-wider',
            alert.kind === 'live' ? 'bg-[color-mix(in_oklab,var(--r-crit)_14%,transparent)] text-[var(--r-crit)]' : 'bg-accent-soft text-accent')}>
            {alert.kind === 'live' ? <ShieldAlert className="size-3" /> : <Radar className="size-3" />}
            {alert.kind === 'live' ? 'LIVE' : 'LOOK-AHEAD'}
          </span>
          <SeverityPill severity={alert.severity} />
          <EventTag type={alert.riskType} />
          {showWell && <span className="text-[12px] font-semibold">{alert.wellName}</span>}
          <span className="ml-auto text-[11.5px] text-faint">{closed || alert.status === 'acknowledged' ? STATUS_LABEL[alert.status] + ' · ' : ''}{timeAgo(alert.createdAt)}</span>
        </div>
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <h3 className="font-display text-[15.5px] font-semibold leading-snug">{alert.title}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="readout text-[15px]" style={{ color }}>{pct(alert.probability)}</span>
            <ChevronDown className={cn('size-4 text-faint transition-transform', open && 'rotate-180')} />
          </div>
        </div>
        {!open && <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted-fg">{alert.message}</p>}
      </button>

      {open && (
        <div className="grid gap-3 px-4 pb-3.5 pl-5">
          <p className="text-[13px] leading-relaxed text-muted-fg">{alert.message}</p>

          {alert.recommendations?.options?.length ? (
            <div>
              <div className="label-caps mb-1.5">What worked before · {alert.recommendations.basedOn} cases in {alert.recommendations.scope}</div>
              <div className="grid gap-1.5">
                {alert.recommendations.options.map((o, i) => (
                  <div key={o.key} className="rounded-lg border border-line bg-panel-2 px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="readout text-[11px] text-faint">{i + 1}</span>
                      <span className="text-[13px] font-semibold">{o.label}</span>
                      <span className="readout ml-auto shrink-0 text-[12.5px] font-medium" style={{ color: o.successRate >= 0.7 ? 'var(--r-low)' : o.successRate >= 0.45 ? 'var(--r-med)' : 'var(--r-crit)' }}>
                        {pct(o.successRate)} worked
                      </span>
                    </div>
                    <div className="readout mt-0.5 pl-4 text-[11px] text-faint">{o.uses} uses · {o.avgNptHours} h average NPT</div>
                    <p className="mt-1 pl-4 text-[12px] leading-snug text-muted-fg">
                      <span className="font-medium text-fg">{o.example.wellName}</span> at <Depth ft={o.example.depthMd} />: {o.example.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {alert.evidence?.length ? (
            <div>
              <div className="label-caps mb-1.5">Offset evidence</div>
              <div className="overflow-hidden rounded-lg border border-line">
                {alert.evidence.slice(0, allEvidence ? 8 : 3).map((e) => (
                  <div key={e.id} className="grid grid-cols-[76px_1fr] gap-x-3 border-b border-line px-3 py-2 last:border-b-0">
                    <div>
                      <Link href={`/wells/${e.wellId}`} className="text-[12.5px] font-semibold hover:text-accent">{e.wellName}</Link>
                      <div className="readout text-[11px] text-faint">{e.distanceKm} km</div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 text-[12px]">
                        <Depth ft={e.depthMd} className="text-[12px]" />
                        {e.outcomeRating && <span style={{ color: OUTCOME_COLOR[e.outcomeRating] }}>{OUTCOME_LABEL[e.outcomeRating]}</span>}
                        {e.nptHours != null && <span className="readout text-faint">{e.nptHours} h NPT</span>}
                        {e.sourceDocumentTitle && (
                          <span className="inline-flex items-center gap-1 text-faint"><FileText className="size-3" />{e.sourceDocumentTitle.replace('Well Completion Report', 'WCR')}{e.sourcePage ? `, p.${e.sourcePage}` : ''}</span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-fg">{e.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {alert.evidence.length > 3 && (
                <button className="mt-1.5 text-[12px] text-accent hover:underline" onClick={() => setAllEvidence((v) => !v)}>
                  {allEvidence ? 'Show fewer cases' : `Show ${Math.min(8, alert.evidence.length) - 3} more offset cases`}
                </button>
              )}
            </div>
          ) : null}

          {alert.feedback && <p className="text-[12px] text-muted-fg"><span className="label-caps mr-1">Feedback</span>{alert.feedback}</p>}

          {onRespond && !closed && (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                {alert.status === 'active' && <Btn size="sm" variant="primary" loading={busy === 'acknowledge'} onClick={() => act('acknowledge')}><Check className="size-3.5" />Acknowledge</Btn>}
                <Btn size="sm" variant="subtle" loading={busy === 'resolve'} onClick={() => act('resolve')}>Mark resolved</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setReasonOpen((o) => !o)}><X className="size-3.5" />False alarm</Btn>
              </div>
              {reasonOpen && (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void act('false_alarm', reason || undefined); }}>
                  <input id={`fa-${alert.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why? e.g. torque rise was a bit change"
                    className="h-8 flex-1 rounded-md border border-line-strong bg-inset px-2.5 text-[12.5px] focus:border-accent focus:outline-none" />
                  <Btn size="sm" variant="danger" type="submit" loading={busy === 'false_alarm'}>Record</Btn>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
