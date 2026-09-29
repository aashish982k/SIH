/**
 * Drizzle ORM — NWIS PostgreSQL schema
 * Mirrors database/schema.sql exactly.
 * No PostGIS required — spatial queries use a Haversine formula in plain SQL.
 */
import {
  pgTable, pgEnum, uuid, varchar, text, boolean,
  timestamp, date, numeric, bigserial, integer,
  smallint, jsonb, index, unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Shared enums ────────────────────────────────────────────────────────────
export const roleEnum            = pgEnum('role_enum',           ['engineer', 'operator', 'administrator']);
export const wellTypeEnum        = pgEnum('well_type_enum',      ['exploratory', 'appraisal', 'development']);
export const profileEnum         = pgEnum('profile_enum',        ['vertical', 'deviated']);
export const wellStatusEnum      = pgEnum('well_status_enum',    ['drilling', 'completed', 'suspended', 'abandoned']);
export const rigStateEnum        = pgEnum('rig_state_enum',      ['drilling', 'connection', 'circulating', 'tripping', 'reaming']);
export const docTypeEnum         = pgEnum('doc_type_enum',       ['WCR', 'DDR', 'mud_log', 'completion_report', 'other']);
export const docStatusEnum       = pgEnum('doc_status_enum',     ['uploaded', 'processing', 'review', 'processed', 'failed']);
export const eventTypeEnum       = pgEnum('event_type_enum',     ['mud_loss', 'kick', 'stuck_pipe', 'tight_hole', 'overpressure', 'wellbore_instability', 'cementing_issue', 'fishing', 'other']);
export const severityEnum        = pgEnum('severity_enum',       ['low', 'medium', 'high', 'critical']);
export const casingTypeEnum      = pgEnum('casing_type_enum',    ['conductor', 'surface', 'intermediate', 'production', 'liner']);
export const cementResultEnum    = pgEnum('cement_result_enum',  ['good', 'acceptable', 'poor', 'failed']);
export const outcomeRatingEnum   = pgEnum('outcome_rating_enum', ['resolved', 'partial', 'failed']);
export const itemTypeEnum        = pgEnum('item_type_enum',      ['event', 'formation_top', 'casing']);
export const itemStatusEnum      = pgEnum('item_status_enum',    ['pending', 'confirmed', 'rejected']);
export const chunkSourceEnum     = pgEnum('chunk_source_enum',   ['document', 'event']);
export const alertKindEnum       = pgEnum('alert_kind_enum',     ['lookahead', 'live']);
export const alertSeverityEnum   = pgEnum('alert_severity_enum', ['low', 'medium', 'high', 'critical']);
export const alertStatusEnum     = pgEnum('alert_status_enum',   ['active', 'acknowledged', 'resolved', 'false_alarm']);

// ─── 1. USERS ────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:            uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name:          varchar('name', { length: 120 }).notNull(),
  email:         varchar('email', { length: 254 }).notNull(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role:          roleEnum('role').notNull().default('engineer'),
  is_active:     boolean('is_active').notNull().default(true),
  created_at:    timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at:    timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  uqEmail:  unique('users_email_uq').on(t.email),
  idxEmail: index('idx_users_email').on(t.email),
}));

// ─── 2. WELLS ────────────────────────────────────────────────────────────────
export const wells = pgTable('wells', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name:             varchar('name', { length: 120 }).notNull(),
  field_name:       varchar('field_name', { length: 120 }).notNull(),
  block:            varchar('block', { length: 80 }),
  pad:              varchar('pad', { length: 40 }),
  operator:         varchar('operator', { length: 120 }).notNull().default('Oil India Limited'),
  well_type:        wellTypeEnum('well_type').notNull().default('development'),
  profile:          profileEnum('profile').notNull().default('vertical'),
  // Stored as NUMERIC for plain Haversine math — no PostGIS required
  latitude:         numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude:        numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  kb_elevation_m:   numeric('kb_elevation_m', { precision: 8, scale: 2 }),
  total_depth_ft:   numeric('total_depth_ft', { precision: 10, scale: 2 }),
  planned_td_ft:    numeric('planned_td_ft', { precision: 10, scale: 2 }),
  current_depth_ft: numeric('current_depth_ft', { precision: 10, scale: 2 }),
  status:           wellStatusEnum('status').notNull().default('completed'),
  spud_date:        date('spud_date'),
  completion_date:  date('completion_date'),
  total_npt_hours:  numeric('total_npt_hours', { precision: 8, scale: 2 }).notNull().default('0'),
  created_at:       timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at:       timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  idxStatus: index('idx_wells_status').on(t.status),
  idxField:  index('idx_wells_field').on(t.field_name),
  idxLatLon: index('idx_wells_lat_lon').on(t.latitude, t.longitude),
}));

