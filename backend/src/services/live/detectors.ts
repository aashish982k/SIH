/**
 * Live precursor detection (Layer B). Transparent engineering rules over rolling
 * windows, evaluated per rig state so connections do not look like anomalies.
 */
import type { Sample } from './simulator';
import type { RiskType } from '../../domain/taxonomy';

export interface Detection { score: number; reasons: string[]; }
export type Detections = Record<RiskType, Detection>;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const std = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))); };
const pct = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

export function detect(history: Sample[]): Detections {
  const drill = history.filter((s) => s.rigState === 'drilling');
  const conns = history.filter((s) => s.rigState === 'connection');
  const recent = drill.slice(-10);
  const base = drill.slice(-90, -30);
  const empty = (): Detection => ({ score: 0, reasons: [] });
  const out: Detections = { mud_loss: empty(), kick: empty(), stuck_pipe: empty(), tight_hole: empty(), overpressure: empty(), wellbore_instability: empty() };
  if (recent.length < 6 || base.length < 20) return out;

  const depthSpan = recent[recent.length - 1].holeDepth - recent[0].holeDepth;

  // Mud loss: flow-out below flow-in, pits dropping
  // Normal return ratio from a long window, so one short loss episode cannot skew it
  const returnGap = (s: Sample) => (s.flowIn - s.flowOut) / Math.max(1, s.flowIn);
  const lossFrac = mean(recent.map(returnGap)) - median(drill.slice(-240, -10).map(returnGap));
  const pitDelta = recent[recent.length - 1].pit - recent[0].pit;
  out.mud_loss.score = clamp01((lossFrac - 0.03) / 0.09) * 0.75 + clamp01(-pitDelta / 12) * 0.25;
  if (lossFrac > 0.03) out.mud_loss.reasons.push(`Flow-out ${pct(-lossFrac)} vs flow-in over the last ${Math.max(1, Math.round(depthSpan))} ft`);
  if (pitDelta < -3) out.mud_loss.reasons.push(`Pit volume down ${Math.abs(Math.round(pitDelta))} bbl`);

  // Kick: flow-out above flow-in, pit gain, gas
  const gainFrac = -lossFrac;
  // Pit gain alone is often a mud transfer; it only counts when flow-out confirms it
  out.kick.score = clamp01((gainFrac - 0.025) / 0.07) * 0.6 + clamp01(pitDelta / 8) * 0.4 * (gainFrac > 0.015 ? 1 : 0.15);
  if (gainFrac > 0.025) out.kick.reasons.push(`Flow-out ${pct(gainFrac)} above flow-in`);
  if (pitDelta > 2 && gainFrac > 0.015) out.kick.reasons.push(`Pit gain of ${Math.round(pitDelta)} bbl`);

  // Stuck pipe / pack-off: torque trend + erratic torque + overpull on connections
  const tRatio = mean(recent.map((s) => s.torque)) / Math.max(0.1, median(base.map((s) => s.torque)));
  const tCv = std(recent.map((s) => s.torque)) / Math.max(0.1, mean(recent.map((s) => s.torque)));
  const lastConns = conns.slice(-3);
  const stringWt = median(base.map((s) => s.hookLoad + s.wob));
  const overpull = lastConns.length ? Math.max(...lastConns.map((s) => s.hookLoad - stringWt)) : 0;
  out.stuck_pipe.score = clamp01((tRatio - 1.08) / 0.3) * 0.5 + clamp01((overpull - 8) / 22) * 0.3 + clamp01((tCv - 0.05) / 0.08) * 0.2;
  if (tRatio > 1.08) out.stuck_pipe.reasons.push(`Torque ${pct(tRatio - 1)} vs baseline`);
  if (tCv > 0.06) out.stuck_pipe.reasons.push(`Erratic torque (variation ${Math.round(tCv * 100)}%)`);
  if (overpull > 10) out.stuck_pipe.reasons.push(`${Math.round(overpull)} klbs overpull on last connection`);

  out.tight_hole.score = clamp01((overpull - 12) / 25) * 0.8 + clamp01((tRatio - 1.1) / 0.4) * 0.2;
  if (overpull > 12) out.tight_hole.reasons.push(`${Math.round(overpull)} klbs overpull when picking up`);

  out.wellbore_instability.score = clamp01((tCv - 0.07) / 0.1) * 0.6 + clamp01((tRatio - 1.15) / 0.4) * 0.4;
  if (tCv > 0.07) out.wellbore_instability.reasons.push('Erratic torque consistent with cavings');

  // Overpressure: background gas rise + corrected d-exponent reversal
  const gasRatio = mean(recent.map((s) => s.gas)) / Math.max(1, median(base.map((s) => s.gas)));
  const dxcDrop = (median(base.map((s) => s.dxc)) - mean(recent.map((s) => s.dxc))) / Math.max(0.1, median(base.map((s) => s.dxc)));
  out.overpressure.score = clamp01((gasRatio - 1.8) / 3) * 0.7 + clamp01((dxcDrop - 0.04) / 0.12) * 0.3;
  if (gasRatio > 1.8) out.overpressure.reasons.push(`Background gas ${gasRatio.toFixed(1)}× baseline`);
  if (dxcDrop > 0.04) out.overpressure.reasons.push(`Corrected d-exponent down ${Math.round(dxcDrop * 100)}% (pressure transition)`);

  for (const k of Object.keys(out) as RiskType[]) out[k].score = Math.round(out[k].score * 1000) / 1000;
  return out;
}
