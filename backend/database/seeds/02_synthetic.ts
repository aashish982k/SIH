/**
 * Synthetic Upper Assam dataset (clearly fictional — for demo and development).
 * Deterministic: the same seed always produces the same wells and events.
 */
import { pool } from '../../src/config/db';

async function query(qs: string, params: any[] = []) {
  let i = 1;
  const pgQs = qs.replace(/\?/g, () => `$${i++}`);
  return pool.query(pgQs, params);
}
import { FORMATIONS } from '../../src/domain/stratigraphy';
import { EVENT_LABELS, type EventType } from '../../src/domain/taxonomy';
import { minimumCurvature, mdAtTvd, positionAtMd, offsetLatLon, toLocalKm, FT_PER_M, type Position } from '../../src/domain/geo';
import {
  FIELDS, HAZARDS, LIVE_SCENARIOS, MITIGATION_OPTIONS, NPT_RANGE, REF,
  mulberry32, structureShiftFt, thicknessFactor, hotspotGain,
} from '../../src/domain/hazardModel';

const rnd = mulberry32(20260926);
const uniform = (a: number, b: number) => a + (b - a) * rnd();
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const r1 = (x: number) => Math.round(x * 10) / 10;
const idOf = (prefix: string, n: number) => `${prefix}-0000-0000-0000-${String(n).padStart(12, '0')}`;
const fmtM = (ft: number) => `${Math.round(ft / FT_PER_M).toLocaleString('en-IN')} m`;
const fmtFt = (ft: number) => `${Math.round(ft).toLocaleString('en-IN')} ft`;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const iso = (d: Date) => d.toISOString().slice(0, 10);

// ── Geology at a point ────────────────────────────────────────
export function topsAt(xKm: number, yKm: number, noise = true): Array<{ name: string; seq: number; lithology: string; topTvd: number; baseTvd: number }> {
  const shift = structureShiftFt(xKm, yKm);
  let depth = 0;
  return FORMATIONS.map(f => {
    const thick = f.typicalThicknessFt * thicknessFactor(f.seq, xKm, yKm) * (noise ? 1 + 0.025 * gauss() : 1);
    const top = f.seq === 1 ? 0 : depth + (f.seq === 2 ? shift : 0);
    depth = top + thick;
    return { name: f.name, seq: f.seq, lithology: f.lithology, topTvd: Math.max(0, top), baseTvd: depth };
  });
}

// ── Report language ──────────────────────────────────────────
const CAUSES: Record<string, string[]> = {
  mud_loss: ['Depleted, highly permeable sand with induced fractures at high ECD.', 'Natural fractures intersected; surge while running in contributed.', 'Overbalance of ~600 psi across depleted interval.'],
  stuck_pipe: ['Differential sticking across permeable sand during a long connection.', 'Coal cavings packed off around the BHA; poor hole cleaning.', 'Mechanical sticking in under-gauge hole after bit trip.'],
  tight_hole: ['Swelling of reactive clays after prolonged exposure to mud.', 'Ledges at coal/shale interfaces.', 'Insufficient inhibition; clay hydration.'],
  wellbore_instability: ['Brittle coal and fissile shale failing under low mud weight.', 'Time-dependent shale hydration; splintery cavings on shakers.', 'Mud weight below collapse gradient in coal seams.'],
  kick: ['Abnormally pressured sand stringer; mud weight insufficient.', 'Swabbing while pulling out through the pressured zone.', 'Pore pressure ramp in shale not detected in time.'],
  overpressure: ['Undercompacted shale with rising pore pressure.', 'Transition zone below regional seal; d-exponent reversal ignored.', 'Gas-bearing stringers within pressured shale.'],
  cementing_issue: ['Losses during displacement into weak zone at the shoe.', 'Poor centralisation; channelling in washed-out section.', 'Slurry density exceeded fracture gradient.'],
  fishing: ['Drill string parted after prolonged jarring.', 'BHA left in hole after back-off.'],
};

