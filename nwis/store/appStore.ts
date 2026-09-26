import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Well, Alert, RTMACData, RiskLevel } from '@/lib/types';
import { api, setStoredToken, getStoredToken } from '@/lib/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'engineer' | 'operator' | 'administrator';
}

interface AppStore {
  // ── Authentication ─────────────────────────────────────────────────────────
  currentUser: UserProfile | null;
  token: string | null;
  isAdmin: boolean;
  setUser: (user: UserProfile | null, token?: string | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => void;

  // ── Wells from DB ──────────────────────────────────────────────────────────
  wells: Well[];
  isLoadingWells: boolean;
  activeWellId: string;
  activeWell: Well | null;
  setActiveWell: (wellId: string) => void;
  fetchWells: () => Promise<void>;

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

  // ── Alerts from DB ─────────────────────────────────────────────────────────
  alerts: Alert[];
  unreadAlertCount: number;
  fetchAlerts: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => void;
  markAllRead: () => void;
  addAlert: (alert: Alert) => void;

  // ── Basin Selection ────────────────────────────────────────────────────────
  selectedBasin: string;
  setSelectedBasin: (basin: string) => void;
}

// Transform backend well object into frontend Well format
function formatDbWell(w: any): Well {
  return {
    id: w.id,
    name: w.name,
    block: w.block || 'Block A',
    field: w.field_name || w.field || 'Duliajan North',
    operator: w.operator || 'Oil India Limited',
    status: w.status || 'active',
    coordinates: {
      lat: Number(w.latitude || 27.3617),
      lng: Number(w.longitude || 95.3191),
    },
    spudDate: w.spud_date || '2024-01-15',
    completionDate: w.completion_date,
    totalDepthFt: Number(w.total_depth_ft || 12000),
    currentDepthFt: w.status === 'active' ? 8420 : Number(w.total_depth_ft || 12000),
    measuredDepthFt: w.status === 'active' ? 8420 : Number(w.total_depth_ft || 12000),
    trueVerticalDepthFt: w.status === 'active' ? 8105 : Number(w.total_depth_ft || 12000) * 0.98,
    inclination: 6.4,
    azimuth: 142,
    riskScore: w.status === 'active' ? 64 : 20,
    riskLevel: w.status === 'active' ? 'medium' : 'low',
    casingProgram: [],
    formations: w.formations || [],
    incidents: (w.recent_events || []).map((e: any) => ({
      id: e.id,
      wellId: e.well_id || w.id,
      type: e.event_type,
      severity: e.severity,
      depthFt: e.start_depth_ft,
      date: e.occurred_at,
      description: e.description,
      mitigation: e.mitigation || '',
      lessonsLearned: e.lessons_learned || '',
      durationHours: e.duration_hours || e.npt_hours || 0,
      formation: e.formation_name || '',
    })),
  };
}

export const BASIN_FIELD_MAPPING: Record<string, { label: string; fields: string[]; defaultActiveWellId: string }> = {
  assam: {
    label: 'Upper Assam Basin',
    fields: ['Duliajan North', 'Lakwa Central', 'Moran East', 'Naharkatiya', 'Baghjan', 'Naharkatia', 'Moran', 'Jorajan', 'Hugrijan', 'Lakwa', 'Geleki', 'Dikom', 'Sibsagar'],
    defaultActiveWellId: 'well-dul-01',
  },
  rajasthan: {
    label: 'Barmer Basin (Rajasthan)',
    fields: ['Barmer Basin (Rajasthan)'],
    defaultActiveWellId: 'well-brm-01',
  },
  cambay: {
    label: 'Cambay Basin (Gujarat)',
    fields: ['Cambay Basin (Gujarat)'],
    defaultActiveWellId: 'well-cby-01',
  },
  mumbai: {
    label: 'Mumbai High (Offshore)',
    fields: ['Mumbai High (Offshore)'],
    defaultActiveWellId: 'well-mbh-01',
  },
  tripura: {
    label: 'Tripura Gas Fields',
    fields: ['Tripura Gas Fields'],
    defaultActiveWellId: 'well-trp-01',
  },
  kg: {
    label: 'KG Deepwater Basin',
    fields: ['KG Basin (Deepwater)'],
    defaultActiveWellId: 'well-kgb-01',
  },
  cauvery: {
    label: 'Cauvery Basin',
    fields: ['Cauvery Basin'],
    defaultActiveWellId: 'well-cvy-01',
  },
};

export const useAppStore = create<AppStore>()(
  immer((set, get) => ({
    // ── Authentication ───────────────────────────────────────────────────────
    currentUser: null,
    token: null,
    isAdmin: false,

    setUser: (user, token) =>
      set((state) => {
        state.currentUser = user;
        state.isAdmin = user?.role === 'administrator';
        if (token !== undefined) {
          state.token = token;
          setStoredToken(token);
        }
      }),

    checkAuth: async () => {
      const token = getStoredToken();
      if (!token) return;
      try {
        const res = await api.auth.getMe();
        if (res.data?.user) {
          set((state) => {
            state.currentUser = res.data.user;
            state.isAdmin = res.data.user.role === 'administrator';
          });
        }
      } catch (err) {
        setStoredToken(null);
      }
    },

    logout: () => {
      api.auth.logout();
      set((state) => {
        state.currentUser = null;
        state.token = null;
        state.isAdmin = false;
      });
    },

    // ── Wells ────────────────────────────────────────────────────────────────
    wells: [],
    isLoadingWells: false,
    activeWellId: 'well-dul-01',
    activeWell: null,

    fetchWells: async () => {
      set((state) => { state.isLoadingWells = true; });
      try {
        const res = await api.wells.list({ limit: 100 });
        const dbWells = (res.data?.wells || []).map(formatDbWell);
        if (dbWells.length > 0) {
          set((state) => {
            state.wells = dbWells;
            let currentActive: Well | undefined;
            if (state.selectedBasin !== 'all' && BASIN_FIELD_MAPPING[state.selectedBasin]) {
              const defId = BASIN_FIELD_MAPPING[state.selectedBasin].defaultActiveWellId;
              currentActive = dbWells.find(w => w.id === defId) ||
                              dbWells.find(w => BASIN_FIELD_MAPPING[state.selectedBasin].fields.some(f => (w.field || '').toLowerCase().includes(f.toLowerCase())));
            }
            if (!currentActive) {
              currentActive = dbWells.find(w => w.id === state.activeWellId) ||
                              dbWells.find(w => w.status === 'active') ||
                              dbWells[0];
            }
            state.activeWell = currentActive;
            state.activeWellId = currentActive.id;
            state.mapCenter = currentActive.coordinates;
            state.liveDepthFt = currentActive.currentDepthFt || 8420;
          });
        }
      } catch (err) {
        console.warn('Could not fetch wells from backend:', err);
      } finally {
        set((state) => { state.isLoadingWells = false; });
      }
    },

    setActiveWell: (wellId) =>
      set((state) => {
        const well = state.wells.find(w => w.id === wellId) ?? null;
        state.activeWellId = wellId;
        state.activeWell = well;
        if (well) {
          state.mapCenter = well.coordinates;
          state.liveDepthFt = well.currentDepthFt || 8420;
        }
      }),

    // ── Live eRTMAC feed ─────────────────────────────────────────────────────
    liveDepthFt: 8420,
    liveRiskScore: 62,
    liveRiskLevel: 'medium',
    liveRtmacData: null,
    isRTMACConnected: false,

    updateRtmacData: (data) =>
      set((state) => {
        state.liveRtmacData = data;
        state.liveDepthFt = data.depthFt;
        state.liveRiskScore = data.riskScore;
        state.liveRiskLevel = data.riskLevel;
        if (state.activeWell) {
          state.activeWell.currentDepthFt = data.depthFt;
        }
      }),

    setRTMACConnected: (connected) =>
      set((state) => { state.isRTMACConnected = connected; }),

    // ── Map settings ─────────────────────────────────────────────────────────
    mapRadius: 15,
    mapCenter: { lat: 27.3617, lng: 95.3191 },
    setMapRadius: (radius) =>
      set((state) => { state.mapRadius = radius; }),

    // ── Alerts ───────────────────────────────────────────────────────────────
    alerts: [],
    unreadAlertCount: 0,

    fetchAlerts: async () => {
      try {
        const res = await api.risks.list();
        const rawRisks = res.data?.risks || [];
        const alertsList: Alert[] = rawRisks.map((r: any) => ({
          id: r.id,
          wellId: r.well_id,
          message: r.message,
          riskLevel: r.severity as RiskLevel,
          status: (r.status === 'active' ? 'new' : r.status) as any,
          relatedWellIds: [],
          recommendedAction: r.description || 'Monitor parameters closely and adhere to casing program.',
          depthFt: Number(r.depth_ft || 8000),
          incidentType: (r.risk_type || 'other') as any,
          timestamp: r.created_at || new Date().toISOString(),
        }));

        set((state) => {
          state.alerts = alertsList;
          state.unreadAlertCount = alertsList.filter(a => a.status === 'new').length;
        });
      } catch (err) {
        console.warn('Could not fetch alerts from backend:', err);
      }
    },

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
        state.alerts.forEach((a) => {
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

    // ── Basin Selection ────────────────────────────────────────────────────────
    selectedBasin: 'all',
    setSelectedBasin: (basin) =>
      set((state) => {
        state.selectedBasin = basin;
        if (basin !== 'all' && BASIN_FIELD_MAPPING[basin] && state.wells.length > 0) {
          const targetId = BASIN_FIELD_MAPPING[basin].defaultActiveWellId;
          const targetWell = state.wells.find(w => w.id === targetId) ||
                             state.wells.find(w => BASIN_FIELD_MAPPING[basin].fields.some(f => (w.field || '').toLowerCase().includes(f.toLowerCase())));
          if (targetWell) {
            state.activeWellId = targetWell.id;
            state.activeWell = targetWell;
            state.mapCenter = targetWell.coordinates;
            state.liveDepthFt = targetWell.currentDepthFt || 8420;
          }
        }
      }),
  }))
);
