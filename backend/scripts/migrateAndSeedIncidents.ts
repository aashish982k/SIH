import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../database/nwis.db');
const db = new Database(dbPath);

console.log('🔄 Running incident migrations on:', dbPath);

// Ensure columns exist
try { db.exec(`ALTER TABLE operational_events ADD COLUMN image_url TEXT;`); } catch (_) {}
try { db.exec(`ALTER TABLE operational_events ADD COLUMN video_url TEXT;`); } catch (_) {}
try { db.exec(`ALTER TABLE operational_events ADD COLUMN status TEXT DEFAULT 'resolved';`); } catch (_) {}

const MEDIA_MAP: Record<string, { image: string; video: string }> = {
  mud_loss: {
    image: 'https://images.unsplash.com/photo-1612831819601-cb7a8430de1e?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=W3q8Od5qJio',
  },
  kick: {
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=Z7BfD_59n4s',
  },
  stuck_pipe: {
    image: 'https://images.unsplash.com/photo-1579548122080-c35fd6820ecb?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=dC9iW9l422w',
  },
  torque_spike: {
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=9Gk5fL2Esq4',
  },
  pressure_anomaly: {
    image: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=8bQz5h1S64k',
  },
  casing_issue: {
    image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=v7sDk29X78s',
  },
  cementing_issue: {
    image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=v7sDk29X78s',
  },
  well_control: {
    image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=Z7BfD_59n4s',
  },
  fishing: {
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=_JkYvV982K0',
  },
  leakage: {
    image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=G4Y3Wp4hI2M',
  },
  corrosion: {
    image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=G4Y3Wp4hI2M',
  },
  npt: {
    image: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=9Gk5fL2Esq4',
  },
  washout: {
    image: 'https://images.unsplash.com/photo-1565373679580-fc0cb2b6f418?w=800&q=80',
    video: 'https://www.youtube.com/watch?v=9Gk5fL2Esq4',
  },
};

// Update all existing events with image, video and status
const events = db.prepare('SELECT id, event_type, severity FROM operational_events').all() as any[];
console.log(`Updating ${events.length} existing operational events...`);

const updateStmt = db.prepare(`
  UPDATE operational_events
  SET image_url = ?, video_url = ?, status = ?
  WHERE id = ?
`);

for (const e of events) {
  const media = MEDIA_MAP[e.event_type] || MEDIA_MAP.mud_loss;
  const status = e.severity === 'critical' ? 'mitigated' : 'resolved';
  updateStmt.run(media.image, media.video, status, e.id);
}

// Ensure every single well in `wells` has at least 1-2 realistic incidents linked to it
const wells = db.prepare('SELECT id, name, field_name, total_depth_ft, primary_formation FROM wells').all() as any[];
const insertEventStmt = db.prepare(`
  INSERT INTO operational_events (
    id, well_id, event_type, severity, start_depth_ft, description,
    cause, impact, mitigation, lessons_learned, outcome, duration_hours,
    npt_hours, occurred_at, image_url, video_url, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let addedCount = 0;
for (const w of wells) {
  const existingCount = (db.prepare('SELECT COUNT(*) as c FROM operational_events WHERE well_id = ?').get(w.id) as any).c;
  if (existingCount === 0) {
    const td = Number(w.total_depth_ft || 10000);
    const eventId = `evt-${w.id}-1`;
    const eventType = w.field_name.includes('Baghjan') ? 'well_control'
      : w.field_name.includes('Lakwa') ? 'kick'
      : w.field_name.includes('Moran') ? 'pressure_anomaly'
      : w.field_name.includes('Naharkatiya') ? 'mud_loss'
      : 'torque_spike';
    const media = MEDIA_MAP[eventType] || MEDIA_MAP.mud_loss;
    const depth = Math.round(td * 0.72);

    insertEventStmt.run(
      eventId,
      w.id,
      eventType,
      'high',
      depth,
      `Operational anomaly recorded at ${w.name} in ${w.primary_formation || 'primary reservoir'} horizon at ${depth} ft.`,
      `Lithological boundary pressure surge and differential porosity contrast in ${w.field_name}.`,
      'Drilling paused temporarily for BHA inspection and mud conditioning.',
      `Circulate high-viscosity sweep pill; adjust mud weight by +0.4 ppg to restore hydrostatic equilibrium.`,
      `Always maintain active LCM background and monitor standpipe pressure across ${w.primary_formation || 'target section'}.`,
      'Well stabilized successfully; drilling resumed on schedule.',
      8.5,
      6.0,
      '2024-01-20',
      media.image,
      media.video,
      'resolved'
    );
    addedCount++;
  }
}

console.log(`✅ Successfully updated all operational events. Added ${addedCount} events for wells without prior history.`);
console.log(`Total events now:`, (db.prepare('SELECT COUNT(*) as c FROM operational_events').get() as any).c);
