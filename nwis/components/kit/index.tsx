'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn, depth, EVENT_LABEL, eventColor, otherUnit, SEVERITY_COLOR } from '@/lib/format';
import { useApp } from '@/lib/store';
import type { EventType, Severity } from '@/lib/types';

export function Panel({ className, children, as: As = 'section' }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article' }) {
  return <As className={cn('panel', className)}>{children}</As>;
}

export function PanelHeader({ title, eyebrow, right, className }: { title: ReactNode; eyebrow?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex items-start justify-between gap-3 px-4 pt-3.5 pb-2.5', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="label-caps mb-0.5">{eyebrow}</div>}
        <h2 className="font-display text-[15px] font-semibold tracking-wide text-fg truncate">{title}</h2>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'subtle'; size?: 'sm' | 'md'; loading?: boolean };
export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn({ variant = 'outline', size = 'md', loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none select-none',
        size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-9 px-3.5 text-[13.5px]',
        variant === 'primary' && 'bg-accent text-accent-fg hover:brightness-110',
        variant === 'outline' && 'border border-line-strong bg-panel hover:bg-panel-2 text-fg',
        variant === 'ghost' && 'hover:bg-panel-2 text-muted-fg hover:text-fg',
        variant === 'subtle' && 'bg-panel-2 hover:bg-inset text-fg border border-line',
        variant === 'danger' && 'border border-[color-mix(in_oklab,var(--r-crit)_45%,transparent)] text-[var(--r-crit)] hover:bg-[color-mix(in_oklab,var(--r-crit)_10%,transparent)]',
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
});

export function SeverityPill({ severity, className }: { severity: Severity; className?: string }) {
  const c = SEVERITY_COLOR[severity];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider', className)}
      style={{ color: c, background: `color-mix(in oklab, ${c} 14%, transparent)` }}>
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {severity}
    </span>
  );
}

export function EventTag({ type, className, count }: { type: EventType | string; className?: string; count?: number }) {
  const c = eventColor(type);
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap', className)}
      style={{ borderColor: `color-mix(in oklab, ${c} 40%, transparent)`, color: c, background: `color-mix(in oklab, ${c} 9%, transparent)` }}>
      <span className="size-2 rotate-45 rounded-[2px]" style={{ background: c }} />
      {EVENT_LABEL[type as EventType] ?? type}
      {count != null && <span className="readout opacity-80">×{count}</span>}
    </span>
  );
}

/** Depth in the viewer's unit, with the other unit on hover. */
export function Depth({ ft, className, decimals }: { ft: number | null | undefined; className?: string; decimals?: number }) {
  const unit = useApp((s) => s.unit);
  return <span className={cn('readout', className)} title={otherUnit(ft, unit)}>{depth(ft, unit, { decimals })}</span>;
}

export function Segmented<T extends string | number>({ value, options, onChange, size = 'md', className }: {
  value: T; options: Array<{ value: T; label: ReactNode }>; onChange: (v: T) => void; size?: 'sm' | 'md'; className?: string;
}) {
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-lg border border-line bg-inset p-0.5', className)}>
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={cn('rounded-md font-medium transition-colors', size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-2.5 text-[12.5px]',
            o.value === value ? 'bg-panel text-fg shadow-sm ring-1 ring-line' : 'text-muted-fg hover:text-fg')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="flex items-center gap-2 p-6 text-muted-fg"><Loader2 className="size-4 animate-spin" /> {label}…</div>;
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="m-4 rounded-lg border border-[color-mix(in_oklab,var(--r-crit)_40%,transparent)] bg-[color-mix(in_oklab,var(--r-crit)_7%,transparent)] p-3 text-[13px]">
      <div className="font-semibold text-[var(--r-crit)]">Could not load this data</div>
      <div className="mt-0.5 text-muted-fg">{message}</div>
      {onRetry && <Btn size="sm" className="mt-2" onClick={onRetry}>Try again</Btn>}
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
      {icon && <div className="mb-1 text-faint">{icon}</div>}
      <div className="font-display text-[15px] font-semibold">{title}</div>
      {children && <div className="max-w-sm text-[13px] text-muted-fg">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="label-caps">{label}</div>
      <div className="readout mt-0.5 text-[22px] font-medium leading-tight" style={tone ? { color: tone } : undefined}>{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-muted-fg truncate">{sub}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1">
      <span className="label-caps">{label}</span>
      {children}
      {hint && <span className="text-[11.5px] text-faint">{hint}</span>}
    </label>
  );
}

export const inputCls = 'h-9 w-full rounded-lg border border-line-strong bg-inset px-3 text-[13.5px] text-fg placeholder:text-faint focus:border-accent focus:outline-none';
