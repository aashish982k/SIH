/**
 * Offset-well intelligence (Layer A).
 *  - Offset selection measured along each wellbore at the same formation, not just at surface.
 *  - Hazard profile: for every depth bin of the active well, the distance-weighted share of
 *    offset wells that had each problem at the formation-equivalent depth.
 */
import { query, queryOne } from '../config/db';
import { env } from '../config/env';
import { haversineKm, offsetLatLon, positionAtMd, type Position } from '../domain/geo';
import { FORMATIONS } from '../domain/stratigraphy';
import { RISK_TYPES, EVENT_LABELS, MITIGATIONS, type RiskType } from '../domain/taxonomy';
import { getEvents, getFormations, getSurveys, normalizeWell } from './wellService';

const BIN_FT = 25;
const KERNEL_FT = 90;         // how far an offset event “spreads” in equivalent depth
const ALPHA = 0.8;            // Bayesian smoothing weight (in “wells”)
const BASE_RATE = 0.03;       // prior per bin when there is no offset evidence
export const ZONE_THRESHOLD = 0.3;

type Formation = { name: string; seq: number; topMd: number; bottomMd: number | null; topTvd: number; bottomTvd: number | null; color: string; predicted: boolean; lithology: string };

function thickness(f: Formation): number | null {
  return f.bottomTvd != null ? f.bottomTvd - f.topTvd : null;
}

// ── Offsets ──────────────────────────────────────────────────
export async function getOffsets(wellId: string, radiusKm = env.DEFAULT_RADIUS_KM) {
  const active = await queryOne(`SELECT * FROM wells WHERE id = ?`, [wellId]);
  if (!active) throw Object.assign(new Error('Well not found'), { statusCode: 404 });
  const lat = Number(active.latitude), lon = Number(active.longitude);

  // Surface pre-filter with the spatial index; 3 km slack for deviated wells
  const candidates = await query(
    `SELECT w.*, ST_Distance_Sphere(w.location, ST_GeomFromText(?, 4326)) / 1000 AS surface_km
     FROM wells w WHERE w.id <> ? AND w.status <> 'drilling'
       AND ST_Distance_Sphere(w.location, ST_GeomFromText(?, 4326)) <= ?`,
    [`POINT(${lat} ${lon})`, wellId, `POINT(${lat} ${lon})`, (radiusKm + 3) * 1000]
  );
  const ids = candidates.map((c: any) => c.id);
  const [fmMap, svMap, activeFm, activeSv] = await Promise.all([getFormations(ids), getSurveys(ids), getFormations([wellId]), getSurveys([wellId])]);
  const aFormations: Formation[] = activeFm.get(wellId) ?? [];
  const aStations: Position[] = activeSv.get(wellId) ?? [];

  const offsets = [] as any[];
  for (const c of candidates as any[]) {
    const stations: Position[] = svMap.get(c.id) ?? [];
    const formations: Formation[] = fmMap.get(c.id) ?? [];
    const distanceByFormation: Record<string, number> = {};
    for (const f of formations) {
      const af = aFormations.find((x) => x.name === f.name);
      if (!af) continue;
      const p = positionAtMd(stations, f.topMd);
      const ap = positionAtMd(aStations, af.topMd);
      const [plat, plon] = offsetLatLon(Number(c.latitude), Number(c.longitude), p.north, p.east);
      const [alat, alon] = offsetLatLon(lat, lon, ap.north, ap.east);
      distanceByFormation[f.name] = Math.round(haversineKm(alat, alon, plat, plon) * 100) / 100;
    }
    const vals = Object.values(distanceByFormation);
    const nearest = vals.length ? Math.min(...vals) : Number(c.surface_km);
    if (nearest > radiusKm) continue;

    const td = Number(c.total_depth_ft ?? 0);
    const path: Array<[number, number]> = [];
    for (let md = 0; md <= td; md += Math.max(250, td / 30)) {
      const p = positionAtMd(stations, md);
      path.push(offsetLatLon(Number(c.latitude), Number(c.longitude), p.north, p.east));
    }
    const bh = positionAtMd(stations, td);
    offsets.push({
      ...normalizeWell(c),
      surfaceDistanceKm: Math.round(Number(c.surface_km) * 100) / 100,
      nearestDistanceKm: nearest,
      distanceByFormation,
      bottomHole: offsetLatLon(Number(c.latitude), Number(c.longitude), bh.north, bh.east),
      horizontalDisplacementFt: Math.round(Math.hypot(bh.north, bh.east)),
      path,
      formations,
    });
  }
  offsets.sort((a, b) => a.nearestDistanceKm - b.nearestDistanceKm);
  return { active: { ...normalizeWell(active), formations: aFormations }, radiusKm, offsets };
}

