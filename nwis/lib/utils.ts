import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RiskLevel, IncidentType } from '@/lib/types';

// ─── shadcn canonical cn() ───────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Risk Utilities ───────────────────────────────────────────────────────────

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low':      return 'var(--risk-low)';
    case 'medium':   return 'var(--risk-medium)';
    case 'high':     return 'var(--risk-high)';
    case 'critical': return 'var(--risk-critical)';
  }
}

export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'low':      return 'Low';
    case 'medium':   return 'Medium';
    case 'high':     return 'High';
    case 'critical': return 'Critical';
  }
}

export function getRiskBgClass(level: RiskLevel): string {
  switch (level) {
    case 'low':      return 'bg-risk-low text-[var(--risk-low)]';
    case 'medium':   return 'bg-risk-medium text-[var(--risk-medium)]';
    case 'high':     return 'bg-risk-high text-[var(--risk-high)]';
    case 'critical': return 'bg-risk-critical text-[var(--risk-critical)]';
  }
}

export function getRiskBorderClass(level: RiskLevel): string {
  switch (level) {
    case 'low':      return 'border-risk-low';
    case 'medium':   return 'border-risk-medium';
    case 'high':     return 'border-risk-high';
    case 'critical': return 'border-risk-critical';
  }
}

// ─── Incident Type Utilities ──────────────────────────────────────────────────

export function getIncidentLabel(type: IncidentType): string {
  const map: Record<IncidentType, string> = {
    mud_loss:   'Lost Circulation',
    kick:       'Well Kick',
    stuck_pipe: 'Stuck Pipe',
    npt:        'NPT Event',
    blowout:    'Blowout',
    washout:    'Washout',
  };
  return map[type] ?? type;
}

export function getIncidentColor(type: IncidentType): string {
  const map: Record<IncidentType, string> = {
    mud_loss:   '#2E86AB',
    kick:       '#DC2626',
    stuck_pipe: '#D97706',
    npt:        '#7C3AED',
    blowout:    '#991B1B',
    washout:    '#0891B2',
  };
  return map[type] ?? '#64748B';
}

// ─── Number Formatters ────────────────────────────────────────────────────────

export function formatDepth(ft: number): string {
  return ft.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Geo Utilities ────────────────────────────────────────────────────────────

/** Haversine formula — returns distance in km */
export function getDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
  if (mins < 60) return rtf.format(-mins, 'minute');
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return rtf.format(-hrs, 'hour');
  const days = Math.floor(hrs / 24);
  return rtf.format(-days, 'day');
}

// Shared Intl formatter (locale-aware, created once).
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'short', day: 'numeric',
});

export function formatDate(isoString: string): string {
  return dateFormatter.format(new Date(isoString));
}
