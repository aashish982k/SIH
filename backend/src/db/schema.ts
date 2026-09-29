/**
 * Drizzle ORM — Full NWIS schema
 * All 14 tables mirroring database/schema.sql.
 * Used by every service instead of raw mysql2 query strings.
 */
import {
  pgTable, uuid, varchar, text, boolean,
  timestamp, date, decimal, bigint, integer, json, index, unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── 1. USERS ────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id:            uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name:          varchar("name",       { length: 120 }).notNull(),
  email:         varchar("email",      { length: 254 }).notNull(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  role:          varchar("role", { enum: ["engineer","operator","administrator"] }).notNull().default("engineer"),
  is_active:     boolean("is_active").notNull().default(true),
  created_at:    timestamp("created_at").notNull().default(sql`now()`),
  updated_at:    timestamp("updated_at").notNull().default(sql`now()`),
}, (t) => ({
  idxEmail: index("idx_users_email").on(t.email),
  idxRole:  index("idx_users_role").on(t.role),
  uqEmail:  unique("email").on(t.email),
}));

// ─── 2. WELLS ────────────────────────────────────────────────────────────────
export const wells = pgTable("wells", {
  id:                uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name:              varchar("name",  { length: 120 }).notNull(),
  well_number:       varchar("well_number", { length: 60 }),
  field_name:        varchar("field_name",  { length: 120 }).notNull(),
  block:             varchar("block",  { length: 80 }),
  operator:          varchar("operator", { length: 120 }).notNull().default("Oil India Limited"),
  latitude:          decimal("latitude",  { precision: 10, scale: 7 }).notNull(),
  longitude:         decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  location_precision: varchar("location_precision", { enum: ["exact", "approximate"] }).notNull().default("exact"),
  created_by:        uuid("created_by").references(() => users.id),
  elevation_m:       decimal("elevation_m", { precision: 8, scale: 2 }),
  total_depth_ft:    decimal("total_depth_ft", { precision: 10, scale: 2 }),
  status:            varchar("status", { enum: ["active","suspended","completed","abandoned"] }).notNull().default("active"),
  spud_date:         date("spud_date", { mode: "date" }),
  completion_date:   date("completion_date", { mode: "date" }),
  primary_formation: varchar("primary_formation", { length: 120 }),
  created_at:        timestamp("created_at").notNull().default(sql`now()`),
  updated_at:        timestamp("updated_at").notNull().default(sql`now()`),
}, (t) => ({
  idxStatus:  index("idx_wells_status").on(t.status),
  idxField:   index("idx_wells_field").on(t.field_name),
  idxLatLng:  index("idx_wells_lat_lng").on(t.latitude, t.longitude),
}));

export const field_contributions = pgTable("field_contributions", {
  id:             uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:        uuid("well_id").notNull().references(() => wells.id, { onDelete: "cascade" }),
  field_name:     varchar("field_name", { length: 64 }).notNull(),
  filled_by:      uuid("filled_by").notNull().references(() => users.id),
  filled_at:      timestamp("filled_at").notNull().default(sql`now()`),
  previous_value: text("previous_value"),
  new_value:      text("new_value").notNull(),
  reversed_at:    timestamp("reversed_at"),
  reversed_by:    uuid("reversed_by").references(() => users.id),
}, (t) => ({
  idxWell: index("idx_field_contributions_well").on(t.well_id),
  idxField: index("idx_field_contributions_field").on(t.well_id, t.field_name),
}));

// ─── 3. WELL_SURVEYS ─────────────────────────────────────────────────────────
export const well_surveys = pgTable("well_surveys", {
  id:                uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:           uuid("well_id").notNull(),
  measured_depth_ft: decimal("measured_depth_ft", { precision: 10, scale: 2 }).notNull(),
  tvd_ft:            decimal("tvd_ft",            { precision: 10, scale: 2 }),
  inclination_deg:   decimal("inclination_deg",   { precision: 6, scale: 3 }),
  azimuth_deg:       decimal("azimuth_deg",        { precision: 6, scale: 3 }),
  northing_ft:       decimal("northing_ft",        { precision: 12, scale: 3 }),
  easting_ft:        decimal("easting_ft",         { precision: 12, scale: 3 }),
  recorded_at:       timestamp("recorded_at").notNull().default(sql`now()`),
}, (t) => ({
  idxWell:  index("idx_survey_well").on(t.well_id),
  idxDepth: index("idx_survey_depth").on(t.well_id, t.measured_depth_ft),
}));

