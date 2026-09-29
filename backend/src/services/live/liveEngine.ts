/**
 * Live engine: runs the eRTMAC replay for each live well, fuses offset history
 * (Layer A) with live precursors (Layer B), manages alert lifecycle and pushes
 * everything to the well's Socket.IO room. The browser never produces drilling data.
 */
import type { Server } from 'socket.io';
import { db } from '../../config/db';
import { sql } from 'drizzle-orm';
import { LIVE_SCENARIOS } from '../../domain/hazardModel';
import { EVENT_LABELS, RISK_TYPES, type RiskType } from '../../domain/taxonomy';
import { FT_PER_M } from '../../domain/geo';
import { getFormations } from '../wellService';
import { getHazardProfile, whatWorked } from '../offsetService';
import { createAlert, updateAlert, getAlert } from '../alertService';
import { WellSimulator, type Sample } from './simulator';
import { detect, type Detections } from './detectors';

const LOOKAHEAD_FT = 400;       // warn this far ahead of a hazard zone
const RAISE_AT = 0.6, CLEAR_AT = 0.4;

export interface RiskSnapshot {
  overall: number;
  byType: Record<RiskType, { prior: number; live: number; fused: number; reasons: string[] }>;
  nextZone: any | null;
}

interface WellRuntime {
  sim: WellSimulator;
  radiusKm: number;
  profile: any | null;
  lastRisk: RiskSnapshot | null;
  lookaheadIssued: Map<string, string>;   // zone id → alert id
  liveActive: Map<RiskType, { alertId: string; lowTicks: number; prob: number }>;
  tickCount: number;
}

const runtimes = new Map<string, WellRuntime>();
let io: Server | null = null;
let timer: NodeJS.Timeout | null = null;

const room = (wellId: string) => `well:${wellId}`;
const m = (ft: number) => `${Math.round(ft / FT_PER_M).toLocaleString('en-IN')} m`;

export async function initLiveEngine(server: Server) {
  io = server;
  for (const sc of LIVE_SCENARIOS) {
    const fm = (await getFormations([sc.wellId])).get(sc.wellId);
    if (!fm?.length) continue;
    const tops = fm.map((f: any) => ({ name: f.name, top: f.topTvd, base: f.bottomTvd ?? f.topTvd + 800 }));
    const start = tops.find((t) => t.name === sc.startFormation)!;
    const startDepth = start.top + sc.startRel * (start.base - start.top);
    const sim = new WellSimulator(sc, tops, startDepth);
    runtimes.set(sc.wellId, { sim, radiusKm: 10, profile: null, lastRisk: null, lookaheadIssued: new Map(), liveActive: new Map(), tickCount: 0 });
  }
  timer = setInterval(() => { void tickAll(); }, 1000);
  console.log(`✅  Live engine ready (${runtimes.size} replay wells, paused)`);
}

export function stopLiveEngine() { if (timer) clearInterval(timer); }

async function ensureProfile(rt: WellRuntime) {
  if (!rt.profile) rt.profile = await getHazardProfile(rt.sim.wellId, rt.radiusKm);
  return rt.profile;
}

function priorAt(profile: any, depth: number, k: RiskType): number {
  let best = 0;
  for (const b of profile.bins) if (b.depth >= depth - 25 && b.depth <= depth + 150) best = Math.max(best, b.p[k] ?? 0);
  return best;
}

function fuse(profile: any, s: Sample, det: Detections): RiskSnapshot {
  const byType = {} as RiskSnapshot['byType'];
  let overall = 0;
  for (const k of RISK_TYPES) {
    const prior = priorAt(profile, s.holeDepth, k);
    const live = det[k].score;
    // Offset history raises attention; live evidence is what confirms it
    const fused = Math.min(0.99, 1 - (1 - 0.45 * prior) * (1 - live * (0.75 + 0.35 * prior)));
    byType[k] = { prior: round3(prior), live: round3(live), fused: round3(fused), reasons: det[k].reasons };
    overall = Math.max(overall, fused);
  }
  const nextZone = profile.zones.find((z: any) => z.baseFt > s.holeDepth) ?? null;
  return { overall: round3(overall), byType, nextZone: nextZone ? { ...nextZone, evidence: undefined, distanceFt: Math.max(0, Math.round(nextZone.topFt - s.holeDepth)) } : null };
}

async function tickAll() {
  for (const rt of runtimes.values()) {
    if (!rt.sim.running) continue;
    try { await tick(rt); } catch (err) { console.error('[live] tick failed:', err); }
  }
}

