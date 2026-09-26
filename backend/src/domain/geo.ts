const DEG = Math.PI / 180;
const EARTH_R_M = 6371008.8;
export const FT_PER_M = 3.28084;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * DEG, dLon = (lon2 - lon1) * DEG;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return (2 * EARTH_R_M * Math.asin(Math.sqrt(a))) / 1000;
}

/** Offset a lat/lon by north/east feet (small-distance approximation, fine for < 50 km). */
export function offsetLatLon(lat: number, lon: number, northFt: number, eastFt: number): [number, number] {
  const n = northFt / FT_PER_M, e = eastFt / FT_PER_M;
  return [lat + (n / EARTH_R_M) / DEG, lon + (e / (EARTH_R_M * Math.cos(lat * DEG))) / DEG];
}

/** Local planar coordinates in km relative to a reference point. */
export function toLocalKm(refLat: number, refLon: number, lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon - refLon) * DEG * EARTH_R_M * Math.cos(refLat * DEG)) / 1000,
    y: ((lat - refLat) * DEG * EARTH_R_M) / 1000,
  };
}

export interface SurveyStation { md: number; inc: number; azi: number; }
export interface Position { md: number; inc: number; azi: number; tvd: number; north: number; east: number; }

/** Minimum-curvature method (Sawaryn & Thorogood 2005). Angles in degrees, lengths in ft. */
export function minimumCurvature(stations: SurveyStation[]): Position[] {
  const out: Position[] = [];
  let tvd = 0, north = 0, east = 0;
  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    if (i === 0) { out.push({ ...s, tvd: s.md * Math.cos(s.inc * DEG), north: 0, east: 0 }); tvd = out[0].tvd; continue; }
    const p = stations[i - 1];
    const dMd = s.md - p.md;
    const i1 = p.inc * DEG, i2 = s.inc * DEG, a1 = p.azi * DEG, a2 = s.azi * DEG;
    const cosDl = Math.cos(i2 - i1) - Math.sin(i1) * Math.sin(i2) * (1 - Math.cos(a2 - a1));
    const dl = Math.acos(Math.min(1, Math.max(-1, cosDl)));
    const rf = dl > 1e-9 ? (2 / dl) * Math.tan(dl / 2) : 1;
    north += (dMd / 2) * (Math.sin(i1) * Math.cos(a1) + Math.sin(i2) * Math.cos(a2)) * rf;
    east  += (dMd / 2) * (Math.sin(i1) * Math.sin(a1) + Math.sin(i2) * Math.sin(a2)) * rf;
    tvd   += (dMd / 2) * (Math.cos(i1) + Math.cos(i2)) * rf;
    out.push({ ...s, tvd, north, east });
  }
  return out;
}

/** Linear interpolation of a position along precomputed stations at a given MD. */
export function positionAtMd(stations: Position[], md: number): Position {
  if (!stations.length) return { md, inc: 0, azi: 0, tvd: md, north: 0, east: 0 };
  if (md <= stations[0].md) return { ...stations[0], md, tvd: md };
  for (let i = 1; i < stations.length; i++) {
    const a = stations[i - 1], b = stations[i];
    if (md <= b.md) {
      const t = (md - a.md) / (b.md - a.md || 1);
      const lerp = (x: number, y: number) => x + (y - x) * t;
      return { md, inc: lerp(a.inc, b.inc), azi: lerp(a.azi, b.azi), tvd: lerp(a.tvd, b.tvd), north: lerp(a.north, b.north), east: lerp(a.east, b.east) };
    }
  }
  const last = stations[stations.length - 1];
  const extra = md - last.md;
  return { ...last, md, tvd: last.tvd + extra * Math.cos(last.inc * DEG),
    north: last.north + extra * Math.sin(last.inc * DEG) * Math.cos(last.azi * DEG),
    east: last.east + extra * Math.sin(last.inc * DEG) * Math.sin(last.azi * DEG) };
}

/** MD at which the well reaches a given TVD. */
export function mdAtTvd(stations: Position[], tvd: number): number {
  if (!stations.length || tvd <= stations[0].tvd) return tvd;
  for (let i = 1; i < stations.length; i++) {
    const a = stations[i - 1], b = stations[i];
    if (tvd <= b.tvd) return a.md + (b.md - a.md) * ((tvd - a.tvd) / (b.tvd - a.tvd || 1));
  }
  const last = stations[stations.length - 1];
  return last.md + (tvd - last.tvd) / Math.max(0.2, Math.cos(last.inc * DEG));
}
