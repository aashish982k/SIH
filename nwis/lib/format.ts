import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { EventType, RiskType, Severity } from './types';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export const FT_PER_M = 3.28084;

/** Depth in the viewer's unit. Input is always feet (the backend's canonical unit). */
export function depth(ft: number | null | undefined, unit: 'm' | 'ft', opts: { suffix?: boolean; decimals?: number } = {}): string {
  if (ft == null || !isFinite(ft)) return '—';
  const v = unit === 'm' ? ft / FT_PER_M : ft;
  const s = v.toLocaleString('en-IN', { maximumFractionDigits: opts.decimals ?? 0, minimumFractionDigits: opts.decimals ?? 0 });
  return opts.suffix === false ? s : `${s} ${unit}`;
}

export function otherUnit(ft: number | null | undefined, unit: 'm' | 'ft'): string {
  return depth(ft, unit === 'm' ? 'ft' : 'm');
}

export const EVENT_LABEL: Record<EventType, string> = {
  mud_loss: 'Mud loss', kick: 'Kick', stuck_pipe: 'Stuck pipe', tight_hole: 'Tight hole', overpressure: 'Overpressure',
  wellbore_instability: 'Instability', cementing_issue: 'Cementing', fishing: 'Fishing', other: 'Other',
};

export const RISK_ORDER: RiskType[] = ['stuck_pipe', 'mud_loss', 'kick', 'overpressure', 'tight_hole', 'wellbore_instability'];

export const eventColor = (t: EventType | string | null | undefined) => `var(--ev-${t ?? 'other'})`;

export const SEVERITY_COLOR: Record<Severity, string> = { low: 'var(--r-low)', medium: 'var(--r-med)', high: 'var(--r-high)', critical: 'var(--r-crit)' };

export function riskLevel(p: number): Severity {
  return p >= 0.8 ? 'critical' : p >= 0.6 ? 'high' : p >= 0.35 ? 'medium' : 'low';
}

export const pct = (p: number | null | undefined) => (p == null ? '—' : `${Math.round(p * 100)}%`);

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const OUTCOME_LABEL: Record<string, string> = { resolved: 'Worked', partial: 'Partly worked', failed: 'Did not work' };
export const OUTCOME_COLOR: Record<string, string> = { resolved: 'var(--r-low)', partial: 'var(--r-med)', failed: 'var(--r-crit)' };

/** Readable label colour on top of a formation fill. */
export function textOn(hex: string): string {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#111' : '#f3f5f7';
}