// ─── 4. WELL_FORMATIONS ──────────────────────────────────────────────────────
export const well_formations = pgTable("well_formations", {
  id:               uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:          uuid("well_id").notNull(),
  formation_name:   varchar("formation_name", { length: 120 }).notNull(),
  top_depth_ft:     decimal("top_depth_ft",   { precision: 10, scale: 2 }).notNull(),
  bottom_depth_ft:  decimal("bottom_depth_ft",{ precision: 10, scale: 2 }),
  lithology:        varchar("lithology",      { length: 120 }),
  pore_pressure_psi:decimal("pore_pressure_psi", { precision: 10, scale: 2 }),
  fracture_gradient:decimal("fracture_gradient",  { precision: 6, scale: 4 }),
  reservoir_notes:  text("reservoir_notes"),
  created_at:       timestamp("created_at").notNull().default(sql`now()`),
}, (t) => ({
  idxWell:  index("idx_formation_well").on(t.well_id),
  idxName:  index("idx_formation_name").on(t.formation_name),
  idxDepth: index("idx_formation_depth").on(t.well_id, t.top_depth_ft),
}));

// ─── 5. DRILLING_PARAMETERS ──────────────────────────────────────────────────
export const drilling_parameters = pgTable("drilling_parameters", {
  id:             uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:        uuid("well_id").notNull(),
  depth_ft:       decimal("depth_ft",       { precision: 10, scale: 2 }).notNull(),
  rop_ft_per_hr:  decimal("rop_ft_per_hr",  { precision: 8, scale: 2 }),
  wob_klbs:       decimal("wob_klbs",       { precision: 8, scale: 2 }),
  rpm:            decimal("rpm",            { precision: 6, scale: 1 }),
  torque_kft_lbs: decimal("torque_kft_lbs",{ precision: 8, scale: 2 }),
  spp_psi:        decimal("spp_psi",        { precision: 8, scale: 2 }),
  flow_rate_gpm:  decimal("flow_rate_gpm",  { precision: 8, scale: 2 }),
  mud_weight_ppg: decimal("mud_weight_ppg", { precision: 6, scale: 3 }),
  ecd_ppg:        decimal("ecd_ppg",        { precision: 6, scale: 3 }),
  temperature_f:  decimal("temperature_f",  { precision: 7, scale: 2 }),
  hook_load_klbs: decimal("hook_load_klbs", { precision: 8, scale: 2 }),
  recorded_at:    timestamp("recorded_at").notNull().default(sql`now()`),
}, (t) => ({
  idxWell:  index("idx_dp_well").on(t.well_id),
  idxDepth: index("idx_dp_depth").on(t.well_id, t.depth_ft),
  idxTime:  index("idx_dp_time").on(t.well_id, t.recorded_at),
}));

// ─── 6. OPERATIONAL_EVENTS ───────────────────────────────────────────────────
export const operational_events = pgTable("operational_events", {
  id:              uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:         uuid("well_id").notNull(),
  formation_id:    uuid("formation_id"),
  event_type:      varchar("event_type", { enum: [
    "mud_loss","kick","stuck_pipe","fishing","npt",
    "torque_spike","pressure_anomaly","cementing_issue",
    "casing_issue","well_control","blowout","other",
  ] }).notNull(),
  severity:        varchar("severity", { enum: ["low","medium","high","critical"] }).notNull().default("medium"),
  start_depth_ft:  decimal("start_depth_ft", { precision: 10, scale: 2 }).notNull(),
  end_depth_ft:    decimal("end_depth_ft",   { precision: 10, scale: 2 }),
  description:     text("description").notNull(),
  cause:           text("cause"),
  impact:          text("impact"),
  mitigation:      text("mitigation"),
  lessons_learned: text("lessons_learned"),
  outcome:         text("outcome"),
  duration_hours:  decimal("duration_hours", { precision: 8, scale: 2 }),
  npt_hours:       decimal("npt_hours",      { precision: 8, scale: 2 }),
  occurred_at:     date("occurred_at", { mode: "date" }).notNull(),
  created_at:      timestamp("created_at").notNull().default(sql`now()`),
  updated_at:      timestamp("updated_at").notNull().default(sql`now()`),
}, (t) => ({
  idxWell:      index("idx_event_well").on(t.well_id),
  idxType:      index("idx_event_type").on(t.event_type),
  idxSeverity:  index("idx_event_severity").on(t.severity),
  idxDepth:     index("idx_event_depth").on(t.well_id, t.start_depth_ft),
  idxFormation: index("idx_event_formation").on(t.formation_id),
}));

