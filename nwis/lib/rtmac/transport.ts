// ─── RTMAC Transport Abstraction ─────────────────────────────────────────────
// Adapter pattern — swap transports without touching UI components.
// Current: PollingTransport (setInterval mock)
// Future:  WebSocketTransport | SSETransport (stubs ready below)

import type { RTMACData, RiskLevel } from '@/lib/types';

// ─── Transport Interface ───────────────────────────────────────────────────────

export interface RTMACTransport {
  /** Start receiving data. Calls onData with each update, onError on failure. */
  connect(onData: (data: RTMACData) => void, onError?: (err: Error) => void): void;
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

  connect(onData: (data: RTMACData) => void, _onError?: (err: Error) => void): void {
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

// ─── 2. WebSocket Transport (STUB — ready for backend integration) ─────────────
// To activate: replace PollingTransport with WebSocketTransport in useRTMACFeed.ts
// Backend needs: ws://your-server/rtmac?wellId=well-001
// Message format: JSON string matching RTMACData interface

export class WebSocketTransport implements RTMACTransport {
  readonly label = 'WebSocket';
  private ws: WebSocket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(onData: (data: RTMACData) => void, onError?: (err: Error) => void): void {
    this.ws = new WebSocket(this.url);

    this.ws.onmessage = (event) => {
      try {
        const data: RTMACData = JSON.parse(event.data as string);
        onData(data);
      } catch {
        onError?.(new Error('Failed to parse WebSocket message'));
      }
    };

    this.ws.onerror = () => {
      onError?.(new Error(`WebSocket connection error: ${this.url}`));
    };

    this.ws.onclose = () => {
      // Reconnect logic would go here (e.g., exponential backoff)
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
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

  connect(onData: (data: RTMACData) => void, onError?: (err: Error) => void): void {
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

export function createTransport(): RTMACTransport {
  return new PollingTransport();
}
