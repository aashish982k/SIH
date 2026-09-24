'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Droplet, 
  Wifi, 
  Bell, 
  ChevronRight, 
  ShieldCheck, 
  User, 
  Sparkles,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';

export function TacticalTopBar() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>('04:32 IST');
  const { unreadAlertCount } = useAppStore();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isHeroLanding = pathname === '/';
  const isBasinSelector = pathname === '/basin';

  return (
    <header className="sticky top-0 z-50 w-full h-[49px] bg-[#070A0E] border-b border-[#141C26] px-4 md:px-6 flex items-center justify-between text-xs select-none">
      {/* Brand Identity / Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded bg-[#F59E0B] text-black font-bold font-mono text-xs flex items-center justify-center tracking-tighter shadow-sm group-hover:scale-105 transition-transform">
            N
          </div>
          <span className="font-mono font-bold tracking-widest text-white text-sm">NWIS</span>
        </Link>

        <span className="text-[#334155] font-mono">/</span>

        {/* Dynamic Context Breadcrumb */}
        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[#8090A0]">
          {isHeroLanding ? (
            <span className="text-[#94A3B8]">01 — DECISION SUPPORT FOR THE SUBSURFACE</span>
          ) : isBasinSelector ? (
            <span className="text-[#94A3B8]">02 — NATIONAL SUBSURFACE INTELLIGENCE / BASIN SELECTOR</span>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/basin" className="hover:text-white transition-colors">UPPER ASSAM BASIN</Link>
              <ChevronRight className="w-3 h-3 text-[#475569]" />
              <span className="text-[#F59E0B] font-semibold">
                {pathname.includes('/overview') ? 'FIELD OVERVIEW' :
                 pathname.includes('/risk') ? 'LIVE SIMULATION' :
                 pathname.includes('/compare') ? 'WELL COMPARISON' :
                 pathname.includes('/knowledge') ? 'KNOWLEDGE SEARCH' :
                 pathname.includes('/upload') ? 'DOCUMENT INGESTION' : 'WORKSPACE'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Operational Status & Intelligence Indicators */}
      <div className="flex items-center gap-4">
        {/* Live Operational Clock */}
        <div className="flex items-center gap-2 font-mono text-[11px] text-[#7E8E9F] bg-[#0C121A] px-2.5 py-1 rounded border border-[#172230]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="hidden md:inline text-[#94A3B8]">OPERATIONAL INTELLIGENCE /</span>
          <span className="text-[#F59E0B] font-medium">{time}</span>
        </div>

        {/* Global Nav Shortcuts for quick jumping */}
        <div className="hidden lg:flex items-center gap-1 font-mono text-[11px]">
          <Link 
            href="/overview" 
            className={cn(
              "px-2.5 py-1 rounded transition-colors", 
              pathname === '/overview' ? "bg-[#162130] text-[#F59E0B]" : "text-[#7E8E9F] hover:text-white"
            )}
          >
            Overview
          </Link>
          <Link 
            href="/risk" 
            className={cn(
              "px-2.5 py-1 rounded transition-colors", 
              pathname === '/risk' ? "bg-[#162130] text-[#F59E0B]" : "text-[#7E8E9F] hover:text-white"
            )}
          >
            Live Drill
          </Link>
          <Link 
            href="/compare" 
            className={cn(
              "px-2.5 py-1 rounded transition-colors", 
              pathname === '/compare' ? "bg-[#162130] text-[#F59E0B]" : "text-[#7E8E9F] hover:text-white"
            )}
          >
            Offset Compare
          </Link>
          <Link 
            href="/knowledge" 
            className={cn(
              "px-2.5 py-1 rounded transition-colors", 
              pathname === '/knowledge' ? "bg-[#162130] text-[#F59E0B]" : "text-[#7E8E9F] hover:text-white"
            )}
          >
            Knowledge Base
          </Link>
        </div>

        {/* Engineer Profile Indicator */}
        <div className="flex items-center gap-2 border-l border-[#1A2634] pl-3">
          <div className="w-6 h-6 rounded-full bg-[#1B2738] border border-[#2D3E54] flex items-center justify-center text-[10px] font-mono text-[#F59E0B] font-bold">
            AS
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-[11px] font-semibold text-white leading-tight">Aarav Shah</div>
            <div className="text-[9px] text-[#64748B] font-mono leading-tight">Drilling Engineering</div>
          </div>
        </div>
      </div>
    </header>
  );
}
