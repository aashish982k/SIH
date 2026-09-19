// ─── Core Domain Types ────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type IncidentType = 'mud_loss' | 'kick' | 'stuck_pipe' | 'npt' | 'blowout' | 'washout';
export type WellStatus = 'active' | 'completed' | 'suspended' | 'abandoned';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved';
export type UploadStatus = 'queued' | 'processing' | 'extracted' | 'error' | 'saved';

// ─── Geographic ───────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

// ─── Formation ────────────────────────────────────────────────────────────────

export interface Formation {
  id: string;
  name: string;
  depthTopFt: number;
  depthBaseFt: number;
  lithology: string; // 'sandstone' | 'shale' | 'limestone' | 'coal' | 'anhydrite'
  color: string;     // hex for stratigraphy log visualization
  porosity?: number; // percentage
  fluidType?: 'gas' | 'oil' | 'water' | 'dry';
}

// ─── Incident ─────────────────────────────────────────────────────────────────

export interface Incident {
  id: string;
  wellId: string;
  type: IncidentType;
  severity: RiskLevel;
  depthFt: number;
  date: string; // ISO
  description: string;
  mitigation: string;
  lessonsLearned: string;
  durationHours: number; // NPT duration
  formation?: string;
  sourceReportId?: string;
}

// ─── Well ─────────────────────────────────────────────────────────────────────

export interface Well {
  id: string;
  name: string;
  block: string;
  field: string;
  operator: string;
  status: WellStatus;
  coordinates: Coordinates;
  spudDate: string;       // ISO date
  completionDate?: string;
  totalDepthFt: number;
  currentDepthFt?: number; // only for active wells
  measuredDepthFt: number;
  trueVerticalDepthFt: number;
  inclination: number;    // degrees
  azimuth: number;        // degrees
  casingProgram: CasingSection[];
  formations: Formation[];
  incidents: Incident[];
  riskScore?: number;     // 0-100, only for active wells
  riskLevel?: RiskLevel;
}

export interface CasingSection {
  id: string;
  name: string;       // '30" Conductor' | '20" Surface' | '13⅜" Intermediate' | '9⅝" Production'
  sizeinches: number;
  setDepthFt: number;
  cementTopFt: number;
  cementBottomFt: number;
  grade: string;
  weight: string;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  wellId: string;
  message: string;
  riskLevel: RiskLevel;
  status: AlertStatus;
  relatedWellIds: string[];
  recommendedAction: string;
  depthFt: number;
  incidentType: IncidentType;
  timestamp: string; // ISO
  acknowledgedAt?: string;
}

// ─── Real-time Feed (eRTMAC) ──────────────────────────────────────────────────

export interface RTMACData {
  wellId: string;
  depthFt: number;
  rateOfPenetrationFtHr: number;
  weightOnBitKlbs: number;
  rotarySpeedRpm: number;
  mudWeightPpg: number;
  standpipePressurePsi: number;
  riskScore: number;      // 0-100
  riskLevel: RiskLevel;
  timestamp: string;
}

// ─── Knowledge Repository ─────────────────────────────────────────────────────

export interface KnowledgeEntry {
  id: string;
  wellId: string;
  wellName: string;
  incidentId: string;
  incidentType: IncidentType;
  severity: RiskLevel;
  depthFt: number;
  formation: string;
  date: string;
  shortDescription: string;
  mitigation: string;
  lessonsLearned: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  title: string;
  type: 'WCR' | 'DDR' | 'IADC' | 'Other';
  wellId?: string;
  uploadedAt: string;
  status: UploadStatus;
  fileName: string;
  fileSizeBytes: number;
  extractedData?: ExtractedReportData;
  progress?: number; // 0-100
}

export interface ExtractedReportData {
  wellName?: string;
  depth?: number;
  formation?: string;
  incidents: Partial<Incident>[];
  formations: Partial<Formation>[];
  confirmed: boolean;
}

// ─── Threat Matrix ────────────────────────────────────────────────────────────

export interface ThreatMatrixEntry {
  riskFactor: string;
  probability: RiskLevel;
  severity: RiskLevel;
  confidence: number; // 0-100
  relatedWellCount: number;
  description: string;
}

// ─── App State (for Zustand) ──────────────────────────────────────────────────

export interface AppState {
  activeWellId: string | null;
  activeWell: Well | null;
  liveDepthFt: number;
  liveRiskScore: number;
  liveRiskLevel: RiskLevel;
  liveRtmacData: RTMACData | null;
  mapRadius: number; // km
  unreadAlertCount: number;
  alerts: Alert[];
  isRTMACConnected: boolean;
}
