export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type RiskType = 'mud_loss' | 'kick' | 'stuck_pipe' | 'tight_hole' | 'overpressure' | 'wellbore_instability';
export type EventType = RiskType | 'cementing_issue' | 'fishing' | 'other';

export interface User { id: string; name: string; email: string; role: string; }

export interface Formation {
  name: string; seq: number; lithology: string; color: string;
  topMd: number; bottomMd: number | null; topTvd: number; bottomTvd: number | null; predicted: boolean;
}

export interface Well {
  id: string; name: string; field: string; block: string | null; pad: string | null; wellType: string; profile: 'vertical' | 'deviated';
  status: 'drilling' | 'completed' | 'suspended' | 'abandoned'; lat: number; lon: number;
  totalDepthFt: number | null; plannedTdFt: number | null; currentDepthFt: number | null;
  spudDate: string | null; completionDate: string | null; totalNptHours: number; eventCount?: number; severeCount?: number;
}

export interface DrillEvent {
  id: string; wellId: string; wellName: string; formation: string | null; type: EventType; severity: Severity;
  depthMd: number; depthTvd: number; description: string; cause: string | null; mitigation: string | null; mitigationKey: string | null;
  outcome: string | null; outcomeRating: 'resolved' | 'partial' | 'failed' | null; lessons: string | null; nptHours: number | null;
  occurredAt: string | null; sourceDocumentId: string | null; sourceDocumentTitle: string | null; sourcePage: number | null;
  distanceKm?: number; equivalentDepthFt?: number;
}

export interface WellDetail extends Well {
  formations: Formation[]; surveys: Array<{ md: number; inc: number; azi: number; tvd: number; north: number; east: number }>;
  events: DrillEvent[];
  casing: Array<{ id: string; type: string; size: string; odIn: number; grade: string | null; weight: number | null; topMd: number; shoeMd: number }>;
  cement: Array<{ id: string; casing: string | null; tocFt: number | null; densityPpg: number | null; returns: boolean | null; result: string | null; issues: string | null }>;
  mud: Array<{ fromFt: number; toFt: number; type: string; weightPpg: number; lossBbl: number | null }>;
  documents: Array<{ id: string; title: string; document_type: string; document_date: string | null; page_count: number | null; status: string }>;
}

export interface Offset extends Well {
  surfaceDistanceKm: number; nearestDistanceKm: number; distanceByFormation: Record<string, number>;
  bottomHole: [number, number]; horizontalDisplacementFt: number; path: Array<[number, number]>; formations: Formation[];
}

export interface HazardZone {
  id: string; type: RiskType; label: string; formation: string; topFt: number; baseFt: number; peakFt: number;
  peakProbability: number; offsetsWithEvent: number; offsetsPenetrated: number; evidence: DrillEvent[]; nptHours: number; distanceFt?: number;
}

export interface HazardProfile {
  wellId: string; radiusKm: number; binFt: number; sigmaKm: number;
  offsets: Array<Omit<Offset, 'formations' | 'path'>>; formations: Formation[];
  bins: Array<{ depth: number; formation: string | null; rel: number | null; p: Record<RiskType, number>; wells: number }>;
  zones: HazardZone[]; method: string;
}

export interface Sample {
  t: string; simTime: number; holeDepth: number; bitDepth: number; rigState: string; formation: string | null;
  rop: number; wob: number; rpm: number; torque: number; spp: number; flowIn: number; flowOut: number; pit: number;
  hookLoad: number; mw: number; ecd: number; gas: number; dxc: number;
}

export interface RiskSnapshot {
  overall: number;
  byType: Record<RiskType, { prior: number; live: number; fused: number; reasons: string[] }>;
  nextZone: (HazardZone & { distanceFt: number }) | null;
}

export interface WhatWorked {
  scope: string; basedOn: number;
  options: Array<{ key: string; label: string; uses: number; successRate: number; avgNptHours: number; example: { wellName: string; depthMd: number; text: string; outcome: string } }>;
}

export interface Alert {
  id: string; wellId: string; wellName: string; kind: 'lookahead' | 'live'; riskType: RiskType; severity: Severity; probability: number;
  bitDepthFt: number; zoneTopFt: number | null; zoneBaseFt: number | null; formation: string | null; title: string; message: string;
  evidence: DrillEvent[] | null; recommendations: WhatWorked | null;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_alarm'; feedback: string | null; acknowledgedAt: string | null; acknowledgedBy: string | null;
  createdAt: string; updatedAt: string;
}

export interface LiveState { wellId: string; running: boolean; speed: number; history: Sample[]; risk: RiskSnapshot | null; radiusKm: number; }

export interface SearchResult {
  id: string; text: string; score: number; matchedBy: Array<'semantic' | 'keyword'>; source_type: string; page: number | null;
  formation_name: string | null; depth_ft: number | null; event_type: EventType | null;
  well: { id: string; name: string; field: string } | null; document: { id: string; title: string } | null;
  event: { id: string; severity: Severity; outcome_rating: string | null; npt_hours: number | null; mitigation: string | null } | null;
}

export interface Meta {
  formations: Array<{ name: string; seq: number; lithology: string; color: string; typicalThicknessFt: number }>;
  eventTypes: Array<{ key: EventType; label: string }>; riskTypes: RiskType[]; mitigations: Record<string, string>;
  liveWells: string[]; capabilities: { groq: boolean; groqModel: string | null; embeddings: { model: string; dimension: number; error: string | null } };
  defaultRadiusKm: number;
}
