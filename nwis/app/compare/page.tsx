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
  ExternalLink,
  Compass,
  Play, 
  X
} from 'lucide-react';
import { TacticalSidebar } from '@/components/layout/Sidebar';
import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

export interface IncidentData {
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
  incidentPhotos: { url: string; caption: string }[];
}

export interface ComparedFormation {
  name: string;
  top: string;
  color: string;
  widthClass: string;
  incident?: IncidentData;
}

export interface ComparedWell {
  id: string;
  name: string;
  depth: string;
  status: string;
  statusColor: string;
  dotColor: string;
  formations: ComparedFormation[];
}

// ─── 7 BASINS WELL COMPARISON DATA (Strictly Intra-Basin) ────────────────────
export const BASIN_COMPARED_DATA: Record<string, { sectorTitle: string; basinLabel: string; wells: ComparedWell[] }> = {
  // ── 1. Upper Assam Basin ──────────────────────────────────────────────────
  assam: {
    sectorTitle: 'UPPER ASSAM BASIN · LAKWA / DULIAJAN SECTOR (3 WELLS)',
    basinLabel: 'Upper Assam',
    wells: [
      {
        id: 'AA-17H',
        name: 'AA-17H / Current',
        depth: '2,414 m',
        status: 'Drilling',
        statusColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
        dotColor: 'bg-[#EF4444]',
        formations: [
          { name: 'Alluvium', top: '0 m', color: '#3A483E', widthClass: 'w-[82%]' },
          { name: 'Tipam Sandstone', top: '650 m', color: '#856A41', widthClass: 'w-[90%]' },
          { 
            name: 'Girujan Clay', 
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
            }
          },
          { 
            name: 'Disang Shale', 
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
            }
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
          { name: 'Tipam Sandstone', top: '680 m', color: '#856A41', widthClass: 'w-[90%]' },
          { 
            name: 'Girujan Clay', 
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
            }
          },
          { 
            name: 'Disang Shale', 
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
            }
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
          { name: 'Tipam Sandstone', top: '630 m', color: '#856A41', widthClass: 'w-[90%]' },
          { 
            name: 'Girujan Clay', 
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
            }
          },
          { 
            name: 'Disang Shale', 
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
            }
          },
          { name: 'Basement', top: '3,380 m', color: '#222834', widthClass: 'w-[75%]' }
        ]
      }
    ]
  },

  // ── 2. Barmer Basin (Rajasthan) ───────────────────────────────────────────
  rajasthan: {
    sectorTitle: 'BARMER BASIN (RAJASTHAN) · BLOCK RJ-ON-90/1 (3 WELLS)',
    basinLabel: 'Barmer Basin',
    wells: [
      {
        id: 'well-brm-01',
        name: 'Mangala-01 / Current',
        depth: '1,478 m',
        status: 'Drilling',
        statusColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
        dotColor: 'bg-[#EF4444]',
        formations: [
          { name: 'Sand Dunes / Alluvium', top: '0 m', color: '#8C7853', widthClass: 'w-[80%]' },
          { 
            name: 'Akli Bentonite Clay', 
            top: '450 m', 
            color: '#5C6B73', 
            widthClass: 'w-[95%]',
            incident: {
              title: 'Severe Bit Balling & Swelling Bentonite',
              severity: 'high',
              depth: '1,250 m',
              formation: 'Akli Bentonite Clay',
              issue: 'Highly water-sensitive sodium montmorillonite bentonite caused severe bit balling. ROP dropped from 30 m/hr to 3 m/hr with rotary torque surges.',
              mitigation: 'Inhibit active water phase with 7% KCl and PHPA encapsulator. Spot 35 bbl detergent/glycol wash pill around BHA.',
              provenAction: [
                'Increase pump rate from 450 to 620 gpm to maximize nozzle hydraulic cleaning',
                'Add glycol cloud-point additive to active suction pit',
                'Monitor shaker screens for sticky bentonite agglomerates'
              ],
              reportRef: 'CAIRN/VEDANTA DDR-MGL-01 / RJ-ON-90/1',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'Preventing Bit Balling in Reactive Bentonitic Shales',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Bentonite gumbo packing bit cones — Barmer Basin' },
              ]
            }
          },
          { name: 'Barmer Hill Diatomite', top: '1,800 m', color: '#4A5568', widthClass: 'w-[90%]' },
          { 
            name: 'Fatehgarh Sandstone', 
            top: '3,400 m', 
            color: '#B08968', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'Dynamic Mud Loss in Fractured Reservoir',
              severity: 'critical',
              depth: '3,450 m',
              formation: 'Fatehgarh Reservoir Contact',
              issue: 'High-permeability fluvial braided sand with micro-fractures resulted in 60 bbl/hr dynamic mud loss upon penetration.',
              mitigation: 'Spot 40 bbl engineered calcium carbonate pill (coarse/medium blend). Maintain ECD strictly below 10.2 ppg.',
              provenAction: [
                'Reduce circulating flow rate from 550 to 380 gpm',
                'Pump 40 bbl CaCO3 LCM slurry with 2 hours hesitation soak',
                'Switch to low-viscosity non-damaging reservoir drill-in fluid'
              ],
              reportRef: 'CAIRN WCR-MGL-RES-2023',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Reservoir Protection & Lost Circulation in Fluvial Sands',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Loss rate monitoring at Barmer rig site' },
              ]
            }
          },
          { name: 'Volcanic Basement', top: '4,500 m', color: '#2D3748', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-brm-02',
        name: 'Bhagyam-04 / Offset',
        depth: '1,585 m',
        status: 'Completed',
        statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        formations: [
          { name: 'Sand Dunes / Alluvium', top: '0 m', color: '#8C7853', widthClass: 'w-[80%]' },
          { 
            name: 'Akli Bentonite Clay', 
            top: '460 m', 
            color: '#5C6B73', 
            widthClass: 'w-[95%]',
            incident: {
              title: 'Torque Spikes & 18 klb Overpull Event',
              severity: 'high',
              depth: '1,280 m',
              formation: 'Akli Bentonite Clay (Offset BHG-04)',
              issue: 'Swelling clay narrowed hole gage during wiper trip, causing 18 klb overpull at bit breaker level.',
              mitigation: 'Reamed out interval at 100 RPM with polymer sweep; increased KCl concentration to 8%.',
              provenAction: [
                'Perform short trips every 120 meters of new hole',
                'Maintain high annular clearance velocity'
              ],
              reportRef: 'VEDANTA DDR-BHG-04 / Rig #12',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'Managing Torque and Drag in Swelling Formations',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Weight indicator showing drag overpull — Bhagyam-04' },
              ]
            }
          },
          { name: 'Barmer Hill Diatomite', top: '1,820 m', color: '#4A5568', widthClass: 'w-[90%]' },
          { 
            name: 'Fatehgarh Sandstone', 
            top: '3,420 m', 
            color: '#B08968', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'Total Fluid Return Loss: 40 bbls',
              severity: 'critical',
              depth: '3,440 m',
              formation: 'Fatehgarh Sandstone (Offset BHG-04)',
              issue: 'Encountered vuggy sand channel with immediate 40 bbls pit volume loss.',
              mitigation: 'Spotted coarse nut-plug and mica blend pill; circulation restored within 90 minutes.',
              provenAction: [
                'Space out string and pull into intermediate casing shoe',
                'Bullhead 30 bbl high solids pill'
              ],
              reportRef: 'CAIRN DDR #89 / BHG-04',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Lost Circulation Recovery Protocols',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Pit level sensors triggering loss warning' },
              ]
            }
          },
          { name: 'Volcanic Basement', top: '4,520 m', color: '#2D3748', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-brm-03',
        name: 'Aishwarya-02 / Offset',
        depth: '1,402 m',
        status: 'Completed',
        statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        formations: [
          { name: 'Sand Dunes / Alluvium', top: '0 m', color: '#8C7853', widthClass: 'w-[80%]' },
          { name: 'Akli Bentonite Clay', top: '440 m', color: '#5C6B73', widthClass: 'w-[95%]' },
          { 
            name: 'Barmer Hill Diatomite', 
            top: '1,790 m', 
            color: '#4A5568', 
            widthClass: 'w-[90%]',
            incident: {
              title: 'Tight Hole in Low-Perm Diatomite',
              severity: 'watch',
              depth: '2,140 m',
              formation: 'Barmer Hill Shale (Offset AWR-02)',
              issue: 'Micro-crystalline silica mud cake building caused high wall contact friction and drag on pipe connections.',
              mitigation: 'Treated mud with 2.5% ester-based lubricant to reduce filter cake coefficient of friction.',
              provenAction: [
                'Maintain rotary speed above 80 RPM',
                'Wiper trip before logging tools run'
              ],
              reportRef: 'VEDANTA WCR-AWR-02-2022',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'Mud Lubrication in Tight Diatomite Reservoirs',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Filter cake inspection on core sample' },
              ]
            }
          },
          { name: 'Fatehgarh Sandstone', top: '3,390 m', color: '#B08968', widthClass: 'w-[100%]' },
          { name: 'Volcanic Basement', top: '4,480 m', color: '#2D3748', widthClass: 'w-[75%]' }
        ]
      }
    ]
  },

  // ── 3. Cambay Basin (Gujarat) ─────────────────────────────────────────────
  cambay: {
    sectorTitle: 'CAMBAY BASIN (GUJARAT) · ANKLESHWAR & KALOL SECTOR (3 WELLS)',
    basinLabel: 'Cambay Basin',
    wells: [
      {
        id: 'well-cby-01',
        name: 'Ankleshwar-12 / Current',
        depth: '1,890 m',
        status: 'Drilling',
        statusColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
        dotColor: 'bg-[#EF4444]',
        formations: [
          { name: 'Post-Eocene Clay', top: '0 m', color: '#4A5568', widthClass: 'w-[82%]' },
          { 
            name: 'Tarapur Shale', 
            top: '1,200 m', 
            color: '#3C4858', 
            widthClass: 'w-[92%]',
            incident: {
              title: 'Pore Pressure Surge & Gas Kick',
              severity: 'critical',
              depth: '1,600 m',
              formation: 'Tarapur Shale Transition',
              issue: 'Rapid increase in pore pressure gradient from 9.2 to 11.4 ppg caused 18 bbl gas influx during connection.',
              mitigation: 'Shut in well on annular preventer. Weight up active system with barite to 11.8 ppg using Wait & Weight method.',
              provenAction: [
                'Record SIDPP and SICP immediately upon shut-in',
                'Circulate gas kick out via choke manifold',
                'Condition mud to uniform density before resuming drilling'
              ],
              reportRef: 'ONGC DDR #122 / Ankleshwar Asset',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Well Control & Wait and Weight Kick Circulation',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Choke console monitoring kick pressure' },
              ]
            }
          },
          { name: 'Hazad Sandstone', top: '3,100 m', color: '#9C6644', widthClass: 'w-[96%]' },
          { 
            name: 'Cambay Black Shale', 
            top: '5,400 m', 
            color: '#1A202C', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'Severe Sloughing Shale Pack-Off',
              severity: 'high',
              depth: '5,600 m',
              formation: 'Cambay Black Shale',
              issue: 'Overpressured organic brittle shale splintered into borehole, overloading shakers and packing off annular space.',
              mitigation: 'Elevate mud weight to 12.2 ppg for hoop stress support. Add glycol cloud-point shale inhibitor.',
              provenAction: [
                'Increase annular velocity to 140 ft/min to clear large splintered cavings',
                'Control ROP to 10 m/hr to prevent cuttings accumulation'
              ],
              reportRef: 'ONGC WCR-ANK-12 / CB-ONN-2000/1',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'Borehole Stability in Tectonically Stressed Shales',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Shaker screen overloaded with splintered cavings' },
              ]
            }
          },
          { name: 'Deccan Trap', top: '6,000 m', color: '#171923', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-cby-02',
        name: 'Kalol-05 / Offset',
        depth: '1,768 m',
        status: 'Completed',
        statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        formations: [
          { name: 'Post-Eocene Clay', top: '0 m', color: '#4A5568', widthClass: 'w-[82%]' },
          { 
            name: 'Tarapur Shale', 
            top: '1,180 m', 
            color: '#3C4858', 
            widthClass: 'w-[92%]',
            incident: {
              title: 'Gas Flow on Shakers: 15% Total Gas',
              severity: 'watch',
              depth: '1,590 m',
              formation: 'Tarapur Shale (Offset KLL-05)',
              issue: 'Encountered lenticular gas sand pocket in lower Tarapur shale; background gas jumped to 15%.',
              mitigation: 'Degasser engaged; raised mud weight from 1.12 to 1.18 SG to control flow.',
              provenAction: [
                'Monitor vacuum degasser efficiency continuously',
                'Flow check at all bit stops'
              ],
              reportRef: 'ONGC DDR-KLL-05 / Kalol Asset',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Mud Gas Management and Degasser Operation',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Mud gas logging unit showing gas peaks' },
              ]
            }
          },
          { name: 'Hazad Sandstone', top: '3,080 m', color: '#9C6644', widthClass: 'w-[96%]' },
          { name: 'Cambay Black Shale', top: '5,380 m', color: '#1A202C', widthClass: 'w-[100%]' },
          { name: 'Deccan Trap', top: '5,950 m', color: '#171923', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-cby-03',
        name: 'Mehsana-08 / Offset',
        depth: '2,164 m',
        status: 'Completed',
        statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        formations: [
          { name: 'Post-Eocene Clay', top: '0 m', color: '#4A5568', widthClass: 'w-[82%]' },
          { name: 'Tarapur Shale', top: '1,220 m', color: '#3C4858', widthClass: 'w-[92%]' },
          { 
            name: 'Hazad Sandstone', 
            top: '3,140 m', 
            color: '#9C6644', 
            widthClass: 'w-[96%]',
            incident: {
              title: 'Differential Sticking in Depleted Sand',
              severity: 'high',
              depth: '3,200 m',
              formation: 'Hazad Sandstone (Offset MSN-08)',
              issue: 'Drill string remained stationary for 20 minutes during survey; stuck against depleted sand due to 450 psi differential overbalance.',
              mitigation: 'Spotted 45 bbl pipe-freeing lubricant pill around stuck zone. Pipe freed after 3 hours soaking with 35 klb jarring down.',
              provenAction: [
                'Keep drill string rotating continuously (>30 RPM) whenever not on bottom',
                'Reduce fluid loss to <4 ml/30min with starch additives'
              ],
              reportRef: 'ONGC WCR-MSN-08 / Mehsana Asset',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'Differential Sticking Mitigation and Jarring Operations',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Jarring action on drill pipe — Mehsana asset' },
              ]
            }
          },
          { name: 'Cambay Black Shale', top: '5,450 m', color: '#1A202C', widthClass: 'w-[100%]' },
          { name: 'Deccan Trap', top: '6,100 m', color: '#171923', widthClass: 'w-[75%]' }
        ]
      }
    ]
  },

  // ── 4. Mumbai High (Arabian Sea Offshore) ─────────────────────────────────
  mumbai: {
    sectorTitle: 'MUMBAI HIGH (OFFSHORE) · L-III CARBONATE SHELF (3 WELLS)',
    basinLabel: 'Mumbai High',
    wells: [
      {
        id: 'well-mbh-01',
        name: 'MH-North-04 / Current',
        depth: '2,560 m',
        status: 'Drilling',
        statusColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
        dotColor: 'bg-[#EF4444]',
        formations: [
          { 
            name: 'Seabed Soft Clays', 
            top: '0 m', 
            color: '#319795', 
            widthClass: 'w-[82%]',
            incident: {
              title: 'Shallow Gas Influx at Conductor Shoe',
              severity: 'critical',
              depth: '650 ft',
              formation: 'Seabed Holocene Silt',
              issue: 'Biogenic pocket gas charged into shallow sand stringer, creating rapid wellhead gas bubbling and risk of cratering.',
              mitigation: 'Divert flow overboard through dual starboard/port diverter lines. Pump 50 bbl heavy 12.5 ppg kill mud into riser.',
              provenAction: [
                'Engage subsea/platform diverter instantly on flow indicator',
                'Avoid shutting in BOP on shallow formations to prevent shoe fracture',
                'Kill well dynamically with high-rate seawater pump-in'
              ],
              reportRef: 'ONGC OFFSHORE WCR-MHN-04 / Rig Sagar Kiran',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Offshore Shallow Gas Mitigation & Diverter Operations',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Offshore platform diverter line discharging gas' },
              ]
            }
          },
          { name: 'Chinchini Formation', top: '1,100 m', color: '#4A5568', widthClass: 'w-[88%]' },
          { name: 'L-II Limestone', top: '3,800 m', color: '#CBD5E0', widthClass: 'w-[94%]' },
          { 
            name: 'L-III Main Carbonate', 
            top: '5,200 m', 
            color: '#E2E8F0', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'Total Loss of Returns in Vuggy Karst Reef',
              severity: 'critical',
              depth: '2,280 m',
              formation: 'L-III Main Limestone Reef',
              issue: 'Encountered cavernous karst void with 100% loss of returns; pit level dropped 85 bbls within 8 minutes.',
              mitigation: 'Pump engineered thixotropic cement-bentonite plug (15.5 ppg) and calcium carbonate cross-linked pill.',
              provenAction: [
                'Pull bit into 9⅝" casing shoe to prevent stuck pipe',
                'Pump 60 bbl LCM pill followed by 40 bbl thixotropic squeeze cement',
                'Wait on cement 8 hours before drilling out plug'
              ],
              reportRef: 'ONGC OFFSHORE WCR-LIII-2023 / Mumbai High',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Managing Massive Karst Lost Circulation in Offshore Carbonates',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Cement unit mixing offshore karst squeeze pill' },
              ]
            }
          },
          { name: 'Deccan Trap Basalt', top: '8,100 m', color: '#1A202C', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-mbh-02',
        name: 'MH-South-09 / Offset',
        depth: '2,773 m',
        status: 'Completed',
        statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        formations: [
          { name: 'Seabed Soft Clays', top: '0 m', color: '#319795', widthClass: 'w-[82%]' },
          { name: 'Chinchini Formation', top: '1,120 m', color: '#4A5568', widthClass: 'w-[88%]' },
          { 
            name: 'L-II Limestone', 
            top: '3,820 m', 
            color: '#CBD5E0', 
            widthClass: 'w-[94%]',
            incident: {
              title: 'Partial Mud Seepage: 35 bbl/hr',
              severity: 'watch',
              depth: '1,850 m',
              formation: 'L-II Chalky Limestone (Offset MHS-09)',
              issue: 'Micro-fractures in chalky limestone caused steady 35 bbl/hr fluid seepage.',
              mitigation: 'Added coarse limestone flakes continuously into active pit; seepage cured in 50 minutes.',
              provenAction: [
                'Lower pump rate by 80 gpm to reduce ECD',
                'Keep trip tank aligned'
              ],
              reportRef: 'ONGC DDR-MHS-09 / Sagar Gaurav',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Seepage Control in Offshore Carbonate Zones',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Trip tank level indicator on offshore rig' },
              ]
            }
          },
          { 
            name: 'L-III Main Carbonate', 
            top: '5,240 m', 
            color: '#E2E8F0', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'Cavernous Karst Total Loss (75 bbls)',
              severity: 'critical',
              depth: '2,260 m',
              formation: 'L-III Carbonate (Offset MHS-09)',
              issue: 'Bit dropped 1.2 meters through cavernous karst void; complete loss of drilling returns.',
              mitigation: 'Pumped dual cement/crosslinked polymer plug; cured with 100% returns.',
              provenAction: [
                'Blind drill with seawater until pill ready',
                'Set 50 bbl thixotropic squeeze plug'
              ],
              reportRef: 'ONGC WCR-MHS-09-LIII',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Blind Drilling and Severe Loss Management Offshore',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80', caption: 'Flowline showing zero returns at MHS-09' },
              ]
            }
          },
          { name: 'Deccan Trap Basalt', top: '8,150 m', color: '#1A202C', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-mbh-04',
        name: 'Neelam-02 / Offset',
        depth: '2,712 m',
        status: 'Completed',
        statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        formations: [
          { name: 'Seabed Soft Clays', top: '0 m', color: '#319795', widthClass: 'w-[82%]' },
          { name: 'Chinchini Formation', top: '1,080 m', color: '#4A5568', widthClass: 'w-[88%]' },
          { name: 'L-II Limestone', top: '3,790 m', color: '#CBD5E0', widthClass: 'w-[94%]' },
          { 
            name: 'L-III Main Carbonate', 
            top: '5,180 m', 
            color: '#E2E8F0', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'H2S Gas Influx & Scavenger Activation',
              severity: 'high',
              depth: '2,310 m',
              formation: 'Mukta/L-III Limestone (Offset NLM-02)',
              issue: 'Encountered sour gas stringer with 120 ppm H2S detected at shaker area.',
              mitigation: 'Injected zinc carbonate H2S scavenger into suction line; raised mud pH to >10.5.',
              provenAction: [
                'All rig personnel donned positive-pressure breathing apparatus',
                'Maintain high pH to prevent H2S breakout into gaseous phase'
              ],
              reportRef: 'ONGC OFFSHORE DDR #168 / Neelam Field',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'H2S Safety and Mud Scavenger Treatment Protocols',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'H2S detection beacon flashing at offshore shaker' },
              ]
            }
          },
          { name: 'Deccan Trap Basalt', top: '8,050 m', color: '#1A202C', widthClass: 'w-[75%]' }
        ]
      }
    ]
  },

  // ── 5. Tripura Gas Fields (Northeast) ─────────────────────────────────────
  tripura: {
    sectorTitle: 'TRIPURA GAS FIELDS · AGARTALA & ROKHIA SECTOR (3 WELLS)',
    basinLabel: 'Tripura Gas',
    wells: [
      {
        id: 'well-trp-01',
        name: 'Agartala-Dome-03 / Current',
        depth: '2,987 m',
        status: 'Drilling',
        statusColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
        dotColor: 'bg-[#EF4444]',
        formations: [
          { name: 'Tipam Sandstone', top: '0 m', color: '#856A41', widthClass: 'w-[85%]' },
          { 
            name: 'Bokabil Formation', 
            top: '1,100 m', 
            color: '#4A5568', 
            widthClass: 'w-[90%]',
            incident: {
              title: 'Fault Zone Pack-Off & High Torque',
              severity: 'high',
              depth: '1,850 m',
              formation: 'Bokabil Fault Contact',
              issue: 'Tectonic compression along anticline fault created high shear stress, causing hole ovalization and drill string pack-off.',
              mitigation: 'Back-ream at 40 RPM; treated mud with 4% bio-lubricant and raised annular flow velocity.',
              provenAction: [
                'Limit dogleg severity below 3 deg/30m in fault interval',
                'Keep pump rate above 500 gpm to prevent cuttings beds'
              ],
              reportRef: 'ONGC/GAIL DDR #94 / Agartala Dome',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'Drilling Through Active Thrust Faults in Fold Belts',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Slickensided shale core showing fault deformation' },
              ]
            }
          },
          { 
            name: 'Upper Bhuban Gas Sand', 
            top: '2,400 m', 
            color: '#B45309', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'Abnormal High-Pressure Gas Kick (>15.2 ppg)',
              severity: 'critical',
              depth: '2,450 m',
              formation: 'Upper Bhuban Gas Sand',
              issue: 'Abnormally pressured high-energy gas reservoir penetrated; shut-in casing pressure spiked to 650 psi within 4 minutes.',
              mitigation: 'Execute Wait and Weight method; weight up kill mud with barite from 12.8 to 15.4 ppg.',
              provenAction: [
                'Space out drill string and close annular BOP immediately',
                'Hold casing pressure constant while bringing pump to kill speed',
                'Vent gas slowly via mud-gas separator'
              ],
              reportRef: 'ONGC WCR-AGD-03-GAS / Tripura Asset',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'High Pressure Gas Well Control & Choke Operation',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'High pressure gas flare stack active at Tripura rig' },
              ]
            }
          },
          { name: 'Middle Bhuban', top: '3,200 m', color: '#2D3748', widthClass: 'w-[80%]' }
        ]
      },
      {
        id: 'well-trp-02',
        name: 'Rokhia-07 / Offset',
        depth: '2,590 m',
        status: 'Completed',
        statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        formations: [
          { name: 'Tipam Sandstone', top: '0 m', color: '#856A41', widthClass: 'w-[85%]' },
          { name: 'Bokabil Formation', top: '1,080 m', color: '#4A5568', widthClass: 'w-[90%]' },
          { 
            name: 'Upper Bhuban Gas Sand', 
            top: '2,380 m', 
            color: '#B45309', 
            widthClass: 'w-[100%]',
            incident: {
              title: '250 psi SICP Gas Kick Encountered',
              severity: 'critical',
              depth: '2,420 m',
              formation: 'Upper Bhuban (Offset ROK-07)',
              issue: 'Drilled into overpressured gas lens; 25 bbl influx with 250 psi shut-in casing pressure.',
              mitigation: 'Successfully circulated out kick using Driller’s method; kill mud weight 15.0 ppg.',
              provenAction: [
                'First circulation: remove gas influx with original mud',
                'Second circulation: displace with heavy kill mud'
              ],
              reportRef: 'GAIL DDR-ROK-07 / Tripura Asset',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Driller’s Method Kick Circulation Step-by-Step',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Choke manifold pressure log during Driller’s method' },
              ]
            }
          },
          { name: 'Middle Bhuban', top: '3,150 m', color: '#2D3748', widthClass: 'w-[80%]' }
        ]
      },
      {
        id: 'well-trp-03',
        name: 'KUB-02 / Offset',
        depth: '3,170 m',
        status: 'Suspended',
        statusColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
        dotColor: 'bg-[#F59E0B]',
        formations: [
          { name: 'Tipam Sandstone', top: '0 m', color: '#856A41', widthClass: 'w-[85%]' },
          { name: 'Bokabil Formation', top: '1,120 m', color: '#4A5568', widthClass: 'w-[90%]' },
          { 
            name: 'Upper Bhuban Gas Sand', 
            top: '2,420 m', 
            color: '#B45309', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'Barite Sag in Static High-Density Mud',
              severity: 'watch',
              depth: '2,860 m',
              formation: 'Lower Bhuban (Offset KUB-02)',
              issue: 'High mud density (15.5 ppg) suffered barite sag during 12-hour wireline logging, leading to hydrostatic loss.',
              mitigation: 'Circulated and sheared mud with organophilic clay viscosifiers to restore yield point.',
              provenAction: [
                'Ensure 10-minute gel strength > 20 lb/100ft²',
                'Rotate pipe slowly during extended wireline operations'
              ],
              reportRef: 'ONGC WCR-KUB-02 / Tripura Asset',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'Preventing Barite Sag in Heavy High-Pressure Muds',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80', caption: 'Mud density check showing density variation from sag' },
              ]
            }
          },
          { name: 'Middle Bhuban', top: '3,220 m', color: '#2D3748', widthClass: 'w-[80%]' }
        ]
      }
    ]
  },

  // ── 6. KG Deepwater Basin (Bay of Bengal) ─────────────────────────────────
  kg: {
    sectorTitle: 'KG DEEPWATER BASIN · BLOCK KG-DWN-98/3 (3 WELLS)',
    basinLabel: 'KG Deepwater',
    wells: [
      {
        id: 'well-kgb-01',
        name: 'KG-D6-A1 / Current',
        depth: '3,901 m',
        status: 'Drilling',
        statusColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
        dotColor: 'bg-[#EF4444]',
        formations: [
          { 
            name: 'Deepwater Marine Gumbo', 
            top: '0 m', 
            color: '#0284C7', 
            widthClass: 'w-[85%]',
            incident: {
              title: 'Shallow Water Flow (SWF) & Seabed Undermining',
              severity: 'critical',
              depth: '850 m',
              formation: 'Deepwater Marine Gumbo Sand',
              issue: 'Overpressured shallow aquifer flowed around conductor pipe, threatening subsea wellhead stability on ocean floor.',
              mitigation: 'Pump weighted 11.2 ppg kill mud pill followed by specialized low-temperature lightweight cement with latex.',
              provenAction: [
                'Use ROV to visually monitor subsea wellhead for broaching',
                'Drill top-hole riserless with high-viscosity bentonite sweeps',
                'Set surface casing promptly across SWF hazard sand'
              ],
              reportRef: 'RIL/BP DRILL-REP #41 / Block KG-DWN-98/3',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Deepwater Shallow Water Flow (SWF) Prevention and Remediation',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'ROV subsea camera inspecting wellhead casing annulus' },
              ]
            }
          },
          { name: 'Godavari Siltstone', top: '1,200 m', color: '#4A5568', widthClass: 'w-[90%]' },
          { name: 'Ravva Sandstone', top: '2,400 m', color: '#856A41', widthClass: 'w-[95%]' },
          { 
            name: 'Pliocene Channel Levee', 
            top: '3,200 m', 
            color: '#0D9488', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'Gas Hydrate Dissociation & Riser Gas Risk',
              severity: 'critical',
              depth: '3,250 m',
              formation: 'Pliocene Gas Turbidite',
              issue: 'Gas kick entering cold deepwater marine riser caused hydrate crystallization risk and sudden gas expansion at surface.',
              mitigation: 'Inject 20% mono-ethylene glycol (MEG) into subsea choke line. Circulate kick via subsea BOP choke.',
              provenAction: [
                'Keep subsea BOP boost line continuous circulation active',
                'Never allow gas to rise above subsea BOP stack unchecked',
                'Maintain riser boost pump rate above 800 gpm'
              ],
              reportRef: 'RIL WCR-KGD6-A01-SUBSEA',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Managing Gas Hydrates and Deepwater Well Control',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Deepwater drillship riser tensioner monitor' },
              ]
            }
          },
          { name: 'Cretaceous Basement', top: '3,800 m', color: '#1E293B', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-kgb-02',
        name: 'Ravva-08 / Offset',
        depth: '2,255 m',
        status: 'Completed',
        statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        formations: [
          { name: 'Deepwater Marine Gumbo', top: '0 m', color: '#0284C7', widthClass: 'w-[85%]' },
          { name: 'Godavari Siltstone', top: '1,180 m', color: '#4A5568', widthClass: 'w-[90%]' },
          { 
            name: 'Ravva Sandstone', 
            top: '2,380 m', 
            color: '#856A41', 
            widthClass: 'w-[95%]',
            incident: {
              title: 'Severe Lost Circulation in Depleted Zone',
              severity: 'high',
              depth: '2,410 m',
              formation: 'Ravva Reservoir (Offset RVW-08)',
              issue: 'Encountered pressure-depleted production sand; mud losses surged to 45 bbl/hr.',
              mitigation: 'Pumped 30 bbl calcium carbonate sizing blend; restored full circulation.',
              provenAction: [
                'Control ECD to under 9.6 ppg',
                'Use low shear rate viscosifier to seal pore throats'
              ],
              reportRef: 'VEDANTA DDR-RVW-08 / Ravva Offshore',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Depleted Sand Lost Circulation Control',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80', caption: 'Loss rate trend graph on offshore dashboard' },
              ]
            }
          },
          { name: 'Pliocene Channel Levee', top: '3,180 m', color: '#0D9488', widthClass: 'w-[100%]' },
          { name: 'Cretaceous Basement', top: '3,780 m', color: '#1E293B', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-kgb-03',
        name: 'Godavari-DW-04 / Offset',
        depth: '4,328 m',
        status: 'Active',
        statusColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
        dotColor: 'bg-[#EF4444]',
        formations: [
          { name: 'Deepwater Marine Gumbo', top: '0 m', color: '#0284C7', widthClass: 'w-[85%]' },
          { name: 'Godavari Siltstone', top: '1,220 m', color: '#4A5568', widthClass: 'w-[90%]' },
          { name: 'Ravva Sandstone', top: '2,420 m', color: '#856A41', widthClass: 'w-[95%]' },
          { 
            name: 'Pliocene Channel Levee', 
            top: '3,220 m', 
            color: '#0D9488', 
            widthClass: 'w-[100%]',
            incident: {
              title: '30 bbl Gas Influx under Riser Margin',
              severity: 'critical',
              depth: '3,310 m',
              formation: 'Turbidite Channel (Offset GDW-04)',
              issue: 'High-rate gas influx penetrated while drilling 8½" hole without riser margin compensation.',
              mitigation: 'Displaced hole to 13.4 ppg synthetic-based mud using deepwater subsea choke.',
              provenAction: [
                'Circulate kick out via subsea choke manifold',
                'Verify temperature profile to prevent hydrate freezing in lines'
              ],
              reportRef: 'ONGC OFFSHORE WCR-GDW-04 / KG-DWN-98/2',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Deepwater Well Control with Synthetic-Based Muds',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Subsea BOP acoustic telemetry monitor' },
              ]
            }
          },
          { name: 'Cretaceous Basement', top: '3,850 m', color: '#1E293B', widthClass: 'w-[75%]' }
        ]
      }
    ]
  },

  // ── 7. Cauvery Basin (Tamil Nadu) ─────────────────────────────────────────
  cauvery: {
    sectorTitle: 'CAUVERY BASIN · NARIMANAM & BHUVANAGIRI SECTOR (3 WELLS)',
    basinLabel: 'Cauvery Basin',
    wells: [
      {
        id: 'well-cvy-01',
        name: 'Narimanam-05 / Current',
        depth: '2,377 m',
        status: 'Drilling',
        statusColor: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30',
        dotColor: 'bg-[#EF4444]',
        formations: [
          { name: 'Cuddalore Sandstone', top: '0 m', color: '#856A41', widthClass: 'w-[80%]' },
          { 
            name: 'Kamalapuram Formation', 
            top: '600 m', 
            color: '#4A5568', 
            widthClass: 'w-[90%]',
            incident: {
              title: 'Swelling Marine Gumbo Shale Tight Hole',
              severity: 'high',
              depth: '1,100 m',
              formation: 'Kamalapuram Marine Shale',
              issue: 'High smectite content caused severe swelling into wellbore with 22 klb overpull on bit trips.',
              mitigation: 'Treat mud system with 6% KCl and polyamine shale inhibitor to prevent clay hydration.',
              provenAction: [
                'Perform wiper trip every 100 meters drilled',
                'Maintain high mud filtration control (<3.5 ml/30min)'
              ],
              reportRef: 'ONGC CY-NRM-05 REPORT / Cauvery Asset',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'Swelling Shale Inhibition & Amine Systems',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Swelling shale core swelling test — Cauvery basin' },
              ]
            }
          },
          { 
            name: 'Bhuvanagiri Sandstone', 
            top: '1,800 m', 
            color: '#B45309', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'High-Pressure Gas-Condensate Kick',
              severity: 'critical',
              depth: '2,150 m',
              formation: 'Bhuvanagiri Reservoir Contact',
              issue: 'Tightly fractured subarkosic sandstone reservoir encountered with rapid 15 bbl condensate and gas influx.',
              mitigation: 'Shut in on pipe rams; raised mud weight from 1.15 to 1.30 SG via Wait & Weight method.',
              provenAction: [
                'Monitor shut-in drill pipe pressure carefully',
                'Slowly bleed gas out via mud-gas separator to prevent liquid carryover',
                'Verify casing shoe integrity before resuming'
              ],
              reportRef: 'ONGC WCR-NRM-05-RES-2023',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Gas Condensate Well Control Protocols',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Condensate sample recovered at well testing unit' },
              ]
            }
          },
          { name: 'Sattapadi Shale', top: '2,600 m', color: '#334155', widthClass: 'w-[85%]' },
          { name: 'Basement', top: '3,200 m', color: '#1E293B', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-cvy-02',
        name: 'Kovilkalappal-02 / Offset',
        depth: '2,103 m',
        status: 'Completed',
        statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        formations: [
          { name: 'Cuddalore Sandstone', top: '0 m', color: '#856A41', widthClass: 'w-[80%]' },
          { 
            name: 'Kamalapuram Formation', 
            top: '590 m', 
            color: '#4A5568', 
            widthClass: 'w-[90%]',
            incident: {
              title: '18 klb Overpull on Connections',
              severity: 'high',
              depth: '1,080 m',
              formation: 'Kamalapuram Shale (Offset KVK-02)',
              issue: 'Tight hole during bit connection due to swelling clay; bit jammed in keyseat.',
              mitigation: 'Back-reamed with full mud circulation and added 3% liquid lubricant.',
              provenAction: [
                'Ensure rotary table running at 70 RPM while pulling off bottom'
              ],
              reportRef: 'ONGC DDR-KVK-02 / Cauvery Asset',
              youtubeId: '9Gk5fL2Esq4',
              youtubeTitle: 'Freeing Keyseated Drillstring in Deviated Holes',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Weight indicator showing drag overpull' },
              ]
            }
          },
          { name: 'Bhuvanagiri Sandstone', top: '1,780 m', color: '#B45309', widthClass: 'w-[100%]' },
          { name: 'Sattapadi Shale', top: '2,580 m', color: '#334155', widthClass: 'w-[85%]' },
          { name: 'Basement', top: '3,180 m', color: '#1E293B', widthClass: 'w-[75%]' }
        ]
      },
      {
        id: 'well-cvy-03',
        name: 'Bhuvanagiri-Deep-01 / Offset',
        depth: '3,505 m',
        status: 'Suspended',
        statusColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
        dotColor: 'bg-[#F59E0B]',
        formations: [
          { name: 'Cuddalore Sandstone', top: '0 m', color: '#856A41', widthClass: 'w-[80%]' },
          { name: 'Kamalapuram Formation', top: '610 m', color: '#4A5568', widthClass: 'w-[90%]' },
          { 
            name: 'Bhuvanagiri Sandstone', 
            top: '1,820 m', 
            color: '#B45309', 
            widthClass: 'w-[100%]',
            incident: {
              title: 'Micro-Fracture Mud Losses: 25 bbl/hr',
              severity: 'watch',
              depth: '2,180 m',
              formation: 'Bhuvanagiri Deep (Offset BHV-01)',
              issue: 'Natural micro-fractures drained 25 bbl/hr of drilling fluid into fractured pay zone.',
              mitigation: 'Pre-treated with medium calcium carbonate (25 ppb); losses sealed completely.',
              provenAction: [
                'Reduce circulating pressure across fracture envelope'
              ],
              reportRef: 'ONGC WCR-BHV-01-DEEP',
              youtubeId: 'W3q8Od5qJio',
              youtubeTitle: 'Micro-Fracture Lost Circulation Sealing',
              incidentPhotos: [
                { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Mud pit loss monitoring chart — Cauvery deep' },
              ]
            }
          },
          { name: 'Sattapadi Shale', top: '2,650 m', color: '#334155', widthClass: 'w-[85%]' },
          { name: 'Basement', top: '3,450 m', color: '#1E293B', widthClass: 'w-[75%]' }
        ]
      }
    ]
  }
};

