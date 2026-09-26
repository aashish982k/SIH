-- ============================================================
-- NWIS — MySQL Schema  (v2 — MVP)
-- Depths are stored in feet (MD unless the column says TVD).
-- All timestamps in UTC.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS risks;
DROP TABLE IF EXISTS extraction_items;
DROP TABLE IF EXISTS knowledge_chunks;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS mud_programs;
DROP TABLE IF EXISTS cement_jobs;
DROP TABLE IF EXISTS casing_sections;
DROP TABLE IF EXISTS operational_events;
DROP TABLE IF EXISTS drilling_parameters;
DROP TABLE IF EXISTS well_formations;
DROP TABLE IF EXISTS well_surveys;
DROP TABLE IF EXISTS wells;
DROP TABLE IF EXISTS users;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('engineer','operator','administrator') NOT NULL DEFAULT 'engineer',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Wells ────────────────────────────────────────────────────
CREATE TABLE wells (
  id                CHAR(36)      NOT NULL PRIMARY KEY,
  name              VARCHAR(120)  NOT NULL,
  field_name        VARCHAR(120)  NOT NULL,
  block             VARCHAR(80)   NULL,
  pad               VARCHAR(40)   NULL COMMENT 'Wells on one pad share a surface location',
  operator          VARCHAR(120)  NOT NULL DEFAULT 'Oil India Limited',
  well_type         ENUM('exploratory','appraisal','development') NOT NULL DEFAULT 'development',
  profile           ENUM('vertical','deviated') NOT NULL DEFAULT 'vertical',
  latitude          DECIMAL(10,7) NOT NULL,
  longitude         DECIMAL(10,7) NOT NULL,
  location          POINT         NOT NULL SRID 4326,
  kb_elevation_m    DECIMAL(8,2)  NULL,
  total_depth_ft    DECIMAL(10,2) NULL COMMENT 'Final MD for completed wells',
  planned_td_ft     DECIMAL(10,2) NULL,
  current_depth_ft  DECIMAL(10,2) NULL COMMENT 'Live wells only',
  status            ENUM('drilling','completed','suspended','abandoned') NOT NULL DEFAULT 'completed',
  spud_date         DATE          NULL,
  completion_date   DATE          NULL,
  total_npt_hours   DECIMAL(8,2)  NOT NULL DEFAULT 0,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  SPATIAL INDEX idx_wells_location (location),
  INDEX idx_wells_status (status),
  INDEX idx_wells_field  (field_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Survey stations (minimum-curvature positions precomputed) ─
CREATE TABLE well_surveys (
  id               BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  well_id          CHAR(36)      NOT NULL,
  md_ft            DECIMAL(10,2) NOT NULL,
  inclination_deg  DECIMAL(6,3)  NOT NULL,
  azimuth_deg      DECIMAL(6,3)  NOT NULL,
  tvd_ft           DECIMAL(10,2) NOT NULL,
  north_ft         DECIMAL(12,2) NOT NULL,
  east_ft          DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_survey_well_md (well_id, md_ft)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Formation tops ───────────────────────────────────────────
CREATE TABLE well_formations (
  id                CHAR(36)      NOT NULL PRIMARY KEY,
  well_id           CHAR(36)      NOT NULL,
  formation_name    VARCHAR(120)  NOT NULL,
  seq               TINYINT       NOT NULL COMMENT 'Stratigraphic order, 1 = shallowest',
  top_md_ft         DECIMAL(10,2) NOT NULL,
  bottom_md_ft      DECIMAL(10,2) NULL,
  top_tvd_ft        DECIMAL(10,2) NOT NULL,
  bottom_tvd_ft     DECIMAL(10,2) NULL,
  lithology         VARCHAR(120)  NULL,
  is_predicted      BOOLEAN       NOT NULL DEFAULT FALSE COMMENT 'TRUE for live-well prognosis',
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_formation_well (well_id, seq),
  INDEX idx_formation_name (formation_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Real-time samples (eRTMAC) ───────────────────────────────
CREATE TABLE drilling_parameters (
  id               BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  well_id          CHAR(36)      NOT NULL,
  recorded_at      DATETIME(3)   NOT NULL,
  hole_depth_ft    DECIMAL(10,2) NOT NULL,
  bit_depth_ft     DECIMAL(10,2) NOT NULL,
  rig_state        ENUM('drilling','connection','circulating','tripping','reaming') NOT NULL,
  rop_ft_hr        DECIMAL(8,2)  NULL,
  wob_klbs         DECIMAL(8,2)  NULL,
  rpm              DECIMAL(6,1)  NULL,
  torque_kftlb     DECIMAL(8,2)  NULL,
  spp_psi          DECIMAL(8,1)  NULL,
  flow_in_gpm      DECIMAL(8,1)  NULL,
  flow_out_gpm     DECIMAL(8,1)  NULL,
  pit_volume_bbl   DECIMAL(8,1)  NULL,
  hook_load_klbs   DECIMAL(8,1)  NULL,
  mud_weight_ppg   DECIMAL(6,2)  NULL,
  ecd_ppg          DECIMAL(6,2)  NULL,
  total_gas_units  DECIMAL(8,1)  NULL,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_dp_well_time (well_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Documents ────────────────────────────────────────────────
CREATE TABLE documents (
  id                CHAR(36)      NOT NULL PRIMARY KEY,
  well_id           CHAR(36)      NULL,
  uploaded_by       CHAR(36)      NULL,
  document_type     ENUM('WCR','DDR','mud_log','completion_report','other') NOT NULL DEFAULT 'other',
  title             VARCHAR(255)  NOT NULL,
  file_name         VARCHAR(255)  NOT NULL,
  file_path         VARCHAR(500)  NULL COMMENT 'Relative to UPLOADS_DIR; NULL for seeded records',
  file_size_bytes   BIGINT        NULL,
  page_count        INT           NULL,
  document_date     DATE          NULL,
  status            ENUM('uploaded','processing','review','processed','failed') NOT NULL DEFAULT 'uploaded',
  extraction_method VARCHAR(40)   NULL COMMENT 'groq:<model> | rules',
  error_message     TEXT          NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id)     REFERENCES wells(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_doc_well   (well_id),
  INDEX idx_doc_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Operational events (incidents) ───────────────────────────
CREATE TABLE operational_events (
  id                 CHAR(36)      NOT NULL PRIMARY KEY,
  well_id            CHAR(36)      NOT NULL,
  formation_name     VARCHAR(120)  NULL,
  event_type         ENUM('mud_loss','kick','stuck_pipe','tight_hole','overpressure',
                          'wellbore_instability','cementing_issue','fishing','other') NOT NULL,
  severity           ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  depth_md_ft        DECIMAL(10,2) NOT NULL,
  depth_tvd_ft       DECIMAL(10,2) NULL,
  description        TEXT          NOT NULL,
  cause              TEXT          NULL,
  mitigation         TEXT          NULL,
  mitigation_key     VARCHAR(60)   NULL COMMENT 'Normalised strategy used for “what worked” ranking',
  outcome            TEXT          NULL,
  outcome_rating     ENUM('resolved','partial','failed') NULL,
  lessons_learned    TEXT          NULL,
  npt_hours          DECIMAL(8,2)  NULL,
  occurred_at        DATE          NULL,
  source_document_id CHAR(36)      NULL,
  source_page        INT           NULL,
  verified           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id)            REFERENCES wells(id) ON DELETE CASCADE,
  FOREIGN KEY (source_document_id) REFERENCES documents(id) ON DELETE SET NULL,
  INDEX idx_event_well      (well_id, depth_md_ft),
  INDEX idx_event_type      (event_type),
  INDEX idx_event_formation (formation_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Casing / cement / mud programs ───────────────────────────
CREATE TABLE casing_sections (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  well_id         CHAR(36)      NOT NULL,
  casing_type     ENUM('conductor','surface','intermediate','production','liner') NOT NULL,
  size_label      VARCHAR(20)   NOT NULL COMMENT 'e.g. 13-3/8"',
  outer_dia_in    DECIMAL(6,3)  NOT NULL,
  grade           VARCHAR(30)   NULL,
  weight_lb_ft    DECIMAL(7,2)  NULL,
  top_md_ft       DECIMAL(10,2) NOT NULL DEFAULT 0,
  shoe_md_ft      DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_casing_well (well_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cement_jobs (
  id                 CHAR(36)      NOT NULL PRIMARY KEY,
  well_id            CHAR(36)      NOT NULL,
  casing_section_id  CHAR(36)      NULL,
  top_of_cement_ft   DECIMAL(10,2) NULL,
  slurry_density_ppg DECIMAL(6,2)  NULL,
  returns_obtained   BOOLEAN       NULL,
  result             ENUM('good','acceptable','poor','failed') NULL,
  issues             TEXT          NULL,
  FOREIGN KEY (well_id)           REFERENCES wells(id) ON DELETE CASCADE,
  FOREIGN KEY (casing_section_id) REFERENCES casing_sections(id) ON DELETE SET NULL,
  INDEX idx_cement_well (well_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mud_programs (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  well_id         CHAR(36)      NOT NULL,
  depth_from_ft   DECIMAL(10,2) NOT NULL,
  depth_to_ft     DECIMAL(10,2) NOT NULL,
  mud_type        VARCHAR(80)   NOT NULL,
  mud_weight_ppg  DECIMAL(6,2)  NOT NULL,
  total_loss_bbl  DECIMAL(8,1)  NULL,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_mud_well (well_id, depth_from_ft)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Extraction queue (awaiting engineer verification) ────────
CREATE TABLE extraction_items (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  document_id     CHAR(36)      NOT NULL,
  item_type       ENUM('event','formation_top','casing') NOT NULL DEFAULT 'event',
  payload         JSON          NOT NULL,
  confidence      DECIMAL(4,3)  NOT NULL DEFAULT 0.5,
  source_page     INT           NULL,
  source_quote    TEXT          NULL,
  status          ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
  created_event_id CHAR(36)     NULL,
  reviewed_by     CHAR(36)      NULL,
  reviewed_at     DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  INDEX idx_extract_doc (document_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Knowledge chunks (MySQL ↔ Qdrant link) ───────────────────
CREATE TABLE knowledge_chunks (
  id              CHAR(36)      NOT NULL PRIMARY KEY COMMENT 'Also the Qdrant point id',
  document_id     CHAR(36)      NULL,
  event_id        CHAR(36)      NULL,
  well_id         CHAR(36)      NULL,
  source_type     ENUM('document','event') NOT NULL,
  chunk_text      TEXT          NOT NULL,
  page            INT           NULL,
  formation_name  VARCHAR(120)  NULL,
  depth_ft        DECIMAL(10,2) NULL,
  event_type      VARCHAR(40)   NULL,
  is_embedded     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id)    REFERENCES operational_events(id) ON DELETE CASCADE,
  FOREIGN KEY (well_id)     REFERENCES wells(id) ON DELETE SET NULL,
  INDEX idx_chunk_well (well_id),
  FULLTEXT INDEX ft_chunk_text (chunk_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Alerts (look-ahead + live) ───────────────────────────────
CREATE TABLE alerts (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  well_id         CHAR(36)      NOT NULL,
  kind            ENUM('lookahead','live') NOT NULL,
  risk_type       VARCHAR(40)   NOT NULL,
  severity        ENUM('low','medium','high','critical') NOT NULL,
  probability     DECIMAL(5,4)  NOT NULL,
  bit_depth_ft    DECIMAL(10,2) NOT NULL,
  zone_top_ft     DECIMAL(10,2) NULL,
  zone_base_ft    DECIMAL(10,2) NULL,
  formation_name  VARCHAR(120)  NULL,
  title           VARCHAR(255)  NOT NULL,
  message         TEXT          NOT NULL,
  evidence        JSON          NULL,
  recommendations JSON          NULL,
  status          ENUM('active','acknowledged','resolved','false_alarm') NOT NULL DEFAULT 'active',
  feedback        TEXT          NULL,
  acknowledged_by CHAR(36)      NULL,
  acknowledged_at DATETIME      NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id) REFERENCES wells(id) ON DELETE CASCADE,
  INDEX idx_alert_well (well_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
