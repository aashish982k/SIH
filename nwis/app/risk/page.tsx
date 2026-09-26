'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  Check, 
  ChevronRight, 
  Compass, 
  Sliders, 
  TrendingUp, 
  Layers, 
  Info,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  X,
  BellRing,
  Radio,
  Flame
} from 'lucide-react';
import { TacticalSidebar } from '@/components/layout/Sidebar';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore, BASIN_FIELD_MAPPING } from '@/store/appStore';
import { cn } from '@/lib/utils';

export interface LiveSignalAlert {
  id: string;
  triggerDepth: number;
  severity: 'critical' | 'watch' | 'normal';
  title: string;
  offsetWell: string;
  depth: string;
  confidence: string;
  timeAgo: string;
  reason: string;
  mitigation: string;
  fieldSteps: string[];
  youtubeId: string;
  youtubeTitle: string;
  incidentPhotos: { url: string; caption: string }[];
  acknowledged: boolean;
}

export interface BasinSimulationConfig {
  wellName: string;
  fieldSector: string;
  basinLabel?: string;
  defaultDepth: number;
  minDepth: number;
  maxDepth: number;
  formations: { name: string; top: number; base: number; color: string; desc: string }[];
  radarOffsets: { name: string; dist: string; topPercent: number; leftPercent: number; risk: 'critical' | 'watch' | 'normal' }[];
  lessonsLearned: { title: string; desc: string; rec: string };
  alerts: LiveSignalAlert[];
}