const MITIGATION_TEXT: Record<string, string[]> = {
  lcm_pill: ['Pumped {n} bbl LCM pill (40 ppb calcium carbonate + mica) and allowed to soak.', 'Spotted {n} bbl high-concentration LCM pill across the loss zone.'],
  reduce_mw: ['Reduced mud weight from {mw1} to {mw2} ppg and lowered flow rate to cut ECD.', 'Lowered ECD by reducing pump rate and mud weight to {mw2} ppg.'],
  cement_plug: ['Spotted cement plug across the loss zone, WOC 12 hrs, drilled out.', 'Set balanced cement plug over the loss interval and drilled out.'],
  spot_pipe_lax: ['Spotted {n} bbl pipe-lax pill around BHA, soaked 6 hrs, jarred down.', 'Spotted diesel-based spotting fluid and worked pipe with jars.'],
  jar_and_work: ['Jarred up and down repeatedly and worked pipe with torque.', 'Worked pipe and jarred for several hours.'],
  back_ream: ['Back-reamed through the tight section and made a wiper trip.', 'Performed wiper trip and back-reamed stand by stand.'],
  raise_mw_inhibit: ['Raised mud weight to {mw2} ppg and increased KCl/glycol inhibition.', 'Increased mud weight to {mw2} ppg; added glycol for shale inhibition.'],
  shut_in_kill: ['Shut in the well, recorded SIDPP/SICP, circulated out by driller\'s method with {mw2} ppg kill mud.', 'Shut in immediately; killed well using wait-and-weight method at {mw2} ppg.'],
  sidetrack: ['Plugged back and sidetracked around the fish.'],
  squeeze_cement: ['Performed remedial squeeze cementing above the shoe.'],
  fishing_tools: ['Ran overshot and jars; recovered fish after several runs.', 'Ran fishing assembly with spear and junk basket.'],
};

const OUTCOME_TEXT: Record<string, Record<'resolved' | 'partial' | 'failed', string[]>> = {
  default: {
    resolved: ['Problem cured; drilling resumed normally.', 'Returns fully restored; resumed drilling.'],
    partial: ['Situation improved but seepage/drag continued for the rest of the section.', 'Partially controlled; drilled ahead with reduced parameters.'],
    failed: ['Mitigation unsuccessful; section plugged back.', 'Not successful; required further remedial work.'],
  },
  stuck_pipe: {
    resolved: ['Pipe freed; circulated and resumed drilling.'],
    partial: ['Pipe freed after extended jarring; BHA damaged.'],
    failed: ['Could not free pipe; backed off and left fish in hole.'],
  },
};

const LESSONS: Record<string, string[]> = {
  mud_loss: ['Pre-treat with LCM before entering the lower {fm}; keep ECD below 10.4 ppg.', 'Control ROP and surge pressures across the lower {fm}.'],
  stuck_pipe: ['Minimise connection time in {fm}; keep pipe moving and pre-spot pipe-lax before long connections.', 'Improve hole cleaning before entering {fm}; watch torque trend closely.'],
  tight_hole: ['Maintain inhibition and plan wiper trips every 500 ft in {fm}.', 'Back-ream proactively when overpull exceeds 30 klbs in {fm}.'],
  wellbore_instability: ['Raise mud weight before entering {fm}; monitor cavings shape on shakers.', 'Keep mud weight ≥ 10.3 ppg through {fm}.'],
  kick: ['Increase mud weight ahead of {fm}; flow-check every connection in the transition.', 'Watch pit volume and flow-out closely in {fm}.'],
  overpressure: ['Track corrected d-exponent and background gas from the top of {fm}.', 'Plan mud weight ramp before {fm}; offset wells show pressure transition.'],
  cementing_issue: ['Use lightweight slurry and staged cementing when losses occurred in {fm}.'],
  fishing: ['Limit jarring cycles; decide on back-off earlier.'],
};

