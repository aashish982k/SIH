'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './types';

interface AppState {
  token: string | null;
  user: User | null;
  unit: 'm' | 'ft';
  theme: 'dark' | 'light';
  activeWellId: string | null;
  radiusKm: number;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setUnit: (u: 'm' | 'ft') => void;
  setTheme: (t: 'dark' | 'light') => void;
  setActiveWell: (id: string) => void;
  setRadius: (km: number) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      unit: 'm',
      theme: 'dark',
      activeWellId: null,
      radiusKm: 10,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setUnit: (unit) => set({ unit }),
      setTheme: (theme) => set({ theme }),
      setActiveWell: (activeWellId) => set({ activeWellId }),
      setRadius: (radiusKm) => set({ radiusKm }),
    }),
    {
      name: 'nwis',
      partialize: ({ token, user, unit, theme, activeWellId, radiusKm }) => ({ token, user, unit, theme, activeWellId, radiusKm }),
    }
  )
);

/** True once the persisted state has been read from localStorage (client only). */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (useApp.persist.hasHydrated()) setReady(true);
    return useApp.persist.onFinishHydration(() => setReady(true));
  }, []);
  return ready;
}
