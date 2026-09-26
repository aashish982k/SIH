/**
 * Drilling event taxonomy. Report language varies a lot between rigs and
 * decades; every extractor maps phrases onto these canonical types.
 */
export const EVENT_TYPES = [
  'mud_loss', 'kick', 'stuck_pipe', 'tight_hole', 'overpressure',
  'wellbore_instability', 'cementing_issue', 'fishing', 'other',
] as const;
export type EventType = typeof EVENT_TYPES[number];

/** Risks the hazard profile and live detectors reason about. */
export const RISK_TYPES = [
  'mud_loss', 'kick', 'stuck_pipe', 'tight_hole', 'overpressure', 'wellbore_instability',
] as const;
export type RiskType = typeof RISK_TYPES[number];

export const EVENT_LABELS: Record<EventType, string> = {
  mud_loss: 'Mud loss',
  kick: 'Kick / influx',
  stuck_pipe: 'Stuck pipe',
  tight_hole: 'Tight hole',
  overpressure: 'Overpressure',
  wellbore_instability: 'Wellbore instability',
  cementing_issue: 'Cementing issue',
  fishing: 'Fishing',
  other: 'Other',
};

/** Phrase → type, most specific first. */
export const EVENT_SYNONYMS: Array<[RegExp, EventType]> = [
  [/\b(differential(ly)? stuck|stuck pipe|pipe (got )?stuck|string (got )?stuck|pipe held up|could not (pull|work) (the )?pipe|jarr(ed|ing))\b/i, 'stuck_pipe'],
  [/\b(fishing (job|operation)|fish(ed)? (out|left)|lost in hole|twist[- ]?off|backed off)\b/i, 'fishing'],
  [/\b(kick|influx|well (was )?flowing|pit gain|gained \d+\s*bbl|shut[- ]in (the )?well|well control)\b/i, 'kick'],
  [/\b(los(s|ses|t) (of )?(circulation|returns)|partial loss(es)?|complete loss(es)?|total loss(es)?|mud loss(es)?|lost circulation|lcm pill|losing mud)\b/i, 'mud_loss'],
  [/\b(overpressur(e|ed)|abnormal(ly)? (high )?pressure|high (background|connection|trip) gas|gas[- ]cut mud|connection gas)\b/i, 'overpressure'],
  [/\b(tight (hole|spot)|overpull|excess drag|pack[- ]?off|packing off|bit balling|reamed? (through|tight))\b/i, 'tight_hole'],
  [/\b(caving(s)?|sloughing|hole (collapse|enlargement|instability)|wellbore instability|splintery cavings|washout)\b/i, 'wellbore_instability'],
  [/\b(poor cement|cement (job )?(failure|failed)|no returns (during|while) cementing|squeeze (job|cement)|channel(l)?ing|cbl (showed|shows) poor)\b/i, 'cementing_issue'],
];

export function classifyEvent(text: string): EventType | null {
  for (const [re, type] of EVENT_SYNONYMS) if (re.test(text)) return type;
  return null;
}

/** Canonical mitigation strategies, so outcomes can be compared across wells. */
export const MITIGATIONS: Record<string, { label: string; re: RegExp }> = {
  lcm_pill:          { label: 'LCM pill',                          re: /\blcm\b|lost[- ]circulation material|mica|nut ?plug|calcium carbonate/i },
  reduce_mw:         { label: 'Reduce mud weight / ECD',           re: /reduc(e|ed|ing) (the )?(mud weight|mw|ecd)|lower(ed)? (mud weight|ecd)/i },
  cement_plug:       { label: 'Cement plug across loss zone',      re: /cement plug|spotted cement/i },
  spot_pipe_lax:     { label: 'Spot pipe-free / spotting fluid',   re: /spot(ted|ting)? (fluid|pill)|pipe[- ]?lax|pipe[- ]free|diesel pill/i },
  jar_and_work:      { label: 'Jar and work pipe',                 re: /\bjar(red|ring)?\b|work(ed|ing) (the )?pipe/i },
  back_ream:         { label: 'Back-ream and wiper trip',          re: /back[- ]?ream|wiper trip|short trip/i },
  raise_mw_inhibit:  { label: 'Raise mud weight + inhibition',     re: /(rais|increas)(e|ed|ing) (the )?(mud weight|mw)|kcl|glycol|inhibit/i },
  shut_in_kill:      { label: 'Shut in and circulate out (kill)',  re: /shut[- ]in|driller'?s method|wait and weight|kill (mud|weight)|circulated out/i },
  sidetrack:         { label: 'Plug back and sidetrack',           re: /side[- ]?track/i },
  squeeze_cement:    { label: 'Remedial squeeze cementing',        re: /squeeze/i },
  fishing_tools:     { label: 'Fishing with overshot / spear',     re: /overshot|spear|fishing (tool|assembly)|junk basket/i },
};

export function classifyMitigation(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const [key, m] of Object.entries(MITIGATIONS)) if (m.re.test(text)) return key;
  return null;
}
