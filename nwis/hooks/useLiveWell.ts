'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api, API_URL } from '@/lib/api';
import { useApp } from '@/lib/store';
import type { Alert, LiveState, RiskSnapshot, Sample } from '@/lib/types';

let socket: Socket | null = null;
let socketToken: string | null = null;

export function getSocket(token: string): Socket {
  if (!socket || socketToken !== token) {
    socket?.disconnect();
    socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketToken = token;
  }
  return socket;
}

/**
 * Subscribes to one live well: eRTMAC samples, fused risk and alerts.
 * History comes from REST on join, then grows from socket pushes.
 */
export function useLiveWell(wellId: string | null, enabled = true) {
  const token = useApp((s) => s.token);
  const [history, setHistory] = useState<Sample[]>([]);
  const [risk, setRisk] = useState<RiskSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(240);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const [freshAlertId, setFreshAlertId] = useState<string | null>(null);
  const [notLive, setNotLive] = useState(false);
  const wellRef = useRef(wellId);
  wellRef.current = wellId;

  const loadState = useCallback(async () => {
    if (!wellId) return;
    const [state, list] = await Promise.all([
      api<LiveState>(`/live/${wellId}`).catch(() => null),
      api<Alert[]>(`/alerts?wellId=${wellId}&limit=60`).catch(() => []),
    ]);
    if (wellRef.current !== wellId) return;
    setNotLive(!state);
    if (state) { setHistory(state.history); setRisk(state.risk); setRunning(state.running); setSpeed(state.speed); }
    setAlerts(list);
  }, [wellId]);

  useEffect(() => {
    if (!wellId || !token || !enabled) return;
    setHistory([]); setRisk(null); setAlerts([]);
    void loadState();
    const s = getSocket(token);
    const join = () => { s.emit('well:join', wellId); setConnected(true); };
    const onDisconnect = () => setConnected(false);
    const onUpdate = (msg: { wellId: string; sample: Sample; risk: RiskSnapshot; running: boolean; speed: number }) => {
      if (msg.wellId !== wellRef.current) return;
      setHistory((h) => (h.length > 600 ? [...h.slice(-599), msg.sample] : [...h, msg.sample]));
      setRisk(msg.risk);
      setRunning(msg.running);
      setSpeed(msg.speed);
    };
    const onAlertNew = (a: Alert) => {
      if (a.wellId !== wellRef.current) return;
      setAlerts((list) => [a, ...list.filter((x) => x.id !== a.id)]);
      setFreshAlertId(a.id);
    };
    const onAlertUpdate = (a: Alert) => {
      if (a.wellId !== wellRef.current) return;
      setAlerts((list) => list.map((x) => (x.id === a.id ? a : x)));
    };
    const onSimState = (st: { wellId: string; running: boolean; speed: number }) => {
      if (st.wellId !== wellRef.current) return;
      setRunning(st.running); setSpeed(st.speed);
    };
    const onReset = (st: LiveState) => {
      if (st?.wellId !== wellRef.current) return;
      setHistory(st.history); setRisk(st.risk); setRunning(st.running);
      void api<Alert[]>(`/alerts?wellId=${st.wellId}&limit=60`).then(setAlerts).catch(() => {});
    };

    if (s.connected) join();
    s.on('connect', join);
    s.on('disconnect', onDisconnect);
    s.on('drilling:update', onUpdate);
    s.on('alert:new', onAlertNew);
    s.on('alert:update', onAlertUpdate);
    s.on('sim:state', onSimState);
    s.on('sim:reset', onReset);
    return () => {
      s.emit('well:leave', wellId);
      s.off('connect', join);
      s.off('disconnect', onDisconnect);
      s.off('drilling:update', onUpdate);
      s.off('alert:new', onAlertNew);
      s.off('alert:update', onAlertUpdate);
      s.off('sim:state', onSimState);
      s.off('sim:reset', onReset);
    };
  }, [wellId, token, enabled, loadState]);

  const control = useCallback(async (action: 'start' | 'pause' | 'reset' | 'speed' | 'radius', value?: number) => {
    if (!wellId) return;
    const st = await api<{ running: boolean; speed: number }>(`/live/${wellId}/control`, { method: 'POST', json: { action, value } });
    setRunning(st.running); setSpeed(st.speed);
    if (action === 'reset') await loadState();
  }, [wellId, loadState]);

  const respond = useCallback(async (alertId: string, action: 'acknowledge' | 'false_alarm' | 'resolve', feedback?: string) => {
    const a = await api<Alert>(`/alerts/${alertId}/respond`, { method: 'POST', json: { action, feedback } });
    setAlerts((list) => list.map((x) => (x.id === a.id ? a : x)));
  }, []);

  return { history, risk, running, speed, alerts, connected, freshAlertId, notLive, control, respond, reload: loadState };
}
