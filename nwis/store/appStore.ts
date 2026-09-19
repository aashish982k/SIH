import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Well, Alert, RTMACData, RiskLevel } from '@/lib/types';
import { MOCK_WELLS } from '@/lib/mock/wells';
import { MOCK_ALERTS } from '@/lib/mock/alerts';

interface AppStore {
  // ── Active well ────────────────────────────────────────────────────────────
  activeWellId: string;
  activeWell: Well | null;
  setActiveWell: (wellId: string) => void;

  // ── Live eRTMAC feed ───────────────────────────────────────────────────────
  liveDepthFt: number;
  liveRiskScore: number;
  liveRiskLevel: RiskLevel;
  liveRtmacData: RTMACData | null;
  isRTMACConnected: boolean;
  updateRtmacData: (data: RTMACData) => void;
  setRTMACConnected: (connected: boolean) => void;

  // ── Map settings ───────────────────────────────────────────────────────────
  mapRadius: number; // km
  setMapRadius: (radius: number) => void;
  mapCenter: { lat: number; lng: number } | null;

  // ── Alerts ─────────────────────────────────────────────────────────────────
  alerts: Alert[];
  unreadAlertCount: number;
  acknowledgeAlert: (alertId: string) => void;
  markAllRead: () => void;
  addAlert: (alert: Alert) => void;

  // ── Auth ───────────────────────────────────────────────────────────────────
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  logout: () => void;
}

const defaultWell = MOCK_WELLS.find(w => w.status === 'active') ?? MOCK_WELLS[0];

export const useAppStore = create<AppStore>()(
  immer((set) => ({
    // ── Active well ──────────────────────────────────────────────────────────
    activeWellId: defaultWell.id,
    activeWell: defaultWell,
    setActiveWell: (wellId) =>
      set((state) => {
        const well = MOCK_WELLS.find(w => w.id === wellId) ?? null;
        state.activeWellId = wellId;
        state.activeWell = well;
        if (well) {
          state.mapCenter = well.coordinates;
        }
      }),

    // ── Live eRTMAC feed ─────────────────────────────────────────────────────
    liveDepthFt: defaultWell.currentDepthFt ?? 8200,
    liveRiskScore: defaultWell.riskScore ?? 55,
    liveRiskLevel: defaultWell.riskLevel ?? 'medium',
    liveRtmacData: null,
    isRTMACConnected: false,
    updateRtmacData: (data) =>
      set((state) => {
        state.liveRtmacData = data;
        state.liveDepthFt = data.depthFt;
        state.liveRiskScore = data.riskScore;
        state.liveRiskLevel = data.riskLevel;
        // Sync active well depth
        if (state.activeWell) {
          state.activeWell.currentDepthFt = data.depthFt;
        }
      }),
    setRTMACConnected: (connected) =>
      set((state) => { state.isRTMACConnected = connected; }),

    // ── Map settings ─────────────────────────────────────────────────────────
    mapRadius: 15, // 15 km default
    mapCenter: defaultWell.coordinates,
    setMapRadius: (radius) =>
      set((state) => { state.mapRadius = radius; }),

    // ── Alerts ───────────────────────────────────────────────────────────────
    alerts: MOCK_ALERTS,
    unreadAlertCount: MOCK_ALERTS.filter(a => a.status === 'new').length,
    acknowledgeAlert: (alertId) =>
      set((state) => {
        const alert = state.alerts.find(a => a.id === alertId);
        if (alert && alert.status === 'new') {
          alert.status = 'acknowledged';
          alert.acknowledgedAt = new Date().toISOString();
          state.unreadAlertCount = Math.max(0, state.unreadAlertCount - 1);
        }
      }),
    markAllRead: () =>
      set((state) => {
        state.alerts.forEach(a => {
          if (a.status === 'new') {
            a.status = 'acknowledged';
            a.acknowledgedAt = new Date().toISOString();
          }
        });
        state.unreadAlertCount = 0;
      }),
    addAlert: (alert) =>
      set((state) => {
        state.alerts.unshift(alert);
        if (alert.status === 'new') {
          state.unreadAlertCount += 1;
        }
      }),

    // ── Auth ─────────────────────────────────────────────────────────────────
    isAdmin: false,
    setIsAdmin: (value) =>
      set((state) => { state.isAdmin = value; }),
    logout: () =>
      set((state) => {
        state.isAdmin = false;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nwis_role');
        }
      }),
  }))
);
