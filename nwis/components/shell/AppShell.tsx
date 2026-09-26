'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, BarChart3, Bell, BookOpenText, ChevronDown, Database, FileStack, Layers, LogOut, Map as MapIcon, Moon, Sun, Radio,
} from 'lucide-react';
import { Logo } from './Logo';
import { useApp, useHydrated } from '@/lib/store';
import { useApi } from '@/hooks/useApi';
import { cn, depth } from '@/lib/format';
import { Segmented } from '@/components/kit';
import type { Meta, Well } from '@/lib/types';

const NAV = [
  { href: '/', label: 'Live well', icon: Activity },
  { href: '/offsets', label: 'Offset map', icon: MapIcon },
  { href: '/correlation', label: 'Correlation', icon: Layers },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpenText },
  { href: '/reports', label: 'Reports', icon: FileStack },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/wells', label: 'Well register', icon: Database },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { token, user, activeWellId, setActiveWell, logout, unit, setUnit, theme, setTheme } = useApp();
  const { data: wells } = useApi<Well[]>(token ? '/wells' : null, { refreshMs: 15000 });
  const { data: meta } = useApi<Meta>(token ? '/meta' : null);

  useEffect(() => { if (hydrated && !token) router.replace('/login'); }, [hydrated, token, router]);

  // Default to the first well that is drilling
  useEffect(() => {
    if (!wells?.length) return;
    if (!activeWellId || !wells.some((w) => w.id === activeWellId)) {
      setActiveWell((wells.find((w) => w.status === 'drilling') ?? wells[0]).id);
    }
  }, [wells, activeWellId, setActiveWell]);

  if (!hydrated || !token) return <div className="min-h-screen bg-bg" />;

  const active = wells?.find((w) => w.id === activeWellId);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[214px] shrink-0 flex-col border-r border-line bg-panel md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-4 pt-4 pb-5">
          <Logo />
          <div className="leading-tight">
            <div className="font-display text-[17px] font-bold tracking-wide">NWIS</div>
            <div className="text-[11px] text-faint">Nearby Wells Intelligence</div>
          </div>
        </Link>
        <nav className="grid gap-0.5 px-2.5" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const on = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={cn('group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors',
                  on ? 'bg-accent-soft text-fg' : 'text-muted-fg hover:bg-panel-2 hover:text-fg')}>
                <Icon className={cn('size-4', on ? 'text-accent' : 'text-faint group-hover:text-muted-fg')} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-2 border-t border-line p-3 text-[11.5px] text-faint">
          <Capability ok label="Local embeddings" detail={meta?.capabilities.embeddings.model} />
          <Capability ok={!!meta?.capabilities.groq} label={meta?.capabilities.groq ? 'Groq extraction & Q&A' : 'Groq not configured'} detail={meta?.capabilities.groqModel ?? 'Rules-based extraction'} />
          <p className="leading-snug">Synthetic Upper Assam dataset for demonstration.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] px-4 backdrop-blur">
          <div className="md:hidden"><Logo size={24} /></div>
          <WellSwitcher wells={wells ?? []} active={active} onPick={setActiveWell} unit={unit} />
          <div className="ml-auto flex items-center gap-2">
            <Segmented size="sm" value={unit} onChange={setUnit} options={[{ value: 'm', label: 'm' }, { value: 'ft', label: 'ft' }]} />
            <button aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="grid size-8 place-items-center rounded-lg text-muted-fg hover:bg-panel-2 hover:text-fg">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <div className="hidden items-center gap-2 border-l border-line pl-3 sm:flex">
              <div className="grid size-7 place-items-center rounded-full bg-panel-2 text-[11px] font-semibold">{user?.name?.split(' ').map((p) => p[0]).join('').slice(0, 2)}</div>
              <div className="leading-tight">
                <div className="text-[12.5px] font-medium">{user?.name}</div>
                <div className="text-[11px] capitalize text-faint">{user?.role}</div>
              </div>
              <button aria-label="Sign out" title="Sign out" onClick={() => { logout(); router.replace('/login'); }}
                className="ml-1 grid size-8 place-items-center rounded-lg text-faint hover:bg-panel-2 hover:text-fg"><LogOut className="size-4" /></button>
            </div>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden scroll-thin" aria-label="Main">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={cn('whitespace-nowrap rounded-md px-2.5 py-1 text-[12.5px]', (href === '/' ? pathname === '/' : pathname.startsWith(href)) ? 'bg-accent-soft text-fg' : 'text-muted-fg')}>{label}</Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1 p-4 lg:p-5">{children}</main>
      </div>
    </div>
  );
}

function Capability({ ok, label, detail }: { ok: boolean; label: string; detail?: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 size-1.5 shrink-0 rounded-full" style={{ background: ok ? 'var(--r-low)' : 'var(--fg-faint)' }} />
      <div className="min-w-0">
        <div className="text-muted-fg">{label}</div>
        {detail && <div className="truncate readout text-[10.5px]">{detail}</div>}
      </div>
    </div>
  );
}

function WellSwitcher({ wells, active, onPick, unit }: { wells: Well[]; active?: Well; onPick: (id: string) => void; unit: 'm' | 'ft' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const groups = useMemo(() => {
    const f = wells.filter((w) => `${w.name} ${w.field}`.toLowerCase().includes(q.toLowerCase()));
    return { live: f.filter((w) => w.status === 'drilling'), done: f.filter((w) => w.status !== 'drilling') };
  }, [wells, q]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex h-9 items-center gap-2.5 rounded-lg border border-line bg-panel px-3 hover:border-line-strong">
        {active?.status === 'drilling'
          ? <Radio className="size-3.5 text-[var(--r-low)]" />
          : <span className="size-2 rounded-full bg-faint" />}
        <span className="font-display text-[15px] font-semibold tracking-wide">{active?.name ?? 'Choose well'}</span>
        {active && <span className="hidden text-[12px] text-muted-fg sm:inline">{active.field}{active.status === 'drilling' && active.currentDepthFt ? ` · bit ${depth(active.currentDepthFt, unit)}` : ''}</span>}
        <ChevronDown className="size-3.5 text-faint" />
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-50 w-[320px] rounded-xl border border-line-strong bg-panel p-2 shadow-2xl">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a well or field"
            className="mb-2 h-8 w-full rounded-md border border-line bg-inset px-2.5 text-[13px] focus:border-accent focus:outline-none" />
          <div className="max-h-[360px] overflow-y-auto scroll-thin">
            {groups.live.length > 0 && <div className="label-caps px-2 py-1">Drilling now</div>}
            {groups.live.map((w) => <WellRow key={w.id} w={w} unit={unit} on={w.id === active?.id} pick={() => { onPick(w.id); setOpen(false); }} />)}
            <div className="label-caps px-2 pb-1 pt-2">Offset wells</div>
            {groups.done.map((w) => <WellRow key={w.id} w={w} unit={unit} on={w.id === active?.id} pick={() => { onPick(w.id); setOpen(false); }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function WellRow({ w, on, pick, unit }: { w: Well; on: boolean; pick: () => void; unit: 'm' | 'ft' }) {
  return (
    <button onClick={pick} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-panel-2', on && 'bg-accent-soft')}>
      <span className={cn('size-2 rounded-full', w.status === 'drilling' ? 'bg-[var(--r-low)]' : 'bg-line-strong')} />
      <span className="font-medium">{w.name}</span>
      <span className="text-[12px] text-faint">{w.field}</span>
      <span className="readout ml-auto text-[11.5px] text-muted-fg">{depth(w.status === 'drilling' ? w.currentDepthFt : w.totalDepthFt, unit)}</span>
    </button>
  );
}
