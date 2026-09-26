'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useApp } from '@/lib/store';
import { useSize } from '@/hooks/useSize';
import { Btn, Depth, Empty, ErrorNote, EventTag, Panel, PanelHeader, SeverityPill, Spinner, Stat } from '@/components/kit';
import { cn, depth, EVENT_LABEL, eventColor, fmtDate, FT_PER_M, OUTCOME_COLOR, OUTCOME_LABEL, textOn } from '@/lib/format';
import type { DrillEvent, WellDetail } from '@/lib/types';

export default function WellPage() {
  const { id } = useParams<{ id: string }>();
  const { unit, setActiveWell } = useApp();
  const { data: w, error, reload } = useApi<WellDetail>(`/wells/${id}`);
  const [focus, setFocus] = useState<string | null>(null);
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!w) return <Spinner label="Loading well" />;
  const td = w.status === 'drilling' ? w.currentDepthFt : w.totalDepthFt;
  const maxInc = Math.max(0, ...w.surveys.map((s) => s.inc));
  const disp = w.surveys.length ? Math.hypot(w.surveys[w.surveys.length - 1].north, w.surveys[w.surveys.length - 1].east) : 0;

  return (
    <div className="grid gap-4">
      <Panel className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
        <div>
          <div className="label-caps">{w.field} · {w.block}</div>
          <h1 className="font-display text-[28px] font-bold leading-tight">{w.name}</h1>
          <div className="text-[12.5px] capitalize text-muted-fg">{w.wellType} · {w.profile}{w.pad ? ` from pad ${w.pad}` : ''} · {w.status}</div>
        </div>
        <Stat label={w.status === 'drilling' ? 'Bit depth' : 'Total depth'} value={depth(td, unit)} sub={depth(td, unit === 'm' ? 'ft' : 'm')} />
        <Stat label="Problems" value={w.events.length} sub={`${w.events.filter((e) => e.severity === 'high' || e.severity === 'critical').length} high or critical`} />
        <Stat label="NPT" value={`${w.totalNptHours} h`} />
        <Stat label="Max inclination" value={`${maxInc.toFixed(1)}°`} sub={`${depth(disp, unit)} displacement`} />
        <Stat label="Spud" value={<span className="text-[17px]">{fmtDate(w.spudDate)}</span>} sub={w.completionDate ? `completed ${fmtDate(w.completionDate)}` : undefined} />
        <div className="ml-auto flex gap-2">
          <Link href="/offsets"><Btn onClick={() => setActiveWell(w.id)}>Offsets of {w.name}</Btn></Link>
          {w.status === 'drilling' && <Link href="/"><Btn variant="primary" onClick={() => setActiveWell(w.id)}>Live view</Btn></Link>}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Panel className="flex flex-col">
          <PanelHeader eyebrow="Formations · casing · problems" title="Well log" />
          <WellLog well={w} unit={unit} focus={focus} onFocus={setFocus} />
        </Panel>

        <div className="grid content-start gap-4">
          <Panel>
            <PanelHeader eyebrow={`${w.events.length} recorded`} title="Problems while drilling" />
            {w.events.length === 0 ? <Empty title="No problems recorded">This well was drilled without recorded incidents.</Empty> : (
              <div className="border-t border-line">
                {w.events.map((e) => <EventRow key={e.id} e={e} on={focus === e.id} onClick={() => setFocus(e.id === focus ? null : e.id)} />)}
              </div>
            )}
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Casing & cement" />
              <table className="w-full text-[12.5px]">
                <tbody>
                  {w.casing.map((c) => {
                    const cem = w.cement.find((x) => x.casing === c.size);
                    return (
                      <tr key={c.id} className="border-t border-line">
                        <td className="px-4 py-2 font-semibold">{c.size}</td>
                        <td className="py-2 capitalize text-muted-fg">{c.type}</td>
                        <td className="py-2 text-muted-fg">{c.grade} · {c.weight} lb/ft</td>
                        <td className="py-2"><Depth ft={c.shoeMd} /></td>
                        <td className="px-4 py-2 text-right" style={{ color: cem?.result === 'poor' || cem?.result === 'failed' ? 'var(--r-crit)' : 'var(--fg-muted)' }}>{cem?.result ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Panel>
            <Panel>
              <PanelHeader title="Mud program" />
              <table className="w-full text-[12.5px]">
                <tbody>
                  {w.mud.map((m) => (
                    <tr key={m.fromFt} className="border-t border-line">
                      <td className="px-4 py-2"><Depth ft={m.fromFt} /> – <Depth ft={m.toFt} /></td>
                      <td className="py-2 text-muted-fg">{m.type}</td>
                      <td className="py-2 readout">{m.weightPpg.toFixed(1)} ppg</td>
                      <td className="px-4 py-2 text-right readout" style={{ color: m.lossBbl ? 'var(--ev-mud_loss)' : 'var(--fg-faint)' }}>{m.lossBbl ? `${Math.round(m.lossBbl)} bbl lost` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
          {w.documents.length > 0 && (
            <Panel>
              <PanelHeader title="Source documents" />
              <div className="border-t border-line">
                {w.documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 border-b border-line px-4 py-2 text-[13px] last:border-b-0">
                    <FileText className="size-4 text-faint" /><span className="font-medium">{d.title}</span>
                    <span className="text-faint">{d.document_type} · {d.page_count} pages · {fmtDate(d.document_date)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function EventRow({ e, on, onClick }: { e: DrillEvent; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('grid w-full gap-1 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-panel-2', on && 'bg-accent-soft')}>
      <div className="flex flex-wrap items-center gap-2">
        <EventTag type={e.type} /><SeverityPill severity={e.severity} /><Depth ft={e.depthMd} className="text-[13px]" />
        <span className="text-[12.5px] text-muted-fg">{e.formation}</span>
        <span className="ml-auto flex items-center gap-3 text-[12px]">
          {e.outcomeRating && <span style={{ color: OUTCOME_COLOR[e.outcomeRating] }}>{OUTCOME_LABEL[e.outcomeRating]}</span>}
          {e.nptHours != null && <span className="readout text-faint">{e.nptHours} h NPT</span>}
        </span>
      </div>
      <p className="text-[13px]">{e.description}</p>
      {on && (
        <div className="mt-1 grid gap-1 text-[12.5px] text-muted-fg">
          {e.cause && <p><span className="label-caps mr-1">Cause</span>{e.cause}</p>}
          {e.mitigation && <p><span className="label-caps mr-1">Did</span>{e.mitigation}</p>}
          {e.outcome && <p><span className="label-caps mr-1">Result</span>{e.outcome}</p>}
          {e.lessons && <p className="rounded-md bg-panel-2 p-2 text-fg"><span className="label-caps mr-1">Lesson</span>{e.lessons}</p>}
          {e.sourceDocumentTitle && <p className="flex items-center gap-1 text-faint"><FileText className="size-3" />{e.sourceDocumentTitle}{e.sourcePage ? `, page ${e.sourcePage}` : ''}</p>}
        </div>
      )}
    </button>
  );
}

function WellLog({ well, unit, focus, onFocus }: { well: WellDetail; unit: 'm' | 'ft'; focus: string | null; onFocus: (id: string) => void }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const H = 760;
  const bottom = Math.max(well.totalDepthFt ?? 0, well.plannedTdFt ?? 0, ...well.formations.map((f) => f.bottomMd ?? 0));
  const y = (ft: number) => 16 + (ft / bottom) * (H - 32);
  const W = Math.max(320, width);
  const step = unit === 'm' ? 500 * FT_PER_M : 1000;
  const x0 = 48, fmW = 110, csgX = x0 + fmW + 16;
  const drilled = well.status === 'drilling' ? well.currentDepthFt ?? 0 : well.totalDepthFt ?? bottom;

  return (
    <div ref={ref} className="px-2 pb-3">
      {width > 0 && (
        <svg width={W} height={H} role="img" aria-label={`Well log of ${well.name}`}>
          {Array.from({ length: Math.floor(bottom / step) + 1 }, (_, i) => i * step).map((d) => (
            <g key={d}>
              <line x1={x0 - 4} x2={W} y1={y(d)} y2={y(d)} stroke="var(--grid)" />
              <text x={x0 - 8} y={y(d) + 3.5} fontSize="10.5" textAnchor="end" fill="var(--fg-faint)" className="readout">{depth(d, unit, { suffix: false })}</text>
            </g>
          ))}
          {well.formations.map((f) => {
            const h = y(f.bottomMd ?? bottom) - y(f.topMd);
            return (
              <g key={f.name}>
                <rect x={x0} y={y(f.topMd)} width={fmW} height={h} fill={f.color} fillOpacity={f.predicted ? 0.5 : 0.9} />
                {h > 16 && <text x={x0 + 5} y={y(f.topMd) + 12} fontSize="10.5" fontWeight="600" fill={textOn(f.color)}>{f.name.replace(' Sandstone', ' Sst').replace(' Limestone', ' Lst')}</text>}
              </g>
            );
          })}
          {drilled < bottom && <rect x={x0} y={y(drilled)} width={fmW} height={y(bottom) - y(drilled)} fill="var(--panel)" fillOpacity="0.7" />}
          {/* casing strings as nested lines with shoe triangles */}
          {well.casing.map((c, i) => {
            const cx = csgX + i * 7;
            return (
              <g key={c.id}>
                <line x1={cx} x2={cx} y1={y(c.topMd)} y2={y(c.shoeMd)} stroke="var(--fg-muted)" strokeWidth="2" />
                <path d={`M${cx} ${y(c.shoeMd)} l5 0 l-5 -7 z`} fill="var(--fg-muted)" />
              </g>
            );
          })}
          <text x={csgX} y={12} fontSize="9.5" fill="var(--fg-faint)" className="label-caps">CASING</text>
          {(() => { let lastY = -99; return well.events.map((e) => {
            const cx = csgX + well.casing.length * 7 + 18, cy = y(e.depthMd);
            const ly = Math.max(cy, lastY + 15); lastY = ly;
            return (
              <g key={e.id} onClick={() => onFocus(e.id)} className="cursor-pointer" role="button" aria-label={`${EVENT_LABEL[e.type]} at ${depth(e.depthMd, unit)}`}>
                <line x1={x0 + fmW} x2={cx} y1={cy} y2={cy} stroke={eventColor(e.type)} strokeOpacity="0.5" />
                <rect x={cx - 5} y={cy - 5} width="10" height="10" transform={`rotate(45 ${cx} ${cy})`} fill={eventColor(e.type)} stroke={focus === e.id ? 'var(--fg)' : 'var(--panel)'} strokeWidth={focus === e.id ? 2 : 1.2} />
                <text x={cx + 12} y={ly + 4} fontSize="11" fill={focus === e.id ? 'var(--fg)' : 'var(--fg-muted)'}>{EVENT_LABEL[e.type]} · {depth(e.depthMd, unit)}</text>
              </g>
            );
          }); })()}
        </svg>
      )}
    </div>
  );
}
