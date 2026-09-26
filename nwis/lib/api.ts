'use client';

import { useApp } from './store';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const token = useApp.getState().token;
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = init.body;
  if (init.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(init.json); }
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, { ...init, headers, body });
  } catch {
    throw new ApiError(`Cannot reach the NWIS backend at ${API_URL}. Start it with "npm run dev" in the backend folder.`, 0);
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) useApp.getState().logout();
  if (!res.ok || data.success === false) {
    const detail = Array.isArray(data.error) ? `: ${data.error.map((e: any) => e.message).join(', ')}` : '';
    throw new ApiError((data.message ?? `Request failed (${res.status})`) + detail, res.status);
  }
  return data.data as T;
}