async function tick(rt: WellRuntime) {
  const profile = await ensureProfile(rt);
  const s = rt.sim.step();
  rt.tickCount++;
  const det = detect(rt.sim.history);
  const risk = fuse(profile, s, det);
  rt.lastRisk = risk;
  const wellId = rt.sim.wellId;

  await db.execute(sql`
    INSERT INTO drilling_parameters (well_id, recorded_at, hole_depth_ft, bit_depth_ft, rig_state, rop_ft_hr, wob_klbs, rpm, torque_kftlb, spp_psi,
       flow_in_gpm, flow_out_gpm, pit_volume_bbl, hook_load_klbs, mud_weight_ppg, ecd_ppg, total_gas_units)
    VALUES (${wellId}, (NOW() AT TIME ZONE 'UTC'), ${s.holeDepth},${s.bitDepth},${s.rigState},${s.rop},${s.wob},${s.rpm},${s.torque},${s.spp},${s.flowIn},${s.flowOut},${s.pit},${s.hookLoad},${s.mw},${s.ecd},${s.gas})
  `);
  if (rt.tickCount % 10 === 0) await db.execute(sql`UPDATE wells SET current_depth_ft = ${s.holeDepth} WHERE id = ${wellId}`);

  io?.to(room(wellId)).emit('drilling:update', { wellId, sample: s, risk, running: true, speed: rt.sim.speed });

  await lookaheadAlerts(rt, profile, s);
  await liveAlerts(rt, profile, s, risk);
}

async function lookaheadAlerts(rt: WellRuntime, profile: any, s: Sample) {
  const wellId = rt.sim.wellId;
  for (const z of profile.zones) {
    const dist = z.topFt - s.holeDepth;
    const issued = rt.lookaheadIssued.get(z.id);
    if (!issued && dist > 0 && dist <= LOOKAHEAD_FT && z.peakProbability >= 0.3) {
      const recs = await whatWorked(z.type, z.formation, profile.offsets.map((o: any) => o.id));
      const alert = await createAlert({
        wellId, kind: 'lookahead', riskType: z.type,
        severity: z.peakProbability >= 0.55 ? 'high' : 'medium',
        probability: z.peakProbability, bitDepthFt: s.holeDepth, zoneTopFt: z.topFt, zoneBaseFt: z.baseFt, formation: z.formation,
        title: `${EVENT_LABELS[z.type as RiskType]} zone ahead · ${z.formation}`,
        message: `In ${Math.round(dist)} ft (${m(dist)}) the bit enters ${m(z.topFt)}–${m(z.baseFt)} in ${z.formation}. ` +
          `${z.offsetsWithEvent} of ${z.offsetsPenetrated} offset wells that drilled this interval had ${EVENT_LABELS[z.type as RiskType].toLowerCase()} here` +
          `${z.nptHours ? `, costing ${z.nptHours} h NPT` : ''}. Peak likelihood ${Math.round(z.peakProbability * 100)}%.`,
        evidence: z.evidence, recommendations: recs,
      });
      rt.lookaheadIssued.set(z.id, alert!.id);
      io?.to(room(wellId)).emit('alert:new', alert);
    }
    // Auto-resolve once the bit is past the zone
    if (issued && s.holeDepth > z.baseFt + 30) {
      const a = await getAlert(issued);
      if (a && a.status === 'active') io?.to(room(wellId)).emit('alert:update', await updateAlert(issued, { status: 'resolved' }));
      rt.lookaheadIssued.set(z.id, 'done');
    }
  }
}

// Related mechanisms share one alert so a single pack-off does not raise three
const FAMILY: Record<RiskType, string> = {
  stuck_pipe: 'mechanical', tight_hole: 'mechanical', wellbore_instability: 'mechanical',
  mud_loss: 'loss', kick: 'influx', overpressure: 'pressure',
};

