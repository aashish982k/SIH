'use client';

import { useMemo } from 'react';
import { useSize } from '@/hooks/useSize';
import { depth, EVENT_LABEL, eventColor, FT_PER_M, RISK_ORDER, textOn } from '@/lib/format';
import type { Formation, HazardProfile, RiskType } from '@/lib/types';

interface Props {
  profile: HazardProfile;
  bitFt: number;
  unit: 'm' | 'ft';
  aboveFt?: number;
  belowFt?: number;
  lookaheadFt?: number;
}

/**
 * Vertical depth track: prognosed formations, offset-derived hazard likelihood per
 * risk type (one lane each), hazard zones with their evidence count, and the bit.
 */
export function DepthTrack({ profile, bitFt, unit, aboveFt = 350, belowFt = 1650, lookaheadFt = 400 }: Props) {
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const top = Math.max(0, bitFt - aboveFt);
  const base = bitFt + belowFt;
  const H = Math.max(420, height);
  const W = Math.max(300, width);
  const HEAD = 78; // room for the rotated lane headers
  const y = (ft: number) => ((ft - top) / (base - top)) * (H - HEAD - 12) + HEAD;

  const cols = { scale: 0, scaleW: 44, fm: 46, fmW: 78, lanes: 130, laneW: 13, laneGap: 2 };
  const lanesEnd = cols.lanes + RISK_ORDER.length * (cols.laneW + cols.laneGap);

  const ticks = useMemo(() => {
    const stepFt = unit === 'm' ? 100 * FT_PER_M : 250;
    const out: number[] = [];
    for (let d = Math.ceil(top / stepFt) * stepFt; d <= base; d += stepFt) out.push(d);
    return out;
  }, [top, base, unit]);

  const bins = profile.bins.filter((b) => b.depth + profile.binFt >= top && b.depth <= base);
  const zones = profile.zones.filter((z) => z.baseFt >= top && z.topFt <= base);
  const fms = profile.formations.filter((f) => (f.bottomTvd ?? Infinity) >= top && f.topTvd <= base);

  // Lay zone labels out without overlapping
  const labels = useMemo(() => {
    const placed: Array<{ z: (typeof zones)[number]; ly: number }> = [];
    [...zones].sort((a, b) => a.topFt - b.topFt).forEach((z) => {
      let ly = Math.max(y(z.topFt) + 11, HEAD + 10);
      for (const p of placed) if (Math.abs(p.ly - ly) < 30) ly = p.ly + 30;
      if (Math.abs(ly - y(bitFt)) < 22 || Math.abs(ly + 12 - y(bitFt)) < 14) ly = y(bitFt) + 26; // keep clear of the bit tag
      placed.push({ z, ly });
    });
    return placed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, top, base, H, bitFt]);

  return (
    <div ref={ref} className="relative h-full min-h-[420px] w-full">
      {width > 0 && (
        <svg width={W} height={H} role="img" aria-label={`Depth track around the bit at ${depth(bitFt, unit)} showing formations and offset-well hazard likelihood`}>
          <defs>
            <pattern id="drilled" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--fg)" strokeOpacity="0.07" strokeWidth="3" />
            </pattern>
          </defs>

          {/* depth scale */}
          {ticks.map((d) => (
            <g key={d}>
              <line x1={cols.scaleW - 6} x2={W} y1={y(d)} y2={y(d)} stroke="var(--grid)" />
              <text x={cols.scaleW - 9} y={y(d) + 3.5} textAnchor="end" className="readout" fontSize="10.5" fill="var(--fg-faint)">
                {depth(d, unit, { suffix: false })}
              </text>
            </g>
          ))}

          {/* formations */}
          {fms.map((f: Formation) => {
            const y1 = y(Math.max(top, f.topTvd)), y2 = y(Math.min(base, f.bottomTvd ?? base));
            const h = y2 - y1;
            return (
              <g key={f.name}>
                <rect x={cols.fm} y={y1} width={cols.fmW} height={h} fill={f.color} fillOpacity="0.85" />
                {f.topTvd >= top && <line x1={cols.fm} x2={lanesEnd} y1={y(f.topTvd)} y2={y(f.topTvd)} stroke="var(--fg)" strokeOpacity="0.35" strokeDasharray={f.predicted ? '4 3' : undefined} />}
                {h > 26 && (
                  <text x={cols.fm + 6} y={y1 + 14} fontSize="11" fontWeight="600" fill={textOn(f.color)} className="font-display">
                    {f.name.replace(' Sandstone', ' Sst').replace(' Limestone', ' Lst').replace('Coal-Shale', 'C-Sh').replace('Arenaceous', 'Aren.')}
                  </text>
                )}
                {h > 42 && f.topTvd >= top && (
                  <text x={cols.fm + 6} y={y1 + 27} fontSize="10" fill={textOn(f.color)} fillOpacity="0.8" className="readout">{f.predicted ? 'prog. ' : ''}{depth(f.topTvd, unit)}</text>
                )}
              </g>
            );
          })}

          {/* hazard lanes */}
          {RISK_ORDER.map((k: RiskType, i) => {
            const x = cols.lanes + i * (cols.laneW + cols.laneGap);
            return (
              <g key={k}>
                <rect x={x} y={HEAD} width={cols.laneW} height={H - HEAD - 12} fill="var(--inset)" />
                {bins.map((b) => {
                  const p = b.p[k] ?? 0;
                  if (p < 0.05) return null;
                  return <rect key={b.depth} x={x} y={y(b.depth)} width={cols.laneW} height={Math.max(1, y(b.depth + profile.binFt) - y(b.depth))} fill={eventColor(k)} fillOpacity={Math.min(1, 0.12 + p * 1.6)} />;
                })}
              </g>
            );
          })}

          {/* zones */}
          {zones.map((z) => {
            const i = RISK_ORDER.indexOf(z.type);
            const x = cols.lanes + i * (cols.laneW + cols.laneGap);
            return <rect key={z.id} x={x - 1.5} y={y(z.topFt)} width={cols.laneW + 3} height={y(z.baseFt) - y(z.topFt)} fill="none" stroke={eventColor(z.type)} strokeWidth="1.6" rx="2" />;
          })}
          {labels.map(({ z, ly }) => {
            const ahead = z.topFt - bitFt;
            const past = z.baseFt < bitFt;
            return (
              <g key={z.id} opacity={past ? 0.45 : 1}>
                <line x1={lanesEnd + 2} x2={lanesEnd + 10} y1={y(z.topFt) + 4} y2={ly - 4} stroke={eventColor(z.type)} strokeOpacity="0.6" />
                <text x={lanesEnd + 12} y={ly - 1} fontSize="11.5" fontWeight="600" fill={eventColor(z.type)}>{EVENT_LABEL[z.type]} {Math.round(z.peakProbability * 100)}%</text>
                <text x={lanesEnd + 12} y={ly + 12} fontSize="10.5" fill="var(--fg-muted)">
                  {z.offsetsWithEvent}/{z.offsetsPenetrated} wells{!past && ahead > 0 ? ` · ${depth(ahead, unit)} ahead` : past ? ' · passed' : ' · at bit'}
                </text>
              </g>
            );
          })}

          {/* drilled interval + look-ahead window */}
          <rect x={cols.fm} y={HEAD} width={lanesEnd - cols.fm} height={Math.max(0, y(bitFt) - HEAD)} fill="url(#drilled)" />
          <rect x={cols.fm - 4} y={y(bitFt)} width={3} height={y(bitFt + lookaheadFt) - y(bitFt)} fill="var(--accent)" rx="1.5" />

          {/* bit */}
          <line x1={cols.scaleW - 6} x2={W} y1={y(bitFt)} y2={y(bitFt)} stroke="var(--accent)" strokeWidth="2" />
          <g transform={`translate(${W - 4}, ${y(bitFt)})`}>
            <rect x={-92} y={-10} width={92} height={20} rx="4" fill="var(--accent)" />
            <text x={-46} y={4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent-fg)" className="readout">BIT {depth(bitFt, unit)}</text>
          </g>

          {/* lane headers */}
          {RISK_ORDER.map((k, i) => (
            <text key={k} transform={`translate(${cols.lanes + i * (cols.laneW + cols.laneGap) + cols.laneW / 2 + 3.5}, ${HEAD - 5}) rotate(-90)`} fontSize="9.5" fill="var(--fg-muted)" className="font-display" fontWeight="600">
              {EVENT_LABEL[k].toUpperCase()}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
