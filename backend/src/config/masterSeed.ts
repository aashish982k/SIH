import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function runMasterSeed(runQuery: (sql: string, params?: any[]) => Promise<any>): Promise<void> {
  // Check if already seeded
  const existingWells = await runQuery('SELECT COUNT(*) as count FROM wells');
  const count = existingWells[0]?.count ?? existingWells[0]?.['COUNT(*)'] ?? 0;
  if (Number(count) >= 15) {
    console.log(`ℹ️  Database already contains ${count} wells. Skipping re-seed.`);
    return;
  }

  console.log('🌱  Seeding 18 realistic Assam basin wells and operational intelligence...');

  // ── 1. Users ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin1234', 10);
  const engHash = await bcrypt.hash('engineer1234', 10);
  const opHash = await bcrypt.hash('operator1234', 10);

  const users = [
    { id: 'usr-00000001', name: 'System Administrator', email: 'admin@nwis.com', password_hash: adminHash, role: 'administrator' },
    { id: 'usr-00000002', name: 'Rahul Sharma (Sr. Drilling Eng)', email: 'rahul.sharma@nwis.com', password_hash: engHash, role: 'engineer' },
    { id: 'usr-00000003', name: 'Field Operator (Rig 04)', email: 'operator@nwis.com', password_hash: opHash, role: 'operator' },
  ];

  for (const u of users) {
    await runQuery(
      `INSERT OR REPLACE INTO users (id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      [u.id, u.name, u.email, u.password_hash, u.role]
    ).catch(async () => {
      // MySQL fallback syntax if not SQLite
      await runQuery(
        `INSERT INTO users (id, name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash)`,
        [u.id, u.name, u.email, u.password_hash, u.role]
      );
    });
  }

  // ── 2. 18 Wells across 5 Assam Fields ──────────────────────────────────────
  const wellsData = [
    // Field 1: Duliajan North (OIL Headquarters hub)
    {
      id: 'well-dul-01',
      name: 'Duliajan-1',
      well_number: 'DJN-001',
      field_name: 'Duliajan North',
      block: 'Block A',
      operator: 'Oil India Limited',
      latitude: 27.3617,
      longitude: 95.3191,
      elevation_m: 118.5,
      total_depth_ft: 12500,
      status: 'active',
      spud_date: '2024-01-15',
      primary_formation: 'Barail Sandstone',
    },
    {
      id: 'well-dul-02',
      name: 'Duliajan-2',
      well_number: 'DJN-002',
      field_name: 'Duliajan North',
      block: 'Block A',
      operator: 'Oil India Limited',
      latitude: 27.3720,
      longitude: 95.3280,
      elevation_m: 119.2,
      total_depth_ft: 11800,
      status: 'completed',
      spud_date: '2021-06-10',
      primary_formation: 'Tipam Sandstone',
    },
    {
      id: 'well-dul-03',
      name: 'Duliajan-3',
      well_number: 'DJN-003',
      field_name: 'Duliajan North',
      block: 'Block A',
      operator: 'Oil India Limited',
      latitude: 27.3550,
      longitude: 95.3050,
      elevation_m: 117.8,
      total_depth_ft: 12100,
      status: 'completed',
      spud_date: '2022-02-18',
      primary_formation: 'Barail Sandstone',
    },
    {
      id: 'well-dul-04',
      name: 'Duliajan-4H',
      well_number: 'DJN-004H',
      field_name: 'Duliajan North',
      block: 'Block A',
      operator: 'Oil India Limited',
      latitude: 27.3810,
      longitude: 95.3340,
      elevation_m: 121.0,
      total_depth_ft: 13200,
      status: 'suspended',
      spud_date: '2023-04-05',
      primary_formation: 'Kopili Shale',
    },

    // Field 2: Lakwa Central (Major onshore producing field)
    {
      id: 'well-lak-101',
      name: 'Lakwa-101',
      well_number: 'LKW-101',
      field_name: 'Lakwa Central',
      block: 'Block B',
      operator: 'Oil India Limited',
      latitude: 27.0215,
      longitude: 94.8850,
      elevation_m: 95.4,
      total_depth_ft: 13500,
      status: 'active',
      spud_date: '2023-11-20',
      primary_formation: 'Barail Sandstone',
    },
    {
      id: 'well-lak-102',
      name: 'Lakwa-102',
      well_number: 'LKW-102',
      field_name: 'Lakwa Central',
      block: 'Block B',
      operator: 'Oil India Limited',
      latitude: 27.0340,
      longitude: 94.8970,
      elevation_m: 96.1,
      total_depth_ft: 12800,
      status: 'completed',
      spud_date: '2020-08-14',
      primary_formation: 'Tipam Sandstone',
    },
    {
      id: 'well-lak-103',
      name: 'Lakwa-103',
      well_number: 'LKW-103',
      field_name: 'Lakwa Central',
      block: 'Block B',
      operator: 'Oil India Limited',
      latitude: 27.0150,
      longitude: 94.8720,
      elevation_m: 94.8,
      total_depth_ft: 12200,
      status: 'completed',
      spud_date: '2019-11-05',
      primary_formation: 'Sylhet Limestone',
    },
    {
      id: 'well-lak-104',
      name: 'Lakwa-104ST',
      well_number: 'LKW-104ST',
      field_name: 'Lakwa Central',
      block: 'Block B',
      operator: 'Oil India Limited',
      latitude: 27.0420,
      longitude: 94.9080,
      elevation_m: 97.0,
      total_depth_ft: 14100,
      status: 'suspended',
      spud_date: '2022-09-12',
      primary_formation: 'Barail Sandstone',
    },

    // Field 3: Moran East (High-pressure zone)
    {
      id: 'well-mrn-201',
      name: 'Moran-201',
      well_number: 'MRN-201',
      field_name: 'Moran East',
      block: 'Block C',
      operator: 'Oil India Limited',
      latitude: 27.1856,
      longitude: 94.9124,
      elevation_m: 102.5,
      total_depth_ft: 11400,
      status: 'active',
      spud_date: '2024-02-01',
      primary_formation: 'Barail Sandstone',
    },
    {
      id: 'well-mrn-202',
      name: 'Moran-202',
      well_number: 'MRN-202',
      field_name: 'Moran East',
      block: 'Block C',
      operator: 'Oil India Limited',
      latitude: 27.1950,
      longitude: 94.9250,
      elevation_m: 103.2,
      total_depth_ft: 11600,
      status: 'completed',
      spud_date: '2021-03-25',
      primary_formation: 'Tipam Sandstone',
    },
    {
      id: 'well-mrn-203',
      name: 'Moran-203',
      well_number: 'MRN-203',
      field_name: 'Moran East',
      block: 'Block C',
      operator: 'Oil India Limited',
      latitude: 27.1740,
      longitude: 94.9010,
      elevation_m: 101.8,
      total_depth_ft: 10900,
      status: 'completed',
      spud_date: '2020-05-19',
      primary_formation: 'Girujan Clay',
    },
    {
      id: 'well-mrn-204',
      name: 'Moran-204',
      well_number: 'MRN-204',
      field_name: 'Moran East',
      block: 'Block C',
      operator: 'Oil India Limited',
      latitude: 27.2050,
      longitude: 94.9380,
      elevation_m: 104.0,
      total_depth_ft: 12250,
      status: 'suspended',
      spud_date: '2022-11-10',
      primary_formation: 'Kopili Shale',
    },

    // Field 4: Naharkatiya (Historic discovery belt)
    {
      id: 'well-nhk-05',
      name: 'Naharkatiya-5',
      well_number: 'NHK-005',
      field_name: 'Naharkatiya',
      block: 'Block D',
      operator: 'Oil India Limited',
      latitude: 27.2948,
      longitude: 95.3445,
      elevation_m: 121.3,
      total_depth_ft: 10800,
      status: 'active',
      spud_date: '2023-10-12',
      primary_formation: 'Tipam Sandstone',
    },
    {
      id: 'well-nhk-06',
      name: 'Naharkatiya-6',
      well_number: 'NHK-006',
      field_name: 'Naharkatiya',
      block: 'Block D',
      operator: 'Oil India Limited',
      latitude: 27.3050,
      longitude: 95.3580,
      elevation_m: 122.0,
      total_depth_ft: 11200,
      status: 'completed',
      spud_date: '2019-07-28',
      primary_formation: 'Barail Sandstone',
    },
    {
      id: 'well-nhk-07',
      name: 'Naharkatiya-7',
      well_number: 'NHK-007',
      field_name: 'Naharkatiya',
      block: 'Block D',
      operator: 'Oil India Limited',
      latitude: 27.2830,
      longitude: 95.3310,
      elevation_m: 120.5,
      total_depth_ft: 10400,
      status: 'completed',
      spud_date: '2018-04-16',
      primary_formation: 'Tipam Sandstone',
    },

    // Field 5: Baghjan (Deep high-pressure gas field)
    {
      id: 'well-bgj-11',
      name: 'Baghjan-11',
      well_number: 'BGJ-011',
      field_name: 'Baghjan',
      block: 'Block E',
      operator: 'Oil India Limited',
      latitude: 27.5840,
      longitude: 95.4210,
      elevation_m: 112.5,
      total_depth_ft: 13900,
      status: 'active',
      spud_date: '2024-03-01',
      primary_formation: 'Barail Sandstone',
    },
    {
      id: 'well-bgj-12',
      name: 'Baghjan-12',
      well_number: 'BGJ-012',
      field_name: 'Baghjan',
      block: 'Block E',
      operator: 'Oil India Limited',
      latitude: 27.5920,
      longitude: 95.4350,
      elevation_m: 113.1,
      total_depth_ft: 14200,
      status: 'completed',
      spud_date: '2021-12-05',
      primary_formation: 'Kopili Shale',
    },
    {
      id: 'well-bgj-14',
      name: 'Baghjan-14',
      well_number: 'BGJ-014',
      field_name: 'Baghjan',
      block: 'Block E',
      operator: 'Oil India Limited',
      latitude: 27.5760,
      longitude: 95.4080,
      elevation_m: 111.9,
      total_depth_ft: 13600,
      status: 'suspended',
      spud_date: '2023-01-20',
      primary_formation: 'Barail Sandstone',
    },
  ];

  for (const w of wellsData) {
    await runQuery(
      `INSERT OR REPLACE INTO wells (id, name, well_number, field_name, block, operator, latitude, longitude, elevation_m, total_depth_ft, status, spud_date, primary_formation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [w.id, w.name, w.well_number, w.field_name, w.block, w.operator, w.latitude, w.longitude, w.elevation_m, w.total_depth_ft, w.status, w.spud_date, w.primary_formation]
    ).catch(async () => {
      await runQuery(
        `INSERT INTO wells (id, name, well_number, field_name, block, operator, latitude, longitude, elevation_m, total_depth_ft, status, spud_date, primary_formation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status), total_depth_ft=VALUES(total_depth_ft)`,
        [w.id, w.name, w.well_number, w.field_name, w.block, w.operator, w.latitude, w.longitude, w.elevation_m, w.total_depth_ft, w.status, w.spud_date, w.primary_formation]
      );
    });

    // ── 3. Formations for each well ─────────────────────────────────────────
    const formations = [
      { name: 'Alluvium', top: 0, bottom: 650, litho: 'Sandstone/Silt', pore: 280, frac: 0.58 },
      { name: 'Tipam Sandstone', top: 650, bottom: 2500, litho: 'Sandstone', pore: 1120, frac: 0.65 },
      { name: 'Girujan Clay', top: 2500, bottom: 3900, litho: 'Shale/Claystone', pore: 1850, frac: 0.72 },
      { name: 'Barail Sandstone', top: 3900, bottom: 6400, litho: 'Sandstone/Coal', pore: 3100, frac: 0.78 },
      { name: 'Kopili Shale', top: 6400, bottom: 8100, litho: 'Shale', pore: 4250, frac: 0.84 },
      { name: 'Sylhet Limestone', top: 8100, bottom: 9800, litho: 'Limestone', pore: 5100, frac: 0.89 },
      { name: 'Langpar Formation', top: 9800, bottom: w.total_depth_ft, litho: 'Calcareous Shale', pore: 5950, frac: 0.93 },
    ];

    for (const f of formations) {
      const fId = `fmt-${w.id}-${f.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
      await runQuery(
        `INSERT OR REPLACE INTO well_formations (id, well_id, formation_name, top_depth_ft, bottom_depth_ft, lithology, pore_pressure_psi, fracture_gradient)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [fId, w.id, f.name, f.top, f.bottom, f.litho, f.pore, f.frac]
      ).catch(() => {});
    }

    // ── 4. Surveys for active & completed wells ──────────────────────────────
    const depths = [1000, 3000, 6000, 8500, 10500, w.total_depth_ft];
    for (let i = 0; i < depths.length; i++) {
      const md = depths[i];
      const inc = (i * 1.8).toFixed(2);
      const az = (130 + i * 5).toFixed(1);
      const tvd = (md * 0.975).toFixed(1);
      await runQuery(
        `INSERT OR REPLACE INTO well_surveys (id, well_id, measured_depth_ft, tvd_ft, inclination_deg, azimuth_deg)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [`srv-${w.id}-${i}`, w.id, md, tvd, inc, az]
      ).catch(() => {});
    }

    // ── 5. Casing Program ───────────────────────────────────────────────────
    const casings = [
      { type: 'conductor', od: 30, shoe: 120, grade: 'K-55', wt: 95 },
      { type: 'surface', od: 20, shoe: 1350, grade: 'K-55', wt: 133 },
      { type: 'intermediate', od: 13.375, shoe: 6100, grade: 'N-80', wt: 68 },
      { type: 'production', od: 9.625, shoe: 10400, grade: 'P-110', wt: 47 },
    ];
    for (let i = 0; i < casings.length; i++) {
      const c = casings[i];
      await runQuery(
        `INSERT OR REPLACE INTO casing_sections (id, well_id, casing_type, outer_dia_in, grade, weight_lb_ft, shoe_depth_ft)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`csg-${w.id}-${i}`, w.id, c.type, c.od, c.grade, c.wt, c.shoe]
      ).catch(() => {});
    }
  }

  // ── 6. Operational Events & Incidents ──────────────────────────────────────
  const events = [
    {
      id: 'evt-001',
      well_id: 'well-dul-01',
      event_type: 'mud_loss',
      severity: 'critical',
      start_depth_ft: 8420,
      description: 'Severe lost circulation in Barail Sandstone: complete fluid returns loss at 65 bbl/hr.',
      cause: 'Intersected depleted sub-hydrostatic channel sand with high permeability.',
      impact: 'Drilling halted for 28 hours. Total 420 bbl synthetic base mud lost.',
      mitigation: 'Spotted 50 bbl high-fluid-loss LCM pill with mica and coarse calcium carbonate. Squeezed at 350 psi.',
      lessons_learned: 'Offset wells in Duliajan North show depletion in upper Barail; reduce ECD below 11.2 ppg before entering.',
      npt_hours: 28.5,
      occurred_at: '2024-02-14',
    },
    {
      id: 'evt-002',
      well_id: 'well-dul-01',
      event_type: 'torque_spike',
      severity: 'medium',
      start_depth_ft: 6100,
      description: 'Severe erratic torque oscillations reaching 24.5 kft-lbs while drilling Kopili transition.',
      cause: 'Micro-fractured brittle shale interbedded with tight siltstone stringers.',
      impact: 'Rpm reduced to 45. Surface vibration threshold exceeded.',
      mitigation: 'Pumped 25 bbl lubricity pill (2% polyglycol), reamed interval twice at 40 rpm.',
      lessons_learned: 'Maintain minimum 4% glycol in mud system throughout Kopili formation.',
      npt_hours: 6.0,
      occurred_at: '2024-02-02',
    },
    {
      id: 'evt-003',
      well_id: 'well-lak-101',
      event_type: 'kick',
      severity: 'critical',
      start_depth_ft: 11450,
      description: 'Well kick: 24 bbl pit volume gain with 480 psi shut-in drillpipe pressure (SIDPP).',
      cause: 'Overpressured gas sand charging in lower Barail horizon.',
      impact: 'BOP closed immediately. Well killed using Driller’s Method in 18 hours.',
      mitigation: 'Increased mud weight from 11.4 ppg to 12.3 ppg with barite weighting agent.',
      lessons_learned: 'Pre-charge monitoring required for all Lakwa deep prospects below 11,000 ft.',
      npt_hours: 36.0,
      occurred_at: '2023-12-18',
    },
    {
      id: 'evt-004',
      well_id: 'well-lak-101',
      event_type: 'stuck_pipe',
      severity: 'high',
      start_depth_ft: 9800,
      description: 'Differential pipe sticking across depleted porous Tipam Sandstone interval.',
      cause: 'Overbalance pressure exceeded 850 psi during stationary survey.',
      impact: 'String stuck for 14 hours. Free point found at 9,450 ft.',
      mitigation: 'Spotted pipe-freeing surfactant pill and jarred down with 80 klbs overpull.',
      lessons_learned: 'Never leave drillstring stationary for > 90 seconds across depleted Tipam.',
      npt_hours: 14.0,
      occurred_at: '2023-12-05',
    },
    {
      id: 'evt-005',
      well_id: 'well-mrn-201',
      event_type: 'pressure_anomaly',
      severity: 'high',
      start_depth_ft: 10200,
      description: 'Pore pressure transition ramp detected: Dxc exponent deviation indicating 12.8 ppg equivalent.',
      cause: 'Under-compacted Kopili marine transgressive shale seal.',
      impact: 'Casing point set 300 ft shallower than prognosis.',
      mitigation: 'Weighted mud system to 12.6 ppg; ran 9-5/8" casing string earlier.',
      lessons_learned: 'Real-time sonic/resistivity LWD crucial for pinpointing Kopili overpressure ramp in Moran.',
      npt_hours: 12.5,
      occurred_at: '2024-02-18',
    },
    {
      id: 'evt-006',
      well_id: 'well-mrn-204',
      event_type: 'casing_issue',
      severity: 'high',
      start_depth_ft: 6150,
      description: 'Casing standoff failure: cement channeling occurred behind 13-3/8" intermediate shoe.',
      cause: 'Insufficient centralizers in 12-deg dogleg section.',
      impact: 'CBL/VDL showed poor isolation; squeeze job required.',
      mitigation: 'Perforated at 6,050 ft and performed block squeeze with 40 bbl Micro-matrix cement.',
      lessons_learned: 'Ensure minimum 75% standoff using rigid centralizers in build sections.',
      npt_hours: 48.0,
      occurred_at: '2022-12-01',
    },
    {
      id: 'evt-007',
      well_id: 'well-bgj-11',
      event_type: 'well_control',
      severity: 'critical',
      start_depth_ft: 12800,
      description: 'High pressure gas influx during connections: rapid pit volume surge of 18 bbl.',
      cause: 'Swabbing during pipe movement in narrow mud window (0.4 ppg margin).',
      impact: 'Well shut in on annular preventer; degasser engaged.',
      mitigation: 'Circulated out influx via choke manifold; conditioned mud to 12.9 ppg.',
      lessons_learned: 'Baghjan wells have extremely tight drilling margins; continuous circulation sub recommended.',
      npt_hours: 22.0,
      occurred_at: '2024-03-08',
    },
    {
      id: 'evt-008',
      well_id: 'well-bgj-14',
      event_type: 'fishing',
      severity: 'high',
      start_depth_ft: 8900,
      description: 'Twisted off 5" drillpipe box at tool joint in abrasive Tipam section.',
      cause: 'High cyclic bending fatigue exacerbated by washouts.',
      impact: 'Fished with 8-1/8" overshot. Recovered fish on second attempt.',
      mitigation: 'Engaged fish with spiral grapple; circulated high-viscosity pill and pulled smoothly.',
      lessons_learned: 'Conduct daily ultrasonic inspection of tool joints when rotating hours exceed 250 hrs.',
      npt_hours: 32.0,
      occurred_at: '2023-02-14',
    },
    {
      id: 'evt-009',
      well_id: 'well-nhk-05',
      event_type: 'mud_loss',
      severity: 'medium',
      start_depth_ft: 7200,
      description: 'Partial mud seepage: lost 18 bbl/hr in fractured sand interval.',
      cause: 'Natural tectonic micro-fractures in Naharkatiya flank.',
      impact: 'Controlled with 20 ppb coarse calcium carbonate LCM sweep.',
      mitigation: 'Maintained 35 ppb LCM background concentration while drilling ahead.',
      lessons_learned: 'Maintain active LCM screening in mud pits when approaching Naharkatiya fault blocks.',
      npt_hours: 4.5,
      occurred_at: '2023-11-02',
    },
  ];

  for (const e of events) {
    await runQuery(
      `INSERT OR REPLACE INTO operational_events (id, well_id, event_type, severity, start_depth_ft, description, cause, impact, mitigation, lessons_learned, npt_hours, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.well_id, e.event_type, e.severity, e.start_depth_ft, e.description, e.cause, e.impact, e.mitigation, e.lessons_learned, e.npt_hours, e.occurred_at]
    ).catch(() => {});
  }

  // ── 7. Documents (WCR, DDR, Mud Logs) ─────────────────────────────────────
  const docs = [
    {
      id: 'doc-001',
      well_id: 'well-dul-01',
      uploaded_by: 'usr-00000002',
      document_type: 'WCR',
      file_name: 'Duliajan-1_Well_Completion_Report_Interim.pdf',
      file_path: 'uploads/Duliajan-1_WCR.pdf',
      file_size_bytes: 4829104,
      document_date: '2024-02-20',
      description: 'Interim completion and geological evaluation report for Duliajan-1 through 8,420 ft.',
      status: 'processed',
    },
    {
      id: 'doc-002',
      well_id: 'well-lak-101',
      uploaded_by: 'usr-00000002',
      document_type: 'DDR',
      file_name: 'Lakwa-101_Daily_Drilling_Report_Kick_Event.pdf',
      file_path: 'uploads/Lakwa-101_DDR_Kick.pdf',
      file_size_bytes: 1948210,
      document_date: '2023-12-19',
      description: 'Daily operational log detailing gas kick mitigation and 12.3 ppg kill operation.',
      status: 'processed',
    },
    {
      id: 'doc-003',
      well_id: 'well-bgj-11',
      uploaded_by: 'usr-00000002',
      document_type: 'mud_log',
      file_name: 'Baghjan-11_Formation_Pressure_Evaluation_Log.pdf',
      file_path: 'uploads/Baghjan-11_PressureLog.pdf',
      file_size_bytes: 3120490,
      document_date: '2024-03-09',
      description: 'Pore pressure and gas chromatograph evaluation log across deep Barail horizon.',
      status: 'processed',
    },
    {
      id: 'doc-004',
      well_id: 'well-mrn-201',
      uploaded_by: 'usr-00000001',
      document_type: 'completion_report',
      file_name: 'Moran_Field_Offset_Hazard_Synthesis_2024.pdf',
      file_path: 'uploads/Moran_Field_Offset_Hazard.pdf',
      file_size_bytes: 5619200,
      document_date: '2024-02-28',
      description: 'Multi-well offset correlation study for Moran East sector overpressure trends.',
      status: 'processed',
    },
  ];

  for (const d of docs) {
    await runQuery(
      `INSERT OR REPLACE INTO documents (id, well_id, uploaded_by, document_type, file_name, file_path, file_size_bytes, document_date, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id, d.well_id, d.uploaded_by, d.document_type, d.file_name, d.file_path, d.file_size_bytes, d.document_date, d.description, d.status]
    ).catch(() => {});
  }

  // ── 8. Knowledge Chunks ───────────────────────────────────────────────────
  const chunks = [
    {
      id: 'chk-001',
      document_id: 'doc-001',
      event_id: 'evt-001',
      well_id: 'well-dul-01',
      source_type: 'mitigation',
      chunk_text: 'Duliajan North Barail Sandstone loss mitigation: Spot 50 bbl high-fluid-loss LCM pill containing medium/coarse ground marble and walnut shells. Squeeze gently at 350 psi. Keep ECD below 11.2 ppg during subsequent reaming.',
      formation_name: 'Barail Sandstone',
      depth_ft: 8420,
      event_type: 'mud_loss',
      severity: 'critical',
    },
    {
      id: 'chk-002',
      document_id: 'doc-002',
      event_id: 'evt-003',
      well_id: 'well-lak-101',
      source_type: 'lesson',
      chunk_text: 'Lakwa Central deep gas kick protocol: Lower Barail sands show unexpected charging. Upon detection of pit gain > 5 bbl, immediately space out, shut in on annular, record SIDPP and SICP, and prepare kill sheet using 12.3 ppg heavy mud.',
      formation_name: 'Barail Sandstone',
      depth_ft: 11450,
      event_type: 'kick',
      severity: 'critical',
    },
    {
      id: 'chk-003',
      document_id: 'doc-003',
      event_id: 'evt-007',
      well_id: 'well-bgj-11',
      source_type: 'lesson',
      chunk_text: 'Baghjan field well control guideline: Narrow drilling window between pore pressure (12.4 ppg) and fracture gradient (13.1 ppg). Continuous swab monitoring required on every connection. Maximum pipe pull speed 45 ft/min.',
      formation_name: 'Barail Sandstone',
      depth_ft: 12800,
      event_type: 'well_control',
      severity: 'critical',
    },
    {
      id: 'chk-004',
      document_id: 'doc-004',
      event_id: 'evt-005',
      well_id: 'well-mrn-201',
      source_type: 'formation',
      chunk_text: 'Moran East Kopili Shale overpressure transition: Dxc exponent deviation typically starts 150 ft above top limestone. Mud weight must be stepped up incrementally by 0.3 ppg stages to prevent shale sloughing and pack-off.',
      formation_name: 'Kopili Shale',
      depth_ft: 10200,
      event_type: 'pressure_anomaly',
      severity: 'high',
    },
    {
      id: 'chk-005',
      document_id: 'doc-001',
      event_id: 'evt-002',
      well_id: 'well-dul-01',
      source_type: 'mitigation',
      chunk_text: 'Kopili brittle shale torque oscillation remedy: Pump 25 bbl glycol-enhanced sweep. Ream dogleg sections at lower RPM (35-45 rpm) to prevent harmonic bit chatter and drillstring fatigue.',
      formation_name: 'Kopili Shale',
      depth_ft: 6100,
      event_type: 'torque_spike',
      severity: 'medium',
    },
    {
      id: 'chk-006',
      document_id: 'doc-002',
      event_id: 'evt-004',
      well_id: 'well-lak-101',
      source_type: 'mitigation',
      chunk_text: 'Differential sticking release in Tipam depleted zones: Reduce hydrostatic pressure differential. Spot pipe-freeing surfactant pill with mineral oil base. Work torque into string and jar downwards with maximum safe jarring load.',
      formation_name: 'Tipam Sandstone',
      depth_ft: 9800,
      event_type: 'stuck_pipe',
      severity: 'high',
    },
  ];

  for (const c of chunks) {
    await runQuery(
      `INSERT OR REPLACE INTO knowledge_chunks (id, document_id, event_id, well_id, source_type, chunk_text, formation_name, depth_ft, event_type, severity, is_embedded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [c.id, c.document_id, c.event_id, c.well_id, c.source_type, c.chunk_text, c.formation_name, c.depth_ft, c.event_type, c.severity]
    ).catch(() => {});
  }

  // ── 9. Active Risks & Alerts ──────────────────────────────────────────────
  const risks = [
    {
      id: 'rsk-001',
      well_id: 'well-dul-01',
      risk_type: 'mud_loss',
      depth_ft: 8420,
      formation_name: 'Barail Sandstone',
      severity: 'high',
      probability: 0.88,
      confidence: 0.92,
      message: 'High probability of recurring lost circulation in sub-hydrostatic Barail sand interval.',
      description: 'Offset well Duliajan-2 and Naharkatiya-5 showed 35-65 bbl/hr losses in matching stratigraphic depth (8,300-8,600 ft).',
      source: 'rule_engine',
      status: 'active',
    },
    {
      id: 'rsk-002',
      well_id: 'well-dul-01',
      risk_type: 'torque_spike',
      depth_ft: 8420,
      formation_name: 'Kopili Shale',
      severity: 'medium',
      probability: 0.65,
      confidence: 0.84,
      message: 'Intermittent torque spikes predicted while rotating across hard carbonate stringers.',
      description: 'LWD resistivity reveals interbedded limestone nodules in Kopili upper contact.',
      source: 'rule_engine',
      status: 'active',
    },
    {
      id: 'rsk-003',
      well_id: 'well-lak-101',
      risk_type: 'kick',
      depth_ft: 11450,
      formation_name: 'Barail Sandstone',
      severity: 'critical',
      probability: 0.94,
      confidence: 0.96,
      message: 'Critical overpressured gas influx hazard: gas charging in lower Barail horizon.',
      description: 'Pore pressure gradient elevated at 0.64 psi/ft. Requires minimum 12.3 ppg kill weight standby.',
      source: 'rule_engine',
      status: 'active',
    },
    {
      id: 'rsk-004',
      well_id: 'well-lak-101',
      risk_type: 'stuck_pipe',
      depth_ft: 9800,
      formation_name: 'Tipam Sandstone',
      severity: 'high',
      probability: 0.72,
      confidence: 0.88,
      message: 'Differential sticking risk: high overbalance pressure across depleted Tipam interval.',
      description: 'Current mud weight creates 750 psi differential overbalance. Stationary pipe time must not exceed 90 seconds.',
      source: 'rule_engine',
      status: 'active',
    },
    {
      id: 'rsk-005',
      well_id: 'well-bgj-11',
      risk_type: 'well_control',
      depth_ft: 12800,
      formation_name: 'Barail Sandstone',
      severity: 'critical',
      probability: 0.91,
      confidence: 0.93,
      message: 'Critical narrow drilling margin: trip gas and influx risk on connections.',
      description: 'Drilling window margin is under 0.4 ppg between pore pressure and formation fracture breakdown.',
      source: 'rule_engine',
      status: 'active',
    },
    {
      id: 'rsk-006',
      well_id: 'well-mrn-201',
      risk_type: 'overpressure',
      depth_ft: 10200,
      formation_name: 'Kopili Shale',
      severity: 'high',
      probability: 0.79,
      confidence: 0.86,
      message: 'Rapid abnormal pressure ramp: transition from 10.4 ppg to 12.6 ppg equivalent.',
      description: 'Sonic travel time confirms undercompaction zone in basal Kopili shale cap.',
      source: 'rule_engine',
      status: 'active',
    },
  ];

  for (const r of risks) {
    await runQuery(
      `INSERT OR REPLACE INTO risks (id, well_id, risk_type, depth_ft, formation_name, severity, probability, confidence, message, description, source, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.well_id, r.risk_type, r.depth_ft, r.formation_name, r.severity, r.probability, r.confidence, r.message, r.description, r.source, r.status]
    ).catch(() => {});

    // Also populate alerts table for compatibility
    await runQuery(
      `INSERT OR REPLACE INTO alerts (id, well_id, alert_type, message, severity, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [r.id, r.well_id, r.risk_type, r.message, r.severity]
    ).catch(() => {});
  }

  // ── 10. Recommendations ───────────────────────────────────────────────────
  const recs = [
    {
      id: 'rec-001',
      well_id: 'well-dul-01',
      risk_id: 'rsk-001',
      recommendation: 'Pre-treat active system with 25 ppb medium marble LCM; keep 50 bbl high-concentration pill ready in slug pit.',
      rationale: 'Mitigates immediate massive losses when entering depleted upper Barail channel sand.',
      priority: 'high',
    },
    {
      id: 'rec-002',
      well_id: 'well-dul-01',
      risk_id: 'rsk-002',
      recommendation: 'Add 3.5% polyglycol lubricant and restrict rotary speed to 45 RPM during interbedded transition drilling.',
      rationale: 'Prevents BHA stick-slip harmonics and downhole tool fatigue failure.',
      priority: 'medium',
    },
    {
      id: 'rec-003',
      well_id: 'well-lak-101',
      risk_id: 'rsk-003',
      recommendation: 'Weight mud to 12.3 ppg before penetrating 11,400 ft marker. Verify degasser, choke manifold, and BOP accumulator bottles.',
      rationale: 'Ensures adequate overbalance and well control capability for high-pressure gas zone.',
      priority: 'critical',
    },
  ];

  for (const rc of recs) {
    await runQuery(
      `INSERT OR REPLACE INTO recommendations (id, well_id, risk_id, recommendation, rationale, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [rc.id, rc.well_id, rc.risk_id, rc.recommendation, rc.rationale, rc.priority]
    ).catch(() => {});
  }

  console.log('✅  Master seed completed: 18 wells, 3 users, formations, surveys, events, chunks, alerts & recommendations live.');
}
