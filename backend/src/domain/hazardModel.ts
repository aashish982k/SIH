/**
 * Ground-truth hazard model for the SYNTHETIC dataset.
 *
 * Used only by the seed generator and the eRTMAC replay simulator so that
 * historic offsets and the live well share the same underlying geology.
 * The intelligence layer never reads this file — it only sees the wells
 * and events it produces.
 */
import type { RiskType, EventType } from './taxonomy';

export interface FieldDef { name: string; code: string; lat: number; lon: number; spreadKm: number; wells: number; block: string; }

export const FIELDS: FieldDef[] = [
  { name: 'Naharkatia', code: 'NHK', lat: 27.290, lon: 95.330, spreadKm: 2.6, wells: 14, block: 'Upper Assam — Block A' },
  { name: 'Jorajan',    code: 'JRJ', lat: 27.330, lon: 95.470, spreadKm: 2.2, wells: 9,  block: 'Upper Assam — Block C' },
  { name: 'Hugrijan',   code: 'HGR', lat: 27.410, lon: 95.360, spreadKm: 2.2, wells: 8,  block: 'Upper Assam — Block D' },
  { name: 'Moran',      code: 'MRN', lat: 27.170, lon: 94.920, spreadKm: 2.8, wells: 9,  block: 'Upper Assam — Block B' },
];

export const REF = { lat: 27.30, lon: 95.30 };

/** Where each hazard sits inside its formation (relative position 0 = top, 1 = base). */
export interface HazardDef {
  formation: string; type: EventType; base: number; relMean: number; relSd: number;
  hotspots: Array<{ field: string; gain: number }>;
}

export const HAZARDS: HazardDef[] = [
  { formation: 'Girujan Clay',      type: 'tight_hole',           base: 0.30, relMean: 0.55, relSd: 0.18, hotspots: [{ field: 'Hugrijan', gain: 1.7 }] },
  { formation: 'Girujan Clay',      type: 'wellbore_instability', base: 0.12, relMean: 0.40, relSd: 0.20, hotspots: [] },
  { formation: 'Tipam Sandstone',   type: 'mud_loss',             base: 0.24, relMean: 0.72, relSd: 0.05, hotspots: [{ field: 'Naharkatia', gain: 2.6 }, { field: 'Jorajan', gain: 1.4 }] },
  { formation: 'Tipam Sandstone',   type: 'stuck_pipe',           base: 0.10, relMean: 0.55, relSd: 0.18, hotspots: [{ field: 'Naharkatia', gain: 1.5 }] },
  { formation: 'Barail Coal-Shale', type: 'stuck_pipe',           base: 0.30, relMean: 0.12, relSd: 0.06, hotspots: [{ field: 'Naharkatia', gain: 2.4 }, { field: 'Jorajan', gain: 1.5 }] },
  { formation: 'Barail Coal-Shale', type: 'wellbore_instability', base: 0.30, relMean: 0.35, relSd: 0.15, hotspots: [] },
  { formation: 'Barail Coal-Shale', type: 'tight_hole',           base: 0.18, relMean: 0.22, relSd: 0.10, hotspots: [{ field: 'Naharkatia', gain: 1.6 }] },
  { formation: 'Barail Arenaceous', type: 'mud_loss',             base: 0.14, relMean: 0.40, relSd: 0.20, hotspots: [{ field: 'Moran', gain: 2.0 }] },
  { formation: 'Barail Arenaceous', type: 'kick',                 base: 0.06, relMean: 0.70, relSd: 0.15, hotspots: [{ field: 'Hugrijan', gain: 2.0 }] },
  { formation: 'Kopili',            type: 'overpressure',         base: 0.20, relMean: 0.38, relSd: 0.12, hotspots: [{ field: 'Hugrijan', gain: 3.4 }, { field: 'Naharkatia', gain: 1.3 }] },
  { formation: 'Kopili',            type: 'kick',                 base: 0.10, relMean: 0.58, relSd: 0.10, hotspots: [{ field: 'Hugrijan', gain: 3.2 }] },
  { formation: 'Sylhet Limestone',  type: 'mud_loss',             base: 0.40, relMean: 0.10, relSd: 0.06, hotspots: [{ field: 'Moran', gain: 1.5 }] },
];

