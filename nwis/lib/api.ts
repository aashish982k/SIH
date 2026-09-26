const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nwis_token');
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('nwis_token', token);
  } else {
    localStorage.removeItem('nwis_token');
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string }> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.message || `Request failed with status ${res.status}`);
    }

    return json;
  } catch (err: any) {
    if (endpoint !== '/auth/me') {
      console.error(`API Error [${endpoint}]:`, err.message);
    }
    throw err;
  }
}

// ─── API Methods ─────────────────────────────────────────────────────────────

export const api = {
  // ── Authentication
  auth: {
    login: (email: string, password: string) =>
      request<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (name: string, email: string, password: string, role: string = 'engineer') =>
      request<{ user: any; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      }),

    getMe: async () => {
      const token = getStoredToken();
      if (!token) {
        return { success: false, data: { user: null } };
      }
      return request<{ user: any }>('/auth/me');
    },

    logout: () => {
      setStoredToken(null);
    },
  },

  // ── Wells Management
  wells: {
    list: (params: { status?: string; field?: string; page?: number; limit?: number } = {}) => {
      const sp = new URLSearchParams();
      if (params.status && params.status !== 'all') sp.set('status', params.status);
      if (params.field && params.field !== 'all') sp.set('field', params.field);
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return request<{ wells: any[]; total: number }>(`/wells${qs}`);
    },

    getById: (id: string) => request<{ well: any }>(`/wells/${id}`),

    getNearby: (latitude: number, longitude: number, radiusKm: number = 25, limit: number = 20) => {
      const sp = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        radiusKm: String(radiusKm),
        limit: String(limit),
      });
      return request<{ wells: any[]; center: { latitude: number; longitude: number }; radius_km: number }>(
        `/wells/nearby?${sp.toString()}`
      );
    },

    create: (data: any) =>
      request<{ well: any }>('/wells', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      request<{ well: any }>(`/wells/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<void>(`/wells/${id}`, {
        method: 'DELETE',
      }),
  },

  // ── Operational Events
  events: {
    list: (params: { well_id?: string; event_type?: string; severity?: string; limit?: number } = {}) => {
      const sp = new URLSearchParams();
      if (params.well_id) sp.set('well_id', params.well_id);
      if (params.event_type) sp.set('event_type', params.event_type);
      if (params.severity) sp.set('severity', params.severity);
      if (params.limit) sp.set('limit', String(params.limit));
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return request<{ events: any[] }>(`/events${qs}`);
    },

    getById: (id: string) => request<{ event: any }>(`/events/${id}`),
  },

  // ── Risks & Alerts
  risks: {
    list: () => request<{ risks: any[]; total: number }>('/risks'),

    getOverview: () =>
      request<{
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        distribution: Record<string, number>;
      }>('/risks/overview'),

    getPredictions: (wellId: string) => request<{ prediction: any }>(`/risks/${wellId}/predictions`),

    getAlerts: (wellId: string) => request<{ alerts: any[] }>(`/risks/${wellId}/alerts`),
  },

  // ── Intelligence
  intelligence: {
    getOverview: () =>
      request<{
        summary: {
          totalWells: number;
          activeWells: number;
          completedWells: number;
          suspendedWells: number;
          totalFields: number;
        };
        fields: Record<string, number>;
        recentEvents: any[];
        activeAlerts: any[];
      }>('/intelligence/overview'),

    getNearby: (wellId: string, radiusKm: number = 50) =>
      request<{ nearbyWells: any[] }>(`/intelligence/${wellId}/nearby?radiusKm=${radiusKm}`),
  },

  // ── Knowledge & Semantic Search
  search: {
    knowledge: (
      query: string = '',
      limit: number = 25,
      filters?: { 
        well_id?: string; 
        event_type?: string; 
        formation?: string; 
        severity?: string;
        status?: string;
        location?: string;
        field?: string;
        date_from?: string;
        date_to?: string;
        radius_km?: number;
      }
    ) =>
      request<{ results: any[]; count: number }>('/search', {
        method: 'POST',
        body: JSON.stringify({ query: query || '', limit, ...filters }),
      }),
  },

  // ── Reports & Uploads
  reports: {
    list: (params: { well_id?: string; type?: string; page?: number; limit?: number } = {}) => {
      const sp = new URLSearchParams();
      if (params.well_id) sp.set('well_id', params.well_id);
      if (params.type) sp.set('type', params.type);
      if (params.page) sp.set('page', String(params.page));
      if (params.limit) sp.set('limit', String(params.limit));
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return request<{ reports?: any[]; documents?: any[]; count?: number }>(`/reports${qs}`);
    },

    upload: (formData: FormData) =>
      request<{ report?: any; document?: any; message?: string }>('/reports/upload', {
        method: 'POST',
        body: formData,
      }),

    generate: (data: { well_id: string; title?: string; report_type?: string; summary?: string; metadata?: any }) =>
      request<{ report: any; downloadUrl: string }>('/reports/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getDownloadUrl: (id: string) => `${API_BASE}/reports/${id}/download`,

    getById: (id: string) => request<{ report?: any; document?: any }>(`/reports/${id}`),
  },

  // ── Recommendations
  recommendations: {
    list: () => request<{ recommendations: any[] }>('/recommendations'),
  },

  // ── Health
  health: () => request<{ status: string; mysql: string; qdrant: string; uptime: number }>('/health'),
};
