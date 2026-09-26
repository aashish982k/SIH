import Database from 'better-sqlite3';

export function initializeSqliteTables(db: Database.Database): void {
  // Register custom Math functions for geo-queries
  db.function('RADIANS', (deg: number) => (deg * Math.PI) / 180);
  db.function('DEGREES', (rad: number) => (rad * 180) / Math.PI);
  db.function('ACOS', (x: number) => Math.acos(Math.max(-1, Math.min(1, x))));
  db.function('COS', (x: number) => Math.cos(x));
  db.function('SIN', (x: number) => Math.sin(x));

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'engineer',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wells (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      well_number TEXT,
      field_name TEXT NOT NULL,
      block TEXT,
      operator TEXT NOT NULL DEFAULT 'Oil India Limited',
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      elevation_m REAL,
      total_depth_ft REAL,
      status TEXT NOT NULL DEFAULT 'active',
      spud_date TEXT,
      completion_date TEXT,
      primary_formation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS well_surveys (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      measured_depth_ft REAL NOT NULL,
      tvd_ft REAL,
      inclination_deg REAL,
      azimuth_deg REAL,
      northing_ft REAL,
      easting_ft REAL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS well_formations (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      formation_name TEXT NOT NULL,
      top_depth_ft REAL NOT NULL,
      bottom_depth_ft REAL,
      lithology TEXT,
      pore_pressure_psi REAL,
      fracture_gradient REAL,
      reservoir_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drilling_parameters (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      depth_ft REAL NOT NULL,
      rop_ft_per_hr REAL,
      wob_klbs REAL,
      rpm REAL,
      torque_kft_lbs REAL,
      spp_psi REAL,
      flow_rate_gpm REAL,
      mud_weight_ppg REAL,
      ecd_ppg REAL,
      temperature_f REAL,
      hook_load_klbs REAL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS operational_events (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      formation_id TEXT REFERENCES well_formations(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      start_depth_ft REAL NOT NULL,
      end_depth_ft REAL,
      description TEXT NOT NULL,
      cause TEXT,
      impact TEXT,
      mitigation TEXT,
      lessons_learned TEXT,
      outcome TEXT,
      duration_hours REAL,
      npt_hours REAL,
      image_url TEXT,
      video_url TEXT,
      status TEXT NOT NULL DEFAULT 'resolved',
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS casing_sections (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      casing_type TEXT NOT NULL,
      outer_dia_in REAL NOT NULL,
      grade TEXT,
      weight_lb_ft REAL,
      shoe_depth_ft REAL NOT NULL,
      top_depth_ft REAL NOT NULL DEFAULT 0,
      set_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cement_jobs (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      casing_section_id TEXT REFERENCES casing_sections(id) ON DELETE SET NULL,
      job_type TEXT NOT NULL DEFAULT 'primary',
      top_of_cement_ft REAL,
      cement_volume_bbls REAL,
      slurry_density_ppg REAL,
      displacement_vol_bbls REAL,
      returns_obtained INTEGER,
      cbil_run INTEGER NOT NULL DEFAULT 0,
      issues TEXT,
      result TEXT,
      job_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mud_programs (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      depth_from_ft REAL NOT NULL,
      depth_to_ft REAL,
      mud_type TEXT NOT NULL,
      mud_weight_ppg REAL NOT NULL,
      viscosity_cp REAL,
      ph_value REAL,
      fluid_loss_cc REAL,
      additives TEXT,
      total_loss_bbls REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      well_id TEXT REFERENCES wells(id) ON DELETE SET NULL,
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      document_type TEXT NOT NULL DEFAULT 'other',
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size_bytes INTEGER,
      document_date TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'uploaded',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
      event_id TEXT REFERENCES operational_events(id) ON DELETE CASCADE,
      well_id TEXT REFERENCES wells(id) ON DELETE SET NULL,
      qdrant_vector_id TEXT UNIQUE,
      source_type TEXT NOT NULL,
      chunk_text TEXT NOT NULL,
      chunk_index INTEGER,
      formation_name TEXT,
      depth_ft REAL,
      event_type TEXT,
      severity TEXT,
      is_embedded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS risks (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      risk_type TEXT NOT NULL,
      depth_ft REAL,
      formation_name TEXT,
      severity TEXT NOT NULL,
      probability REAL,
      confidence REAL,
      message TEXT NOT NULL,
      description TEXT,
      source TEXT NOT NULL DEFAULT 'rule_engine',
      related_well_ids TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      well_id TEXT NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
      risk_id TEXT REFERENCES risks(id) ON DELETE SET NULL,
      recommendation TEXT NOT NULL,
      rationale TEXT,
      source TEXT NOT NULL DEFAULT 'rule_engine',
      confidence REAL,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      applied_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_wells_status ON wells(status);
    CREATE INDEX IF NOT EXISTS idx_wells_field ON wells(field_name);
    CREATE INDEX IF NOT EXISTS idx_event_well ON operational_events(well_id);
    CREATE INDEX IF NOT EXISTS idx_event_type ON operational_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_risk_well ON risks(well_id);
    CREATE INDEX IF NOT EXISTS idx_chunk_well ON knowledge_chunks(well_id);
  `);

  // Safe table migration for existing databases
  try { db.exec(`ALTER TABLE operational_events ADD COLUMN image_url TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE operational_events ADD COLUMN video_url TEXT;`); } catch (_) {}
  try { db.exec(`ALTER TABLE operational_events ADD COLUMN status TEXT DEFAULT 'resolved';`); } catch (_) {}
}