// ─── 3. WELL_SURVEYS ─────────────────────────────────────────────────────────
export const well_surveys = pgTable('well_surveys', {
  id:              bigserial('id', { mode: 'number' }).primaryKey(),
  well_id:         uuid('well_id').notNull().references(() => wells.id, { onDelete: 'cascade' }),
  md_ft:           numeric('md_ft', { precision: 10, scale: 2 }).notNull(),
  inclination_deg: numeric('inclination_deg', { precision: 6, scale: 3 }).notNull(),
  azimuth_deg:     numeric('azimuth_deg', { precision: 6, scale: 3 }).notNull(),
  tvd_ft:          numeric('tvd_ft', { precision: 10, scale: 2 }).notNull(),
  north_ft:        numeric('north_ft', { precision: 12, scale: 2 }).notNull(),
  east_ft:         numeric('east_ft', { precision: 12, scale: 2 }).notNull(),
}, (t) => ({
  idxWellMd: index('idx_survey_well_md').on(t.well_id, t.md_ft),
}));

// ─── 4. WELL_FORMATIONS ──────────────────────────────────────────────────────
export const well_formations = pgTable('well_formations', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  well_id:        uuid('well_id').notNull().references(() => wells.id, { onDelete: 'cascade' }),
  formation_name: varchar('formation_name', { length: 120 }).notNull(),
  seq:            smallint('seq').notNull(),
  top_md_ft:      numeric('top_md_ft', { precision: 10, scale: 2 }).notNull(),
  bottom_md_ft:   numeric('bottom_md_ft', { precision: 10, scale: 2 }),
  top_tvd_ft:     numeric('top_tvd_ft', { precision: 10, scale: 2 }).notNull(),
  bottom_tvd_ft:  numeric('bottom_tvd_ft', { precision: 10, scale: 2 }),
  lithology:      varchar('lithology', { length: 120 }),
  is_predicted:   boolean('is_predicted').notNull().default(false),
}, (t) => ({
  idxWellSeq: index('idx_formation_well').on(t.well_id, t.seq),
  idxName:    index('idx_formation_name').on(t.formation_name),
}));

// ─── 5. DRILLING_PARAMETERS ──────────────────────────────────────────────────
export const drilling_parameters = pgTable('drilling_parameters', {
  id:              bigserial('id', { mode: 'number' }).primaryKey(),
  well_id:         uuid('well_id').notNull().references(() => wells.id, { onDelete: 'cascade' }),
  recorded_at:     timestamp('recorded_at', { withTimezone: true }).notNull(),
  hole_depth_ft:   numeric('hole_depth_ft', { precision: 10, scale: 2 }).notNull(),
  bit_depth_ft:    numeric('bit_depth_ft', { precision: 10, scale: 2 }).notNull(),
  rig_state:       rigStateEnum('rig_state').notNull(),
  rop_ft_hr:       numeric('rop_ft_hr', { precision: 8, scale: 2 }),
  wob_klbs:        numeric('wob_klbs', { precision: 8, scale: 2 }),
  rpm:             numeric('rpm', { precision: 6, scale: 1 }),
  torque_kftlb:    numeric('torque_kftlb', { precision: 8, scale: 2 }),
  spp_psi:         numeric('spp_psi', { precision: 8, scale: 1 }),
  flow_in_gpm:     numeric('flow_in_gpm', { precision: 8, scale: 1 }),
  flow_out_gpm:    numeric('flow_out_gpm', { precision: 8, scale: 1 }),
  pit_volume_bbl:  numeric('pit_volume_bbl', { precision: 8, scale: 1 }),
  hook_load_klbs:  numeric('hook_load_klbs', { precision: 8, scale: 1 }),
  mud_weight_ppg:  numeric('mud_weight_ppg', { precision: 6, scale: 2 }),
  ecd_ppg:         numeric('ecd_ppg', { precision: 6, scale: 2 }),
  total_gas_units: numeric('total_gas_units', { precision: 8, scale: 1 }),
}, (t) => ({
  idxWellTime: index('idx_dp_well_time').on(t.well_id, t.recorded_at),
}));

