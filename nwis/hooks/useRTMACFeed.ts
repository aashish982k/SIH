'use client';

import { useEffect, useRef } from 'react';
import { createTransport, type RTMACTransport } from '@/lib/rtmac/transport';
import { useAppStore } from '@/store/appStore';

/**
 * useRTMACFeed — connects to the active transport and streams data into Zustand.
 *
 * Usage: mount once at the root layout level.
 * The transport can be swapped in lib/rtmac/transport.ts without touching this hook.
 */
export function useRTMACFeed() {
  const updateRtmacData = useAppStore(s => s.updateRtmacData);
  const setConnected = useAppStore(s => s.setRTMACConnected);
  const addAlert = useAppStore(s => s.addAlert);
  const activeWellId = useAppStore(s => s.activeWellId);
  const transportRef = useRef<RTMACTransport | null>(null);

  useEffect(() => {
    if (!activeWellId) return;

    const transport = createTransport(activeWellId);
    transportRef.current = transport;

    transport.connect(
      (data) => {
        updateRtmacData(data);
        setConnected(true);
      },
      (alertData) => {
        // Map backend alert to frontend Alert type if necessary, or just add
        addAlert({
          ...alertData,
          status: 'new'
        });
      },
      (err) => {
        console.error('[RTMAC]', err.message);
        setConnected(false);
      }
    );

    setConnected(true);

    return () => {
      transport.disconnect();
      setConnected(false);
    };
  }, [updateRtmacData, setConnected, addAlert, activeWellId]);
}
