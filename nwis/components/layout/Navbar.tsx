'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  LayoutDashboard, Map, BookOpen, AlertTriangle, Settings,
  Bell, ChevronDown, Menu, X, Wifi, WifiOff,
  Activity, LogIn, LogOut, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/appStore';
import { cn, getRiskLabel, formatDepth } from '@/lib/utils';
import { DecodeText } from '@/components/motion/DecodeText';
import { MOCK_WELLS } from '@/lib/mock/wells';
import type { Alert } from '@/lib/types';

// ─── Nav Links ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/map',         label: 'Map View',    icon: Map },
  { href: '/knowledge',   label: 'Knowledge',   icon: BookOpen },
  { href: '/risk',        label: 'Risk & Alerts', icon: AlertTriangle },
  { href: '/upload',      label: 'Upload Report', icon: Upload },
];

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

// ─── Alert Popover Item ────────────────────────────────────────────────────────
function AlertItem({ alert }: { alert: Alert }) {
  return (
    <Link
      href="/risk"
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors',
        'flex items-start gap-3 group'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 w-2 h-2 rounded-full shrink-0',
          alert.riskLevel === 'high' || alert.riskLevel === 'critical'
            ? 'bg-[var(--risk-high)]' : 'bg-[var(--risk-medium)]'
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
          {alert.message}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
          {timeFormatter.format(new Date(alert.timestamp))}
        </p>
      </div>
    </Link>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const {
    activeWell, liveDepthFt, liveRiskLevel,
    unreadAlertCount, alerts, isRTMACConnected, isAdmin, user,
    markAllRead, setActiveWell, logout
  } = useAppStore();

  const newAlerts = alerts.filter(a => a.status === 'new').slice(0, 5);

  // GSAP entrance: bar slides down once on mount (skipped for reduced motion).
  useGSAP(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from(headerRef.current, {
        yPercent: -100,
        duration: 0.7,
        ease: 'power3.out',
      });
    });
  }, { scope: headerRef });

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <header ref={headerRef} className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* ── Logo ─────────────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="NWIS home">
            <div className="flex flex-col">
              <span className="font-sans font-bold text-2xl text-primary tracking-tight">NWIS</span>
            </div>
          </Link>

          {/* ── Desktop Nav ───────────────────────────────────────────────── */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                    'focus-visible:ring-2 focus-visible:ring-ring outline-none',
                    active
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon aria-hidden="true" className="w-4 h-4" />
                  {label}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/25"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                aria-current={pathname === '/admin' ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring outline-none',
                  pathname === '/admin'
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Settings aria-hidden="true" className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>

          {/* ── Right: Active Well Chip + Alerts + Avatar ─────────────────── */}
          <div className="flex items-center gap-2">

            {/* Active Well Chip */}
            {activeWell && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Active well: ${activeWell.name}. Switch well`}
                  className={cn(
                    'hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border',
                    'bg-card hover:bg-muted transition-colors text-sm font-medium cursor-pointer outline-none',
                    'focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                >
                  {/* Live connection dot */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isRTMACConnected ? 'bg-[var(--risk-low)] pulse-live' : 'bg-muted-foreground'
                      )}
                    />
                    <DecodeText text={activeWell.name} className="text-foreground max-w-[120px] truncate" chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-" />
                    <Separator orientation="vertical" className="h-3" />
                    <span className="font-mono text-xs text-muted-foreground tabular-nums" data-depth>
                      {formatDepth(liveDepthFt)} ft
                    </span>
                    {/* Risk badge */}
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md',
                        liveRiskLevel === 'low' && 'bg-risk-low text-[var(--risk-low)]',
                        liveRiskLevel === 'medium' && 'bg-risk-medium text-[var(--risk-medium)]',
                        liveRiskLevel === 'high' && 'bg-risk-high text-[var(--risk-high)]',
                        liveRiskLevel === 'critical' && 'bg-risk-critical text-[var(--risk-critical)]',
                      )}
                    >
                      {getRiskLabel(liveRiskLevel)}
                    </span>
                    <ChevronDown aria-hidden="true" className="w-3 h-3 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Switch Active Well</p>
                  </div>
                  <DropdownMenuSeparator />
                  {MOCK_WELLS.filter(w => w.status === 'active').map(well => (
                    <DropdownMenuItem
                      key={well.id}
                      onClick={() => setActiveWell(well.id)}
                      className={cn('cursor-pointer', well.id === activeWell.id && 'bg-primary/5')}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--risk-low)]" />
                        <span className="flex-1">{well.name}</span>
                        {well.id === activeWell.id && (
                          <Badge variant="outline" className="text-[10px] py-0">Active</Badge>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* RTMAC Connection status (mobile/small) */}
            <div className="flex md:hidden items-center" aria-live="polite">
              {isRTMACConnected
                ? <Wifi aria-label="Connected" className="w-4 h-4 text-[var(--risk-low)]" />
                : <WifiOff aria-label="Disconnected" className="w-4 h-4 text-muted-foreground" />
              }
            </div>

            {/* Alert Bell */}
            <Popover>
              <PopoverTrigger
                aria-label={`Alerts${unreadAlertCount > 0 ? ` — ${unreadAlertCount} unread` : ''}`}
                className={cn(
                  "relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <Bell aria-hidden="true" className="w-4 h-4" />
                  <AnimatePresence>
                    {unreadAlertCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center"
                      >
                        {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Bell aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">Alerts</span>
                    {unreadAlertCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{unreadAlertCount} new</Badge>
                    )}
                  </div>
                  {unreadAlertCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded outline-none"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border/50 px-2 py-1">
                  {newAlerts.length > 0 ? (
                    newAlerts.map(alert => <AlertItem key={alert.id} alert={alert} />)
                  ) : (
                    <div className="py-8 text-center">
                      <Activity aria-hidden="true" className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No new alerts</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-border px-4 py-2.5">
                  <Link href="/risk" className="text-xs text-primary font-medium hover:underline">
                    View all alerts →
                  </Link>
                </div>
              </PopoverContent>
            </Popover>

            {/* User Avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className={cn(
                  "inline-flex items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {isAdmin ? 'AD' : 'EG'}
                    </AvatarFallback>
                  </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">
                    {isAdmin ? 'Administrator' : user ? (user.name || 'Engineer') : 'Guest'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'Oil India Limited' : user?.email || 'Not signed in'}
                  </p>
                </div>
                <DropdownMenuSeparator />
                {!user && (
                  <DropdownMenuItem onClick={() => router.push('/login')} className="cursor-pointer">
                    <LogIn aria-hidden="true" className="w-3.5 h-3.5 mr-2" />
                    Login
                  </DropdownMenuItem>
                )}
                {user && !isAdmin && (
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    <LogOut aria-hidden="true" className="w-3.5 h-3.5 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer">
                      <Settings aria-hidden="true" className="w-3.5 h-3.5 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                      <LogOut aria-hidden="true" className="w-3.5 h-3.5 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                aria-label="Open navigation menu"
                className={cn(
                  "lg:hidden inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <Menu aria-hidden="true" className="w-4 h-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full">
                  {/* Mobile header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <span className="font-sans font-bold text-xl text-primary tracking-tight">NWIS</span>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)}>
                      <X aria-hidden="true" className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Active well (mobile) */}
                  {activeWell && (
                    <div className="mx-4 my-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Active Well</p>
                      <p className="font-semibold text-sm text-foreground">{activeWell.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatDepth(liveDepthFt)} ft</span>
                        <span className={cn(
                          'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
                          liveRiskLevel === 'high' || liveRiskLevel === 'critical'
                            ? 'bg-risk-high text-[var(--risk-high)]'
                            : 'bg-risk-medium text-[var(--risk-medium)]'
                        )}>
                          {getRiskLabel(liveRiskLevel)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Mobile nav links */}
                  <nav aria-label="Mobile" className="flex-1 px-3 py-2 space-y-1">
                    {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                      const active = pathname === href || pathname.startsWith(href + '/');
                      return (
                        <Link
                          key={href}
                          href={href}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                            active
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          )}
                        >
                          <Icon aria-hidden="true" className="w-4 h-4" />
                          {label}
                          {href === '/risk' && unreadAlertCount > 0 && (
                            <Badge variant="destructive" className="ml-auto h-4 text-[10px] px-1.5">
                              {unreadAlertCount}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        aria-current={pathname === '/admin' ? 'page' : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                          pathname === '/admin'
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <Settings aria-hidden="true" className="w-4 h-4" />
                        Admin
                      </Link>
                    )}
                  </nav>

                  {/* Mobile footer */}
                  <div className="px-4 py-4 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {isRTMACConnected
                        ? <><Wifi aria-hidden="true" className="w-3.5 h-3.5 text-[var(--risk-low)]" /><span>eRTMAC Connected</span></>
                        : <><WifiOff aria-hidden="true" className="w-3.5 h-3.5" /><span>Disconnected</span></>
                      }
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