// ─── 7. CASING_SECTIONS ──────────────────────────────────────────────────────
export const casing_sections = pgTable("casing_sections", {
  id:           uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:      uuid("well_id").notNull(),
  casing_type:  varchar("casing_type", { enum: ["conductor","surface","intermediate","production","liner"] }).notNull(),
  outer_dia_in: decimal("outer_dia_in",  { precision: 6, scale: 3 }).notNull(),
  grade:        varchar("grade",         { length: 30 }),
  weight_lb_ft: decimal("weight_lb_ft",  { precision: 7, scale: 3 }),
  shoe_depth_ft:decimal("shoe_depth_ft", { precision: 10, scale: 2 }).notNull(),
  top_depth_ft: decimal("top_depth_ft",  { precision: 10, scale: 2 }).notNull().default(sql`0`),
  set_date:     date("set_date", { mode: "date" }),
  notes:        text("notes"),
  created_at:   timestamp("created_at").notNull().default(sql`now()`),
}, (t) => ({ idxWell: index("idx_casing_well").on(t.well_id) }));

// ─── 8. CEMENT_JOBS ──────────────────────────────────────────────────────────
export const cement_jobs = pgTable("cement_jobs", {
  id:                    uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:               uuid("well_id").notNull(),
  casing_section_id:     uuid("casing_section_id"),
  job_type:              varchar("job_type", { enum: ["primary","remedial","plug"] }).notNull().default("primary"),
  top_of_cement_ft:      decimal("top_of_cement_ft",     { precision: 10, scale: 2 }),
  cement_volume_bbls:    decimal("cement_volume_bbls",    { precision: 10, scale: 2 }),
  slurry_density_ppg:    decimal("slurry_density_ppg",    { precision: 6, scale: 3 }),
  displacement_vol_bbls: decimal("displacement_vol_bbls", { precision: 10, scale: 2 }),
  returns_obtained:      boolean("returns_obtained"),
  cbil_run:              boolean("cbil_run").notNull().default(false),
  issues:                text("issues"),
  result:                varchar("result", { enum: ["good","acceptable","poor","failed"] }),
  job_date:              date("job_date", { mode: "date" }),
  created_at:            timestamp("created_at").notNull().default(sql`now()`),
}, (t) => ({ idxWell: index("idx_cement_well").on(t.well_id) }));

// ─── 9. MUD_PROGRAMS ─────────────────────────────────────────────────────────
export const mud_programs = pgTable("mud_programs", {
  id:             uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:        uuid("well_id").notNull(),
  depth_from_ft:  decimal("depth_from_ft",  { precision: 10, scale: 2 }).notNull(),
  depth_to_ft:    decimal("depth_to_ft",    { precision: 10, scale: 2 }),
  mud_type:       varchar("mud_type",       { length: 80 }).notNull(),
  mud_weight_ppg: decimal("mud_weight_ppg", { precision: 6, scale: 3 }).notNull(),
  viscosity_cp:   decimal("viscosity_cp",   { precision: 8, scale: 2 }),
  ph_value:       decimal("ph_value",       { precision: 4, scale: 2 }),
  fluid_loss_cc:  decimal("fluid_loss_cc",  { precision: 6, scale: 2 }),
  additives:      text("additives"),
  total_loss_bbls:decimal("total_loss_bbls",{ precision: 8, scale: 2 }),
  notes:          text("notes"),
  created_at:     timestamp("created_at").notNull().default(sql`now()`),
}, (t) => ({
  idxWell:  index("idx_mud_well").on(t.well_id),
  idxDepth: index("idx_mud_depth").on(t.well_id, t.depth_from_ft),
}));

