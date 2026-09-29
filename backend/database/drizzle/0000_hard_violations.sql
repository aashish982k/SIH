CREATE TYPE "public"."alert_kind_enum" AS ENUM('lookahead', 'live');--> statement-breakpoint
CREATE TYPE "public"."alert_severity_enum" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_status_enum" AS ENUM('active', 'acknowledged', 'resolved', 'false_alarm');--> statement-breakpoint
CREATE TYPE "public"."casing_type_enum" AS ENUM('conductor', 'surface', 'intermediate', 'production', 'liner');--> statement-breakpoint
CREATE TYPE "public"."cement_result_enum" AS ENUM('good', 'acceptable', 'poor', 'failed');--> statement-breakpoint
CREATE TYPE "public"."chunk_source_enum" AS ENUM('document', 'event');--> statement-breakpoint
CREATE TYPE "public"."doc_status_enum" AS ENUM('uploaded', 'processing', 'review', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."doc_type_enum" AS ENUM('WCR', 'DDR', 'mud_log', 'completion_report', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_type_enum" AS ENUM('mud_loss', 'kick', 'stuck_pipe', 'tight_hole', 'overpressure', 'wellbore_instability', 'cementing_issue', 'fishing', 'other');--> statement-breakpoint
CREATE TYPE "public"."item_status_enum" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."item_type_enum" AS ENUM('event', 'formation_top', 'casing');--> statement-breakpoint
CREATE TYPE "public"."outcome_rating_enum" AS ENUM('resolved', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."profile_enum" AS ENUM('vertical', 'deviated');--> statement-breakpoint
CREATE TYPE "public"."rig_state_enum" AS ENUM('drilling', 'connection', 'circulating', 'tripping', 'reaming');--> statement-breakpoint
CREATE TYPE "public"."role_enum" AS ENUM('engineer', 'operator', 'administrator');--> statement-breakpoint
CREATE TYPE "public"."severity_enum" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."well_status_enum" AS ENUM('drilling', 'completed', 'suspended', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."well_type_enum" AS ENUM('exploratory', 'appraisal', 'development');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"kind" "alert_kind_enum" NOT NULL,
	"risk_type" varchar(40) NOT NULL,
	"severity" "alert_severity_enum" NOT NULL,
	"probability" numeric(5, 4) NOT NULL,
	"bit_depth_ft" numeric(10, 2) NOT NULL,
	"zone_top_ft" numeric(10, 2),
	"zone_base_ft" numeric(10, 2),
	"formation_name" varchar(120),
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"evidence" jsonb,
	"recommendations" jsonb,
	"status" "alert_status_enum" DEFAULT 'active' NOT NULL,
	"feedback" text,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casing_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"casing_type" "casing_type_enum" NOT NULL,
	"size_label" varchar(20) NOT NULL,
	"outer_dia_in" numeric(6, 3) NOT NULL,
	"grade" varchar(30),
	"weight_lb_ft" numeric(7, 2),
	"top_md_ft" numeric(10, 2) DEFAULT '0' NOT NULL,
	"shoe_md_ft" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cement_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"casing_section_id" uuid,
	"top_of_cement_ft" numeric(10, 2),
	"slurry_density_ppg" numeric(6, 2),
	"returns_obtained" boolean,
	"result" "cement_result_enum",
	"issues" text
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid,
	"uploaded_by" uuid,
	"document_type" "doc_type_enum" DEFAULT 'other' NOT NULL,
	"title" varchar(255) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500),
	"file_size_bytes" integer,
	"page_count" integer,
	"document_date" date,
	"status" "doc_status_enum" DEFAULT 'uploaded' NOT NULL,
	"extraction_method" varchar(40),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drilling_parameters" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"well_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"hole_depth_ft" numeric(10, 2) NOT NULL,
	"bit_depth_ft" numeric(10, 2) NOT NULL,
	"rig_state" "rig_state_enum" NOT NULL,
	"rop_ft_hr" numeric(8, 2),
	"wob_klbs" numeric(8, 2),
	"rpm" numeric(6, 1),
	"torque_kftlb" numeric(8, 2),
	"spp_psi" numeric(8, 1),
	"flow_in_gpm" numeric(8, 1),
	"flow_out_gpm" numeric(8, 1),
	"pit_volume_bbl" numeric(8, 1),
	"hook_load_klbs" numeric(8, 1),
	"mud_weight_ppg" numeric(6, 2),
	"ecd_ppg" numeric(6, 2),
	"total_gas_units" numeric(8, 1)
);
--> statement-breakpoint
CREATE TABLE "extraction_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"item_type" "item_type_enum" DEFAULT 'event' NOT NULL,
	"payload" jsonb NOT NULL,
	"confidence" numeric(4, 3) DEFAULT '0.5' NOT NULL,
	"source_page" integer,
	"source_quote" text,
	"status" "item_status_enum" DEFAULT 'pending' NOT NULL,
	"created_event_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"document_id" uuid,
	"event_id" uuid,
	"well_id" uuid,
	"source_type" "chunk_source_enum" NOT NULL,
	"chunk_text" text NOT NULL,
	"page" integer,
	"formation_name" varchar(120),
	"depth_ft" numeric(10, 2),
	"event_type" varchar(40),
	"chunk_tsv" text,
	"is_embedded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mud_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"depth_from_ft" numeric(10, 2) NOT NULL,
	"depth_to_ft" numeric(10, 2) NOT NULL,
	"mud_type" varchar(80) NOT NULL,
	"mud_weight_ppg" numeric(6, 2) NOT NULL,
	"total_loss_bbl" numeric(8, 1)
);
--> statement-breakpoint
CREATE TABLE "operational_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"formation_name" varchar(120),
	"event_type" "event_type_enum" NOT NULL,
	"severity" "severity_enum" DEFAULT 'medium' NOT NULL,
	"depth_md_ft" numeric(10, 2) NOT NULL,
	"depth_tvd_ft" numeric(10, 2),
	"description" text NOT NULL,
	"cause" text,
	"mitigation" text,
	"mitigation_key" varchar(60),
	"outcome" text,
	"outcome_rating" "outcome_rating_enum",
	"lessons_learned" text,
	"npt_hours" numeric(8, 2),
	"occurred_at" date,
	"source_document_id" uuid,
	"source_page" integer,
	"verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "role_enum" DEFAULT 'engineer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_uq" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "well_formations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"formation_name" varchar(120) NOT NULL,
	"seq" smallint NOT NULL,
	"top_md_ft" numeric(10, 2) NOT NULL,
	"bottom_md_ft" numeric(10, 2),
	"top_tvd_ft" numeric(10, 2) NOT NULL,
	"bottom_tvd_ft" numeric(10, 2),
	"lithology" varchar(120),
	"is_predicted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "well_surveys" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"well_id" uuid NOT NULL,
	"md_ft" numeric(10, 2) NOT NULL,
	"inclination_deg" numeric(6, 3) NOT NULL,
	"azimuth_deg" numeric(6, 3) NOT NULL,
	"tvd_ft" numeric(10, 2) NOT NULL,
	"north_ft" numeric(12, 2) NOT NULL,
	"east_ft" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"field_name" varchar(120) NOT NULL,
	"block" varchar(80),
	"pad" varchar(40),
	"operator" varchar(120) DEFAULT 'Oil India Limited' NOT NULL,
	"well_type" "well_type_enum" DEFAULT 'development' NOT NULL,
	"profile" "profile_enum" DEFAULT 'vertical' NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"kb_elevation_m" numeric(8, 2),
	"total_depth_ft" numeric(10, 2),
	"planned_td_ft" numeric(10, 2),
	"current_depth_ft" numeric(10, 2),
	"status" "well_status_enum" DEFAULT 'completed' NOT NULL,
	"spud_date" date,
	"completion_date" date,
	"total_npt_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "casing_sections" ADD CONSTRAINT "casing_sections_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cement_jobs" ADD CONSTRAINT "cement_jobs_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cement_jobs" ADD CONSTRAINT "cement_jobs_casing_section_id_casing_sections_id_fk" FOREIGN KEY ("casing_section_id") REFERENCES "public"."casing_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drilling_parameters" ADD CONSTRAINT "drilling_parameters_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_items" ADD CONSTRAINT "extraction_items_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_items" ADD CONSTRAINT "extraction_items_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_event_id_operational_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."operational_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mud_programs" ADD CONSTRAINT "mud_programs_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_events" ADD CONSTRAINT "operational_events_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_events" ADD CONSTRAINT "operational_events_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "well_formations" ADD CONSTRAINT "well_formations_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "well_surveys" ADD CONSTRAINT "well_surveys_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alert_well" ON "alerts" USING btree ("well_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_casing_well" ON "casing_sections" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_cement_well" ON "cement_jobs" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_doc_well" ON "documents" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_doc_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dp_well_time" ON "drilling_parameters" USING btree ("well_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_extract_doc" ON "extraction_items" USING btree ("document_id","status");--> statement-breakpoint
CREATE INDEX "idx_chunk_well" ON "knowledge_chunks" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_chunk_embedded" ON "knowledge_chunks" USING btree ("is_embedded");--> statement-breakpoint
CREATE INDEX "idx_mud_well" ON "mud_programs" USING btree ("well_id","depth_from_ft");--> statement-breakpoint
CREATE INDEX "idx_event_well" ON "operational_events" USING btree ("well_id","depth_md_ft");--> statement-breakpoint
CREATE INDEX "idx_event_type" ON "operational_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_event_formation" ON "operational_events" USING btree ("formation_name");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_formation_well" ON "well_formations" USING btree ("well_id","seq");--> statement-breakpoint
CREATE INDEX "idx_formation_name" ON "well_formations" USING btree ("formation_name");--> statement-breakpoint
CREATE INDEX "idx_survey_well_md" ON "well_surveys" USING btree ("well_id","md_ft");--> statement-breakpoint
CREATE INDEX "idx_wells_status" ON "wells" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wells_field" ON "wells" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "idx_wells_lat_lon" ON "wells" USING btree ("latitude","longitude");