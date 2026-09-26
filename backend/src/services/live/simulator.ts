/**
 * eRTMAC replay simulator for the synthetic live wells.
 * Produces surface drilling parameters like a mud-logging unit would, including
 * rig-state changes (connections every stand) and the physical precursors of
 * losses, pack-off / stuck pipe, overpressure and kicks at the hidden episode depths.
 */
import { LIVE_SCENARIOS, mulberry32, type LiveScenario } from '../../domain/hazardModel';
import type { RiskType } from '../../domain/taxonomy';

export type RigState = 'drilling' | 'connection' | 'circulating' | 'tripping' | 'reaming';

export interface Sample {
  t: string; simTime: number;
  holeDepth: number; bitDepth: number; rigState: RigState; formation: string | null;
  rop: number; wob: number; rpm: number; torque: number; spp: number;
  flowIn: number; flowOut: number; pit: number; hookLoad: number; mw: number; ecd: number; gas: number; dxc: number;
}

interface Episode { type: RiskType; top: number; base: number; }

const ROP: Record<string, number> = {
  'Alluvium': 120, 'Dhekiajuli': 90, 'Girujan Clay': 42, 'Tipam Sandstone': 68, 'Barail Coal-Shale': 55,
  'Barail Arenaceous': 48, 'Kopili': 30, 'Sylhet Limestone': 24,
};
const GAS: Record<string, number> = { 'Barail Coal-Shale': 26, 'Kopili': 18, 'Barail Arenaceous': 14 };
const STAND_FT = 93;

export class WellSimulator {
  readonly scenario: LiveScenario;
  readonly wellId: string;
  running = false;
  speed = 240;                       // simulated seconds per 1 s tick
  history: Sample[] = [];
  private rnd: () => number;
  private tops: Array<{ name: string; top: number; base: number }> = [];
  private episodes: Episode[] = [];
  private hole = 0;
  private simTime = 0;
  private pit = 480;
  private sinceStand = 0;
  private connectionLeft = 0;
  private startDepth = 0;

  constructor(scenario: LiveScenario, predictedTops: Array<{ name: string; top: number; base: number }>, startDepth: number) {
    this.scenario = scenario;
    this.wellId = scenario.wellId;
    this.rnd = mulberry32(scenario.wellId.charCodeAt(30) * 7919);
    // The real subsurface differs a little from the prognosis
    const drift = [0, 20, -30, 35, 45, -25, 40, 30];
    this.tops = predictedTops.map((t, i) => ({ name: t.name, top: t.top + (i ? drift[i] ?? 0 : 0), base: t.base + (drift[i + 1] ?? 0) }));
    this.episodes = scenario.episodes.map((e) => {
      const f = this.tops.find((t) => t.name === e.formation)!;
      const top = f.top + e.rel * (f.base - f.top);
      return { type: e.type, top, base: top + e.lengthFt };
    });
    this.startDepth = startDepth;
    this.reset();
  }

  reset() {
    this.hole = this.startDepth - 160;
    this.simTime = 0;
    this.pit = 480;
    this.sinceStand = 40;
    this.connectionLeft = 0;
    this.history = [];
    // Warm-up so charts open with context behind the bit
    while (this.hole < this.startDepth) this.step(120);
  }

  get holeDepth() { return this.hole; }
  get simSeconds() { return this.simTime; }

  formationAt(d: number) { return this.tops.find((t) => d >= t.top && d < t.base)?.name ?? null; }

  private n(sd: number) { let u = 0, v = 0; while (!u) u = this.rnd(); while (!v) v = this.rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd; }

  /** Intensity 0–1 of the episode of a type at the current depth. */
  private intensity(type: RiskType): number {
    const e = this.episodes.find((x) => x.type === type && this.hole >= x.top - 5 && this.hole <= x.base + 25);
    if (!e) return 0;
    const len = e.base - e.top;
    const into = this.hole - e.top;
    if (into < 0) return 0.2;
    if (into > len) return Math.max(0, 1 - (into - len) / 25);
    return Math.min(1, 0.35 + (into / (len * 0.4)) * 0.65);
  }

