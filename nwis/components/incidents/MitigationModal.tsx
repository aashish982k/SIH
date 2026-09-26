'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, AlertTriangle, ShieldCheck, Play, ExternalLink, 
  MapPin, Layers, Calendar, Activity, CheckCircle2, Info
} from 'lucide-react';
import { cn, getIncidentLabel, getIncidentColor, getRiskBgClass, getRiskLabel, formatDepth, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface IncidentMitigationData {
  id: string;
  incidentType: string;
  wellName: string;
  wellId?: string;
  severity: string;
  description: string;
  date: string;
  depthFt?: number;
  formation?: string;
  status?: string;
  cause?: string;
  mitigation?: string;
  imageUrl?: string;
  videoUrl?: string;
}

interface MitigationModalProps {
  incident: IncidentMitigationData | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToWell?: (wellId: string) => void;
}

export function extractYouTubeId(urlOrId?: string): string {
  if (!urlOrId) return 'W3q8Od5qJio';
  const trimmed = urlOrId.trim();
  if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : 'W3q8Od5qJio';
}

// Fallback incident photos by type if missing from record
function getIncidentPhoto(type: string, directUrl?: string): string {
  if (directUrl && directUrl.startsWith('http')) return directUrl;
  const lower = (type || '').toLowerCase();
  if (lower.includes('kick') || lower.includes('blowout')) {
    return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('pipe') || lower.includes('stuck')) {
    return 'https://images.unsplash.com/photo-1504307651554-66914ee56a38?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('wash') || lower.includes('joint')) {
    return 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('leak') || lower.includes('spill')) {
    return 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80';
  }
  if (lower.includes('corrosion') || lower.includes('fail') || lower.includes('npt')) {
    return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80';
}

export default function MitigationModal({ incident, isOpen, onClose, onNavigateToWell }: MitigationModalProps) {
  if (!isOpen || !incident) return null;

  const youtubeId = extractYouTubeId(incident.videoUrl);
  const photoUrl = getIncidentPhoto(incident.incidentType, incident.imageUrl);
  const color = getIncidentColor(incident.incidentType as any);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0B1119] border border-[#23354C] rounded-2xl max-w-3xl w-full my-8 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[#1A283A] bg-[#0E1622]/80">
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ 
                  backgroundColor: `${color}15`, 
                  borderColor: `${color}40`,
                  color: color
                }}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-md font-mono"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                    }}
                  >
                    {getIncidentLabel(incident.incidentType as any)}
                  </span>
                  <Badge className={cn('text-[10px] h-4 px-1.5 font-mono', getRiskBgClass(incident.severity as any))}>
                    {getRiskLabel(incident.severity as any)}
                  </Badge>
                  {incident.status && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono text-cyan-400 border-cyan-500/40 uppercase">
                      {incident.status}
                    </Badge>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {incident.wellName} — {getIncidentLabel(incident.incidentType as any)}
                </h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap font-mono">
                  {incident.depthFt && (
                    <span className="flex items-center gap-1 text-cyan-300">
                      <Layers className="w-3.5 h-3.5" />
                      {formatDepth(incident.depthFt)} ft
                    </span>
                  )}
                  {incident.formation && (
                    <span>· {incident.formation}</span>
                  )}
                  {incident.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(incident.date)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#141F2D] hover:bg-[#1E2E42] text-[#94A3B8] hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close mitigation modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* Description & Root Cause Card */}
            <div className="bg-[#101722]/80 border border-white/5 rounded-xl p-4 space-y-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Incident Synopsis
                </h4>
                <p className="text-sm text-white/90 leading-relaxed font-sans">
                  {incident.description}
                </p>
              </div>

              {incident.cause && (
                <div className="pt-2 border-t border-white/5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Identified Root Cause
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {incident.cause}
                  </p>
                </div>
              )}
            </div>

            {/* Proven Engineering Mitigation Protocol */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#091512] border border-[#10B981]/30 relative overflow-hidden">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#10B981] font-bold mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                VERIFIED MITIGATION & RECOVERY PROTOCOL
              </div>
              <p className="text-sm text-white font-medium leading-relaxed mb-4">
                {incident.mitigation || 'Execute standard well control procedures, adjust drilling fluid rheology, and verify annular pressure integrity.'}
              </p>

              <div className="space-y-2 pt-3 border-t border-[#132A24]">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Standard Field SOP Actions:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#34D399]">
                  <div className="flex items-center gap-2 bg-[#0C1F1A] px-2.5 py-1.5 rounded-lg border border-[#10B981]/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span>Real-time ECD/BHP monitoring</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0C1F1A] px-2.5 py-1.5 rounded-lg border border-[#10B981]/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span>Cross-well formation correlation</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0C1F1A] px-2.5 py-1.5 rounded-lg border border-[#10B981]/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span>Hydraulic casing pressure testing</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0C1F1A] px-2.5 py-1.5 rounded-lg border border-[#10B981]/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    <span>Adhere to safe drillstring trip speed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incident Photo & YouTube Technical Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Photo Box */}
              <div className="flex flex-col rounded-xl overflow-hidden border border-[#1E2E42] bg-[#070D14]">
                <div className="px-3 py-2 border-b border-[#1E2E42] bg-[#0E1622] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-cyan-400" />
                    INCIDENT FIELD INSPECTION PHOTO
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400/80">RIG LOG // ARCHIVE</span>
                </div>
                <div className="relative aspect-video w-full overflow-hidden bg-black/60 group">
                  <img
                    src={photoUrl}
                    alt={`${incident.wellName} ${incident.incidentType}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-2 left-2 right-2 text-[10px] font-mono text-white/90 drop-shadow-md">
                    {incident.wellName} · {getIncidentLabel(incident.incidentType as any)} at {formatDepth(incident.depthFt || 8000)} ft
                  </div>
                </div>
              </div>

              {/* YouTube Video Box */}
              <div className="flex flex-col rounded-xl overflow-hidden border border-[#1E2E42] bg-[#070D14]">
                <div className="px-3 py-2 border-b border-[#1E2E42] bg-[#0E1622] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#F59E0B] uppercase font-bold tracking-wider flex items-center gap-1.5">
                    <Play className="w-3 h-3 fill-current text-[#F59E0B]" />
                    TECHNICAL MITIGATION VIDEO
                  </span>
                  <a
                    href={`https://www.youtube.com/watch?v=${youtubeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1"
                  >
                    <span>Open YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=0&rel=0`}
                    title={`${incident.incidentType} technical mitigation video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              </div>

            </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#1A283A] bg-[#0E1622]/80 flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              INCIDENT ID: <span className="text-white font-semibold">{incident.id}</span>
            </span>
            <div className="flex items-center gap-2">
              {incident.wellId && onNavigateToWell && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-mono border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                  onClick={() => {
                    onClose();
                    onNavigateToWell(incident.wellId!);
                  }}
                >
                  <MapPin className="w-3.5 h-3.5 mr-1.5" />
                  View Well Dossier
                </Button>
              )}
              <Button
                size="sm"
                className="text-xs font-mono bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                onClick={onClose}
              >
                Close Protocol
              </Button>
            </div>
          </div>

        </div>
      </div>
  );
}
