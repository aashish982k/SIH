'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Activity, 
  GitCompare, 
  Search, 
  Bell, 
  FileText, 
  Map, 
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAppStore } from '@/store/appStore';

interface SidebarProps {
  currentWell?: string;
  activeBasin?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: number;
}

const BASIN_METADATA: Record<string, { name: string; letter: string; color: string; type: string }> = {
  rajasthan: { name: 'Barmer Basin', letter: 'B', color: '#F97316', type: 'Rajasthan / Onshore' },
  cambay: { name: 'Cambay Basin', letter: 'C', color: '#F59E0B', type: 'Gujarat / Onshore' },
  mumbai: { name: 'Mumbai High', letter: 'M', color: '#EF4444', type: 'Arabian Sea / Offshore' },
  assam: { name: 'Upper Assam Basin', letter: 'A', color: '#10B981', type: 'Assam / Onshore' },
  tripura: { name: 'Tripura Gas Fields', letter: 'T', color: '#EAB308', type: 'Tripura / Onshore' },
  kg: { name: 'KG Deepwater Basin', letter: 'K', color: '#A855F7', type: 'Krishna Godavari / Offshore' },
  cauvery: { name: 'Cauvery Basin', letter: 'C', color: '#06B6D4', type: 'Tamil Nadu / Onshore' },
};

export function TacticalSidebar({ 
  currentWell = "AA-17H / LAKWA",
  activeBasin: propActiveBasin
}: SidebarProps) {
  const pathname = usePathname();
  const [fieldMode, setFieldMode] = useState<'field' | 'office'>('office');
  const { selectedBasin } = useAppStore();

  const basinInfo = BASIN_METADATA[selectedBasin] || {
    name: propActiveBasin || 'National Basins (All)',
    letter: 'IN',
    color: '#10B981',
    type: 'India / Multi-Basin'
  };

  const navItems: NavItem[] = [
    { label: 'Field overview', href: '/overview', icon: LayoutDashboard },
    { label: 'Wells directory', href: '/wells', icon: Layers },
    { label: 'Map view', href: '/map', icon: Map },
    { label: 'Live simulation', href: '/risk', icon: Activity },
    { label: 'Knowledge search', href: '/knowledge', icon: Search },
    { label: 'Document upload', href: '/upload', icon: FileText },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-[#151D28] bg-[#070B10] flex flex-col justify-between select-none h-[calc(100vh-49px)] sticky top-[49px]">
      <div>
        {/* Active Workspace Pill */}
        <div className="p-3">
          <div className="text-[10px] font-mono tracking-widest uppercase text-[#5A6878] mb-1.5 px-1">
            Active Workspace
          </div>
          <Link 
            href="/basin"
            className="flex items-center justify-between p-2.5 rounded-lg bg-[#0C121B] border border-[#182332] hover:border-[#F59E0B]/50 transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                className="w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold border shrink-0"
                style={{
                  backgroundColor: `${basinInfo.color}25`,
                  color: basinInfo.color,
                  borderColor: `${basinInfo.color}50`,
                }}
              >
                {basinInfo.letter}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate group-hover:text-[#F59E0B] transition-colors">
                  {basinInfo.name}
                </div>
                <div className="text-[10px] text-[#64748B] font-mono truncate">{basinInfo.type}</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#5A6878] group-hover:text-white transition-colors shrink-0" />
          </Link>
        </div>

        {/* Workspace Navigation */}
        <div className="px-3 py-2">
          <div className="text-[10px] font-mono tracking-widest uppercase text-[#5A6878] mb-2 px-1">
            Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === '/overview' && pathname === '/');
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all",
                    isActive
                      ? "bg-[#141F2D] text-[#F59E0B] border-l-2 border-[#F59E0B] shadow-sm font-semibold"
                      : "text-[#8E9CAE] hover:text-white hover:bg-[#0E1520]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("w-4 h-4", isActive ? "text-[#F59E0B]" : "text-[#5A6878]")} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="w-4 h-4 rounded-full bg-[#EF4444] text-[10px] font-mono text-white flex items-center justify-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Tactical Drawer & Toggles */}
      <div className="p-3 border-t border-[#151D28] space-y-3">
        {/* Ask NWIS Action Button */}
        <Link 
          href="/knowledge"
          className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-[#0E1D24] to-[#0A161C] border border-[#00B4D8]/30 hover:border-[#00B4D8] transition-all group"
        >
          <div>
            <div className="text-[11px] font-semibold text-[#38BDF8] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
              Ask NWIS
            </div>
            <div className="text-[10px] text-[#5A7382]">Find the next right move</div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#38BDF8] group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Field View / Office Mode Switch */}
        <div className="flex items-center justify-between px-2 pt-1 text-[11px]">
          <span className="text-[#5A6878] font-mono uppercase tracking-wider text-[10px]">
            Display
          </span>
          <div className="flex items-center gap-1 bg-[#0C121B] p-0.5 rounded border border-[#1A2634]">
            <button
              onClick={() => setFieldMode('field')}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono transition-all",
                fieldMode === 'field' ? "bg-[#1E293B] text-white font-semibold" : "text-[#64748B] hover:text-white"
              )}
            >
              Field
            </button>
            <button
              onClick={() => setFieldMode('office')}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono transition-all",
                fieldMode === 'office' ? "bg-[#F59E0B] text-black font-semibold" : "text-[#64748B] hover:text-white"
              )}
            >
              Office
            </button>
          </div>
        </div>

        {/* Subsurface System Version */}
        <div className="px-1 text-[9px] font-mono text-[#475569] flex items-center justify-between">
          <span>NWIS PLATFORM</span>
          <span>v2.4.1 / ASSAM CORE</span>
        </div>
      </div>
    </aside>
  );
}
