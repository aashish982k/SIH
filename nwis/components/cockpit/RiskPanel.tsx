'use client';

import { EVENT_LABEL, eventColor, pct, RISK_ORDER, riskLevel, SEVERITY_COLOR } from '@/lib/format';
import type { RiskSnapshot } from '@/lib/types';

/** Fused risk per type, split into what offset history says and what live data shows. */
export function RiskPanel({ risk }: { risk: RiskSnapshot | null }) {
  if (!risk) return <p className="px-4 pb-4 text-[13px] text-muted-fg">Start the eRTMAC replay to see live risk.</p>;
  const level = riskLevel(risk.overall);
  const rows = [...RISK_ORDER].sort((a, b) => risk.byType[b].fused - risk.byType[a].fused);
  const top = rows[0];

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-4">
        <Ring value={risk.overall} color={SEVERITY_COLOR[level]} />
        <div className="min-w-0">
          <div className="label-caps">Highest risk now</div>
          <div className="font-display text-[20px] font-semibold leading-tight" style={{ color: risk.overall >= 0.35 ? SEVERITY_COLOR[level] : undefined }}>
            {risk.overall < 0.2 ? 'Normal drilling' : EVENT_LABEL[top]}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted-fg">
            {risk.byType[top].reasons[0] ?? (risk.byType[top].prior > 0.25 ? 'Offset wells had trouble at this depth' : 'No abnormal trends')}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5">
        <div className="grid grid-cols-[1fr_64px_64px_44px] gap-2 text-[10.5px] text-faint">
          <span />
          <span className="label-caps !text-[10px]">Offsets</span>
          <span className="label-caps !text-[10px]">Live</span>
          <span className="label-caps !text-[10px] text-right">Risk</span>
        </div>
        {rows.map((k) => {
          const r = risk.byType[k];
          return (
            <div key={k} className="grid grid-cols-[1fr_64px_64px_44px] items-center gap-2" title={r.reasons.join('\n')}>
              <span className="flex items-center gap-1.5 text-[12.5px]">
                <span className="size-2 rotate-45 rounded-[2px]" style={{ background: eventColor(k) }} />{EVENT_LABEL[k]}
              </span>
              <Bar value={r.prior} color={eventColor(k)} hatched />
              <Bar value={r.live} color={eventColor(k)} />
              <span className="readout text-right text-[12.5px]" style={{ color: r.fused >= 0.35 ? SEVERITY_COLOR[riskLevel(r.fused)] : 'var(--fg-muted)' }}>{pct(r.fused)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ value, color, hatched }: { value: number; color: string; hatched?: boolean }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-inset">
      <div className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.max(2, value * 100)}%`, background: hatched ? `repeating-linear-gradient(135deg, ${color} 0 3px, color-mix(in oklab, ${color} 45%, transparent) 3px 6px)` : color, opacity: value < 0.02 ? 0.25 : 1 }} />
    </div>
  );
}

function Ring({ value, color }: { value: number; color: string }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={`Overall risk ${pct(value)}`}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--inset)" strokeWidth="7" />
      <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`} transform="rotate(-90 34 34)" style={{ transition: 'stroke-dasharray .7s ease' }} />
      <text x="34" y="39" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--fg)" className="readout">{Math.round(value * 100)}</text>
    </svg>
  );
}