async function liveAlerts(rt: WellRuntime, profile: any, s: Sample, risk: RiskSnapshot) {
  const wellId = rt.sim.wellId;
  const ordered = [...RISK_TYPES].sort((a, b) => risk.byType[b].fused - risk.byType[a].fused);
  for (const k of ordered) {
    const r = risk.byType[k];
    const active = rt.liveActive.get(k);
    const familyBusy = [...rt.liveActive.keys()].some((other) => other !== k && FAMILY[other] === FAMILY[k]);
    if (!active && !familyBusy && r.fused >= RAISE_AT && r.live >= 0.35) {
      // Find the most similar historic case: same type, nearest equivalent depth
      const zone = profile.zones.find((z: any) => z.type === k && s.holeDepth >= z.topFt - 150 && s.holeDepth <= z.baseFt + 150);
      const similar = zone?.evidence?.[0];
      const recs = await whatWorked(k, s.formation, profile.offsets.map((o: any) => o.id));
      const alert = await createAlert({
        wellId, kind: 'live', riskType: k, severity: r.fused >= 0.8 ? 'critical' : 'high', probability: r.fused, bitDepthFt: s.holeDepth,
        zoneTopFt: zone?.topFt ?? null, zoneBaseFt: zone?.baseFt ?? null, formation: s.formation,
        title: `${EVENT_LABELS[k]} developing at ${m(s.holeDepth)}`,
        message: `${r.reasons.join('; ')}.` +
          (similar ? ` Pattern matches ${similar.wellName} (${similar.distanceKm} km away), which had ${EVENT_LABELS[k].toLowerCase()} at ${m(similar.depthMd)} in ${similar.formation}.` : '') +
          ` Offset history for this depth: ${Math.round(r.prior * 100)}%.`,
        evidence: zone?.evidence ?? [], recommendations: recs,
      });
      rt.liveActive.set(k, { alertId: alert!.id, lowTicks: 0, prob: r.fused });
      io?.to(room(wellId)).emit('alert:new', alert);
    } else if (active) {
      if (r.fused < CLEAR_AT) {
        active.lowTicks++;
        if (active.lowTicks >= 8) {
          const a = await getAlert(active.alertId);
          if (a && (a.status === 'active' || a.status === 'acknowledged')) io?.to(room(wellId)).emit('alert:update', await updateAlert(active.alertId, { status: 'resolved' }));
          rt.liveActive.delete(k);
        }
      } else {
        active.lowTicks = 0;
        if (r.fused > active.prob + 0.05) {
          active.prob = r.fused;
          const a = await getAlert(active.alertId);
          if (a && a.status === 'active') {
            io?.to(room(wellId)).emit('alert:update', await updateAlert(active.alertId, { probability: r.fused, severity: r.fused >= 0.8 ? 'critical' : 'high', message: `${r.reasons.join('; ')}. Offset history for this depth: ${Math.round(r.prior * 100)}%.` }));
          }
        }
      }
    }
  }
}

// ── Control & state (REST) ───────────────────────────────────
export function liveWells() { return [...runtimes.keys()]; }

export async function getLiveState(wellId: string) {
  const rt = runtimes.get(wellId);
  if (!rt) return null;
  const profile = await ensureProfile(rt);
  const last = rt.sim.history[rt.sim.history.length - 1];
  const risk = rt.lastRisk ?? (last ? fuse(profile, last, detect(rt.sim.history)) : null);
  return { wellId, running: rt.sim.running, speed: rt.sim.speed, history: rt.sim.history.slice(-400), risk, radiusKm: rt.radiusKm };
}

export async function controlLive(wellId: string, action: 'start' | 'pause' | 'reset' | 'speed' | 'radius', value?: number) {
  const rt = runtimes.get(wellId);
  if (!rt) throw Object.assign(new Error('This well has no live feed'), { statusCode: 404 });
  if (action === 'start') rt.sim.running = true;
  if (action === 'pause') rt.sim.running = false;
  if (action === 'speed' && value) rt.sim.speed = Math.max(5, Math.min(1200, value));
  const newRadius = action === 'radius' && value ? Math.max(2, Math.min(40, value)) : rt.radiusKm;
  const radiusChanged = newRadius !== rt.radiusKm;
  if (radiusChanged) { rt.radiusKm = newRadius; rt.profile = null; }
  if (action === 'reset') {
    rt.sim.running = false;
    rt.sim.reset();
    rt.lookaheadIssued.clear();
    rt.liveActive.clear();
    rt.lastRisk = null;
    await db.execute(sql`UPDATE alerts SET status = 'resolved' WHERE well_id = ${wellId} AND status IN ('active','acknowledged')`);
    await db.execute(sql`DELETE FROM drilling_parameters WHERE well_id = ${wellId}`);
    await db.execute(sql`UPDATE wells SET current_depth_ft = ${rt.sim.holeDepth} WHERE id = ${wellId}`);
  }
  const state = { wellId, running: rt.sim.running, speed: rt.sim.speed, radiusKm: rt.radiusKm };
  io?.to(room(wellId)).emit('sim:state', state);
  if (action === 'reset' || radiusChanged) io?.to(room(wellId)).emit('sim:reset', await getLiveState(wellId));
  return state;
}

export function invalidateLiveProfiles() { for (const rt of runtimes.values()) rt.profile = null; }

const round3 = (x: number) => Math.round(x * 1000) / 1000;
