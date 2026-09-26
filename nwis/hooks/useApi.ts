'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

const cache = new Map<string, unknown>();

/** Fetch-on-mount with a small in-memory cache so page switches feel instant. */
export function useApi<T>(path: string | null, opts: { refreshMs?: number } = {}) {
  const [data, setData] = useState<T | undefined>(() => (path ? (cache.get(path) as T | undefined) : undefined));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path && !cache.has(path));
  const current = useRef(path);
  current.current = path;

  const load = useCallback(async () => {
    if (!path) return;
    try {
      const d = await api<T>(path);
      if (current.current !== path) return;
      cache.set(path, d);
      setData(d);
      setError(null);
    } catch (e: any) {
      if (current.current === path) setError(e.message);
    } finally {
      if (current.current === path) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (!path) { setData(undefined); setLoading(false); return; }
    setData(cache.get(path) as T | undefined);
    setLoading(!cache.has(path));
    void load();
    if (!opts.refreshMs) return;
    const id = setInterval(load, opts.refreshMs);
    return () => clearInterval(id);
  }, [path, load, opts.refreshMs]);

  return { data, error, loading, reload: load, setData };
}