function fill(t: string, vars: Record<string, string | number>) { return t.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')); }

function severityFor(npt: number) { return npt < 6 ? 'low' : npt < 16 ? 'medium' : npt < 36 ? 'high' : 'critical'; }

function describe(type: EventType, depthFt: number, fm: string, rng = rnd): string {
  const m = fmtM(depthFt), f = fmtFt(depthFt);
  const T: Record<string, string[]> = {
    mud_loss: [`Partial losses of ${Math.round(uniform(20, 80))} bbl/hr observed at ${m} (${f}) while drilling ${fm}.`, `Complete loss of returns at ${m} in ${fm}; annulus dropped out of sight.`, `Losses of ${Math.round(uniform(15, 60))} bbl/hr while drilling ${fm} at ${m}.`],
    stuck_pipe: [`String got differentially stuck at ${m} (${f}) in ${fm} after a connection.`, `Pipe held up at ${m} while pulling out through ${fm}; unable to rotate or circulate freely.`, `Stuck pipe at ${m} in ${fm} with pack-off; string could not be worked up.`],
    tight_hole: [`Tight spots with overpull of ${Math.round(uniform(30, 70))} klbs at ${m} in ${fm}.`, `Excess drag and intermittent pack-off at ${m} (${f}) while tripping through ${fm}.`],
    wellbore_instability: [`Heavy splintery cavings on shakers from ${m} in ${fm}; hole enlargement suspected.`, `Sloughing shale and coal cavings at ${m} (${f}) in ${fm}.`],
    kick: [`Kick taken at ${m} (${f}) in ${fm}: pit gain of ${Math.round(uniform(6, 22))} bbl with flow-out increase.`, `Well flowing on connection at ${m} in ${fm}; influx of ${Math.round(uniform(5, 15))} bbl.`],
    overpressure: [`High background gas (${Math.round(uniform(80, 260))} units) and connection gas from ${m} in ${fm}; d-exponent reversed.`, `Gas-cut mud and rising connection gas at ${m} (${f}) indicating overpressure in ${fm}.`],
    cementing_issue: [`Losses during cement displacement for casing shoe at ${m}; top of cement lower than planned.`, `CBL showed poor bond above shoe at ${m} (${f}).`],
    fishing: [`Fishing job at ${m} to recover BHA left in hole in ${fm}.`],
  };
  return (T[type] ?? [`${EVENT_LABELS[type]} at ${m} in ${fm}.`])[Math.floor(rng() * (T[type]?.length ?? 1))];
}

// ── Main ─────────────────────────────────────────────────────
interface GenWell {
  id: string; name: string; field: string; block: string; pad: string | null; type: 'exploratory' | 'appraisal' | 'development';
  profile: 'vertical' | 'deviated'; lat: number; lon: number; x: number; y: number;
  stations: Position[]; tops: ReturnType<typeof topsAt>; tdMd: number; spud: Date; status: 'completed' | 'drilling';
}

export async function seedSynthetic(): Promise<void> {
  const wells: GenWell[] = [];
  let wellNo = 1;

  for (const field of FIELDS) {
    const nums = Array.from({ length: field.wells }, (_, i) => 3 + i * 2 + Math.floor(rnd() * 2)).sort((a, b) => a - b);
    const padCenters = [0, 1].map(() => ({ e: gauss() * field.spreadKm * 0.5, n: gauss() * field.spreadKm * 0.5 }));
    for (let i = 0; i < field.wells; i++) {
      const onPad = i >= 2 && i < 8;  // six pad wells per field (two pads of three)
      const padIdx = onPad ? (i < 5 ? 0 : 1) : -1;
      const pc = padIdx >= 0 ? padCenters[padIdx] : { e: gauss() * field.spreadKm, n: gauss() * field.spreadKm };
      const [lat, lon] = offsetLatLon(field.lat, field.lon, (pc.n + (onPad ? uniform(-0.02, 0.02) : 0)) * 1000 * FT_PER_M, (pc.e + (onPad ? uniform(-0.02, 0.02) : 0)) * 1000 * FT_PER_M);
      const deviated = onPad && (i % 3 !== 2);
      const { x, y } = toLocalKm(REF.lat, REF.lon, lat, lon);

      // Trajectory
      const kop = uniform(1600, 2600), targetInc = uniform(22, 38), azi = uniform(0, 360);
      const surveyStations = [] as Array<{ md: number; inc: number; azi: number }>;
      const provisionalTd = 12600;
      for (let md = 0; md <= provisionalTd; md += 200) {
        const inc = deviated ? clamp((md - kop) / 100 * 2.5, 0, targetInc) : Math.abs(0.3 + 0.2 * gauss());
        surveyStations.push({ md, inc: md === 0 ? 0 : inc, azi: deviated ? azi : uniform(0, 360) });
      }
      const stations = minimumCurvature(surveyStations);

      // Tops evaluated at the wellbore's position near that depth
      const tops0 = topsAt(x, y);
      const tops = tops0.map(t => {
        const pos = positionAtMd(stations, mdAtTvd(stations, t.topTvd));
        const lx = x + pos.east / FT_PER_M / 1000, ly = y + pos.north / FT_PER_M / 1000;
        const shifted = topsAt(lx, ly, false).find(tt => tt.name === t.name)!;
        return { ...t, topTvd: t.seq === 1 ? 0 : (t.topTvd + shifted.topTvd) / 2 };
      });
      for (let k = 0; k < tops.length; k++) tops[k].baseTvd = k < tops.length - 1 ? tops[k + 1].topTvd : tops[k].topTvd + FORMATIONS[k].typicalThicknessFt;

      const shallow = rnd() < 0.3;
      const tdTvd = shallow ? tops[5].topTvd + uniform(400, 900) : tops[7].topTvd + uniform(250, 600);
      const tdMd = mdAtTvd(stations, tdTvd);
      const year = Math.floor(uniform(2006, 2024));
      wells.push({
        id: idOf('10000000', wellNo), name: `${field.code}-${String(nums[i]).padStart(2, '0')}`, field: field.name, block: field.block,
        pad: padIdx >= 0 ? `${field.code}-P${padIdx + 1}` : null,
        type: i === 0 ? 'exploratory' : i === 1 ? 'appraisal' : 'development',
        profile: deviated ? 'deviated' : 'vertical', lat, lon, x, y,
        stations: stations.filter(s => s.md <= tdMd + 200), tops, tdMd,
        spud: new Date(Date.UTC(year, Math.floor(uniform(0, 12)), Math.floor(uniform(1, 28)))), status: 'completed',
      });
      wellNo++;
    }
  }

  // ── Insert historic wells ───────────────────────────────────
  let eventNo = 1, docNo = 1, fmNo = 1, csgNo = 1, mudNo = 1, cemNo = 1;
  const allEvents: any[] = [];

  for (const w of wells) {
    const tdTvd = positionAtMd(w.stations, w.tdMd).tvd;
    const reached = w.tops.filter(t => t.topTvd < tdTvd);
    const bottom = reached[reached.length - 1];
    const daysDrilling = Math.round(w.tdMd / 220 + uniform(4, 14));
    const completion = addDays(w.spud, daysDrilling);

    // Events from the hazard model at this location
    const events: any[] = [];
    for (const h of HAZARDS) {
      const fm = reached.find(t => t.name === h.formation);
      if (!fm) continue;
      const base = Math.min(fm.baseTvd, tdTvd);
      const p = clamp(h.base * hotspotGain(h, w.x, w.y), 0, 0.92);
      if (rnd() > p) continue;
      const rel = clamp(h.relMean + h.relSd * gauss(), 0.02, 0.98);
      const tvd = fm.topTvd + rel * (fm.baseTvd - fm.topTvd);
      if (tvd > base) continue;
      events.push({ type: h.type, fm: h.formation, tvd });
    }
    // Losses in Tipam often spoil the intermediate cement job
    if (events.some(e => e.type === 'mud_loss' && e.fm === 'Tipam Sandstone') ? rnd() < 0.5 : rnd() < 0.1) {
      const tvd = (w.tops[4].topTvd - 60);
      if (tvd < tdTvd) events.push({ type: 'cementing_issue', fm: 'Tipam Sandstone', tvd });
    }

    let wellNpt = 0;
    const docId = idOf('20000000', docNo++);
    const eventRows: any[] = [];
    for (const e of events.sort((a, b) => a.tvd - b.tvd)) {
      const md = mdAtTvd(w.stations, e.tvd);
      const opt = pick(MITIGATION_OPTIONS[e.type]);
      const roll = rnd();
      const rating: 'resolved' | 'partial' | 'failed' = roll < opt.success ? 'resolved' : roll < opt.success + (1 - opt.success) * 0.55 ? 'partial' : 'failed';
      const [lo, hi] = NPT_RANGE[e.type];
      const npt = r1(uniform(lo, hi) * opt.nptMul * (rating === 'failed' ? 1.8 : rating === 'partial' ? 1.25 : 1));
      wellNpt += npt;
      const mw1 = r1(uniform(9.6, 10.6)), mw2 = r1(e.type === 'mud_loss' ? mw1 - uniform(0.2, 0.5) : mw1 + uniform(0.3, 0.8));
      const mitigation = fill(pick(MITIGATION_TEXT[opt.key]), { n: Math.round(uniform(30, 80)), mw1, mw2 });
      const outcomes = OUTCOME_TEXT[e.type] ?? OUTCOME_TEXT.default;
      const ev = {
        id: idOf('30000000', eventNo++), well_id: w.id, formation_name: e.fm, event_type: e.type as EventType,
        severity: severityFor(npt), depth_md_ft: r1(md), depth_tvd_ft: r1(e.tvd),
        description: describe(e.type, md, e.fm), cause: pick(CAUSES[e.type] ?? ['Not recorded.']),
        mitigation, mitigation_key: opt.key, outcome: pick(outcomes[rating]), outcome_rating: rating,
        lessons_learned: fill(pick(LESSONS[e.type] ?? ['Review offset data before entering {fm}.']), { fm: e.fm }),
        npt_hours: npt, occurred_at: iso(addDays(w.spud, Math.round((md / w.tdMd) * daysDrilling))),
        source_document_id: docId, source_page: Math.floor(uniform(6, 38)),
      };
      eventRows.push(ev);
      // A failed stuck-pipe job usually turns into a fishing job
      if (e.type === 'stuck_pipe' && rating === 'failed') {
        const fnpt = r1(uniform(24, 90)); wellNpt += fnpt;
        eventRows.push({
          ...ev, id: idOf('30000000', eventNo++), event_type: 'fishing', severity: severityFor(fnpt), description: describe('fishing', md, e.fm),
          cause: pick(CAUSES.fishing), mitigation: pick(MITIGATION_TEXT.fishing_tools), mitigation_key: 'fishing_tools',
          outcome: rnd() < 0.6 ? 'Fish recovered; hole conditioned.' : 'Fish not recovered; plugged back and sidetracked.',
          outcome_rating: rnd() < 0.6 ? 'resolved' : 'failed', lessons_learned: fill(pick(LESSONS.fishing), { fm: e.fm }), npt_hours: fnpt,
        });
      }
    }

    await query(
      `INSERT INTO wells (id, name, field_name, block, pad, well_type, profile, latitude, longitude, kb_elevation_m,
         total_depth_ft, planned_td_ft, status, spud_date, completion_date, total_npt_hours)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [w.id, w.name, w.field, w.block, w.pad, w.type, w.profile, w.lat.toFixed(7), w.lon.toFixed(7),
        r1(uniform(95, 135)), r1(w.tdMd), r1(w.tdMd), 'completed', iso(w.spud), iso(completion), r1(wellNpt)]);

    for (const s of w.stations) {
      await query(`INSERT INTO well_surveys (well_id, md_ft, inclination_deg, azimuth_deg, tvd_ft, north_ft, east_ft) VALUES (?,?,?,?,?,?,?)`,
        [w.id, r1(s.md), s.inc.toFixed(3), s.azi.toFixed(3), r1(s.tvd), r1(s.north), r1(s.east)]);
    }
    for (const t of reached) {
      const bottomTvd = Math.min(t.baseTvd, tdTvd);
      await query(`INSERT INTO well_formations (id, well_id, formation_name, seq, top_md_ft, bottom_md_ft, top_tvd_ft, bottom_tvd_ft, lithology) VALUES (?,?,?,?,?,?,?,?,?)`,
        [idOf('40000000', fmNo++), w.id, t.name, t.seq, r1(mdAtTvd(w.stations, t.topTvd)), r1(mdAtTvd(w.stations, bottomTvd)), r1(t.topTvd), r1(bottomTvd), t.lithology]);
    }

    // Casing, cement, mud
    const surfShoe = mdAtTvd(w.stations, w.tops[1].baseTvd - 250);
    const intShoe = mdAtTvd(w.stations, w.tops[4].topTvd - 60);
    const casings = [
      { type: 'conductor', label: '20"', od: 20, grade: 'K-55', wt: 94, top: 0, shoe: 150 },
      { type: 'surface', label: '13-3/8"', od: 13.375, grade: 'N-80', wt: 68, top: 0, shoe: surfShoe },
      ...(intShoe < w.tdMd ? [{ type: 'intermediate', label: '9-5/8"', od: 9.625, grade: 'N-80', wt: 47, top: 0, shoe: intShoe }] : []),
      { type: 'liner', label: '7"', od: 7, grade: 'P-110', wt: 29, top: Math.min(intShoe, w.tdMd) - 300, shoe: w.tdMd - 20 },
    ];
    const hadCementIssue = eventRows.some(e => e.event_type === 'cementing_issue');
    for (const c of casings) {
      const cid = idOf('50000000', csgNo++);
      await query(`INSERT INTO casing_sections (id, well_id, casing_type, size_label, outer_dia_in, grade, weight_lb_ft, top_md_ft, shoe_md_ft) VALUES (?,?,?,?,?,?,?,?,?)`,
        [cid, w.id, c.type, c.label, c.od, c.grade, c.wt, r1(c.top), r1(c.shoe)]);
      const bad = hadCementIssue && c.type === 'intermediate';
      await query(`INSERT INTO cement_jobs (id, well_id, casing_section_id, top_of_cement_ft, slurry_density_ppg, returns_obtained, result, issues) VALUES (?,?,?,?,?,?,?,?)`,
        [idOf('51000000', cemNo++), w.id, cid, r1(Math.max(0, c.shoe - uniform(800, 2500))), r1(uniform(14.8, 15.9)), !bad, bad ? 'poor' : pick(['good', 'good', 'acceptable']), bad ? 'Losses during displacement; remedial squeeze required.' : null]);
    }
    const lossBbl = (fm: string) => eventRows.filter(e => e.event_type === 'mud_loss' && e.formation_name === fm).reduce((s, e) => s + e.npt_hours * uniform(8, 20), 0);
    const overp = eventRows.some(e => e.event_type === 'overpressure' || e.event_type === 'kick');
    const muds = [
      { from: 0, to: surfShoe, type: 'Spud mud (WBM)', mw: uniform(8.8, 9.1), loss: 0 },
      { from: surfShoe, to: Math.min(intShoe, w.tdMd), type: 'KCl-polymer WBM', mw: uniform(9.6, 10.2), loss: lossBbl('Tipam Sandstone') },
      ...(intShoe < w.tdMd ? [{ from: intShoe, to: w.tdMd, type: 'KCl-PHPA-glycol WBM', mw: uniform(10.3, 10.8) + (overp ? 0.6 : 0), loss: lossBbl('Sylhet Limestone') + lossBbl('Barail Arenaceous') }] : []),
    ];
    for (const m of muds) {
      await query(`INSERT INTO mud_programs (id, well_id, depth_from_ft, depth_to_ft, mud_type, mud_weight_ppg, total_loss_bbl) VALUES (?,?,?,?,?,?,?)`,
        [idOf('52000000', mudNo++), w.id, r1(m.from), r1(m.to), m.type, r1(m.mw), r1(m.loss)]);
    }

    // The well completion report every event is cited from
    await query(`INSERT INTO documents (id, well_id, document_type, title, file_name, page_count, document_date, status, extraction_method) VALUES (?,?,?,?,?,?,?,?,?)`,
      [docId, w.id, 'WCR', `Well Completion Report — ${w.name}`, `WCR_${w.name}.pdf`, Math.floor(uniform(42, 96)), iso(addDays(completion, 30)), 'processed', 'legacy-import']);

    for (const ev of eventRows) {
      await query(
        `INSERT INTO operational_events (id, well_id, formation_name, event_type, severity, depth_md_ft, depth_tvd_ft, description, cause,
           mitigation, mitigation_key, outcome, outcome_rating, lessons_learned, npt_hours, occurred_at, source_document_id, source_page, verified)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,TRUE)`,
        [ev.id, ev.well_id, ev.formation_name, ev.event_type, ev.severity, ev.depth_md_ft, ev.depth_tvd_ft, ev.description, ev.cause,
          ev.mitigation, ev.mitigation_key, ev.outcome, ev.outcome_rating, ev.lessons_learned, ev.npt_hours, ev.occurred_at, ev.source_document_id, ev.source_page]);
      allEvents.push({ ...ev, wellName: w.name });
    }
  }

  // ── Live wells: prognosis from offsets (IDW), not from the hidden truth ──
  for (const sc of LIVE_SCENARIOS) {
    const field = FIELDS.find(f => f.name === sc.field)!;
    const [lat, lon] = offsetLatLon(field.lat, field.lon, sc.northKm * 1000 * FT_PER_M, sc.eastKm * 1000 * FT_PER_M);
    const { x, y } = toLocalKm(REF.lat, REF.lon, lat, lon);
    const neighbours = wells.map(w => ({ w, d: Math.hypot(w.x - x, w.y - y) })).sort((a, b) => a.d - b.d).slice(0, 6);
    const prog = FORMATIONS.map(f => {
      let num = 0, den = 0;
      for (const { w, d } of neighbours) { const t = w.tops.find(tt => tt.name === f.name)!; const wt = 1 / Math.max(0.2, d) ** 2; num += t.topTvd * wt; den += wt; }
      return { name: f.name, seq: f.seq, lithology: f.lithology, top: f.seq === 1 ? 0 : num / den };
    });
    const plannedTd = prog[7].top + 450;
    const start = prog.find(p => p.name === sc.startFormation)!;
    const next = prog.find(p => p.seq === start.seq + 1)!;
    const currentDepth = start.top + sc.startRel * (next.top - start.top);

    await query(
      `INSERT INTO wells (id, name, field_name, block, pad, well_type, profile, latitude, longitude, kb_elevation_m,
         planned_td_ft, current_depth_ft, status, spud_date)
       VALUES (?,?,?,?,NULL,'development','vertical',?,?,?,?,?,'drilling',?)`,
      [sc.wellId, sc.name, field.name, field.block, lat.toFixed(7), lon.toFixed(7), 112.4, r1(plannedTd), r1(currentDepth), '2026-08-29']);
    for (let md = 0; md <= plannedTd; md += 500) {
      await query(`INSERT INTO well_surveys (well_id, md_ft, inclination_deg, azimuth_deg, tvd_ft, north_ft, east_ft) VALUES (?,?,?,?,?,?,?)`, [sc.wellId, md, 0.4, 90, md, 0, 0]);
    }
    for (let k = 0; k < prog.length; k++) {
      const base = k < prog.length - 1 ? prog[k + 1].top : plannedTd;
      await query(`INSERT INTO well_formations (id, well_id, formation_name, seq, top_md_ft, bottom_md_ft, top_tvd_ft, bottom_tvd_ft, lithology, is_predicted) VALUES (?,?,?,?,?,?,?,?,?,TRUE)`,
        [idOf('40000000', fmNo++), sc.wellId, prog[k].name, prog[k].seq, r1(prog[k].top), r1(base), r1(prog[k].top), r1(base), prog[k].lithology]);
    }
    const shoe = prog[1].top + 1750;
    await query(`INSERT INTO casing_sections (id, well_id, casing_type, size_label, outer_dia_in, grade, weight_lb_ft, top_md_ft, shoe_md_ft) VALUES (?,?,?,?,?,?,?,?,?)`,
      [idOf('50000000', csgNo++), sc.wellId, 'surface', '13-3/8"', 13.375, 'N-80', 68, 0, r1(shoe)]);
    await query(`INSERT INTO mud_programs (id, well_id, depth_from_ft, depth_to_ft, mud_type, mud_weight_ppg) VALUES (?,?,?,?,?,?)`,
      [idOf('52000000', mudNo++), sc.wellId, r1(shoe), r1(plannedTd), 'KCl-polymer WBM', 10.1]);
  }

  const byType = allEvents.reduce((m: Record<string, number>, e) => (m[e.event_type] = (m[e.event_type] ?? 0) + 1, m), {});
  console.log(`  ✔ ${wells.length} offset wells, ${LIVE_SCENARIOS.length} live wells, ${allEvents.length} events`, byType);
}

