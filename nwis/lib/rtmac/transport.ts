// ─── RTMAC Transport Abstraction ─────────────────────────────────────────────
// Adapter pattern — swap transports without touching UI components.
// Current: PollingTransport (setInterval mock)
// Future:  WebSocketTransport | SSETransport (stubs ready below)

import type { RTMACData, RiskLevel } from '@/lib/types';
import { io, Socket } from 'socket.io-client';

// ─── Transport Interface ───────────────────────────────────────────────────────

export interface RTMACTransport {
  /** Start receiving data. Calls onData with each update, onError on failure. */
  connect(
    onData: (data: RTMACData) => void,
    onAlert: (alert: unknown) => void,
    onError?: (err: Error) => void
  ): void;
  /** Stop receiving data and clean up resources. */
  disconnect(): void;
  /** Human-readable label shown in UI status indicator */
  readonly label: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * range * 2;
}

// ─── 1. Polling Transport (ACTIVE — uses setInterval) ─────────────────────────

export class PollingTransport implements RTMACTransport {
  readonly label = 'Simulated (Polling)';

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentDepth = 8200;
  private currentRiskScore = 58;
  private ropTrend = 1; // direction of ROP drift

  connect(
    onData: (data: RTMACData) => void
  ): void {
    if (this.intervalId) return; // already connected

    const tick = () => {
      // Simulate gradual depth increase
      this.currentDepth += jitter(2.5, 1.5); // ~2.5 ft per tick avg

      // Simulate risk score drift — gradually increases as we approach Barail
      const targetRisk = this.currentDepth > 8300 ? 70 : 55;
      this.currentRiskScore += (targetRisk - this.currentRiskScore) * 0.05 + jitter(0, 2);
      this.currentRiskScore = Math.min(100, Math.max(0, this.currentRiskScore));

      // Drift ROP
      this.ropTrend += jitter(0, 0.3);
      const rop = Math.max(5, Math.min(80, 32 + this.ropTrend * 2));

      const data: RTMACData = {
        wellId: 'well-001',
        depthFt: Math.round(this.currentDepth * 10) / 10,
        rateOfPenetrationFtHr: Math.round(rop * 10) / 10,
        weightOnBitKlbs: Math.round(jitter(28, 4) * 10) / 10,
        rotarySpeedRpm: Math.round(jitter(85, 10)),
        mudWeightPpg: Math.round(jitter(10.8, 0.2) * 100) / 100,
        standpipePressurePsi: Math.round(jitter(2800, 150)),
        riskScore: Math.round(this.currentRiskScore),
        riskLevel: getRiskLevel(this.currentRiskScore),
        timestamp: new Date().toISOString(),
      };

      onData(data);
    };

    // Immediate first tick, then every 3s
    tick();
    this.intervalId = setInterval(tick, 3000);
  }

  disconnect(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// ─── 2. Socket.IO Transport (ACTIVE — real backend integration) ───────────────

export class SocketIOTransport implements RTMACTransport {
  readonly label = 'Socket.IO';
  private socket: Socket | null = null;
  private url: string;
  private wellId: string;

  constructor(url: string, wellId: string) {
    this.url = url;
    this.wellId = wellId;
  }

  connect(
    onData: (data: RTMACData) => void,
    onAlert: (alert: unknown) => void,
    onError?: (err: Error) => void
  ): void {
    this.socket = io(this.url, {
      auth: { token: 'mock-token' }, // Add token if auth middleware requires it
    });

    this.socket.on('connect', () => {
      this.socket?.emit('well:join', this.wellId);
    });

    this.socket.on('drilling:update', (data: RTMACData) => {
      onData(data);
    });

    this.socket.on('alert:new', (alertData: unknown) => {
      onAlert(alertData);
    });

    this.socket.on('connect_error', (err: Error) => {
      onError?.(err);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.emit('well:leave', this.wellId);
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// ─── 3. SSE Transport (STUB — alternative to WebSocket for read-only streams) ──
// To activate: replace PollingTransport with SSETransport in useRTMACFeed.ts
// Backend needs: GET /api/rtmac/stream?wellId=well-001 (text/event-stream)
// Message format: data: <JSON RTMACData>\n\n

export class SSETransport implements RTMACTransport {
  readonly label = 'Server-Sent Events';
  private eventSource: EventSource | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(
    onData: (data: RTMACData) => void,
    _onAlert: (alert: unknown) => void,
    onError?: (err: Error) => void
  ): void {
    this.eventSource = new EventSource(this.url);

    this.eventSource.onmessage = (event) => {
      try {
        const data: RTMACData = JSON.parse(event.data as string);
        onData(data);
      } catch {
        onError?.(new Error('Failed to parse SSE message'));
      }
    };

    this.eventSource.onerror = () => {
      onError?.(new Error(`SSE connection error: ${this.url}`));
      // EventSource auto-reconnects by default
    };
  }

  disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }
}

// ─── Active Transport Factory ─────────────────────────────────────────────────
// ✅ Change this one line to swap transports:
//   - Mock:      new PollingTransport()
//   - WebSocket: new WebSocketTransport('ws://your-server/rtmac')
//   - SSE:       new SSETransport('/api/rtmac/stream')

export function createTransport(wellId: string = 'well-001'): RTMACTransport {
  // Use backend URL from env, default to localhost:5000
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';
  return new SocketIOTransport(wsUrl, wellId);
}
