import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../database/nwis.db');
const db = new Database(dbPath);

console.log('🔄 Checking & seeding cluster wells in SQLite:', dbPath);

const clusterWells = [
  {
    id: '10000000-0000-0000-0000-000000000009',
    name: 'Naharkatia A-2',
    field_name: 'Naharkatia',
    operator: 'Oil India Limited',
    latitude: '27.3158000',
    longitude: '95.3685000',
    spud_date: '2023-04-10',
    total_depth_ft: 9600,
    status: 'completed',
    event: {
      id: 'evt-nhk-02',
      event_type: 'mud_loss',
      severity: 'high',
      start_depth_ft: 7840,
      description: 'Lost 55 bbl drilling fluid in permeable Barail Sandstone during core extraction.',
      cause: 'Natural micro-fractures in upper Barail formation.',
      mitigation: 'Spotted 40 bbl calcium carbonate LCM pill (medium/coarse blend). ECD restored to 9.8 ppg.',
      lessons_learned: 'Pre-treat active system with sized LCM before penetrating Barail boundary.',
      image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://www.youtube.com/watch?v=W3q8Od5qJio',
    }
  },
  {
    id: '10000000-0000-0000-0000-000000000010',
    name: 'Naharkatia A-3',
    field_name: 'Naharkatia',
    operator: 'Oil India Limited',
    latitude: '27.2668000',
    longitude: '95.3125000',
    spud_date: '2023-09-18',
    total_depth_ft: 10200,
    status: 'completed',
    event: {
      id: 'evt-nhk-03',
      event_type: 'kick',
      severity: 'critical',
      start_depth_ft: 8210,
      description: '12 bbl pit gain and 290 psi shut-in casing pressure observed entering overpressured Kopili Shale.',
      cause: 'Abnormal pore pressure ramp in Kopili transition zone.',
      mitigation: 'Executed Wait and Weight well kill method. Raised mud weight from 11.2 to 12.4 ppg using barite.',
      lessons_learned: 'Monitor background gas trends continuously across transition lithologies.',
      image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://www.youtube.com/watch?v=Z7BfD_59n4s',
    }
  },
  {
    id: '10000000-0000-0000-0000-000000000011',
    name: 'Naharkatia-Dev-04',
    field_name: 'Naharkatia',
    operator: 'Oil India Limited',
    latitude: '27.3468000',
    longitude: '95.2935000',
    spud_date: '2024-01-05',
    total_depth_ft: 9400,
    status: 'completed',
    event: {
      id: 'evt-nhk-04',
      event_type: 'stuck_pipe',
      severity: 'high',
      start_depth_ft: 9100,
      description: 'Differential sticking occurred during survey pause across high-permeability sand body.',
      cause: 'Excessive mud cake thickness and high hydrostatic overbalance.',
      mitigation: 'Spotted 30 bbl lubricating ester-glycol freeing pill and jarred upward with 50 klbs overpull.',
      lessons_learned: 'Maintain drillstring rotation during connection and surveys in permeable zones.',
      image_url: 'https://images.unsplash.com/photo-1504307651554-66914ee56a38?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://www.youtube.com/watch?v=dC9iW9l422w',
    }
  },
  {
    id: '10000000-0000-0000-0000-000000000012',
    name: 'Naharkatia-East-05',
    field_name: 'Naharkatia',
    operator: 'Oil India Limited',
    latitude: '27.3068000',
    longitude: '95.4355000',
    spud_date: '2024-03-22',
    total_depth_ft: 8900,
    status: 'completed',
    event: {
      id: 'evt-nhk-05',
      event_type: 'washout',
      severity: 'medium',
      start_depth_ft: 6450,
      description: 'Pressure drop of 350 psi at standpipe indicative of wash at BHA stabilizer connection.',
      cause: 'Fatigue cracking and severe annular fluid cavitation.',
      mitigation: 'Tripped string out of hole, replaced worn drill collars, and inspected threads with MPI.',
      lessons_learned: 'Perform mandatory NDT inspection of drill collars every 150 rotating hours.',
      image_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
      video_url: 'https://www.youtube.com/watch?v=v7sDk29X78s',
    }
  },
];

for (const w of clusterWells) {
  const existing = db.prepare('SELECT id FROM wells WHERE id = ?').get(w.id);
  if (!existing) {
    db.prepare(`
      INSERT INTO wells (id, name, field_name, operator, latitude, longitude, spud_date, total_depth_ft, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(w.id, w.name, w.field_name, w.operator, w.latitude, w.longitude, w.spud_date, w.total_depth_ft, w.status);
    console.log(`  + Seeded well: ${w.name}`);
  }

  const evExisting = db.prepare('SELECT id FROM operational_events WHERE id = ?').get(w.event.id);
  if (!evExisting) {
    db.prepare(`
      INSERT INTO operational_events (id, well_id, event_type, severity, start_depth_ft, description, cause, mitigation, lessons_learned, occurred_at, image_url, video_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'resolved')
    `).run(
      w.event.id,
      w.id,
      w.event.event_type,
      w.event.severity,
      w.event.start_depth_ft,
      w.event.description,
      w.event.cause,
      w.event.mitigation,
      w.event.lessons_learned,
      '2024-02-15 10:00:00',
      w.event.image_url,
      w.event.video_url
    );
    console.log(`    + Seeded incident: ${w.event.id} (${w.event.event_type})`);
  }
}

console.log('✅ Cluster wells seeded successfully.');
process.exit(0);