const BASIN_LIST = [
  { id: 'assam', label: 'Upper Assam' },
  { id: 'rajasthan', label: 'Barmer (RJ)' },
  { id: 'cambay', label: 'Cambay (GJ)' },
  { id: 'mumbai', label: 'Mumbai High' },
  { id: 'tripura', label: 'Tripura Gas' },
  { id: 'kg', label: 'KG Deepwater' },
  { id: 'cauvery', label: 'Cauvery' },
];

export default function WellComparisonPage() {
  const { selectedBasin, setSelectedBasin } = useAppStore();
  const [activeTab, setActiveTab] = useState<'formation' | 'incidents' | 'depth'>('formation');
  const [selectedIncident, setSelectedIncident] = useState<IncidentData | null>(null);

  // Active basin (fallback to 'assam' if 'all')
  const currentBasinKey = selectedBasin && selectedBasin !== 'all' ? selectedBasin : 'assam';
  const currentBasinData = BASIN_COMPARED_DATA[currentBasinKey] || BASIN_COMPARED_DATA.assam;

  const handleSelectBasin = (basinKey: string) => {
    setSelectedBasin(basinKey);
  };

  return (
    <div className="flex min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white">
      {/* Tactical Left Sidebar */}
      <TacticalSidebar />

      {/* Main Well Comparison Workspace */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1500px]">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#141F2D] mb-6">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#7E8B9B] uppercase mb-1">
              HISTORICAL INTELLIGENCE · BASIN-SPECIFIC WELL CORRELATION
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Well comparison
            </h1>
            <p className="text-xs text-[#8A9BAE] mt-0.5">
              Comparing stratigraphic formations and historical incidents strictly within the active basin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0E1520] border border-[#233144] hover:border-[#F59E0B] text-xs font-mono text-white transition-colors cursor-pointer">
              <Plus className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Add well in basin</span>
            </button>
          </div>
        </div>

        {/* ── Basin Selector Tabs ────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0A0F16] border border-[#172332] rounded-xl overflow-x-auto mb-6">
          <span className="text-[10px] font-mono text-[#F59E0B] font-bold uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Compass className="w-3.5 h-3.5 text-[#F59E0B]" />
            ACTIVE BASIN:
          </span>
          {BASIN_LIST.map((b) => (
            <button
              key={b.id}
              onClick={() => handleSelectBasin(b.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer",
                currentBasinKey === b.id
                  ? "bg-[#F59E0B] text-black font-bold shadow-md shadow-[#F59E0B]/30"
                  : "text-[#8A9BAE] hover:text-white hover:bg-[#141F2D]"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Stratigraphic Memory View Container */}
        <div className="bg-[#0A0F16] border border-[#172332] rounded-xl p-6 relative">
          {/* Controls Bar inside the comparison panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#141F2D]">
            <div>
              <div className="text-[10px] font-mono tracking-wider uppercase text-[#F59E0B] font-bold">
                {currentBasinData.sectorTitle}
              </div>
              <h2 className="text-lg font-semibold text-white mt-0.5">Stratigraphic memory</h2>
            </div>

            {/* Toggle View Options */}
            <div className="flex items-center gap-1 bg-[#070D13] p-1 rounded-lg border border-[#141F2D]">
              <button
                onClick={() => setActiveTab('formation')}
                className={cn(
                  "px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer",
                  activeTab === 'formation' ? "bg-[#162232] text-[#F59E0B] font-bold" : "text-[#7E8B9B] hover:text-white"
                )}
              >
                Formation
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                className={cn(
                  "px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer",
                  activeTab === 'incidents' ? "bg-[#162232] text-[#F59E0B] font-bold" : "text-[#7E8B9B] hover:text-white"
                )}
              >
                Incidents
              </button>
              <button
                onClick={() => setActiveTab('depth')}
                className={cn(
                  "px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer",
                  activeTab === 'depth' ? "bg-[#162232] text-[#F59E0B] font-bold" : "text-[#7E8B9B] hover:text-white"
                )}
              >
                Depth
              </button>
            </div>
          </div>

          {/* 3 Side-by-Side Stratigraphic Columns strictly within the Active Basin */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {currentBasinData.wells.map((well) => (
              <div key={well.id} className="flex flex-col items-center">
                {/* Column Well Header */}
                <div className="flex items-center gap-2 mb-4 font-mono text-xs">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", well.dotColor)} />
                  <span className="font-bold text-white">{well.name}</span>
                  <span className="text-[#64748B] text-[10px]">({well.depth})</span>
                </div>

                <div className="text-[10px] font-mono text-[#64748B] mb-2 uppercase">Surface 0 m</div>

                {/* Layer stack */}
                <div className="w-full flex flex-col items-center space-y-1.5 max-w-[280px]">
                  {well.formations.map((f) => (
                    <div
                      key={f.name}
                      onClick={() => f.incident && setSelectedIncident(f.incident)}
                      style={{ backgroundColor: f.color }}
                      className={cn(
                        f.widthClass,
                        "h-14 rounded-md flex items-center justify-between px-3 text-xs font-mono text-white transition-all cursor-pointer relative shadow-md",
                        f.incident 
                          ? "border border-[#EF4444]/70 hover:ring-2 hover:ring-[#EF4444] hover:scale-[1.02]" 
                          : "border border-black/20 hover:border-white/30"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-[11px] drop-shadow">{f.name}</span>
                        {activeTab === 'depth' && (
                          <span className="text-[9px] text-white/70 font-mono">Top: {f.top}</span>
                        )}
                      </div>

                      {f.incident && (
                        <div className="flex items-center gap-1 bg-[#EF4444] text-white px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse shadow-sm">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{f.incident.severity.toUpperCase()}</span>
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
                    className="p-1.5 rounded-lg bg-[#141F2D] hover:bg-[#1E2E42] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
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

                {/* Modal Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[#162332] text-[10px] font-mono text-[#64748B]">
                  <span>Reference: {selectedIncident.reportRef}</span>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="px-4 py-1.5 rounded-lg bg-[#141F2D] hover:bg-[#1E2E42] text-white text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