// ─── 7 BASINS SIMULATION CONFIGURATION ─────────────────────────────────────────
export const BASIN_SIMULATION_CONFIG: Record<string, BasinSimulationConfig> = {
  // ── 1. Upper Assam Basin ──────────────────────────────────────────────────
  assam: {
    wellName: 'Well AA-17H',
    fieldSector: 'UPPER ASSAM · LAKWA CENTRAL SECTOR',
    defaultDepth: 1600,
    minDepth: 1400,
    maxDepth: 3500,
    formations: [
      { name: 'Recent Alluvium', top: 0, base: 600, color: '#3A483E', desc: 'Loose gravel and sandy clay' },
      { name: 'Dhekiajuli Formation', top: 600, base: 1400, color: '#4A5B52', desc: 'Coarse sandstones with clay bands' },
      { name: 'Tipam Sandstone', top: 1400, base: 2442, color: '#856A41', desc: 'Porous reservoir sand, high fluid mobility' },
      { name: 'Girujan Clay', top: 2442, base: 2850, color: '#4D5866', desc: 'Overpressured reactive shale zone' },
      { name: 'Disang Shale', top: 2850, base: 3400, color: '#353D4A', desc: 'Hard compact shale, wellbore collapse risk' },
      { name: 'Basement', top: 3400, base: 4000, color: '#222834', desc: 'Granitic metamorphic basement' }
    ],
    radarOffsets: [
      { name: 'AA-12Y', dist: '1.2 km', topPercent: 28, leftPercent: 72, risk: 'critical' },
      { name: 'AA-092', dist: '2.4 km', topPercent: 35, leftPercent: 24, risk: 'watch' },
      { name: 'AA-037', dist: '3.8 km', topPercent: 72, leftPercent: 32, risk: 'normal' },
      { name: 'AA-701', dist: '5.2 km', topPercent: 68, leftPercent: 78, risk: 'normal' },
    ],
    lessonsLearned: {
      title: 'Mud losses at Tipam/Girujan contact (2,442 m)',
      desc: '3 of 4 offset wells saw mud losses at Tipam/Girujan boundary due to sub-hydrostatic sands.',
      rec: 'Reduce ECD by 0.3 ppg before entering boundary and keep 30 bbl LCM pill mixed.'
    },
    alerts: [
      {
        id: 'asm-sig-01',
        triggerDepth: 1954,
        severity: 'watch',
        title: 'Torque increase above offset median',
        offsetWell: 'Offset AA-092',
        depth: '1,954 m',
        confidence: '78% confidence',
        timeAgo: 'APPROACHING',
        reason: 'Spatial distance + recency in Tipam sand',
        mitigation: 'Add 3% liquid lubricant to active mud system to reduce frictional drag. Maintain string rotation during connections.',
        fieldSteps: [
          'Add 3% bio-lubricant to suction pit',
          'Control rotary table at 60 RPM to mitigate stick-slip',
          'Perform reaming passes if torque exceeds 14,000 ft-lbs'
        ],
        youtubeId: '9Gk5fL2Esq4',
        youtubeTitle: 'Torque & Drag Optimization in Directional Drilling',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Weight indicator — torque oscillation event at AA-092' },
          { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Shale cuttings indicating reactive formation contact' },
        ],
        acknowledged: false
      },
      {
        id: 'asm-sig-02',
        triggerDepth: 2442,
        severity: 'critical',
        title: 'Lost circulation pattern detected',
        offsetWell: 'Offset AA-12Y',
        depth: '2,430 m',
        confidence: '92% confidence',
        timeAgo: 'IMMINENT',
        reason: 'Formation match + depth proximity at Girujan boundary',
        mitigation: 'Pre-treat active system with 20 ppb coarse fiber LCM pill. Reduce pump flow to 420 gpm to keep ECD below fracture gradient.',
        fieldSteps: [
          'Spot 30 bbl high-viscosity pill with mica & calcium carbonate',
          'Reduce pump rate from 650 to 420 gpm before boundary',
          'Monitor pit volume on 1-minute interval'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Managing Lost Circulation in Upper Assam Reservoir Sands',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Pit volume monitor — sudden total loss event' },
          { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80', caption: 'LCM pill being mixed on rig floor, AA-12Y' },
        ],
        acknowledged: false
      },
      {
        id: 'asm-sig-03',
        triggerDepth: 2850,
        severity: 'critical',
        title: 'Differential sticking & wellbore collapse risk',
        offsetWell: 'Offset AA-09P',
        depth: '2,850 m',
        confidence: '89% confidence',
        timeAgo: 'DEEPER HORIZON',
        reason: 'Tectonic stress in laminated Disang shale',
        mitigation: 'Spot lubricating glycol-based pill around BHA. Maintain continuous string rotation (>40 RPM) during pauses. Increase mud inhibition with 6% KCl.',
        fieldSteps: [
          'Spot 40 bbl oil-wetting lubricant pill across tight interval',
          'Ream back through intervals at 20 m/hr with full circulation',
          'Ensure minimum annular velocity of 120 ft/min to clear cavings'
        ],
        youtubeId: '9Gk5fL2Esq4',
        youtubeTitle: 'Wellbore Stability & Stuck Pipe Prevention in Reactive Shales',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Drill string overpull — tight hole indication' },
          { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Reactive shale cuttings on shaker — Disang formation' },
        ],
        acknowledged: false
      }
    ]
  },

  // ── 2. Barmer Basin (Rajasthan) ───────────────────────────────────────────
  rajasthan: {
    wellName: 'Well Mangala-01',
    fieldSector: 'BARMER BASIN · RJ-ON-90/1 WESTERN SECTOR',
    defaultDepth: 800,
    minDepth: 400,
    maxDepth: 4500,
    formations: [
      { name: 'Sand Dunes / Alluvium', top: 0, base: 450, color: '#8C7853', desc: 'Loose surface desert sands' },
      { name: 'Akli Bentonite Clay', top: 450, base: 1800, color: '#5C6B73', desc: 'Swelling bentonitic clay, high bit-balling risk' },
      { name: 'Barmer Hill Diatomite', top: 1800, base: 3400, color: '#4A5568', desc: 'Low permeability siliceous diatomite shale' },
      { name: 'Fatehgarh Sandstone', top: 3400, base: 4200, color: '#B08968', desc: 'High perm fluvial sand, severe loss zone' },
      { name: 'Volcanic Basement', top: 4200, base: 4500, color: '#2D3748', desc: 'Pre-Cambrian rhyolitic basalt basement' }
    ],
    radarOffsets: [
      { name: 'Bhagyam-04', dist: '1.4 km', topPercent: 30, leftPercent: 70, risk: 'critical' },
      { name: 'Aishwarya-02', dist: '2.6 km', topPercent: 36, leftPercent: 26, risk: 'watch' },
      { name: 'Raageshwari-01', dist: '4.2 km', topPercent: 72, leftPercent: 30, risk: 'normal' },
      { name: 'Saraswati-02', dist: '5.8 km', topPercent: 65, leftPercent: 75, risk: 'normal' },
    ],
    lessonsLearned: {
      title: 'Akli Bentonite Bit Balling & Fatehgarh Losses',
      desc: 'Offset Bhagyam-04 had ROP drop to 3 m/hr in Akli bentonite, while Raageshwari saw 60 bbl/hr loss in Fatehgarh.',
      rec: 'Inhibit active water phase with 7% KCl + PHPA and keep 40 bbl CaCO3 LCM ready in suction pit.'
    },
    alerts: [
      {
        id: 'brm-sig-01',
        triggerDepth: 1250,
        severity: 'high' as any,
        title: 'Severe bit balling in Akli bentonite clay',
        offsetWell: 'Offset Bhagyam-04',
        depth: '1,250 m',
        confidence: '91% confidence',
        timeAgo: 'IMMINENT',
        reason: 'Water-sensitive sodium bentonite contact',
        mitigation: 'Inhibit active water phase with 7% KCl and PHPA encapsulator. Spot 35 bbl detergent/glycol wash pill around BHA.',
        fieldSteps: [
          'Increase pump rate from 450 to 620 gpm to maximize nozzle hydraulic cleaning',
          'Add glycol cloud-point additive to active suction pit',
          'Monitor shaker screens for sticky bentonite agglomerates'
        ],
        youtubeId: '9Gk5fL2Esq4',
        youtubeTitle: 'Preventing Bit Balling in Reactive Bentonitic Shales',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Bentonite gumbo packing bit cones — Barmer Basin' },
        ],
        acknowledged: false
      },
      {
        id: 'brm-sig-02',
        triggerDepth: 2140,
        severity: 'watch',
        title: 'Tight hole in low-perm Barmer Hill Diatomite',
        offsetWell: 'Offset Aishwarya-02',
        depth: '2,140 m',
        confidence: '84% confidence',
        timeAgo: 'APPROACHING',
        reason: 'High wall contact friction in micro-crystalline silica',
        mitigation: 'Treated mud with 2.5% ester-based lubricant to reduce filter cake coefficient of friction.',
        fieldSteps: [
          'Maintain rotary speed above 80 RPM',
          'Wiper trip before logging tools run',
          'Verify torque limits on top drive'
        ],
        youtubeId: '9Gk5fL2Esq4',
        youtubeTitle: 'Mud Lubrication in Tight Diatomite Reservoirs',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Filter cake inspection on core sample' },
        ],
        acknowledged: false
      },
      {
        id: 'brm-sig-03',
        triggerDepth: 3450,
        severity: 'critical',
        title: 'Dynamic mud loss in fractured Fatehgarh reservoir',
        offsetWell: 'Offset Raageshwari-Deep-01',
        depth: '3,460 m',
        confidence: '95% confidence',
        timeAgo: 'DEEPER HORIZON',
        reason: 'High permeability braided sand micro-fractures',
        mitigation: 'Spot 40 bbl engineered calcium carbonate pill (coarse/medium blend). Maintain ECD strictly below 10.2 ppg.',
        fieldSteps: [
          'Reduce circulating flow rate from 550 to 380 gpm',
          'Pump 40 bbl CaCO3 LCM slurry with 2 hours hesitation soak',
          'Switch to low-viscosity non-damaging reservoir drill-in fluid'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Reservoir Protection & Lost Circulation in Fluvial Sands',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Loss rate monitoring at Barmer rig site' },
        ],
        acknowledged: false
      }
    ]
  },

  // ── 3. Cambay Basin (Gujarat) ─────────────────────────────────────────────
  cambay: {
    wellName: 'Well Ankleshwar-12',
    fieldSector: 'CAMBAY BASIN · ANKLESHWAR & KALOL SECTOR',
    defaultDepth: 1200,
    minDepth: 800,
    maxDepth: 5800,
    formations: [
      { name: 'Post-Eocene Clay', top: 0, base: 1200, color: '#4A5568', desc: 'Soft claystone & surface alluvium' },
      { name: 'Tarapur Shale', top: 1200, base: 3100, color: '#3C4858', desc: 'Overpressured sloughing shale with gas stringers' },
      { name: 'Hazad Sandstone', top: 3100, base: 5400, color: '#9C6644', desc: 'Deltaic quartz sand reservoir' },
      { name: 'Cambay Black Shale', top: 5400, base: 6000, color: '#1A202C', desc: 'Overpressured organic brittle shale' },
      { name: 'Deccan Trap', top: 6000, base: 6200, color: '#171923', desc: 'Volcanic basalt formation' }
    ],
    radarOffsets: [
      { name: 'Kalol-05', dist: '1.8 km', topPercent: 28, leftPercent: 72, risk: 'critical' },
      { name: 'Mehsana-08', dist: '2.9 km', topPercent: 35, leftPercent: 25, risk: 'watch' },
      { name: 'Sanand-03', dist: '3.9 km', topPercent: 70, leftPercent: 32, risk: 'normal' },
      { name: 'Gandhar-02', dist: '5.1 km', topPercent: 68, leftPercent: 76, risk: 'normal' },
    ],
    lessonsLearned: {
      title: 'Pore Pressure Surge & Tarapur Gas Kick',
      desc: 'Offset Kalol-05 experienced sudden 18 bbl gas influx when pore pressure rose from 9.2 to 11.4 ppg.',
      rec: 'Weight up mud to 11.8 ppg before drilling into lower Tarapur shale contact.'
    },
    alerts: [
      {
        id: 'cby-sig-01',
        triggerDepth: 1600,
        severity: 'critical',
        title: 'Pore pressure surge & gas kick warning',
        offsetWell: 'Offset Kalol-05',
        depth: '1,590 m',
        confidence: '90% confidence',
        timeAgo: 'IMMINENT',
        reason: 'Rapid transition into overpressured Tarapur shale',
        mitigation: 'Shut in well on annular preventer. Weight up active system with barite to 11.8 ppg using Wait & Weight method.',
        fieldSteps: [
          'Record SIDPP and SICP immediately upon shut-in',
          'Circulate gas kick out via choke manifold',
          'Condition mud to uniform density before resuming drilling'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Well Control & Wait and Weight Kick Circulation',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Choke console monitoring kick pressure' },
        ],
        acknowledged: false
      },
      {
        id: 'cby-sig-02',
        triggerDepth: 3180,
        severity: 'watch',
        title: 'Differential sticking in depleted Hazad sand',
        offsetWell: 'Offset Sanand-03',
        depth: '3,180 m',
        confidence: '86% confidence',
        timeAgo: 'APPROACHING',
        reason: 'Depleted reservoir overbalance friction',
        mitigation: 'Keep string rotating continuously. Spot 40 bbl ester-based lubricant pill across interval.',
        fieldSteps: [
          'Maintain minimum string rotation (>40 RPM) on pauses',
          'Lower fluid loss below 4 ml/30min with starch polymers'
        ],
        youtubeId: '9Gk5fL2Esq4',
        youtubeTitle: 'Differential Sticking Prevention in Depleted Sands',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=320&q=80', caption: 'Jarring action on drill pipe' },
        ],
        acknowledged: false
      },
      {
        id: 'cby-sig-03',
        triggerDepth: 5500,
        severity: 'critical',
        title: 'Severe sloughing shale pack-off risk',
        offsetWell: 'Offset Mehsana-08',
        depth: '5,480 m',
        confidence: '93% confidence',
        timeAgo: 'DEEPER HORIZON',
        reason: 'Tectonic stress in brittle Cambay Black Shale',
        mitigation: 'Elevate mud weight to 12.2 ppg for hoop stress support. Add glycol cloud-point shale inhibitor.',
        fieldSteps: [
          'Increase annular velocity to 140 ft/min to clear large splintered cavings',
          'Control ROP to 10 m/hr to prevent cuttings accumulation'
        ],
        youtubeId: '9Gk5fL2Esq4',
        youtubeTitle: 'Borehole Stability in Tectonically Stressed Shales',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Shaker screen overloaded with splintered cavings' },
        ],
        acknowledged: false
      }
    ]
  },

  // ── 4. Mumbai High (Arabian Sea Offshore) ─────────────────────────────────
  mumbai: {
    wellName: 'Well MH-North-04',
    fieldSector: 'MUMBAI HIGH (OFFSHORE) · L-III REEF SECTOR',
    defaultDepth: 450,
    minDepth: 400,
    maxDepth: 3000,
    formations: [
      { name: 'Seabed Soft Clays', top: 0, base: 400, color: '#319795', desc: 'Marine Holocene silt & shallow biogenic gas' },
      { name: 'Chinchini Formation', top: 400, base: 1400, color: '#4A5568', desc: 'Calcareous claystone and marls' },
      { name: 'L-II Limestone', top: 1400, base: 2100, color: '#CBD5E0', desc: 'Chalky biomicrite packstone limestone' },
      { name: 'L-III Main Carbonate', top: 2100, base: 2700, color: '#E2E8F0', desc: 'Vuggy cavernous karst limestone reef' },
      { name: 'Deccan Trap Basalt', top: 2700, base: 3000, color: '#1A202C', desc: 'Dense basaltic volcanic basement' }
    ],
    radarOffsets: [
      { name: 'MH-South-09', dist: '1.5 km', topPercent: 28, leftPercent: 72, risk: 'critical' },
      { name: 'Neelam-02', dist: '2.7 km', topPercent: 34, leftPercent: 26, risk: 'watch' },
      { name: 'Heera-07', dist: '4.1 km', topPercent: 72, leftPercent: 34, risk: 'normal' },
      { name: 'Bassein-03', dist: '5.4 km', topPercent: 66, leftPercent: 78, risk: 'normal' },
    ],
    lessonsLearned: {
      title: 'Cavernous Karst Voids in L-III Reef',
      desc: 'Offset MH-South-09 lost 75 bbls instantaneously upon penetrating cavernous karst void at 2,260 m.',
      rec: 'Prepare thixotropic cement/polymer squeeze pill and drop pump rate before cavern contact.'
    },
    alerts: [
      {
        id: 'mbh-sig-01',
        triggerDepth: 650,
        severity: 'critical',
        title: 'Shallow gas influx at conductor casing shoe',
        offsetWell: 'Offset Neelam-02',
        depth: '640 ft',
        confidence: '89% confidence',
        timeAgo: 'SHALLOW RISK',
        reason: 'Biogenic pocket gas charging shallow marine silt',
        mitigation: 'Divert flow overboard through dual starboard/port diverter lines. Pump 50 bbl heavy 12.5 ppg kill mud into riser.',
        fieldSteps: [
          'Engage platform diverter instantly on flow indicator',
          'Avoid shutting in BOP on shallow formations to prevent shoe fracture',
          'Kill well dynamically with high-rate seawater pump-in'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Offshore Shallow Gas Mitigation & Diverter Operations',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Offshore platform diverter line discharging gas' },
        ],
        acknowledged: false
      },
      {
        id: 'mbh-sig-02',
        triggerDepth: 1850,
        severity: 'watch',
        title: 'Chalky limestone dynamic fluid seepage',
        offsetWell: 'Offset MH-South-09',
        depth: '1,850 m',
        confidence: '82% confidence',
        timeAgo: 'APPROACHING',
        reason: 'Micro-fractures in chalky L-II packstone',
        mitigation: 'Add coarse limestone flakes continuously into active pit; seepage cured in 50 minutes.',
        fieldSteps: [
          'Lower pump rate by 80 gpm to reduce ECD',
          'Keep trip tank aligned'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Seepage Control in Offshore Carbonate Zones',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Trip tank level indicator on offshore rig' },
        ],
        acknowledged: false
      },
      {
        id: 'mbh-sig-03',
        triggerDepth: 2260,
        severity: 'critical',
        title: 'Total loss of returns in cavernous karst reef void',
        offsetWell: 'Offset MH-South-09',
        depth: '2,260 m',
        confidence: '96% confidence',
        timeAgo: 'IMMINENT',
        reason: 'Bit dropping into massive karst cavity in L-III',
        mitigation: 'Pump engineered thixotropic cement-bentonite plug (15.5 ppg) and calcium carbonate cross-linked pill.',
        fieldSteps: [
          'Pull bit into 9⅝" casing shoe to prevent stuck pipe',
          'Pump 60 bbl LCM pill followed by 40 bbl thixotropic squeeze cement',
          'Wait on cement 8 hours before drilling out plug'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Managing Massive Karst Lost Circulation in Offshore Carbonates',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Cement unit mixing offshore karst squeeze pill' },
        ],
        acknowledged: false
      }
    ]
  },

  // ── 5. Tripura Gas Fields (Northeast) ─────────────────────────────────────
  tripura: {
    wellName: 'Well Agartala-Dome-03',
    fieldSector: 'TRIPURA GAS FIELDS · AGARTALA & ROKHIA SECTOR',
    defaultDepth: 1200,
    minDepth: 800,
    maxDepth: 3600,
    formations: [
      { name: 'Tipam Sandstone', top: 0, base: 1100, color: '#856A41', desc: 'Massive friable sandstone, good drillability' },
      { name: 'Bokabil Formation', top: 1100, base: 2400, color: '#4A5568', desc: 'Interbedded shale & tight silt, fault zones' },
      { name: 'Upper Bhuban Gas Sand', top: 2400, base: 3200, color: '#B45309', desc: 'Overpressured tight gas sand (>15.2 ppg)' },
      { name: 'Middle Bhuban', top: 3200, base: 3600, color: '#2D3748', desc: 'Dense compact shale with high tectonic stress' }
    ],
    radarOffsets: [
      { name: 'Agartala-Dome-02', dist: '1.6 km', topPercent: 29, leftPercent: 71, risk: 'critical' },
      { name: 'Rokhia-07', dist: '2.4 km', topPercent: 35, leftPercent: 25, risk: 'watch' },
      { name: 'KUB-02', dist: '4.3 km', topPercent: 71, leftPercent: 33, risk: 'normal' },
      { name: 'Baramura-04', dist: '5.5 km', topPercent: 67, leftPercent: 77, risk: 'normal' },
    ],
    lessonsLearned: {
      title: 'High-Pressure Gas Influx (>15.2 ppg) in Upper Bhuban',
      desc: 'Offset Rokhia-07 saw 250 psi shut-in casing pressure upon entering gas lens at 2,420 m.',
      rec: 'Weight up mud to 15.2 ppg before entering Upper Bhuban and ensure degasser ready.'
    },
    alerts: [
      {
        id: 'trp-sig-01',
        triggerDepth: 1850,
        severity: 'watch',
        title: 'Thrust fault pack-off & severe torque oscillations',
        offsetWell: 'Offset Rokhia-07',
        depth: '1,840 m',
        confidence: '86% confidence',
        timeAgo: 'APPROACHING',
        reason: 'Tectonic compression along anticline thrust fault',
        mitigation: 'Back-ream at 40 RPM; treated mud with 4% bio-lubricant and raised annular flow velocity.',
        fieldSteps: [
          'Limit dogleg severity below 3 deg/30m in fault interval',
          'Keep pump rate above 500 gpm to prevent cuttings beds'
        ],
        youtubeId: '9Gk5fL2Esq4',
        youtubeTitle: 'Drilling Through Active Thrust Faults in Fold Belts',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Slickensided shale core showing fault deformation' },
        ],
        acknowledged: false
      },
      {
        id: 'trp-sig-02',
        triggerDepth: 2420,
        severity: 'critical',
        title: 'Abnormal high-pressure gas kick (>15.2 ppg equivalent)',
        offsetWell: 'Offset Agartala-Dome-02',
        depth: '2,420 m',
        confidence: '96% confidence',
        timeAgo: 'IMMINENT',
        reason: 'Overpressured tight gas reservoir contact',
        mitigation: 'Execute Wait and Weight method; weight up kill mud with barite from 12.8 to 15.4 ppg.',
        fieldSteps: [
          'Space out drill string and close annular BOP immediately',
          'Hold casing pressure constant while bringing pump to kill speed',
          'Vent gas slowly via mud-gas separator'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'High Pressure Gas Well Control & Choke Operation',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'High pressure gas flare stack active at Tripura rig' },
        ],
        acknowledged: false
      },
      {
        id: 'trp-sig-03',
        triggerDepth: 2860,
        severity: 'watch',
        title: 'Barite sag risk in static heavy mud column',
        offsetWell: 'Offset KUB-02',
        depth: '2,860 m',
        confidence: '88% confidence',
        timeAgo: 'DEEPER HORIZON',
        reason: 'Static settlement in 15.5 ppg mud during survey stops',
        mitigation: 'Circulated and sheared mud with organophilic clay viscosifiers to restore yield point.',
        fieldSteps: [
          'Ensure 10-minute gel strength > 20 lb/100ft²',
          'Rotate pipe slowly during extended wireline operations'
        ],
        youtubeId: '9Gk5fL2Esq4',
        youtubeTitle: 'Preventing Barite Sag in Heavy High-Pressure Muds',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80', caption: 'Mud density check showing density variation from sag' },
        ],
        acknowledged: false
      }
    ]
  },

  // ── 6. KG Deepwater Basin (Bay of Bengal) ─────────────────────────────────
  kg: {
    wellName: 'Well KG-D6-A1',
    fieldSector: 'KG DEEPWATER BASIN · BLOCK KG-DWN-98/3',
    defaultDepth: 550,
    minDepth: 500,
    maxDepth: 4200,
    formations: [
      { name: 'Deepwater Marine Gumbo', top: 0, base: 1200, color: '#0284C7', desc: 'Hydrated smectite clays, SWF hazard' },
      { name: 'Godavari Siltstone', top: 1200, base: 2400, color: '#4A5568', desc: 'Soft marine silt and micro-turbidites' },
      { name: 'Ravva Sandstone', top: 2400, base: 3200, color: '#856A41', desc: 'Depleted deltaic sand, loss of circulation' },
      { name: 'Pliocene Turbidites', top: 3200, base: 4000, color: '#0D9488', desc: 'High energy channel levee gas reservoir' },
      { name: 'Cretaceous Basement', top: 4000, base: 4200, color: '#1E293B', desc: 'Dense shale and igneous basement' }
    ],
    radarOffsets: [
      { name: 'Ravva-08', dist: '1.7 km', topPercent: 28, leftPercent: 72, risk: 'critical' },
      { name: 'Godavari-DW-04', dist: '2.8 km', topPercent: 34, leftPercent: 26, risk: 'watch' },
      { name: 'KG-DWN-Offset', dist: '4.0 km', topPercent: 70, leftPercent: 32, risk: 'normal' },
      { name: 'Dhirubhai-06', dist: '5.2 km', topPercent: 68, leftPercent: 76, risk: 'normal' },
    ],
    lessonsLearned: {
      title: 'Shallow Water Flow (SWF) & Deepwater Gas Hydrate Risk',
      desc: 'Offset Ravva-08 had severe seabed erosion at 840 m; Godavari-DW-04 had riser gas expansion at 3,250 m.',
      rec: 'Drill riserless with heavy bentonite sweeps for top-hole and keep MEG injection ready for hydrate control.'
    },
    alerts: [
      {
        id: 'kg-sig-01',
        triggerDepth: 850,
        severity: 'critical',
        title: 'Shallow water flow (SWF) & seabed undermining hazard',
        offsetWell: 'Offset Ravva-08',
        depth: '840 m',
        confidence: '94% confidence',
        timeAgo: 'TOP HOLE RISK',
        reason: 'Overpressured shallow marine sand stringer',
        mitigation: 'Pump weighted 11.2 ppg kill mud pill followed by specialized low-temperature lightweight cement with latex.',
        fieldSteps: [
          'Use ROV to visually monitor subsea wellhead for broaching',
          'Drill top-hole riserless with high-viscosity bentonite sweeps',
          'Set surface casing promptly across SWF hazard sand'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Deepwater Shallow Water Flow (SWF) Prevention and Remediation',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'ROV subsea camera inspecting wellhead casing annulus' },
        ],
        acknowledged: false
      },
      {
        id: 'kg-sig-02',
        triggerDepth: 2410,
        severity: 'watch',
        title: 'Severe lost circulation in depleted Ravva reservoir',
        offsetWell: 'Offset Ravva-08',
        depth: '2,410 m',
        confidence: '87% confidence',
        timeAgo: 'APPROACHING',
        reason: 'Pressure depletion in mature production sand',
        mitigation: 'Pumped 30 bbl calcium carbonate sizing blend; restored full circulation.',
        fieldSteps: [
          'Control ECD to under 9.6 ppg',
          'Use low shear rate viscosifier to seal pore throats'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Depleted Sand Lost Circulation Control',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=320&q=80', caption: 'Loss rate trend graph on offshore dashboard' },
        ],
        acknowledged: false
      },
      {
        id: 'kg-sig-03',
        triggerDepth: 3250,
        severity: 'critical',
        title: 'Gas hydrate dissociation & rapid riser gas expansion',
        offsetWell: 'Offset Godavari-DW-04',
        depth: '3,250 m',
        confidence: '93% confidence',
        timeAgo: 'IMMINENT',
        reason: 'Cold deepwater riser gas breakout risk',
        mitigation: 'Inject 20% mono-ethylene glycol (MEG) into subsea choke line. Circulate kick via subsea BOP choke.',
        fieldSteps: [
          'Keep subsea BOP boost line continuous circulation active',
          'Never allow gas to rise above subsea BOP stack unchecked',
          'Maintain riser boost pump rate above 800 gpm'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Managing Gas Hydrates and Deepwater Well Control',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Deepwater drillship riser tensioner monitor' },
        ],
        acknowledged: false
      }
    ]
  },

  // ── 7. Cauvery Basin (Tamil Nadu) ─────────────────────────────────────────
  cauvery: {
    wellName: 'Well Narimanam-05',
    fieldSector: 'CAUVERY BASIN · NARIMANAM & BHUVANAGIRI SECTOR',
    defaultDepth: 650,
    minDepth: 400,
    maxDepth: 3500,
    formations: [
      { name: 'Cuddalore Sandstone', top: 0, base: 600, color: '#856A41', desc: 'Coarse friable sand & surface clay' },
      { name: 'Kamalapuram Formation', top: 600, base: 1800, color: '#4A5568', desc: 'Marine swelling gumbo shale' },
      { name: 'Bhuvanagiri Sandstone', top: 1800, base: 2600, color: '#B45309', desc: 'Subarkosic gas condensate reservoir' },
      { name: 'Sattapadi Shale', top: 2600, base: 3200, color: '#334155', desc: 'Hard fractured calcareous shale' },
      { name: 'Basement', top: 3200, base: 3500, color: '#1E293B', desc: 'Granitic metamorphic basement' }
    ],
    radarOffsets: [
      { name: 'Kovilkalappal-02', dist: '1.5 km', topPercent: 28, leftPercent: 72, risk: 'watch' },
      { name: 'Bhuvanagiri-Deep-01', dist: '2.5 km', topPercent: 35, leftPercent: 25, risk: 'critical' },
      { name: 'Madanam-04', dist: '3.8 km', topPercent: 72, leftPercent: 30, risk: 'normal' },
      { name: 'Adiyakkamangalam', dist: '5.1 km', topPercent: 68, leftPercent: 76, risk: 'normal' },
    ],
    lessonsLearned: {
      title: 'Bhuvanagiri Gas-Condensate Kicks & Kamalapuram Drag',
      desc: 'Offset Narimanam-05 had 15 bbl condensate influx; Kovilkalappal-02 had 18 klb drag in Kamalapuram shale.',
      rec: 'Maintain mud weight at 1.25 SG and pretreat with polyamine shale stabilizer before drilling deeper.'
    },
    alerts: [
      {
        id: 'cvy-sig-01',
        triggerDepth: 1100,
        severity: 'watch',
        title: 'Swelling marine gumbo shale tight hole on connection',
        offsetWell: 'Offset Kovilkalappal-02',
        depth: '1,080 m',
        confidence: '87% confidence',
        timeAgo: 'APPROACHING',
        reason: 'High smectite content causing clay hydration',
        mitigation: 'Treat mud system with 6% KCl and polyamine shale inhibitor to prevent clay hydration.',
        fieldSteps: [
          'Perform wiper trip every 100 meters drilled',
          'Maintain high mud filtration control (<3.5 ml/30min)'
        ],
        youtubeId: '9Gk5fL2Esq4',
        youtubeTitle: 'Swelling Shale Inhibition & Amine Systems',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=320&q=80', caption: 'Swelling shale core swelling test — Cauvery basin' },
        ],
        acknowledged: false
      },
      {
        id: 'cvy-sig-02',
        triggerDepth: 2150,
        severity: 'critical',
        title: 'High-pressure gas-condensate kick & pore pressure jump',
        offsetWell: 'Offset Bhuvanagiri-Deep-01',
        depth: '2,150 m',
        confidence: '92% confidence',
        timeAgo: 'IMMINENT',
        reason: 'Fractured subarkosic condensate reservoir contact',
        mitigation: 'Shut in on pipe rams; raised mud weight from 1.15 to 1.30 SG via Wait & Weight method.',
        fieldSteps: [
          'Monitor shut-in drill pipe pressure carefully',
          'Slowly bleed gas out via mud-gas separator to prevent liquid carryover',
          'Verify casing shoe integrity before resuming'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Gas Condensate Well Control Protocols',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Condensate sample recovered at well testing unit' },
        ],
        acknowledged: false
      },
      {
        id: 'cvy-sig-03',
        triggerDepth: 2750,
        severity: 'watch',
        title: 'Micro-fracture mud loss in Cretaceous tight sand',
        offsetWell: 'Offset Bhuvanagiri-Deep-01',
        depth: '2,740 m',
        confidence: '85% confidence',
        timeAgo: 'DEEPER HORIZON',
        reason: 'Natural micro-fractures draining 25 bbl/hr mud',
        mitigation: 'Pre-treated with medium calcium carbonate (25 ppb); losses sealed completely.',
        fieldSteps: [
          'Reduce circulating pressure across fracture envelope'
        ],
        youtubeId: 'W3q8Od5qJio',
        youtubeTitle: 'Micro-Fracture Lost Circulation Sealing',
        incidentPhotos: [
          { url: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=320&q=80', caption: 'Mud pit loss monitoring chart — Cauvery deep' },
        ],
        acknowledged: false
      }
    ]
  }
};