// ─── 6. DOCUMENTS ────────────────────────────────────────────────────────────
export const documents = pgTable('documents', {
  id:                 uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  well_id:            uuid('well_id').references(() => wells.id, { onDelete: 'set null' }),
  uploaded_by:        uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  document_type:      docTypeEnum('document_type').notNull().default('other'),
  title:              varchar('title', { length: 255 }).notNull(),
  file_name:          varchar('file_name', { length: 255 }).notNull(),
  file_path:          varchar('file_path', { length: 500 }),
  file_size_bytes:    integer('file_size_bytes'),
  page_count:         integer('page_count'),
  document_date:      date('document_date'),
  status:             docStatusEnum('status').notNull().default('uploaded'),
  extraction_method:  varchar('extraction_method', { length: 40 }),
  error_message:      text('error_message'),
  created_at:         timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at:         timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  idxWell:   index('idx_doc_well').on(t.well_id),
  idxStatus: index('idx_doc_status').on(t.status),
}));

// ─── 7. OPERATIONAL_EVENTS ───────────────────────────────────────────────────
export const operational_events = pgTable('operational_events', {
  id:                 uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  well_id:            uuid('well_id').notNull().references(() => wells.id, { onDelete: 'cascade' }),
  formation_name:     varchar('formation_name', { length: 120 }),
  event_type:         eventTypeEnum('event_type').notNull(),
  severity:           severityEnum('severity').notNull().default('medium'),
  depth_md_ft:        numeric('depth_md_ft', { precision: 10, scale: 2 }).notNull(),
  depth_tvd_ft:       numeric('depth_tvd_ft', { precision: 10, scale: 2 }),
  description:        text('description').notNull(),
  cause:              text('cause'),
  mitigation:         text('mitigation'),
  mitigation_key:     varchar('mitigation_key', { length: 60 }),
  outcome:            text('outcome'),
  outcome_rating:     outcomeRatingEnum('outcome_rating'),
  lessons_learned:    text('lessons_learned'),
  npt_hours:          numeric('npt_hours', { precision: 8, scale: 2 }),
  occurred_at:        date('occurred_at'),
  source_document_id: uuid('source_document_id').references(() => documents.id, { onDelete: 'set null' }),
  source_page:        integer('source_page'),
  verified:           boolean('verified').notNull().default(true),
  created_at:         timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  idxWellDepth: index('idx_event_well').on(t.well_id, t.depth_md_ft),
  idxType:      index('idx_event_type').on(t.event_type),
  idxFormation: index('idx_event_formation').on(t.formation_name),
}));

// ─── 8. CASING_SECTIONS ──────────────────────────────────────────────────────
export const casing_sections = pgTable('casing_sections', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  well_id:      uuid('well_id').notNull().references(() => wells.id, { onDelete: 'cascade' }),
  casing_type:  casingTypeEnum('casing_type').notNull(),
  size_label:   varchar('size_label', { length: 20 }).notNull(),
  outer_dia_in: numeric('outer_dia_in', { precision: 6, scale: 3 }).notNull(),
  grade:        varchar('grade', { length: 30 }),
  weight_lb_ft: numeric('weight_lb_ft', { precision: 7, scale: 2 }),
  top_md_ft:    numeric('top_md_ft', { precision: 10, scale: 2 }).notNull().default('0'),
  shoe_md_ft:   numeric('shoe_md_ft', { precision: 10, scale: 2 }).notNull(),
}, (t) => ({
  idxWell: index('idx_casing_well').on(t.well_id),
}));

// ─── 9. CEMENT_JOBS ──────────────────────────────────────────────────────────
export const cement_jobs = pgTable('cement_jobs', {
  id:                 uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  well_id:            uuid('well_id').notNull().references(() => wells.id, { onDelete: 'cascade' }),
  casing_section_id:  uuid('casing_section_id').references(() => casing_sections.id, { onDelete: 'set null' }),
  top_of_cement_ft:   numeric('top_of_cement_ft', { precision: 10, scale: 2 }),
  slurry_density_ppg: numeric('slurry_density_ppg', { precision: 6, scale: 2 }),
  returns_obtained:   boolean('returns_obtained'),
  result:             cementResultEnum('result'),
  issues:             text('issues'),
}, (t) => ({
  idxWell: index('idx_cement_well').on(t.well_id),
}));

// ─── 10. MUD_PROGRAMS ────────────────────────────────────────────────────────
export const mud_programs = pgTable('mud_programs', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  well_id:        uuid('well_id').notNull().references(() => wells.id, { onDelete: 'cascade' }),
  depth_from_ft:  numeric('depth_from_ft', { precision: 10, scale: 2 }).notNull(),
  depth_to_ft:    numeric('depth_to_ft', { precision: 10, scale: 2 }).notNull(),
  mud_type:       varchar('mud_type', { length: 80 }).notNull(),
  mud_weight_ppg: numeric('mud_weight_ppg', { precision: 6, scale: 2 }).notNull(),
  total_loss_bbl: numeric('total_loss_bbl', { precision: 8, scale: 1 }),
}, (t) => ({
  idxWell: index('idx_mud_well').on(t.well_id, t.depth_from_ft),
}));