/** Mitigation choices per event type with their chance of fully resolving it. */
export const MITIGATION_OPTIONS: Record<string, Array<{ key: string; success: number; nptMul: number }>> = {
  mud_loss:             [{ key: 'lcm_pill', success: 0.68, nptMul: 1 }, { key: 'reduce_mw', success: 0.55, nptMul: 0.8 }, { key: 'cement_plug', success: 0.85, nptMul: 1.8 }],
  stuck_pipe:           [{ key: 'spot_pipe_lax', success: 0.72, nptMul: 1 }, { key: 'jar_and_work', success: 0.42, nptMul: 1.3 }],
  tight_hole:           [{ key: 'back_ream', success: 0.8, nptMul: 1 }, { key: 'raise_mw_inhibit', success: 0.66, nptMul: 1.2 }],
  wellbore_instability: [{ key: 'raise_mw_inhibit', success: 0.74, nptMul: 1 }, { key: 'back_ream', success: 0.48, nptMul: 1.3 }],
  kick:                 [{ key: 'shut_in_kill', success: 0.9, nptMul: 1 }],
  overpressure:         [{ key: 'raise_mw_inhibit', success: 0.78, nptMul: 1 }, { key: 'shut_in_kill', success: 0.85, nptMul: 1.4 }],
  cementing_issue:      [{ key: 'squeeze_cement', success: 0.7, nptMul: 1 }],
  fishing:              [{ key: 'fishing_tools', success: 0.6, nptMul: 1 }],
};

export const NPT_RANGE: Record<string, [number, number]> = {
  mud_loss: [3, 30], kick: [6, 36], stuck_pipe: [10, 70], tight_hole: [2, 12],
  overpressure: [2, 16], wellbore_instability: [4, 26], cementing_issue: [8, 30], fishing: [18, 96], other: [1, 8],
};

/** Live wells drilled by the eRTMAC replay, and the hidden episodes the replay will produce. */
export interface LiveScenario {
  wellId: string; name: string; field: string; eastKm: number; northKm: number;
  startFormation: string; startRel: number;
  episodes: Array<{ type: RiskType; formation: string; rel: number; lengthFt: number }>;
}

export const LIVE_SCENARIOS: LiveScenario[] = [
  {
    wellId: '90000000-0000-0000-0000-000000000047', name: 'NHK-47', field: 'Naharkatia', eastKm: 0.6, northKm: -0.4,
    startFormation: 'Tipam Sandstone', startRel: 0.52,
    episodes: [
      { type: 'mud_loss',   formation: 'Tipam Sandstone',   rel: 0.68, lengthFt: 80 },
      { type: 'stuck_pipe', formation: 'Barail Coal-Shale', rel: 0.07, lengthFt: 90 },
    ],
  },
  {
    wellId: '90000000-0000-0000-0000-000000000022', name: 'HGR-22', field: 'Hugrijan', eastKm: -0.5, northKm: 0.7,
    startFormation: 'Barail Arenaceous', startRel: 0.55,
    episodes: [
      { type: 'overpressure', formation: 'Kopili', rel: 0.36, lengthFt: 110 },
      { type: 'kick',         formation: 'Kopili', rel: 0.57, lengthFt: 60 },
    ],
  },
];

// ── Deterministic helpers ─────────────────────────────────────
export function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Structural depth shift (ft) at a local position — gentle SE dip plus field anticlines. */
export function structureShiftFt(xKm: number, yKm: number): number {
  let s = 22 * (0.6 * xKm - 0.8 * yKm);
  for (const f of FIELDS) {
    const dx = xKm - (f.lon - REF.lon) * 98.9, dy = yKm - (f.lat - REF.lat) * 111.2;
    s -= 160 * Math.exp(-(dx * dx + dy * dy) / 9);
  }
  return s;
}

/** Thickness multiplier per formation, smooth in space. */
export function thicknessFactor(seq: number, xKm: number, yKm: number): number {
  return 1 + 0.08 * Math.sin(xKm / 7 + seq) + 0.06 * Math.cos(yKm / 5 + seq * 1.7);
}

/** Probability multiplier from field hotspots (Gaussian, ~4 km radius). */
export function hotspotGain(h: HazardDef, xKm: number, yKm: number): number {
  let g = 1;
  for (const hs of h.hotspots) {
    const f = FIELDS.find(ff => ff.name === hs.field)!;
    const dx = xKm - (f.lon - REF.lon) * 98.9, dy = yKm - (f.lat - REF.lat) * 111.2;
    g += (hs.gain - 1) * Math.exp(-(dx * dx + dy * dy) / 16);
  }
  return g;
}
