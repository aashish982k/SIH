'use client';

import type { RTMACData } from '@/lib/types';

// ─── Drilling Parameters Grid ─────────────────────────────────────────────────
// Shared by the dashboard Live Feed card and the risk page Drilling Parameters
// card. Single source of truth for parameter list, formatting, and layout.

export function DrillingParamsGrid({ data, className = '' }: { data: RTMACData; className?: string }) {
  const params = [
    { label: 'ROP', value: `${data.rateOfPenetrationFtHr.toFixed(1)}`, unit: 'ft/hr' },
    { label: 'WOB', value: `${data.weightOnBitKlbs.toFixed(1)}`, unit: 'klbs' },
    { label: 'RPM', value: `${data.rotarySpeedRpm}`, unit: 'rpm' },
    { label: 'MW', value: `${data.mudWeightPpg.toFixed(2)}`, unit: 'ppg' },
    { label: 'SPP', value: `${data.standpipePressurePsi}`, unit: 'psi' },
  ];

  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-2.5 ${className}`}>
      {params.map(({ label, value, unit }) => (
        <div key={label}>
          <p className="text-[10px] text-muted-foreground font-medium uppercase">{label}</p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {value} <span className="text-xs text-muted-foreground font-normal">{unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
