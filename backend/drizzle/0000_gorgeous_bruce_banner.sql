CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"risk_id" uuid,
	"alert_type" varchar(60) NOT NULL,
	"severity" varchar DEFAULT 'medium' NOT NULL,
	"payload" json NOT NULL,
	"seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "casing_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"casing_type" varchar NOT NULL,
	"outer_dia_in" numeric(6, 3) NOT NULL,
	"grade" varchar(30),
	"weight_lb_ft" numeric(7, 3),
	"shoe_depth_ft" numeric(10, 2) NOT NULL,
	"top_depth_ft" numeric(10, 2) DEFAULT 0 NOT NULL,
	"set_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cement_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"casing_section_id" uuid,
	"job_type" varchar DEFAULT 'primary' NOT NULL,
	"top_of_cement_ft" numeric(10, 2),
	"cement_volume_bbls" numeric(10, 2),
	"slurry_density_ppg" numeric(6, 3),
	"displacement_vol_bbls" numeric(10, 2),
	"returns_obtained" boolean,
	"cbil_run" boolean DEFAULT false NOT NULL,
	"issues" text,
	"result" varchar,
	"job_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"document_type" varchar DEFAULT 'other' NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_size_bytes" bigint,
	"document_date" date,
	"description" text,
	"status" varchar DEFAULT 'uploaded' NOT NULL,
	"processing_checkpoint" varchar(80),
	"processing_error" text,
	"well_resolution" varchar(32),
	"resolved_well_name" varchar(120),
	"resolved_latitude" numeric(10, 7),
	"resolved_longitude" numeric(10, 7),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drilling_parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"depth_ft" numeric(10, 2) NOT NULL,
	"rop_ft_per_hr" numeric(8, 2),
	"wob_klbs" numeric(8, 2),
	"rpm" numeric(6, 1),
	"torque_kft_lbs" numeric(8, 2),
	"spp_psi" numeric(8, 2),
	"flow_rate_gpm" numeric(8, 2),
	"mud_weight_ppg" numeric(6, 3),
	"ecd_ppg" numeric(6, 3),
	"temperature_f" numeric(7, 2),
	"hook_load_klbs" numeric(8, 2),
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"field_name" varchar(64) NOT NULL,
	"filled_by" uuid NOT NULL,
	"filled_at" timestamp DEFAULT now() NOT NULL,
	"previous_value" text,
	"new_value" text NOT NULL,
	"reversed_at" timestamp,
	"reversed_by" uuid
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"event_id" uuid,
	"well_id" uuid,
	"qdrant_vector_id" uuid,
	"source_type" varchar NOT NULL,
	"chunk_text" text NOT NULL,
	"chunk_index" integer,
	"formation_name" varchar(120),
	"depth_ft" numeric(10, 2),
	"event_type" varchar(50),
	"severity" varchar(20),
	"is_embedded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qdrant_vector_id" UNIQUE("qdrant_vector_id")
);
--> statement-breakpoint
CREATE TABLE "mud_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"depth_from_ft" numeric(10, 2) NOT NULL,
	"depth_to_ft" numeric(10, 2),
	"mud_type" varchar(80) NOT NULL,
	"mud_weight_ppg" numeric(6, 3) NOT NULL,
	"viscosity_cp" numeric(8, 2),
	"ph_value" numeric(4, 2),
	"fluid_loss_cc" numeric(6, 2),
	"additives" text,
	"total_loss_bbls" numeric(8, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"formation_id" uuid,
	"event_type" varchar NOT NULL,
	"severity" varchar DEFAULT 'medium' NOT NULL,
	"start_depth_ft" numeric(10, 2) NOT NULL,
	"end_depth_ft" numeric(10, 2),
	"description" text NOT NULL,
	"cause" text,
	"impact" text,
	"mitigation" text,
	"lessons_learned" text,
	"outcome" text,
	"duration_hours" numeric(8, 2),
	"npt_hours" numeric(8, 2),
	"occurred_at" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"risk_id" uuid,
	"recommendation" text NOT NULL,
	"rationale" text,
	"source" varchar DEFAULT 'rule_engine' NOT NULL,
	"confidence" numeric(5, 4),
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"risk_type" varchar NOT NULL,
	"depth_ft" numeric(10, 2),
	"formation_name" varchar(120),
	"severity" varchar NOT NULL,
	"probability" numeric(5, 4),
	"confidence" numeric(5, 4),
	"message" text NOT NULL,
	"description" text,
	"source" varchar DEFAULT 'rule_engine' NOT NULL,
	"reasoning" text,
	"evidence" json,
	"recommendation" text,
	"related_well_ids" json,
	"status" varchar DEFAULT 'active' NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar DEFAULT 'engineer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "well_formations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"formation_name" varchar(120) NOT NULL,
	"top_depth_ft" numeric(10, 2) NOT NULL,
	"bottom_depth_ft" numeric(10, 2),
	"lithology" varchar(120),
	"pore_pressure_psi" numeric(10, 2),
	"fracture_gradient" numeric(6, 4),
	"reservoir_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "well_surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"well_id" uuid NOT NULL,
	"measured_depth_ft" numeric(10, 2) NOT NULL,
	"tvd_ft" numeric(10, 2),
	"inclination_deg" numeric(6, 3),
	"azimuth_deg" numeric(6, 3),
	"northing_ft" numeric(12, 3),
	"easting_ft" numeric(12, 3),
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"well_number" varchar(60),
	"field_name" varchar(120) NOT NULL,
	"block" varchar(80),
	"operator" varchar(120) DEFAULT 'Oil India Limited' NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"location_precision" varchar DEFAULT 'exact' NOT NULL,
	"created_by" uuid,
	"elevation_m" numeric(8, 2),
	"total_depth_ft" numeric(10, 2),
	"status" varchar DEFAULT 'active' NOT NULL,
	"spud_date" date,
	"completion_date" date,
	"primary_formation" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field_contributions" ADD CONSTRAINT "field_contributions_well_id_wells_id_fk" FOREIGN KEY ("well_id") REFERENCES "public"."wells"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_contributions" ADD CONSTRAINT "field_contributions_filled_by_users_id_fk" FOREIGN KEY ("filled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_contributions" ADD CONSTRAINT "field_contributions_reversed_by_users_id_fk" FOREIGN KEY ("reversed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wells" ADD CONSTRAINT "wells_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alert_well" ON "alerts" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_alert_type" ON "alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "idx_alert_seen" ON "alerts" USING btree ("seen_at");--> statement-breakpoint
CREATE INDEX "idx_alert_created" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_casing_well" ON "casing_sections" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_cement_well" ON "cement_jobs" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_doc_well" ON "documents" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_doc_user" ON "documents" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_doc_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dp_well" ON "drilling_parameters" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_dp_depth" ON "drilling_parameters" USING btree ("well_id","depth_ft");--> statement-breakpoint
CREATE INDEX "idx_dp_time" ON "drilling_parameters" USING btree ("well_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_field_contributions_well" ON "field_contributions" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_field_contributions_field" ON "field_contributions" USING btree ("well_id","field_name");--> statement-breakpoint
CREATE INDEX "idx_chunk_doc" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_chunk_event" ON "knowledge_chunks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_chunk_well" ON "knowledge_chunks" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_chunk_embedded" ON "knowledge_chunks" USING btree ("is_embedded");--> statement-breakpoint
CREATE INDEX "idx_chunk_source_type" ON "knowledge_chunks" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_mud_well" ON "mud_programs" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_mud_depth" ON "mud_programs" USING btree ("well_id","depth_from_ft");--> statement-breakpoint
CREATE INDEX "idx_event_well" ON "operational_events" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_event_type" ON "operational_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_event_severity" ON "operational_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_event_depth" ON "operational_events" USING btree ("well_id","start_depth_ft");--> statement-breakpoint
CREATE INDEX "idx_event_formation" ON "operational_events" USING btree ("formation_id");--> statement-breakpoint
CREATE INDEX "idx_rec_well" ON "recommendations" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_rec_risk" ON "recommendations" USING btree ("risk_id");--> statement-breakpoint
CREATE INDEX "idx_rec_status" ON "recommendations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_risk_well" ON "risks" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_risk_type" ON "risks" USING btree ("risk_type");--> statement-breakpoint
CREATE INDEX "idx_risk_status" ON "risks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_risk_severity" ON "risks" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_risk_created" ON "risks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_formation_well" ON "well_formations" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_formation_name" ON "well_formations" USING btree ("formation_name");--> statement-breakpoint
CREATE INDEX "idx_formation_depth" ON "well_formations" USING btree ("well_id","top_depth_ft");--> statement-breakpoint
CREATE INDEX "idx_survey_well" ON "well_surveys" USING btree ("well_id");--> statement-breakpoint
CREATE INDEX "idx_survey_depth" ON "well_surveys" USING btree ("well_id","measured_depth_ft");--> statement-breakpoint
CREATE INDEX "idx_wells_status" ON "wells" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wells_field" ON "wells" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "idx_wells_lat_lng" ON "wells" USING btree ("latitude","longitude");