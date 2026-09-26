'use client';

import { useSize } from '@/hooks/useSize';
import type { Sample } from '@/lib/types';

interface Series { key: keyof Sample; label: string; color: string; dashed?: boolean }

/** One mud-log style strip: a parameter against time, drilling samples only. */
export function StripChart({ samples, series, unit, decimals = 0, height = 74, warn }: {
  samples: Sample[]; series: Series[]; unit: string; decimals?: number; height?: number; warn?: boolean;
}) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const pts = samples.filter((s) => s.rigState === 'drilling');
  const vals = pts.flatMap((s) => series.map((se) => Number(s[se.key])));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.05 || 1;
  lo -= pad; hi += pad;
  const W = Math.max(200, width), H = height;
  const x = (i: number) => (pts.length <= 1 ? W : (i / (pts.length - 1)) * (W - 4) + 2);
  const y = (v: number) => H - 4 - ((v - lo) / (hi - lo)) * (H - 8);
  const last = pts[pts.length - 1];

  return (
    <div className="grid grid-cols-[132px_1fr] items-stretch border-b border-line last:border-b-0">
      <div className="flex flex-col justify-center gap-0.5 border-r border-line px-3 py-2">
        {series.map((se) => (
          <div key={String(se.key)} className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted-fg">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: se.color, opacity: se.dashed ? 0.7 : 1 }} />{se.label}
            </span>
          </div>
        ))}
        <div className="readout mt-0.5 text-[17px] leading-none" style={warn ? { color: 'var(--r-high)' } : undefined}>
          {last ? series.map((se) => Number(last[se.key]).toFixed(decimals)).join(' / ') : '—'}
          <span className="ml-1 text-[11px] text-faint">{unit}</span>
        </div>
      </div>
      <div ref={ref} className="relative" style={{ height: H }}>
        {width > 0 && pts.length > 1 && (
          <svg width={W} height={H} aria-hidden="true">
            {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="var(--grid)" />)}
            {series.map((se) => {
              const d = pts.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(Number(s[se.key])).toFixed(1)}`).join('');
              return (
                <g key={String(se.key)}>
                  {!se.dashed && series.length === 1 && <path d={`${d}L${x(pts.length - 1)},${H}L${x(0)},${H}Z`} fill={se.color} fillOpacity="0.08" />}
                  <path d={d} fill="none" stroke={se.color} strokeWidth="1.5" strokeDasharray={se.dashed ? '4 3' : undefined} strokeLinejoin="round" />
                </g>
              );
            })}
            {last && series.map((se) => <circle key={String(se.key)} cx={x(pts.length - 1)} cy={y(Number(last[se.key]))} r="3" fill={se.color} stroke="var(--panel)" strokeWidth="1.5" />)}
          </svg>
        )}
      </div>
    </div>
  );
}