// ─── 11. EXTRACTION_ITEMS ────────────────────────────────────────────────────
export const extraction_items = pgTable('extraction_items', {
  id:               uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  document_id:      uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  item_type:        itemTypeEnum('item_type').notNull().default('event'),
  payload:          jsonb('payload').notNull(),
  confidence:       numeric('confidence', { precision: 4, scale: 3 }).notNull().default('0.5'),
  source_page:      integer('source_page'),
  source_quote:     text('source_quote'),
  status:           itemStatusEnum('status').notNull().default('pending'),
  created_event_id: uuid('created_event_id'),
  reviewed_by:      uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewed_at:      timestamp('reviewed_at', { withTimezone: true }),
  created_at:       timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  idxDocStatus: index('idx_extract_doc').on(t.document_id, t.status),
}));

// ─── 12. KNOWLEDGE_CHUNKS ────────────────────────────────────────────────────
export const knowledge_chunks = pgTable('knowledge_chunks', {
  id:             uuid('id').primaryKey(),  // also the Qdrant point id
  document_id:    uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  event_id:       uuid('event_id').references(() => operational_events.id, { onDelete: 'cascade' }),
  well_id:        uuid('well_id').references(() => wells.id, { onDelete: 'set null' }),
  source_type:    chunkSourceEnum('source_type').notNull(),
  chunk_text:     text('chunk_text').notNull(),
  page:           integer('page'),
  formation_name: varchar('formation_name', { length: 120 }),
  depth_ft:       numeric('depth_ft', { precision: 10, scale: 2 }),
  event_type:     varchar('event_type', { length: 40 }),
  // tsvector stored for full-text search; updated by trigger in schema.sql
  chunk_tsv:      text('chunk_tsv'), // populated via SQL trigger, read-only from ORM
  is_embedded:    boolean('is_embedded').notNull().default(false),
  created_at:     timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  idxWell:      index('idx_chunk_well').on(t.well_id),
  idxEmbedded:  index('idx_chunk_embedded').on(t.is_embedded),
}));

// ─── 13. ALERTS ──────────────────────────────────────────────────────────────
export const alerts = pgTable('alerts', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  well_id:         uuid('well_id').notNull().references(() => wells.id, { onDelete: 'cascade' }),
  kind:            alertKindEnum('kind').notNull(),
  risk_type:       varchar('risk_type', { length: 40 }).notNull(),
  severity:        alertSeverityEnum('severity').notNull(),
  probability:     numeric('probability', { precision: 5, scale: 4 }).notNull(),
  bit_depth_ft:    numeric('bit_depth_ft', { precision: 10, scale: 2 }).notNull(),
  zone_top_ft:     numeric('zone_top_ft', { precision: 10, scale: 2 }),
  zone_base_ft:    numeric('zone_base_ft', { precision: 10, scale: 2 }),
  formation_name:  varchar('formation_name', { length: 120 }),
  title:           varchar('title', { length: 255 }).notNull(),
  message:         text('message').notNull(),
  evidence:        jsonb('evidence'),
  recommendations: jsonb('recommendations'),
  status:          alertStatusEnum('status').notNull().default('active'),
  feedback:        text('feedback'),
  acknowledged_by: uuid('acknowledged_by').references(() => users.id, { onDelete: 'set null' }),
  acknowledged_at: timestamp('acknowledged_at', { withTimezone: true }),
  created_at:      timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updated_at:      timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  idxWellStatus: index('idx_alert_well').on(t.well_id, t.status, t.created_at),
}));

// ─── Type exports ─────────────────────────────────────────────────────────────
export type User              = typeof users.$inferSelect;
export type NewUser           = typeof users.$inferInsert;
export type Well              = typeof wells.$inferSelect;
export type NewWell           = typeof wells.$inferInsert;
export type OperationalEvent  = typeof operational_events.$inferSelect;
export type NewOperationalEvent = typeof operational_events.$inferInsert;
export type Document          = typeof documents.$inferSelect;
export type NewDocument       = typeof documents.$inferInsert;
export type KnowledgeChunk    = typeof knowledge_chunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledge_chunks.$inferInsert;
export type Alert             = typeof alerts.$inferSelect;
export type NewAlert          = typeof alerts.$inferInsert;
export type ExtractionItem    = typeof extraction_items.$inferSelect;
