'use client';

import { motion } from 'framer-motion';
import { 
  GitCompare, 
  Layers, 
  AlertTriangle, 
  ShieldAlert, 
  Info, 
  Plus, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { TacticalSidebar } from '@/components/layout/Sidebar';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Play, X } from 'lucide-react';

interface IncidentData {
  title: string;
  severity: 'critical' | 'high' | 'watch';
  depth: string;
  formation: string;
  issue: string;
  mitigation: string;
  provenAction: string[];
  reportRef: string;
  youtubeId: string;
  youtubeTitle: string;
  // Unsplash images representative of the incident type (CC0)
  incidentPhotos: { url: string; caption: string }[];
}

// Wells compared side-by-side with structured incident metadata
const COMPARED_WELLS = [
  {
    id: 'AA-17H',
    name: 'AA-17H / Current',
    depth: '2,414 m',
    status: 'Drilling',
    statusColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
    dotColor: 'bg-[#EF4444]',
    formations: [
      { name: 'Alluvium', top: '0 m', color: '#3A483E', widthClass: 'w-[82%]' },
      { name: 'Tipam sandstone', top: '650 m', color: '#856A41', widthClass: 'w-[90%]' },
      { 
        name: 'Girujan clay', 
        top: '2,442 m', 
        color: '#4D5866', 
        widthClass: 'w-[100%]', 
        incident: {
          title: 'Lost Circulation Hazard Approaching',
          severity: 'critical',
          depth: '2,442 m',
          formation: 'Girujan Clay Contact',
          issue: 'Sudden dynamic mud losses observed in offset wells at formation boundary due to depleted sub-hydrostatic sands.',
          mitigation: 'Pre-treat mud active system with 15-20 ppb coarse fibrous LCM (Mica & Nut plug blend). Drop pump rate from 650 to 420 gpm before transition. Keep hydrostatic head balanced.',
          provenAction: [
            'Mix 25 bbl heavy LCM pill ready in suction pit',
            'Lower ECD by 0.3 ppg using low-gravity solids dilution',
            'Perform dynamic flow check every 5 meters in transition zone'
          ],
          reportRef: 'OIL WCR-AA-17H-PRED / DDR-88',
          youtubeId: 'W3q8Od5qJio',
          youtubeTitle: 'Drilling Engineering: Lost Circulation Control & LCM Pill Placement',
          incidentPhotos: [
            { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Drilling mud pit — severe volume drop observed' },
            { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80', caption: 'LCM pill mixing on rig floor — Assam field' },
          ]
        } as IncidentData
      },
      { 
        name: 'Disang shale', 
        top: '2,850 m', 
        color: '#353D4A', 
        widthClass: 'w-[88%]', 
        incident: {
          title: 'Differential Sticking & Wellbore Collapsing Risk',
          severity: 'high',
          depth: '2,850 m',
          formation: 'Disang Shale',
          issue: 'Tectonic stress in laminated shale causing tight hole condition, bit balling, and 30 klb overpull during pipe connections.',
          mitigation: 'Spot lubricating glycol-based pill around BHA. Maintain continuous string rotation (>40 RPM) during pauses. Increase mud inhibition with 6% KCl.',
          provenAction: [
            'Spot 40 bbl oil-wetting lubricant pill across tight interval',
            'Ream back through intervals at 20 m/hr with full circulation',
            'Ensure minimum annular velocity of 120 ft/min to clear cavings'
          ],
          reportRef: 'OIL WCR-DISANG-RISK-2023',
          youtubeId: '9Gk5fL2Esq4',
          youtubeTitle: 'Wellbore Stability & Stuck Pipe Prevention in Reactive Shales',
          incidentPhotos: [
            { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Drill string overpull — tight hole indication' },
            { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Reactive shale cuttings on shaker — Disang formation' },
          ]
        } as IncidentData
      },
      { name: 'Basement', top: '3,400 m', color: '#222834', widthClass: 'w-[75%]' }
    ]
  },
  {
    id: 'AA-12G',
    name: 'AA-12G / Offset',
    depth: '2,950 m',
    status: 'Completed',
    statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
    dotColor: 'bg-[#10B981]',
    formations: [
      { name: 'Alluvium', top: '0 m', color: '#3A483E', widthClass: 'w-[82%]' },
      { name: 'Tipam sandstone', top: '680 m', color: '#856A41', widthClass: 'w-[90%]' },
      { 
        name: 'Girujan clay', 
        top: '2,430 m', 
        color: '#4D5866', 
        widthClass: 'w-[100%]', 
        incident: {
          title: 'Total Mud Loss: 45 bbls Encountered',
          severity: 'critical',
          depth: '2,430 m',
          formation: 'Girujan Clay (Offset AA-12G)',
          issue: 'Encountered fractured sandstone stringer with total loss of returns. Pit volume dropped 45 bbls within 12 minutes.',
          mitigation: 'Successfully cured by pumping 35 bbl high-viscosity pill with 30 ppb medium-to-coarse mica flakes and 10 ppb calcium carbonate.',
          provenAction: [
            'Immediate pull off bottom and space out above thief zone',
            'Pumped 35 bbl LCM slurry at 2.5 bpm and allowed 2 hrs soak',
            'Circulation restored to 100% return with ECD controlled at 1.15 SG'
          ],
          reportRef: 'Oil India Well Completion Report WCR-12G-2022 / Rig OIL-04',
          youtubeId: 'W3q8Od5qJio',
          youtubeTitle: 'Managing Lost Circulation in Upper Assam Reservoir Sands',
          incidentPhotos: [
            { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Pit volume monitor — 45 bbl total loss event' },
            { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80', caption: 'Flowline showing zero returns at AA-12G' },
          ]
        } as IncidentData
      },
      { 
        name: 'Disang shale', 
        top: '2,890 m', 
        color: '#353D4A', 
        widthClass: 'w-[88%]', 
        incident: {
          title: 'Tight Hole & 25 klb Overpull Event',
          severity: 'high',
          depth: '2,890 m',
          formation: 'Disang Shale (Offset AA-12G)',
          issue: 'Encountered 25 klb overpull while pulling out of hole for bit change. Reactive swelling shale narrowed hole diameter.',
          mitigation: 'Back-reamed interval with 120 RPM and 550 gpm mud flow. Raised mud weight from 1.18 to 1.23 SG to support wellbore hoop stress.',
          provenAction: [
            'Conducted short trip every 150m of new hole drilled',
            'Increased PHPA polymer encapsulation concentration',
            'Zero non-productive time on subsequent runs'
          ],
          reportRef: 'Oil India DDR #114 / Well AA-12G',
          youtubeId: '9Gk5fL2Esq4',
          youtubeTitle: 'Pipe Freeing Techniques & Back-Reaming Operations',
          incidentPhotos: [
            { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Hookload overpull indicator during POOH' },
            { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Shale cuttings recovered from Disang interval' },
          ]
        } as IncidentData
      },
      { name: 'Basement', top: '3,420 m', color: '#222834', widthClass: 'w-[75%]' }
    ]
  },
  {
    id: 'AA-09P',
    name: 'AA-09P / Offset',
    depth: '3,120 m',
    status: 'Completed',
    statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
    dotColor: 'bg-[#10B981]',
    formations: [
      { name: 'Alluvium', top: '0 m', color: '#3A483E', widthClass: 'w-[82%]' },
      { name: 'Tipam sandstone', top: '630 m', color: '#856A41', widthClass: 'w-[90%]' },
      { 
        name: 'Girujan clay', 
        top: '2,455 m', 
        color: '#4D5866', 
        widthClass: 'w-[100%]', 
        incident: {
          title: 'Partial Mud Seepage: 20 bbls/hr',
          severity: 'watch',
          depth: '2,455 m',
          formation: 'Girujan Clay (Offset AA-09P)',
          issue: 'Micro-fractures caused steady 20 bbl/hr mud loss while penetrating 8½" section.',
          mitigation: 'Throttled flow rate to 380 gpm, added fine walnut shells (8 ppb) continuously to active pit, losses cured within 40 minutes.',
          provenAction: [
            'Avoided surge pressure during casing running',
            'Controlled ROP to 8 m/hr to allow cake building'
          ],
          reportRef: 'OIL Daily Drilling Report #92 / Moran Field',
          youtubeId: 'W3q8Od5qJio',
          youtubeTitle: 'Seepage Losses & Fine LCM Continuous Treatment',
          incidentPhotos: [
            { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Flowline monitor — 20 bbl/hr seepage at AA-09P' },
          ]
        } as IncidentData
      },
      { 
        name: 'Disang shale', 
        top: '2,820 m', 
        color: '#353D4A', 
        widthClass: 'w-[88%]', 
        incident: {
          title: 'Severe Reaming & Torque Oscillations',
          severity: 'high',
          depth: '2,820 m',
          formation: 'Disang Shale (Offset AA-09P)',
          issue: 'High torque spikes up to 18,000 ft-lbs due to swelling shale led to stick-slip vibrations.',
          mitigation: 'Treated mud system with 3% bio-lubricant and increased mud flow to maintain clean annular clearing.',
          provenAction: [
            'Controlled rotary table to steady 60 RPM',
            'Reduced weight on bit by 4 tons to avoid bit stalling'
          ],
          reportRef: 'OIL DDR #140 / AA-09P',
          youtubeId: '9Gk5fL2Esq4',
          youtubeTitle: 'Torque and Drag Mitigation in Directional Drilling',
          incidentPhotos: [
            { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Rotary torque spiking to 18,000 ft-lbs — AA-09P' },
            { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Bit balled with shale — recovered on trip out' },
          ]
        } as IncidentData
      },
      { name: 'Basement', top: '3,380 m', color: '#222834', widthClass: 'w-[75%]' }
    ]
  }
];

export default function WellComparisonPage() {
  const [activeTab, setActiveTab] = useState<'formation' | 'incidents' | 'depth'>('formation');
  const [selectedIncident, setSelectedIncident] = useState<IncidentData | null>(null);

  return (
    <div className="flex min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white">
      {/* Tactical Left Sidebar */}
      <TacticalSidebar />

      {/* Main Well Comparison Workspace */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1500px]">
        {/* Top Header matching Reference Image 5 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#141F2D] mb-6">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#7E8B9B] uppercase mb-1">
              HISTORICAL INTELLIGENCE · FORMATION ALIGNMENT
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Well comparison
            </h1>
            <p className="text-xs text-[#8A9BAE] mt-0.5">
              See where patterns repeat before they become problems.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0E1520] border border-[#233144] hover:border-[#F59E0B] text-xs font-mono text-white transition-colors">
              <Plus className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Add well</span>
            </button>
          </div>
        </div>

        {/* Stratigraphic Memory View Container */}
        <div className="bg-[#0A0F16] border border-[#172332] rounded-xl p-6 relative">
          {/* Controls Bar inside the comparison panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#141F2D]">
            <div>
              <div className="text-[10px] font-mono tracking-wider uppercase text-[#7E8B9B]">
                LAKWA CENTRAL / 3 SELECTED WELLS
              </div>
              <h2 className="text-lg font-semibold text-white">Stratigraphic memory</h2>
            </div>

            {/* Toggle View Options */}
            <div className="flex items-center gap-1 bg-[#070D13] p-1 rounded-lg border border-[#141F2D]">
              <button
                onClick={() => setActiveTab('formation')}
                className={cn(
                  "px-3 py-1 rounded text-xs font-mono transition-all",
                  activeTab === 'formation' ? "bg-[#162232] text-[#F59E0B] font-bold" : "text-[#7E8B9B] hover:text-white"
                )}
              >
                Formation
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                className={cn(
                  "px-3 py-1 rounded text-xs font-mono transition-all",
                  activeTab === 'incidents' ? "bg-[#162232] text-[#F59E0B] font-bold" : "text-[#7E8B9B] hover:text-white"
                )}
              >
                Incidents
              </button>
              <button
                onClick={() => setActiveTab('depth')}
                className={cn(
                  "px-3 py-1 rounded text-xs font-mono transition-all",
                  activeTab === 'depth' ? "bg-[#162232] text-[#F59E0B] font-bold" : "text-[#7E8B9B] hover:text-white"
                )}
              >
                Depth
              </button>
            </div>
          </div>

          {/* 3 Side-by-Side Stratigraphic Columns matching Reference Image 5 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Stratigraphic Columns */}
            {COMPARED_WELLS.map((well) => (
              <div key={well.id} className="flex flex-col items-center">
                {/* Column Well Header */}
                <div className="flex items-center gap-2 mb-4 font-mono text-xs">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", well.dotColor)} />
                  <span className="font-bold text-white">{well.name}</span>
                  <span className="text-[#64748B] text-[10px]">({well.depth})</span>
                </div>

                <div className="text-[10px] font-mono text-[#64748B] mb-2 uppercase">Surface</div>

                {/* Trapezoid / Layer stack */}
                <div className="w-full flex flex-col items-center space-y-1.5 max-w-[280px]">
                  {well.formations.map((f, idx) => (
                    <div
                      key={f.name}
                      onClick={() => f.incident && setSelectedIncident(f.incident)}
                      style={{ backgroundColor: f.color }}
                      className={cn(
                        f.widthClass,
                        "h-14 rounded-md flex items-center justify-between px-3 text-xs font-mono text-white transition-all cursor-pointer relative shadow-md",
                        f.incident ? "border border-[#EF4444]/60 hover:ring-2 hover:ring-[#EF4444]" : "border border-black/20"
                      )}
                    >
                      <span className="font-medium text-[11px] drop-shadow">{f.name}</span>

                      {f.incident && (
                        <div className="flex items-center gap-1 bg-[#EF4444] text-white px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>!</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Incident Detail Popup Modal with YouTube Video & Mitigations */}
          {selectedIncident && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-[#0B1119] border border-[#23354C] rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl relative overflow-hidden">
                {/* Header with incident severity badge */}
                <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-[#1A283A]">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                      selectedIncident.severity === 'critical' ? "bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]" : "bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]"
                    )}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded",
                          selectedIncident.severity === 'critical' ? "bg-[#EF4444]/20 text-[#EF4444]" : "bg-[#F59E0B]/20 text-[#F59E0B]"
                        )}>
                          {selectedIncident.severity === 'critical' ? 'CRITICAL INCIDENT ALERT' : 'DRILLING HAZARD WATCH'}
                        </span>
                        <span className="text-[11px] font-mono text-[#64748B]">
                          {selectedIncident.depth} · {selectedIncident.formation}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1">
                        {selectedIncident.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="p-1.5 rounded-lg bg-[#141F2D] hover:bg-[#1E2E42] text-[#94A3B8] hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Subsurface Incident Issue Description */}
                <div className="mb-4 p-3.5 rounded-xl bg-[#070D14] border border-[#162232]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#7E8B9B] mb-1">
                    HISTORICAL DRILLING PHENOMENON
                  </div>
                  <p className="text-xs text-[#E2E8F0] leading-relaxed">
                    {selectedIncident.issue}
                  </p>
                </div>

                {/* Verified Mitigation Step */}
                <div className="mb-4 p-4 rounded-xl bg-[#091512] border border-[#10B981]/30">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#10B981] font-bold mb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    PROVEN MITIGATION PROTOCOL
                  </div>
                  <p className="text-xs text-white font-medium leading-relaxed mb-3">
                    {selectedIncident.mitigation}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-[#132A24]">
                    <div className="text-[10px] font-mono text-[#64748B] uppercase">Mandatory Field Steps:</div>
                    {selectedIncident.provenAction.map((action, i) => (
                      <div key={i} className="text-[11px] font-mono text-[#34D399] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Incident Photo Evidence Strip */}
                {selectedIncident.incidentPhotos && selectedIncident.incidentPhotos.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      INCIDENT FIELD PHOTOS
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedIncident.incidentPhotos.map((photo, i) => (
                        <div key={i} className="shrink-0 rounded-lg overflow-hidden border border-[#1E2E42] w-[150px]">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            className="w-full h-[90px] object-cover"
                          />
                          <div className="px-1.5 py-1 bg-[#070D14] text-[9px] font-mono text-[#64748B] leading-tight">
                            {photo.caption}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Embedded YouTube Mitigation Video */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-mono uppercase text-[#F59E0B] font-bold flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      OPERATIONAL VIDEO GUIDE
                    </div>
                    <a
                      href={`https://www.youtube.com/watch?v=${selectedIncident.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1"
                    >
                      <span>Open on YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#1C2C3E] bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${selectedIncident.youtubeId}?autoplay=0&rel=0`}
                      title={selectedIncident.youtubeTitle}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>

                {/* Footer Reference */}
                <div className="flex items-center justify-between pt-3 border-t border-[#162332] text-[10px] font-mono text-[#64748B]">
                  <span>Source: {selectedIncident.reportRef}</span>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="px-4 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold text-xs transition-colors"
                  >
                    Close Mitigation Guide
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Stratigraphic Legend matching Reference Image 5 */}
          <div className="mt-10 pt-4 border-t border-[#141F2D] flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-[#64748B]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#EF4444]" /> Incident marker
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-[1px] bg-[#64748B] inline-block" /> Shared formation boundary
              </span>
              <span className="flex items-center gap-1.5 text-[#F59E0B]">
                ● Click marker for detail
              </span>
            </div>

            <div className="text-[#38BDF8]">Normalized Depth Index: Zeroed at Formation Top</div>
          </div>
        </div>
      </div>
    </div>
  );
}
