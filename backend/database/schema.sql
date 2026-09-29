-- ============================================================
-- NWIS — PostgreSQL Schema  (v3 — Drizzle ORM migration)
-- No PostGIS required. Spatial queries use Haversine SQL.
-- Depths stored in feet. All timestamps in UTC (TIMESTAMPTZ).
-- ============================================================

-- Create custom types (idempotent)
DO $$ BEGIN
  CREATE TYPE role_enum          AS ENUM ('engineer','operator','administrator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE well_type_enum     AS ENUM ('exploratory','appraisal','development'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE profile_enum       AS ENUM ('vertical','deviated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE well_status_enum   AS ENUM ('drilling','completed','suspended','abandoned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE rig_state_enum     AS ENUM ('drilling','connection','circulating','tripping','reaming'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE doc_type_enum      AS ENUM ('WCR','DDR','mud_log','completion_report','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE doc_status_enum    AS ENUM ('uploaded','processing','review','processed','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE event_type_enum    AS ENUM ('mud_loss','kick','stuck_pipe','tight_hole','overpressure','wellbore_instability','cementing_issue','fishing','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE severity_enum      AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE casing_type_enum   AS ENUM ('conductor','surface','intermediate','production','liner'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE cement_result_enum AS ENUM ('good','acceptable','poor','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE outcome_rating_enum AS ENUM ('resolved','partial','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE item_type_enum     AS ENUM ('event','formation_top','casing'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE item_status_enum   AS ENUM ('pending','confirmed','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE chunk_source_enum  AS ENUM ('document','event'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE alert_kind_enum    AS ENUM ('lookahead','live'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE alert_severity_enum AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE alert_status_enum  AS ENUM ('active','acknowledged','resolved','false_alarm'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Drop tables in reverse FK order
DROP TABLE IF EXISTS alerts             CASCADE;
DROP TABLE IF EXISTS knowledge_chunks   CASCADE;
DROP TABLE IF EXISTS extraction_items   CASCADE;
DROP TABLE IF EXISTS mud_programs       CASCADE;
DROP TABLE IF EXISTS cement_jobs        CASCADE;
DROP TABLE IF EXISTS casing_sections    CASCADE;
DROP TABLE IF EXISTS operational_events CASCADE;
DROP TABLE IF EXISTS drilling_parameters CASCADE;
DROP TABLE IF EXISTS well_formations    CASCADE;
DROP TABLE IF EXISTS well_surveys       CASCADE;
DROP TABLE IF EXISTS documents          CASCADE;
DROP TABLE IF EXISTS wells              CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          role_enum    NOT NULL DEFAULT 'engineer',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_uq UNIQUE (email)
);
CREATE INDEX idx_users_email ON users (email);

-- ── Wells ────────────────────────────────────────────────────
-- NUMERIC lat/lon — Haversine in SQL, no PostGIS extension needed
CREATE TABLE wells (
  id                UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(120)  NOT NULL,
  field_name        VARCHAR(120)  NOT NULL,
  block             VARCHAR(80),
  pad               VARCHAR(40),
  operator          VARCHAR(120)  NOT NULL DEFAULT 'Oil India Limited',
  well_type         well_type_enum  NOT NULL DEFAULT 'development',
  profile           profile_enum    NOT NULL DEFAULT 'vertical',
  latitude          NUMERIC(10,7) NOT NULL,
  longitude         NUMERIC(10,7) NOT NULL,
  kb_elevation_m    NUMERIC(8,2),
  total_depth_ft    NUMERIC(10,2),
  planned_td_ft     NUMERIC(10,2),
  current_depth_ft  NUMERIC(10,2),
  status            well_status_enum NOT NULL DEFAULT 'completed',
  spud_date         DATE,
  completion_date   DATE,
  total_npt_hours   NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_wells_status  ON wells (status);
CREATE INDEX idx_wells_field   ON wells (field_name);
CREATE INDEX idx_wells_lat_lon ON wells (latitude, longitude);

-- ── Survey stations ───────────────────────────────────────────
CREATE TABLE well_surveys (
  id               BIGSERIAL     NOT NULL PRIMARY KEY,
  well_id          UUID          NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  md_ft            NUMERIC(10,2) NOT NULL,
  inclination_deg  NUMERIC(6,3)  NOT NULL,
  azimuth_deg      NUMERIC(6,3)  NOT NULL,
  tvd_ft           NUMERIC(10,2) NOT NULL,
  north_ft         NUMERIC(12,2) NOT NULL,
  east_ft          NUMERIC(12,2) NOT NULL
);
CREATE INDEX idx_survey_well_md ON well_surveys (well_id, md_ft);

-- ── Formation tops ────────────────────────────────────────────
CREATE TABLE well_formations (
  id                UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id           UUID          NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  formation_name    VARCHAR(120)  NOT NULL,
  seq               SMALLINT      NOT NULL,
  top_md_ft         NUMERIC(10,2) NOT NULL,
  bottom_md_ft      NUMERIC(10,2),
  top_tvd_ft        NUMERIC(10,2) NOT NULL,
  bottom_tvd_ft     NUMERIC(10,2),
  lithology         VARCHAR(120),
  is_predicted      BOOLEAN       NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_formation_well ON well_formations (well_id, seq);
CREATE INDEX idx_formation_name ON well_formations (formation_name);

-- ── Real-time samples (eRTMAC) ────────────────────────────────
CREATE TABLE drilling_parameters (
  id               BIGSERIAL     NOT NULL PRIMARY KEY,
  well_id          UUID          NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  recorded_at      TIMESTAMPTZ   NOT NULL,
  hole_depth_ft    NUMERIC(10,2) NOT NULL,
  bit_depth_ft     NUMERIC(10,2) NOT NULL,
  rig_state        rig_state_enum NOT NULL,
  rop_ft_hr        NUMERIC(8,2),
  wob_klbs         NUMERIC(8,2),
  rpm              NUMERIC(6,1),
  torque_kftlb     NUMERIC(8,2),
  spp_psi          NUMERIC(8,1),
  flow_in_gpm      NUMERIC(8,1),
  flow_out_gpm     NUMERIC(8,1),
  pit_volume_bbl   NUMERIC(8,1),
  hook_load_klbs   NUMERIC(8,1),
  mud_weight_ppg   NUMERIC(6,2),
  ecd_ppg          NUMERIC(6,2),
  total_gas_units  NUMERIC(8,1)
);
CREATE INDEX idx_dp_well_time ON drilling_parameters (well_id, recorded_at);

-- ── Documents ─────────────────────────────────────────────────
CREATE TABLE documents (
  id                UUID          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id           UUID          REFERENCES wells(id) ON DELETE SET NULL,
  uploaded_by       UUID          REFERENCES users(id) ON DELETE SET NULL,
  document_type     doc_type_enum   NOT NULL DEFAULT 'other',
  title             VARCHAR(255)  NOT NULL,
  file_name         VARCHAR(255)  NOT NULL,
  file_path         VARCHAR(500),
  file_size_bytes   INTEGER,
  page_count        INTEGER,
  document_date     DATE,
  status            doc_status_enum NOT NULL DEFAULT 'uploaded',
  extraction_method VARCHAR(40),
  error_message     TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_doc_well   ON documents (well_id);
CREATE INDEX idx_doc_status ON documents (status);

-- ── Operational events ────────────────────────────────────────
CREATE TABLE operational_events (
  id                 UUID               NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id            UUID               NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  formation_name     VARCHAR(120),
  event_type         event_type_enum    NOT NULL,
  severity           severity_enum      NOT NULL DEFAULT 'medium',
  depth_md_ft        NUMERIC(10,2)      NOT NULL,
  depth_tvd_ft       NUMERIC(10,2),
  description        TEXT               NOT NULL,
  cause              TEXT,
  mitigation         TEXT,
  mitigation_key     VARCHAR(60),
  outcome            TEXT,
  outcome_rating     outcome_rating_enum,
  lessons_learned    TEXT,
  npt_hours          NUMERIC(8,2),
  occurred_at        DATE,
  source_document_id UUID               REFERENCES documents(id) ON DELETE SET NULL,
  source_page        INTEGER,
  verified           BOOLEAN            NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_event_well      ON operational_events (well_id, depth_md_ft);
CREATE INDEX idx_event_type      ON operational_events (event_type);
CREATE INDEX idx_event_formation ON operational_events (formation_name);

-- ── Casing / cement / mud programs ───────────────────────────
CREATE TABLE casing_sections (
  id              UUID             NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id         UUID             NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  casing_type     casing_type_enum NOT NULL,
  size_label      VARCHAR(20)      NOT NULL,
  outer_dia_in    NUMERIC(6,3)     NOT NULL,
  grade           VARCHAR(30),
  weight_lb_ft    NUMERIC(7,2),
  top_md_ft       NUMERIC(10,2)    NOT NULL DEFAULT 0,
  shoe_md_ft      NUMERIC(10,2)    NOT NULL
);
CREATE INDEX idx_casing_well ON casing_sections (well_id);

CREATE TABLE cement_jobs (
  id                 UUID               NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id            UUID               NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  casing_section_id  UUID               REFERENCES casing_sections(id) ON DELETE SET NULL,
  top_of_cement_ft   NUMERIC(10,2),
  slurry_density_ppg NUMERIC(6,2),
  returns_obtained   BOOLEAN,
  result             cement_result_enum,
  issues             TEXT
);
CREATE INDEX idx_cement_well ON cement_jobs (well_id);

CREATE TABLE mud_programs (
  id              UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id         UUID         NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  depth_from_ft   NUMERIC(10,2) NOT NULL,
  depth_to_ft     NUMERIC(10,2) NOT NULL,
  mud_type        VARCHAR(80)  NOT NULL,
  mud_weight_ppg  NUMERIC(6,2) NOT NULL,
  total_loss_bbl  NUMERIC(8,1)
);
CREATE INDEX idx_mud_well ON mud_programs (well_id, depth_from_ft);

-- ── Extraction queue ──────────────────────────────────────────
CREATE TABLE extraction_items (
  id               UUID             NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID             NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  item_type        item_type_enum   NOT NULL DEFAULT 'event',
  payload          JSONB            NOT NULL,
  confidence       NUMERIC(4,3)     NOT NULL DEFAULT 0.5,
  source_page      INTEGER,
  source_quote     TEXT,
  status           item_status_enum NOT NULL DEFAULT 'pending',
  created_event_id UUID,
  reviewed_by      UUID             REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_extract_doc ON extraction_items (document_id, status);

-- ── Knowledge chunks (PostgreSQL ↔ Qdrant link) ───────────────
CREATE TABLE knowledge_chunks (
  id              UUID              NOT NULL PRIMARY KEY,  -- also the Qdrant point id
  document_id     UUID              REFERENCES documents(id) ON DELETE CASCADE,
  event_id        UUID              REFERENCES operational_events(id) ON DELETE CASCADE,
  well_id         UUID              REFERENCES wells(id) ON DELETE SET NULL,
  source_type     chunk_source_enum NOT NULL,
  chunk_text      TEXT              NOT NULL,
  page            INTEGER,
  formation_name  VARCHAR(120),
  depth_ft        NUMERIC(10,2),
  event_type      VARCHAR(40),
  -- tsvector for full-text keyword search (replaces MySQL FULLTEXT)
  chunk_tsv       TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED,
  is_embedded     BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chunk_well     ON knowledge_chunks (well_id);
CREATE INDEX idx_chunk_embedded ON knowledge_chunks (is_embedded);
CREATE INDEX idx_chunk_tsv      ON knowledge_chunks USING GIN (chunk_tsv);

-- ── Alerts ────────────────────────────────────────────────────
CREATE TABLE alerts (
  id              UUID               NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id         UUID               NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  kind            alert_kind_enum    NOT NULL,
  risk_type       VARCHAR(40)        NOT NULL,
  severity        alert_severity_enum NOT NULL,
  probability     NUMERIC(5,4)       NOT NULL,
  bit_depth_ft    NUMERIC(10,2)      NOT NULL,
  zone_top_ft     NUMERIC(10,2),
  zone_base_ft    NUMERIC(10,2),
  formation_name  VARCHAR(120),
  title           VARCHAR(255)       NOT NULL,
  message         TEXT               NOT NULL,
  evidence        JSONB,
  recommendations JSONB,
  status          alert_status_enum  NOT NULL DEFAULT 'active',
  feedback        TEXT,
  acknowledged_by UUID               REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_alert_well ON alerts (well_id, status, created_at);