// ─── 10. DOCUMENTS ───────────────────────────────────────────────────────────
export const documents = pgTable("documents", {
  id:              uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:         uuid("well_id"),
  uploaded_by:     uuid("uploaded_by").notNull(),
  document_type:   varchar("document_type", { enum: ["WCR","DDR","mud_log","completion_report","other"] }).notNull().default("other"),
  file_name:       varchar("file_name", { length: 255 }).notNull(),
  file_path:       varchar("file_path", { length: 500 }).notNull(),
  file_size_bytes: bigint("file_size_bytes", { mode: "number" }),
  document_date:   date("document_date", { mode: "date" }),
  description:     text("description"),
  status:          varchar("status", { enum: ["uploaded","processing","processed","failed"] }).notNull().default("uploaded"),
  processing_checkpoint: varchar("processing_checkpoint", { length: 80 }),
  processing_error: text("processing_error"),
  well_resolution: varchar("well_resolution", { length: 32 }),
  resolved_well_name: varchar("resolved_well_name", { length: 120 }),
  resolved_latitude: decimal("resolved_latitude", { precision: 10, scale: 7 }),
  resolved_longitude: decimal("resolved_longitude", { precision: 10, scale: 7 }),
  created_at:      timestamp("created_at").notNull().default(sql`now()`),
  updated_at:      timestamp("updated_at").notNull().default(sql`now()`),
}, (t) => ({
  idxWell:   index("idx_doc_well").on(t.well_id),
  idxUser:   index("idx_doc_user").on(t.uploaded_by),
  idxStatus: index("idx_doc_status").on(t.status),
}));

// ─── 11. KNOWLEDGE_CHUNKS ────────────────────────────────────────────────────
export const knowledge_chunks = pgTable("knowledge_chunks", {
  id:               uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  document_id:      uuid("document_id"),
  event_id:         uuid("event_id"),
  well_id:          uuid("well_id"),
  qdrant_vector_id: uuid("qdrant_vector_id"),
  source_type:      varchar("source_type", { enum: ["document","event","lesson","mitigation","formation"] }).notNull(),
  chunk_text:       text("chunk_text").notNull(),
  chunk_index:      integer("chunk_index"),
  formation_name:   varchar("formation_name", { length: 120 }),
  depth_ft:         decimal("depth_ft",  { precision: 10, scale: 2 }),
  event_type:       varchar("event_type",{ length: 50 }),
  severity:         varchar("severity",  { length: 20 }),
  is_embedded:      boolean("is_embedded").notNull().default(false),
  created_at:       timestamp("created_at").notNull().default(sql`now()`),
}, (t) => ({
  idxDoc:        index("idx_chunk_doc").on(t.document_id),
  idxEvent:      index("idx_chunk_event").on(t.event_id),
  idxWell:       index("idx_chunk_well").on(t.well_id),
  idxEmbedded:   index("idx_chunk_embedded").on(t.is_embedded),
  idxSourceType: index("idx_chunk_source_type").on(t.source_type),
  uqVectorId:    unique("qdrant_vector_id").on(t.qdrant_vector_id),
}));

