-- ============================================================
-- NWIS — MySQL Schema
-- Version: 001
-- All timestamps in UTC
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ────────────────────────────────────────────────────────────
-- 1. USERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('engineer','operator','administrator') NOT NULL DEFAULT 'engineer',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 2. WELLS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wells (
  id              CHAR(36)       NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name            VARCHAR(120)   NOT NULL,
  well_number     VARCHAR(60)    NULL,
  field_name      VARCHAR(120)   NOT NULL,
  block           VARCHAR(80)    NULL,
  operator        VARCHAR(120)   NOT NULL DEFAULT 'Oil India Limited',
  latitude        DECIMAL(10,7)  NOT NULL,
  longitude       DECIMAL(10,7)  NOT NULL,
  elevation_m     DECIMAL(8,2)   NULL COMMENT 'Kelly Bushing elevation in metres',
  total_depth_ft  DECIMAL(10,2)  NULL,
  status          ENUM('active','suspended','completed','abandoned') NOT NULL DEFAULT 'active',
  spud_date       DATE           NULL,
  completion_date DATE           NULL,
  primary_formation VARCHAR(120) NULL COMMENT 'Primary reservoir/formation name',
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wells_status    (status),
  INDEX idx_wells_field     (field_name),
  INDEX idx_wells_lat_lng   (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 3. WELL SURVEY / TRAJECTORY
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS well_surveys (
  id               CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id          CHAR(36)      NOT NULL,
  measured_depth_ft DECIMAL(10,2) NOT NULL,
  tvd_ft           DECIMAL(10,2) NULL  COMMENT 'True Vertical Depth',
  inclination_deg  DECIMAL(6,3)  NULL,
  azimuth_deg      DECIMAL(6,3)  NULL,
  northing_ft      DECIMAL(12,3) NULL,
  easting_ft       DECIMAL(12,3) NULL,
  recorded_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_survey_well  (well_id),
  INDEX idx_survey_depth (well_id, measured_depth_ft)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 4. FORMATIONS / GEOLOGICAL INFORMATION
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS well_formations (
  id                 CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id            CHAR(36)      NOT NULL,
  formation_name     VARCHAR(120)  NOT NULL,
  top_depth_ft       DECIMAL(10,2) NOT NULL,
  bottom_depth_ft    DECIMAL(10,2) NULL,
  lithology          VARCHAR(120)  NULL  COMMENT 'e.g., Sandstone, Shale, Limestone',
  pore_pressure_psi  DECIMAL(10,2) NULL,
  fracture_gradient  DECIMAL(6,4)  NULL  COMMENT 'in psi/ft',
  reservoir_notes    TEXT          NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_formation_well  (well_id),
  INDEX idx_formation_name  (formation_name),
  INDEX idx_formation_depth (well_id, top_depth_ft)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 5. DRILLING PARAMETERS (eRTMAC feed snapshots)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drilling_parameters (
  id                CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id           CHAR(36)      NOT NULL,
  depth_ft          DECIMAL(10,2) NOT NULL,
  rop_ft_per_hr     DECIMAL(8,2)  NULL  COMMENT 'Rate of Penetration',
  wob_klbs          DECIMAL(8,2)  NULL  COMMENT 'Weight on Bit',
  rpm               DECIMAL(6,1)  NULL  COMMENT 'Rotary Speed',
  torque_kft_lbs    DECIMAL(8,2)  NULL,
  spp_psi           DECIMAL(8,2)  NULL  COMMENT 'Standpipe Pressure',
  flow_rate_gpm     DECIMAL(8,2)  NULL,
  mud_weight_ppg    DECIMAL(6,3)  NULL,
  ecd_ppg           DECIMAL(6,3)  NULL  COMMENT 'Equivalent Circulating Density',
  temperature_f     DECIMAL(7,2)  NULL,
  hook_load_klbs    DECIMAL(8,2)  NULL,
  recorded_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_dp_well  (well_id),
  INDEX idx_dp_depth (well_id, depth_ft),
  INDEX idx_dp_time  (well_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 6. OPERATIONAL EVENTS (incidents)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operational_events (
  id              CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id         CHAR(36)      NOT NULL,
  formation_id    CHAR(36)      NULL,
  event_type      ENUM(
    'mud_loss','kick','stuck_pipe','fishing','npt',
    'torque_spike','pressure_anomaly','cementing_issue',
    'casing_issue','well_control','blowout','other'
  ) NOT NULL,
  severity        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  start_depth_ft  DECIMAL(10,2) NOT NULL,
  end_depth_ft    DECIMAL(10,2) NULL,
  description     TEXT          NOT NULL,
  cause           TEXT          NULL,
  impact          TEXT          NULL,
  mitigation      TEXT          NULL,
  lessons_learned TEXT          NULL,
  outcome         TEXT          NULL,
  duration_hours  DECIMAL(8,2)  NULL,
  npt_hours       DECIMAL(8,2)  NULL COMMENT 'Non-Productive Time',
  occurred_at     DATE          NOT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id)      REFERENCES wells(id) ON DELETE CASCADE,
  FOREIGN KEY (formation_id) REFERENCES well_formations(id) ON DELETE SET NULL,
  INDEX idx_event_well      (well_id),
  INDEX idx_event_type      (event_type),
  INDEX idx_event_severity  (severity),
  INDEX idx_event_depth     (well_id, start_depth_ft),
  INDEX idx_event_formation (formation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 7. CASING SECTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS casing_sections (
  id              CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id         CHAR(36)      NOT NULL,
  casing_type     ENUM('conductor','surface','intermediate','production','liner') NOT NULL,
  outer_dia_in    DECIMAL(6,3)  NOT NULL COMMENT 'Outer diameter in inches',
  grade           VARCHAR(30)   NULL   COMMENT 'e.g., J55, K55, L80, P110',
  weight_lb_ft    DECIMAL(7,3)  NULL,
  shoe_depth_ft   DECIMAL(10,2) NOT NULL,
  top_depth_ft    DECIMAL(10,2) NOT NULL DEFAULT 0,
  set_date        DATE          NULL,
  notes           TEXT          NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_casing_well (well_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 8. CEMENT JOBS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cement_jobs (
  id                  CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id             CHAR(36)      NOT NULL,
  casing_section_id   CHAR(36)      NULL,
  job_type            ENUM('primary','remedial','plug') NOT NULL DEFAULT 'primary',
  top_of_cement_ft    DECIMAL(10,2) NULL,
  cement_volume_bbls  DECIMAL(10,2) NULL,
  slurry_density_ppg  DECIMAL(6,3)  NULL,
  displacement_vol_bbls DECIMAL(10,2) NULL,
  returns_obtained    BOOLEAN       NULL COMMENT 'Full returns to surface?',
  cbil_run            BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'Cement bond log run?',
  issues              TEXT          NULL,
  result              ENUM('good','acceptable','poor','failed') NULL,
  job_date            DATE          NULL,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id)           REFERENCES wells(id) ON DELETE CASCADE,
  FOREIGN KEY (casing_section_id) REFERENCES casing_sections(id) ON DELETE SET NULL,
  INDEX idx_cement_well (well_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 9. MUD PROGRAMS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mud_programs (
  id              CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id         CHAR(36)      NOT NULL,
  depth_from_ft   DECIMAL(10,2) NOT NULL,
  depth_to_ft     DECIMAL(10,2) NULL,
  mud_type        VARCHAR(80)   NOT NULL COMMENT 'e.g., Water-Based, Oil-Based, Synthetic',
  mud_weight_ppg  DECIMAL(6,3)  NOT NULL,
  viscosity_cp    DECIMAL(8,2)  NULL COMMENT 'Plastic viscosity in cP',
  ph_value        DECIMAL(4,2)  NULL,
  fluid_loss_cc   DECIMAL(6,2)  NULL COMMENT 'API fluid loss in cc/30min',
  additives       TEXT          NULL COMMENT 'JSON or CSV list of additives',
  total_loss_bbls DECIMAL(8,2)  NULL COMMENT 'Cumulative mud losses in this interval',
  notes           TEXT          NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_mud_well  (well_id),
  INDEX idx_mud_depth (well_id, depth_from_ft)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 10. DOCUMENTS (WCR / DDR / report metadata)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id         CHAR(36)      NULL,
  uploaded_by     CHAR(36)      NOT NULL,
  document_type   ENUM('WCR','DDR','mud_log','completion_report','other') NOT NULL DEFAULT 'other',
  file_name       VARCHAR(255)  NOT NULL,
  file_path       VARCHAR(500)  NOT NULL,
  file_size_bytes BIGINT        NULL,
  document_date   DATE          NULL,
  description     TEXT          NULL,
  status          ENUM('uploaded','processing','processed','failed') NOT NULL DEFAULT 'uploaded',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id)     REFERENCES wells(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_doc_well   (well_id),
  INDEX idx_doc_user   (uploaded_by),
  INDEX idx_doc_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 11. KNOWLEDGE CHUNKS (links MySQL ↔ Qdrant)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id               CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  document_id      CHAR(36)      NULL,
  event_id         CHAR(36)      NULL COMMENT 'If chunk is from an operational_event',
  well_id          CHAR(36)      NULL,
  qdrant_vector_id CHAR(36)      NULL UNIQUE COMMENT 'ID stored in Qdrant',
  source_type      ENUM('document','event','lesson','mitigation','formation') NOT NULL,
  chunk_text       TEXT          NOT NULL,
  chunk_index      INT           NULL COMMENT 'Position of this chunk in the source document',
  formation_name   VARCHAR(120)  NULL,
  depth_ft         DECIMAL(10,2) NULL,
  event_type       VARCHAR(50)   NULL,
  severity         VARCHAR(20)   NULL,
  is_embedded      BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'FALSE = zero-vector placeholder; TRUE = real embedding',
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id)    REFERENCES operational_events(id) ON DELETE CASCADE,
  FOREIGN KEY (well_id)     REFERENCES wells(id) ON DELETE SET NULL,
  INDEX idx_chunk_doc        (document_id),
  INDEX idx_chunk_event      (event_id),
  INDEX idx_chunk_well       (well_id),
  INDEX idx_chunk_embedded   (is_embedded),
  INDEX idx_chunk_source_type (source_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 12. RISKS / ALERTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risks (
  id                CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id           CHAR(36)      NOT NULL,
  risk_type         ENUM(
    'mud_loss','stuck_pipe','kick','overpressure','torque_spike',
    'cementing_issue','casing_issue','well_control','other'
  ) NOT NULL,
  depth_ft          DECIMAL(10,2) NULL,
  formation_name    VARCHAR(120)  NULL,
  severity          ENUM('low','medium','high','critical') NOT NULL,
  probability       DECIMAL(5,4)  NULL COMMENT '0.0 to 1.0 — set by ML in Part 2',
  confidence        DECIMAL(5,4)  NULL COMMENT '0.0 to 1.0',
  message           TEXT          NOT NULL,
  description       TEXT          NULL,
  source            ENUM('rule_engine','ml_model','manual') NOT NULL DEFAULT 'rule_engine',
  related_well_ids  JSON          NULL COMMENT 'Array of nearby well IDs that contributed',
  status            ENUM('active','resolved','dismissed') NOT NULL DEFAULT 'active',
  resolved_at       DATETIME      NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_risk_well     (well_id),
  INDEX idx_risk_type     (risk_type),
  INDEX idx_risk_status   (status),
  INDEX idx_risk_severity (severity),
  INDEX idx_risk_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 13. RECOMMENDATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
  id               CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  well_id          CHAR(36)      NOT NULL,
  risk_id          CHAR(36)      NULL,
  recommendation   TEXT          NOT NULL,
  rationale        TEXT          NULL,
  source           ENUM('rule_engine','ml_model','knowledge_base','manual') NOT NULL DEFAULT 'rule_engine',
  confidence       DECIMAL(5,4)  NULL,
  priority         ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  status           ENUM('pending','applied','dismissed') NOT NULL DEFAULT 'pending',
  applied_at       DATETIME      NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  FOREIGN KEY (risk_id) REFERENCES risks(id) ON DELETE SET NULL,
  INDEX idx_rec_well   (well_id),
  INDEX idx_rec_risk   (risk_id),
  INDEX idx_rec_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