// ── Hazard profile ───────────────────────────────────────────
const cache = new Map<string, { at: number; value: any }>();
export function invalidateHazardCache() { cache.clear(); }

export async function getHazardProfile(wellId: string, radiusKm = env.DEFAULT_RADIUS_KM) {
  const key = `${wellId}|${radiusKm}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.value;

  const { active, offsets } = await getOffsets(wellId, radiusKm);
  const events = await getEvents(offsets.map((o) => o.id));
  const aFm: Formation[] = active.formations;
  const td = active.plannedTdFt ?? active.totalDepthFt ?? (aFm.length ? (aFm[aFm.length - 1].bottomTvd ?? 12000) : 12000);
  const sigma = Math.max(1.5, radiusKm * 0.55);

  // Pre-compute per offset: weight per formation, events with relative position
  const offsetInfo = offsets.map((o) => {
    const evs = events.filter((e) => e.wellId === o.id).map((e) => {
      const f: Formation | undefined = o.formations.find((ff: Formation) => ff.name === e.formation);
      const th = f ? thickness(f) : null;
      return { ...e, rel: f && th ? (e.depthTvd - f.topTvd) / th : null };
    });
    return { o, evs };
  });

  const bins: Array<{ depth: number; formation: string | null; rel: number | null; p: Record<string, number>; wells: number }> = [];
  for (let z = 0; z <= td; z += BIN_FT) {
    const f = aFm.find((x) => z >= x.topTvd && z < (x.bottomTvd ?? Infinity));
    const p: Record<string, number> = {};
    if (!f || f.bottomTvd == null) { RISK_TYPES.forEach((k) => (p[k] = 0)); bins.push({ depth: z, formation: f?.name ?? null, rel: null, p, wells: 0 }); continue; }
    const rel = (z - f.topTvd) / (f.bottomTvd - f.topTvd);
    let sumW = 0;
    const sumHit: Record<string, number> = Object.fromEntries(RISK_TYPES.map((k) => [k, 0]));
    for (const { o, evs } of offsetInfo) {
      const of: Formation | undefined = o.formations.find((ff: Formation) => ff.name === f.name);
      const oth = of ? thickness(of) : null;
      if (!of || !oth) continue;
      // Only wells that actually drilled this equivalent depth count as evidence
      const equivTvd = of.topTvd + rel * oth;
      const reachedTvd = o.formations[o.formations.length - 1]?.bottomTvd ?? 0;
      if (equivTvd > reachedTvd) continue;
      const d = o.distanceByFormation[f.name] ?? o.nearestDistanceKm;
      const w = Math.exp(-((d / sigma) ** 2));
      sumW += w;
      for (const k of RISK_TYPES) {
        let h = 0;
        for (const e of evs) {
          if (e.type !== k || e.formation !== f.name || e.rel == null) continue;
          const dz = (e.rel - rel) * (f.bottomTvd - f.topTvd);
          h = Math.max(h, Math.exp(-((dz / KERNEL_FT) ** 2)));
        }
        sumHit[k] += w * h;
      }
    }
    for (const k of RISK_TYPES) p[k] = Math.round(((sumHit[k] + ALPHA * BASE_RATE) / (sumW + ALPHA)) * 1000) / 1000;
    bins.push({ depth: z, formation: f.name, rel, p, wells: Math.round(sumW * 10) / 10 });
  }

  // Zones: contiguous bins above threshold, with the evidence behind them
  const zones: any[] = [];
  for (const k of RISK_TYPES) {
    let start = -1;
    for (let i = 0; i <= bins.length; i++) {
      const on = i < bins.length && bins[i].p[k] >= ZONE_THRESHOLD;
      if (on && start < 0) start = i;
      if (!on && start >= 0) {
        const seg = bins.slice(start, i);
        const peak = seg.reduce((m, b) => (b.p[k] > m.p[k] ? b : m), seg[0]);
        const fName = peak.formation!;
        const af = aFm.find((x) => x.name === fName)!;
        const relTop = (seg[0].depth - af.topTvd) / ((af.bottomTvd ?? af.topTvd + 1) - af.topTvd);
        const relBase = (seg[seg.length - 1].depth + BIN_FT - af.topTvd) / ((af.bottomTvd ?? af.topTvd + 1) - af.topTvd);
        const penetrated = new Set<string>(), withEvent = new Set<string>();
        const evidence: any[] = [];
        for (const { o, evs } of offsetInfo) {
          const of = o.formations.find((ff: Formation) => ff.name === fName);
          if (!of || !thickness(of)) continue;
          const reached = (o.formations[o.formations.length - 1]?.bottomTvd ?? 0) >= of.topTvd + relBase * thickness(of)!;
          if (reached) penetrated.add(o.id);
          for (const e of evs) {
            if (e.type !== k || e.formation !== fName || e.rel == null) continue;
            if (e.rel < relTop - 0.12 || e.rel > relBase + 0.12) continue;
            withEvent.add(o.id);
            evidence.push({ ...e, distanceKm: o.distanceByFormation[fName] ?? o.nearestDistanceKm, equivalentDepthFt: Math.round(af.topTvd + e.rel * ((af.bottomTvd ?? 0) - af.topTvd)) });
          }
        }
        evidence.sort((a, b) => a.distanceKm - b.distanceKm);
        zones.push({
          id: `${k}:${seg[0].depth}`, type: k, label: EVENT_LABELS[k], formation: fName,
          topFt: seg[0].depth, baseFt: seg[seg.length - 1].depth + BIN_FT, peakFt: peak.depth,
          peakProbability: peak.p[k], offsetsWithEvent: withEvent.size, offsetsPenetrated: Math.max(penetrated.size, withEvent.size),
          evidence: evidence.slice(0, 8),
          nptHours: Math.round(evidence.reduce((s, e) => s + (e.nptHours ?? 0), 0) * 10) / 10,
        });
        start = -1;
      }
    }
  }
  zones.sort((a, b) => a.topFt - b.topFt);

  const value = {
    wellId, radiusKm, binFt: BIN_FT, sigmaKm: Math.round(sigma * 10) / 10,
    offsets: offsets.map(({ formations, path, ...o }) => o),
    formations: aFm,
    bins, zones,
    method: 'Distance-weighted, formation-aligned offset frequency with Bayesian smoothing',
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}

// ── What worked before ───────────────────────────────────────
export async function whatWorked(type: string, formation: string | null, offsetIds: string[]) {
  const scoped = async (ids: string[] | null) => {
    const c: string[] = ['e.event_type = ?', 'e.mitigation_key IS NOT NULL']; const p: any[] = [type];
    if (formation) { c.push('e.formation_name = ?'); p.push(formation); }
    if (ids) { if (!ids.length) return []; c.push(`e.well_id IN (${ids.map(() => '?').join(',')})`); p.push(...ids); }
    return query(`SELECT e.*, w.name AS well_name FROM operational_events e JOIN wells w ON w.id = e.well_id WHERE ${c.join(' AND ')}`, p);
  };
  let rows: any[] = await scoped(offsetIds);
  let scope = 'offset wells';
  if (rows.length < 3) { rows = await scoped(null); scope = 'all wells in the database'; }

  const groups = new Map<string, any[]>();
  for (const r of rows) groups.set(r.mitigation_key, [...(groups.get(r.mitigation_key) ?? []), r]);
  const score = (r: any) => (r.outcome_rating === 'resolved' ? 1 : r.outcome_rating === 'partial' ? 0.5 : 0);
  const ranked = [...groups.entries()].map(([key, list]) => {
    const success = list.reduce((s, r) => s + score(r), 0) / list.length;
    const best = [...list].sort((a, b) => score(b) - score(a) || Number(a.npt_hours) - Number(b.npt_hours))[0];
    return {
      key, label: MITIGATIONS[key]?.label ?? key, uses: list.length,
      successRate: Math.round(success * 100) / 100,
      avgNptHours: Math.round((list.reduce((s, r) => s + Number(r.npt_hours ?? 0), 0) / list.length) * 10) / 10,
      example: { wellName: best.well_name, depthMd: Number(best.depth_md_ft), text: best.mitigation, outcome: best.outcome },
      rank: success * Math.log(1 + list.length),
    };
  }).sort((a, b) => b.rank - a.rank);
  return { scope, basedOn: rows.length, options: ranked.slice(0, 3).map(({ rank, ...r }) => r) };
}

export const RISK_ORDER: RiskType[] = [...RISK_TYPES];
export { FORMATIONS };