// ─── 12. RISKS ───────────────────────────────────────────────────────────────
export const risks = pgTable("risks", {
  id:               uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:          uuid("well_id").notNull(),
  risk_type:        varchar("risk_type", { enum: [
    "mud_loss","stuck_pipe","kick","overpressure","torque_spike",
    "cementing_issue","casing_issue","well_control","other",
  ] }).notNull(),
  depth_ft:         decimal("depth_ft",  { precision: 10, scale: 2 }),
  formation_name:   varchar("formation_name", { length: 120 }),
  severity:         varchar("severity", { enum: ["low","medium","high","critical"] }).notNull(),
  probability:      decimal("probability", { precision: 5, scale: 4 }),
  confidence:       decimal("confidence",  { precision: 5, scale: 4 }),
  message:          text("message").notNull(),
  description:      text("description"),
  source:           varchar("source", { enum: ["rule_engine","ml_model","rag_llm","manual"] }).notNull().default("rule_engine"),
  reasoning:        text("reasoning"),
  evidence:         json("evidence"),
  recommendation:   text("recommendation"),
  related_well_ids: json("related_well_ids"),
  status:           varchar("status", { enum: ["active","resolved","dismissed"] }).notNull().default("active"),
  resolved_at:      timestamp("resolved_at"),
  created_at:       timestamp("created_at").notNull().default(sql`now()`),
}, (t) => ({
  idxWell:     index("idx_risk_well").on(t.well_id),
  idxType:     index("idx_risk_type").on(t.risk_type),
  idxStatus:   index("idx_risk_status").on(t.status),
  idxSeverity: index("idx_risk_severity").on(t.severity),
  idxCreated:  index("idx_risk_created").on(t.created_at),
}));

// ─── 13. RECOMMENDATIONS ─────────────────────────────────────────────────────
export const recommendations = pgTable("recommendations", {
  id:             uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:        uuid("well_id").notNull(),
  risk_id:        uuid("risk_id"),
  recommendation: text("recommendation").notNull(),
  rationale:      text("rationale"),
  source:         varchar("source", { enum: ["rule_engine","ml_model","knowledge_base","manual"] }).notNull().default("rule_engine"),
  confidence:     decimal("confidence", { precision: 5, scale: 4 }),
  priority:       varchar("priority", { enum: ["low","medium","high","critical"] }).notNull().default("medium"),
  status:         varchar("status", { enum: ["pending","applied","dismissed"] }).notNull().default("pending"),
  applied_at:     timestamp("applied_at"),
  created_at:     timestamp("created_at").notNull().default(sql`now()`),
}, (t) => ({
  idxWell:   index("idx_rec_well").on(t.well_id),
  idxRisk:   index("idx_rec_risk").on(t.risk_id),
  idxStatus: index("idx_rec_status").on(t.status),
}));

// ─── 14. ALERTS ──────────────────────────────────────────────────────────────
export const alerts = pgTable("alerts", {
  id:         uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  well_id:    uuid("well_id").notNull(),
  risk_id:    uuid("risk_id"),
  alert_type: varchar("alert_type", { length: 60 }).notNull(),
  severity:   varchar("severity", { enum: ["low","medium","high","critical"] }).notNull().default("medium"),
  payload:    json("payload").notNull(),
  seen_at:    timestamp("seen_at"),
  created_at: timestamp("created_at").notNull().default(sql`now()`),
}, (t) => ({
  idxWell:    index("idx_alert_well").on(t.well_id),
  idxType:    index("idx_alert_type").on(t.alert_type),
  idxSeen:    index("idx_alert_seen").on(t.seen_at),
  idxCreated: index("idx_alert_created").on(t.created_at),
}));

// ─── Type exports ─────────────────────────────────────────────────────────────
export type User               = typeof users.$inferSelect;
export type NewUser            = typeof users.$inferInsert;
export type Well               = typeof wells.$inferSelect;
export type NewWell            = typeof wells.$inferInsert;
export type OperationalEvent   = typeof operational_events.$inferSelect;
export type NewOperationalEvent= typeof operational_events.$inferInsert;
export type Document           = typeof documents.$inferSelect;
export type NewDocument        = typeof documents.$inferInsert;
export type KnowledgeChunk     = typeof knowledge_chunks.$inferSelect;
export type NewKnowledgeChunk  = typeof knowledge_chunks.$inferInsert;
export type Risk               = typeof risks.$inferSelect;
export type NewRisk            = typeof risks.$inferInsert;
export type Recommendation     = typeof recommendations.$inferSelect;
export type NewRecommendation  = typeof recommendations.$inferInsert;
export type Alert              = typeof alerts.$inferSelect;
export type NewAlert           = typeof alerts.$inferInsert;