  step(dtSim = this.speed): Sample {
    this.simTime += dtSim;
    const fm = this.formationAt(this.hole) ?? 'Sylhet Limestone';
    const loss = this.intensity('mud_loss');
    const stuck = this.intensity('stuck_pipe');
    const op = this.intensity('overpressure');
    const kick = this.intensity('kick');

    let rigState: RigState = 'drilling';
    if (this.connectionLeft > 0) { rigState = 'connection'; this.connectionLeft -= dtSim; }

    const baseRop = (ROP[fm] ?? 40) * (1 + op * 0.35 + kick * 0.25) * (1 - stuck * 0.35);
    const rop = rigState === 'drilling' ? Math.max(4, baseRop * (1 + this.n(0.08))) : 0;
    if (rigState === 'drilling') {
      const adv = (rop * dtSim) / 3600;
      this.hole += adv;
      this.sinceStand += adv;
      if (this.sinceStand >= STAND_FT) { this.sinceStand = 0; this.connectionLeft = 300; }
    }

    const drilling = rigState === 'drilling';
    const flowIn = drilling ? 640 + this.n(4) : 0;
    const lossFrac = loss * (0.14 + this.n(0.02));
    const gainFrac = kick * (0.12 + this.n(0.015));
    const flowOut = drilling ? flowIn * (0.985 - lossFrac + gainFrac + this.n(0.006)) : kick * 35 + Math.max(0, this.n(2));
    // Pit volume integrates the flow imbalance (gpm → bbl)
    this.pit += ((flowOut - flowIn * (drilling ? 0.985 : 0)) * dtSim) / 60 / 42 * (drilling ? 1 : 0.2);
    if (!loss && !kick) this.pit += (480 - this.pit) * 0.01; // slow top-up by the mud engineer
    const pit = this.pit + this.n(0.6);

    const baseTorque = 7 + this.hole / 1400 + (fm === 'Barail Coal-Shale' ? 1.2 : 0);
    const torque = drilling ? baseTorque * (1 + stuck * 0.45) * (1 + this.n(0.035 + stuck * 0.09)) : 0;
    const wob = drilling ? 24 + this.n(1.8) : 0;
    const rpm = drilling ? 110 + this.n(3) : 0;
    const spp = drilling ? (1850 + this.hole * 0.11) * (1 - loss * 0.05 - kick * 0.03 + stuck * 0.06 * (this.rnd() < 0.4 ? 1 : 0.3)) + this.n(18) : 0;
    const stringWeight = 115 + this.hole * 0.0125;
    const overpull = rigState === 'connection' ? stuck * (26 + this.n(5)) + Math.max(0, this.n(3)) : 0;
    const hookLoad = drilling ? stringWeight - wob + this.n(1.5) : stringWeight + overpull + this.n(1.5);
    const mw = 10.1;
    const ecd = drilling ? mw + 0.32 + this.n(0.01) : mw;
    const gasBase = GAS[fm] ?? 10;
    const gas = Math.max(1, gasBase * (1 + op * 6 + kick * 4 + (rigState === 'connection' ? op * 3 : 0)) * (1 + this.n(0.08)));
    // Corrected d-exponent: drops when pore pressure rises (drilling gets easier)
    const R = Math.max(rop, 1), N = Math.max(rpm, 1), W = Math.max(wob, 1), D = 8.5;
    const d = drilling ? Math.log10(R / (60 * N)) / Math.log10((12 * W) / (1e3 * D)) : 0;
    const dxc = drilling ? d * (9.0 / ecd) : 0;

    const s: Sample = {
      t: new Date().toISOString(), simTime: this.simTime,
      holeDepth: round(this.hole, 1), bitDepth: round(this.hole - (drilling ? 0 : 30), 1), rigState, formation: fm,
      rop: round(rop, 1), wob: round(wob, 1), rpm: round(rpm, 0), torque: round(torque, 2), spp: round(spp, 0),
      flowIn: round(flowIn, 0), flowOut: round(flowOut, 0), pit: round(pit, 1), hookLoad: round(hookLoad, 1),
      mw, ecd: round(ecd, 2), gas: round(gas, 1), dxc: round(dxc, 3),
    };
    this.history.push(s);
    if (this.history.length > 900) this.history.shift();
    return s;
  }

  jumpTo(depth: number) {
    while (this.hole < depth) this.step(120);
  }
}

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

export function scenarioFor(wellId: string) {
  return LIVE_SCENARIOS.find((s) => s.wellId === wellId) ?? null;
}