const BASIN_TABS = [
  { id: 'assam', label: 'Upper Assam' },
  { id: 'rajasthan', label: 'Barmer (RJ)' },
  { id: 'cambay', label: 'Cambay (GJ)' },
  { id: 'mumbai', label: 'Mumbai High' },
  { id: 'tripura', label: 'Tripura Gas' },
  { id: 'kg', label: 'KG Deepwater' },
  { id: 'cauvery', label: 'Cauvery' },
];

export default function LiveSimulationPage() {
  const { selectedBasin, setSelectedBasin } = useAppStore();

  const currentBasinKey = selectedBasin && selectedBasin !== 'all' ? selectedBasin : 'assam';
  const config = BASIN_SIMULATION_CONFIG[currentBasinKey] || BASIN_SIMULATION_CONFIG.assam;

  const [currentDepth, setCurrentDepth] = useState<number>(config.defaultDepth);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [alerts, setAlerts] = useState<LiveSignalAlert[]>(config.alerts);
  const [selectedAlertForMitigation, setSelectedAlertForMitigation] = useState<LiveSignalAlert | null>(null);

  // Dynamic Depth-Triggered POPUP State
  const [poppedAlert, setPoppedAlert] = useState<LiveSignalAlert | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const prevDepthRef = useRef<number>(config.defaultDepth);

  // When basin changes, sync depth and alerts
  useEffect(() => {
    setCurrentDepth(config.defaultDepth);
    setAlerts(config.alerts.map(a => ({ ...a, acknowledged: false })));
    setPoppedAlert(null);
    setDismissedAlertIds(new Set());
    prevDepthRef.current = config.defaultDepth;
    setIsPlaying(true);
  }, [currentBasinKey, config]);

  // "don't show live alerts prior before even alerts are found"
  // Only alerts that are acknowledged OR whose trigger depth has been reached appear in the live signals stack
  const discoveredAlerts = alerts.filter(a => 
    a.acknowledged || (currentDepth >= a.triggerDepth - 15)
  );

  // Check depth trigger as currentDepth increases
  useEffect(() => {
    const isIncreasing = currentDepth >= prevDepthRef.current;
    prevDepthRef.current = currentDepth;

    if (!isIncreasing) return;

    // Find any unacknowledged alert whose trigger depth has been reached
    const matchingAlert = alerts.find(a => 
      !a.acknowledged &&
      !dismissedAlertIds.has(a.id) &&
      Math.abs(currentDepth - a.triggerDepth) <= 20
    );

    if (matchingAlert && poppedAlert?.id !== matchingAlert.id) {
      setPoppedAlert(matchingAlert);
      setAlerts(prev => {
        const without = prev.filter(x => x.id !== matchingAlert.id);
        return [{ ...matchingAlert, timeAgo: 'TRIGGERED NOW' }, ...without];
      });
    }
  }, [currentDepth, alerts, dismissedAlertIds, poppedAlert]);

  // "once that alert is acknowledged ..then depth changes continues"
  const handleAcknowledge = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true, timeAgo: 'ACKNOWLEDGED' } : a));
    setSelectedAlertForMitigation(prev => prev && prev.id === id ? { ...prev, acknowledged: true } : prev);
    setDismissedAlertIds(prev => new Set(prev).add(id));
    if (poppedAlert && poppedAlert.id === id) {
      setPoppedAlert(null);
    }
    // Automatically continue depth advancement!
    setIsPlaying(true);
  };

  const handleDismissPopped = () => {
    if (poppedAlert) {
      const id = poppedAlert.id;
      setDismissedAlertIds(prev => new Set(prev).add(id));
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true, timeAgo: 'ACKNOWLEDGED' } : a));
      setPoppedAlert(null);
      // Automatically continue depth advancement!
      setIsPlaying(true);
    }
  };

  // Active Formation based on depth
  const currentFormation = config.formations.find(f => currentDepth >= f.top && currentDepth < f.base) || config.formations[config.formations.length - 1];
  const nextBoundaryDistance = currentFormation ? currentFormation.base - currentDepth : 0;

  // Live simulation play loop: pauses automatically when an unacknowledged hazard alert is popped,
  // and continues automatically once that alert is acknowledged!
  useEffect(() => {
    let interval: any = null;
    const isPausedForHazard = Boolean(poppedAlert && !poppedAlert.acknowledged);

    if (isPlaying && !isPausedForHazard) {
      interval = setInterval(() => {
        setCurrentDepth(prev => {
          const step = 2 * speed;
          const nextDepth = prev + step;

          // Check if an unacknowledged alert is reached in this step
          const hitAlert = alerts.find(a => 
            !a.acknowledged && 
            !dismissedAlertIds.has(a.id) && 
            prev < a.triggerDepth && 
            nextDepth >= a.triggerDepth
          );

          if (hitAlert) {
            // Halt depth progression right at the hazard depth!
            setPoppedAlert(hitAlert);
            setAlerts(prevAlerts => {
              const without = prevAlerts.filter(x => x.id !== hitAlert.id);
              return [{ ...hitAlert, timeAgo: 'TRIGGERED NOW' }, ...without];
            });
            return hitAlert.triggerDepth;
          }

          if (nextDepth >= config.maxDepth) return config.minDepth; // loop simulation
          return nextDepth;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, poppedAlert, speed, config.maxDepth, config.minDepth, alerts, dismissedAlertIds]);

  return (
    <div className="flex min-h-[calc(100vh-49px)] w-full bg-[#070A0E] text-white">
      {/* Tactical Left Sidebar */}
      <TacticalSidebar />

      {/* Main Live Drill Simulation Workspace */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1500px]">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#141F2D] mb-6">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#7E8B9B] uppercase mb-1">
              LIVE DRILL SIMULATION · {config.fieldSector}
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight flex items-baseline gap-3 flex-wrap">
              {config.wellName}
              {poppedAlert && !poppedAlert.acknowledged ? (
                <span className="text-xs font-mono font-bold text-[#F59E0B] bg-[#F59E0B]/15 px-2.5 py-1 rounded border border-[#F59E0B]/50 flex items-center gap-1.5 animate-pulse shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                  DRILL HOLD · Hazard Acknowledgment Required
                </span>
              ) : (
                <span className="text-xs font-mono font-normal text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
                  Simulation Live · {isPlaying ? 'Advancing' : 'Paused'}
                </span>
              )}
            </h1>
            <p className="text-xs text-[#8A9BAE] mt-0.5 font-mono">
              Real-time offset intelligence at <span className="text-[#F59E0B] font-bold">{currentDepth.toLocaleString()} m</span> measured depth.
            </p>
          </div>

          {/* Simulation Depth Control Toolbar */}
          <div className="flex items-center gap-3">
            {/* Play/Pause & Speed */}
            <div className="flex items-center gap-1 bg-[#0A0F16] p-1 rounded-lg border border-[#1A2634]">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded hover:bg-[#1E293B] text-white transition-colors cursor-pointer"
                title={isPlaying ? "Pause" : "Play Drill Feed"}
              >
                {isPlaying ? <Pause className="w-4 h-4 text-[#F59E0B]" /> : <Play className="w-4 h-4 text-[#10B981]" />}
              </button>
              <button
                onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                className="px-2 py-1 rounded text-[11px] font-mono font-bold text-[#94A3B8] hover:text-white cursor-pointer"
              >
                {speed}x speed
              </button>
              <button
                onClick={() => {
                  setCurrentDepth(config.defaultDepth);
                  setAlerts(config.alerts.map(a => ({ ...a, acknowledged: false })));
                  setPoppedAlert(null);
                  setDismissedAlertIds(new Set());
                  setIsPlaying(true);
                }}
                className="p-1.5 rounded hover:bg-[#1E293B] text-[#64748B] hover:text-white cursor-pointer"
                title={`Reset to ${config.defaultDepth}m`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Depth Scrubber Input */}
            <div className="flex items-center gap-2 bg-[#0A0F16] px-3 py-1.5 rounded-lg border border-[#1A2634]">
              <span className="text-[10px] font-mono text-[#64748B] uppercase">Depth</span>
              <input
                type="range"
                min={config.minDepth}
                max={config.maxDepth}
                value={currentDepth}
                onChange={(e) => setCurrentDepth(Number(e.target.value))}
                className="w-32 accent-[#F59E0B] cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-white min-w-[55px] text-right">
                {currentDepth} m
              </span>
            </div>
          </div>
        </div>

        {/* ── Basin Selector Toolbar ──────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0A0F16] border border-[#172332] rounded-xl overflow-x-auto mb-6">
          <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            SIMULATION BASIN:
          </span>
          {BASIN_TABS.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBasin(b.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer",
                currentBasinKey === b.id
                  ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/40"
                  : "text-[#8A9BAE] hover:text-white hover:bg-[#141F2D]"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* ── HIGH-VISIBILITY REAL-TIME DEPTH-TRIGGERED ALERT POPUP BANNER ── */}
        <AnimatePresence>
          {poppedAlert && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={cn(
                "mb-6 p-4 rounded-xl border-2 shadow-2xl relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-md overflow-hidden",
                poppedAlert.severity === 'critical'
                  ? "bg-[#180A0E]/95 border-[#EF4444] shadow-[0_0_24px_rgba(239,68,68,0.4)]"
                  : "bg-[#181308]/95 border-[#F59E0B] shadow-[0_0_24px_rgba(245,158,11,0.4)]"
              )}
            >
              {/* Background alert pulse effect */}
              <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

              <div className="flex items-start gap-3.5 z-10">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-lg",
                  poppedAlert.severity === 'critical'
                    ? "bg-[#EF4444] text-white border-white/40 animate-pulse"
                    : "bg-[#F59E0B] text-black border-white/40 animate-pulse"
                )}>
                  <AlertTriangle className="w-6 h-6 fill-current" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded shadow-sm",
                      poppedAlert.severity === 'critical' ? "bg-[#EF4444] text-white" : "bg-[#F59E0B] text-black"
                    )}>
                      ⚠️ REAL-TIME SUBSURFACE HAZARD DETECTED · {currentDepth} m
                    </span>
                    <span className="text-[11px] font-mono text-[#CBD5E1]">
                      {poppedAlert.offsetWell} · {poppedAlert.confidence}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-1">
                    {poppedAlert.title}
                  </h3>
                  <p className="text-xs text-[#E2E8F0] mt-0.5 max-w-3xl line-clamp-1">
                    <span className="text-[#F59E0B] font-semibold">Immediate Protocol:</span> {poppedAlert.mitigation}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 z-10 shrink-0 self-end md:self-center">
                <button
                  onClick={() => setSelectedAlertForMitigation(poppedAlert)}
                  className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Review Mitigation Protocol</span>
                </button>

                <button
                  onClick={() => handleAcknowledge(poppedAlert.id)}
                  className="px-3.5 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>ACK & Clear</span>
                </button>

                <button
                  onClick={handleDismissPopped}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss popup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3-Column Tactical Display matching Reference Image 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Subsurface Stratigraphic Window (3 cols) */}
          <div className="lg:col-span-3 bg-[#0A0F16] border border-[#172332] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#7E8B9B]">
              <span className="uppercase tracking-wider">FORMATION COLUMN</span>
              <span className="text-[#38BDF8]">SUBSURFACE WINDOW</span>
            </div>

            {/* Geological Vertical Strata Stack */}
            <div className="relative w-full h-[460px] rounded-lg border border-[#172334] overflow-hidden flex flex-col">
              {config.formations.map((f) => {
                const totalSpan = config.maxDepth;
                const heightPercent = Math.max(10, ((f.base - f.top) / totalSpan) * 100);
                const isCurrent = currentFormation.name === f.name;

                return (
                  <div
                    key={f.name}
                    style={{ height: `${heightPercent}%`, backgroundColor: f.color }}
                    className={cn(
                      "w-full relative px-2.5 py-1.5 border-b border-black/40 flex flex-col justify-between transition-all",
                      isCurrent ? "ring-2 ring-inset ring-[#F59E0B]" : "opacity-90"
                    )}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-white font-medium drop-shadow-sm truncate">{f.name}</span>
                      <span className="text-white/70 text-[9px] shrink-0 ml-1">{f.top} m</span>
                    </div>

                    {isCurrent && (
                      <div className="text-[9px] text-[#F59E0B] font-mono font-bold drop-shadow">
                        ACTIVE INTERVAL
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Live Drill Bit Depth Marker Line */}
              <div
                style={{ top: `${Math.min(96, Math.max(4, (currentDepth / config.maxDepth) * 100))}%` }}
                className="absolute left-0 right-0 z-20 flex items-center -translate-y-1/2 pointer-events-none transition-all duration-150"
              >
                <div className="w-full h-[2px] bg-[#EF4444] shadow-md shadow-[#EF4444]" />
                <div className="absolute right-1 px-1.5 py-0.5 rounded bg-[#EF4444] text-white text-[9px] font-mono font-bold whitespace-nowrap shadow-md">
                  {currentDepth} m
                </div>
              </div>
            </div>

            {/* Formation boundary status badge */}
            <div className="mt-3 p-2.5 rounded-lg bg-[#070D13] border border-[#141F2D] text-xs font-mono">
              <div className="text-[#64748B] text-[10px] uppercase">Next formation boundary</div>
              <div className="text-white font-bold flex items-center justify-between mt-0.5">
                <span className="truncate">{currentFormation.name} Base</span>
                <span className="text-[#F59E0B] shrink-0 ml-2">-{nextBoundaryDistance} m</span>
              </div>
            </div>
          </div>

          {/* Column 2: Offset Intelligence Radar Map (5 cols) */}
          <div className="lg:col-span-5 bg-[#0A0F16] border border-[#172332] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#7E8B9B]">
              <span className="uppercase tracking-wider">OFFSET INTELLIGENCE / {config.basinLabel || 'LOCAL BASIN'}</span>
              <div className="flex items-center gap-1 font-mono text-[9px]">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-400 font-bold">{config.radarOffsets.length} OFFSETS</span>
              </div>
            </div>

            {/* Radar View Container */}
            <div className="relative aspect-square w-full rounded-lg bg-[#070D13] border border-[#141E2C] flex items-center justify-center overflow-hidden">
              {/* Distance Rings */}
              <div className="absolute w-[80%] h-[80%] rounded-full border border-[#162334]" />
              <div className="absolute w-[55%] h-[55%] rounded-full border border-[#162334]" />
              <div className="absolute w-[30%] h-[30%] rounded-full border border-[#1F3148]" />

              {/* Crosshair Lines */}
              <div className="absolute w-full h-[1px] bg-[#141E2C]" />
              <div className="absolute h-full w-[1px] bg-[#141E2C]" />

              {/* Radar Sweep Animation */}
              <div className="absolute w-full h-full radar-sweep pointer-events-none" />

              {/* Center Active Well */}
              <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                <span className="w-3.5 h-3.5 rounded-full bg-[#EF4444] animate-ping absolute" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#EF4444] border-2 border-white relative shadow-lg shadow-[#EF4444]" />
                <span className="font-mono text-[9px] text-white font-bold mt-1 bg-black/80 px-1 rounded border border-[#EF4444]/40 whitespace-nowrap">
                  {config.wellName} (Active)
                </span>
              </div>

              {/* Basin Specific Offset Wells with distance markers */}
              {config.radarOffsets.map((offset, i) => (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{ top: `${offset.topPercent}%`, left: `${offset.leftPercent}%` }}
                >
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full border border-white",
                    offset.risk === 'critical' ? "bg-[#EF4444]" : offset.risk === 'watch' ? "bg-[#F59E0B]" : "bg-[#10B981]"
                  )} />
                  <span className={cn(
                    "font-mono text-[8px] font-bold mt-0.5 bg-black/75 px-1 rounded whitespace-nowrap",
                    offset.risk === 'critical' ? "text-[#EF4444]" : offset.risk === 'watch' ? "text-[#F59E0B]" : "text-[#10B981]"
                  )}>
                    {offset.name} ({offset.dist})
                  </span>
                </div>
              ))}

              {/* Radar Scale Legend */}
              <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[#64748B]">
                Sector Range: 10 km radius
              </div>
            </div>

            {/* Offset Well Summary Bar */}
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-[#7E8B9B]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Active Drill
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Relevant Offsets
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Baseline Wells
              </span>
            </div>
          </div>

          {/* Column 3: Live Offset Alerts & Lessons Learned (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#0A0F16] border border-[#172332] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 text-[10px] font-mono text-[#7E8B9B]">
                <span className="uppercase tracking-wider">
                  LIVE SIGNALS · BASIN ALERTS ({discoveredAlerts.length})
                </span>
                <span className="text-[#F59E0B] font-bold">DEPTH-INDEXED →</span>
              </div>

              {/* Dynamic Alerts Stack - only shows discovered alerts reached at current depth */}
              {discoveredAlerts.length > 0 ? (
                <div className="space-y-3">
                  {discoveredAlerts.map((alert) => {
                    const isCurrentTarget = Math.abs(currentDepth - alert.triggerDepth) <= 50;

                    return (
                      <div 
                        key={alert.id}
                        onClick={() => setSelectedAlertForMitigation(alert)}
                        className={cn(
                          "p-3 rounded-lg border relative transition-all cursor-pointer group",
                          alert.acknowledged 
                            ? "bg-[#0A0E14] border-[#162230] opacity-60" 
                            : isCurrentTarget
                            ? "bg-[#1E1116] border-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.3)] ring-1 ring-[#EF4444]"
                            : alert.severity === 'critical'
                            ? "bg-[#140D10] border-[#EF4444]/40 hover:border-[#EF4444]"
                            : alert.severity === 'watch'
                            ? "bg-[#14120D] border-[#F59E0B]/40 hover:border-[#F59E0B]"
                            : "bg-[#0C141E] border-[#0284C7]/40 hover:border-[#38BDF8]"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={cn(
                            "text-[9px] font-mono uppercase font-bold flex items-center gap-1",
                            alert.severity === 'critical' ? "text-[#EF4444]" : alert.severity === 'watch' ? "text-[#F59E0B]" : "text-[#38BDF8]"
                          )}>
                            {!alert.acknowledged && alert.severity === 'critical' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-ping" />
                            )}
                            {alert.severity === 'critical' ? 'CRITICAL RISK' : alert.severity === 'watch' ? 'WATCH RISK' : 'NORMAL BOUNDARY'}
                            {alert.acknowledged && (
                              <span className="text-[9px] bg-[#10B981]/20 text-[#10B981] px-1 rounded ml-1 font-mono">
                                ACKNOWLEDGED
                              </span>
                            )}
                          </span>
                          <span className="text-[9px] font-mono text-[#64748B]">{alert.timeAgo}</span>
                        </div>

                        <div className="text-xs font-semibold text-white mb-1 group-hover:text-[#F59E0B] transition-colors">
                          {alert.title}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] font-mono mb-2">
                          {alert.offsetWell} · {alert.depth} · <span className={cn(
                            "font-bold",
                            alert.severity === 'critical' ? "text-[#EF4444]" : alert.severity === 'watch' ? "text-[#F59E0B]" : "text-[#38BDF8]"
                          )}>{alert.confidence}</span>
                        </div>

                        <div className="pt-2 border-t border-[#1C2634] flex items-center justify-between">
                          <span className="text-[9px] font-mono text-[#8E9CAE] flex items-center gap-1 truncate mr-2">
                            <span>{alert.reason}</span>
                          </span>

                          <button 
                            onClick={(e) => handleAcknowledge(alert.id, e)}
                            className={cn(
                              "px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0",
                              alert.acknowledged
                                ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40"
                                : alert.severity === 'critical'
                                ? "bg-[#EF4444]/20 hover:bg-[#EF4444]/40 text-[#EF4444]"
                                : alert.severity === 'watch'
                                ? "bg-[#F59E0B]/20 hover:bg-[#F59E0B]/40 text-[#F59E0B]"
                                : "bg-[#0284C7]/20 hover:bg-[#0284C7]/40 text-[#38BDF8]"
                            )}
                          >
                            <Check className="w-3 h-3" />
                            <span>{alert.acknowledged ? 'ACKED' : 'ACK'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 px-4 text-center rounded-lg border border-[#172332] bg-[#070D13]">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2.5">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-xs font-semibold text-white mb-1">
                    Normal Drilling Operations
                  </div>
                  <div className="text-[11px] font-mono text-[#64748B] leading-relaxed">
                    No subsurface hazards detected at current depth ({currentDepth} m). Monitoring offset intelligence ahead of the bit...
                  </div>
                </div>
              )}
            </div>

            {/* Lessons Learned Highlight Card for Active Basin */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#0E1714] to-[#0A1210] border border-[#10B981]/40 text-xs">
              <div className="text-[10px] font-mono uppercase text-[#10B981] font-bold mb-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                INSTITUTIONAL BASIN MEMORY · {config.fieldSector}
              </div>
              <p className="text-white font-medium leading-relaxed mb-2">
                {config.lessonsLearned.desc}
              </p>
              <div className="p-2 rounded bg-black/40 border border-[#10B981]/30 font-mono text-[11px] text-[#34D399]">
                ✓ {config.lessonsLearned.rec}
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Modal for Alert Details */}
        {selectedAlertForMitigation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#0B1119] border border-[#23354C] rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl relative overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-[#1A283A]">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                    selectedAlertForMitigation.severity === 'critical' 
                      ? "bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]" 
                      : "bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B]"
                  )}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded",
                        selectedAlertForMitigation.severity === 'critical' 
                          ? "bg-[#EF4444]/20 text-[#EF4444]" 
                          : "bg-[#F59E0B]/20 text-[#F59E0B]"
                      )}>
                        {selectedAlertForMitigation.severity === 'critical' ? 'CRITICAL SIGNAL MITIGATION' : 'OPERATIONAL WATCH PROTOCOL'}
                      </span>
                      <span className="text-[11px] font-mono text-[#64748B]">
                        {selectedAlertForMitigation.depth} · {selectedAlertForMitigation.offsetWell}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {selectedAlertForMitigation.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAlertForMitigation(null)}
                  className="p-1.5 rounded-lg bg-[#141F2D] hover:bg-[#1E2E42] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Proven Mitigation Recommendation */}
              <div className="mb-4 p-4 rounded-xl bg-[#091512] border border-[#10B981]/30">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#10B981] font-bold mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  PROVEN MITIGATION RECOMMENDATION
                </div>
                <p className="text-xs text-white font-medium leading-relaxed mb-3">
                  {selectedAlertForMitigation.mitigation}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-[#132A24]">
                  <div className="text-[10px] font-mono text-[#64748B] uppercase">Field Operating Steps:</div>
                  {selectedAlertForMitigation.fieldSteps.map((step, idx) => (
                    <div key={idx} className="text-[11px] font-mono text-[#34D399] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incident Field Photos */}
              {selectedAlertForMitigation.incidentPhotos && selectedAlertForMitigation.incidentPhotos.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold mb-2 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    INCIDENT FIELD PHOTOS
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedAlertForMitigation.incidentPhotos.map((photo, i) => (
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

              {/* Embedded YouTube Video */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-mono uppercase text-[#F59E0B] font-bold flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    TECHNICAL VIDEO DEMO
                  </div>
                  <a
                    href={`https://www.youtube.com/watch?v=${selectedAlertForMitigation.youtubeId}`}
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
                    src={`https://www.youtube-nocookie.com/embed/${selectedAlertForMitigation.youtubeId}?autoplay=0&rel=0`}
                    title={selectedAlertForMitigation.youtubeTitle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#162332] text-[10px] font-mono text-[#64748B]">
                <span>Correlation: {selectedAlertForMitigation.reason}</span>
                <div className="flex items-center gap-2">
                  {!selectedAlertForMitigation.acknowledged ? (
                    <button
                      onClick={() => handleAcknowledge(selectedAlertForMitigation.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors bg-[#EF4444] text-white hover:bg-[#DC2626] cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge Alert</span>
                    </button>
                  ) : (
                    <span className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-[#10B981]/20 text-[#10B981] border border-[#10B981]">
                      <Check className="w-3.5 h-3.5" />
                      Acknowledged
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedAlertForMitigation(null)}
                    className="px-3 py-1.5 rounded-lg bg-[#141F2D] hover:bg-[#1E2E42] text-white text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Horizon Predictive Risk Bar */}
        <div className="mt-6 p-4 rounded-xl bg-[#0A0F16] border border-[#172332]">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#7E8B9B] mb-2">
            <span className="uppercase tracking-wider">FORMATION RISK HORIZON · {config.wellName}</span>
            <span className="text-[#EF4444] font-bold">
              Target Horizon: {config.maxDepth} m (Active Basin: {config.basinLabel || currentBasinKey.toUpperCase()})
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-[#121B27] overflow-hidden relative">
            <div className="h-full bg-[#10B981] absolute left-0 w-[55%]" />
            <div className="h-full bg-[#F59E0B] absolute left-[55%] w-[15%]" />
            <div className="h-full bg-[#EF4444] absolute left-[70%] w-[10%]" />
            <div className="h-full bg-[#10B981] absolute left-[80%] w-[20%]" />
            
            <div
              style={{ left: `${Math.min(100, Math.max(0, (currentDepth / config.maxDepth) * 100))}%` }}
              className="absolute top-0 bottom-0 w-2 bg-white shadow-md -translate-x-1/2"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] mt-2">
            <span>Start: {config.minDepth} m</span>
            <span className="text-white font-bold">Current Bit Depth: {currentDepth} m</span>
            <span>Target: {config.maxDepth} m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
