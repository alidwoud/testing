CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_code" text NOT NULL,
	"action" text NOT NULL,
	"performed_by" text NOT NULL,
	"performed_by_name" text NOT NULL,
	"performed_by_role" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cables" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"cable_id" text NOT NULL,
	"from_equipment_id" integer,
	"from_equipment_code" text NOT NULL,
	"to_equipment_id" integer,
	"to_equipment_code" text NOT NULL,
	"location_id" integer,
	"system" text NOT NULL,
	"cable_type" text NOT NULL,
	"cable_size" text NOT NULL,
	"core_count" integer DEFAULT 4 NOT NULL,
	"length" double precision,
	"responsible_company" text NOT NULL,
	"installation_status" text DEFAULT 'Not Installed' NOT NULL,
	"termination_status" text DEFAULT 'Not Terminated' NOT NULL,
	"testing_status" text DEFAULT 'Not Tested' NOT NULL,
	"qa_status" text DEFAULT 'Not Started' NOT NULL,
	"installation_date" text,
	"test_date" text,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"role" text NOT NULL,
	"contact_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drawings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"drawing_number" text NOT NULL,
	"title" text NOT NULL,
	"discipline" text NOT NULL,
	"revision" text DEFAULT 'Rev A' NOT NULL,
	"status" text DEFAULT 'Issued for Construction' NOT NULL,
	"scale" text DEFAULT '1:100',
	"location_id" integer,
	"level_name" text,
	"file_url" text,
	"svg_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"equipment_code" text NOT NULL,
	"equipment_name" text NOT NULL,
	"equipment_type" text NOT NULL,
	"system" text NOT NULL,
	"manufacturer" text,
	"model" text,
	"serial_number" text,
	"responsible_company" text NOT NULL,
	"status" text DEFAULT 'Installed' NOT NULL,
	"description" text,
	"qr_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"issue_number" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"location_id" integer,
	"equipment_id" integer,
	"cable_id" integer,
	"itr_instance_id" integer,
	"assigned_person" text,
	"assigned_company" text,
	"raised_by" text NOT NULL,
	"raised_by_name" text NOT NULL,
	"due_date" text,
	"photo_url" text,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itr_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"itr_number" text NOT NULL,
	"template_id" integer NOT NULL,
	"template_title" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"target_code" text NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"auto_populated_data" text NOT NULL,
	"formData" text NOT NULL,
	"assigned_to" text,
	"assigned_company" text,
	"submitted_by" text,
	"submitted_by_name" text,
	"submitted_at" timestamp,
	"reviewed_by" text,
	"reviewed_by_name" text,
	"reviewed_at" timestamp,
	"approval_notes" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itr_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"discipline" text NOT NULL,
	"target_type" text DEFAULT 'Cable' NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"schema_definition" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"parent_id" integer,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"path" text NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"caption" text,
	"category" text NOT NULL,
	"photo_url" text NOT NULL,
	"thumbnail_url" text,
	"taken_by" text NOT NULL,
	"taken_by_name" text NOT NULL,
	"taken_at" timestamp DEFAULT now() NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"entity_code" text,
	"location_id" integer,
	"spatial_pin_id" integer,
	"gps_coords" text,
	"qa_verified" text DEFAULT 'false',
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_uid" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"client_name" text,
	"location" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spatial_pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"drawing_id" integer NOT NULL,
	"location_id" integer,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_code" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"color" text,
	"notes" text,
	"created_by_id" text,
	"created_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"itr_instance_id" integer,
	"cable_id" integer,
	"equipment_id" integer,
	"test_type" text NOT NULL,
	"phase" text NOT NULL,
	"reading" double precision NOT NULL,
	"unit" text NOT NULL,
	"test_voltage" text,
	"result" text NOT NULL,
	"tested_by" text NOT NULL,
	"test_date" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'Supervisor' NOT NULL,
	"company_id" integer,
	"company_name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "workforce_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"date" text NOT NULL,
	"shift" text DEFAULT 'Day Shift' NOT NULL,
	"start_time" text DEFAULT '07:00' NOT NULL,
	"end_time" text DEFAULT '15:30' NOT NULL,
	"zone_id" integer NOT NULL,
	"workstream_id" integer NOT NULL,
	"crew_id" integer,
	"supervisor_name" text,
	"status" text DEFAULT 'Draft' NOT NULL,
	"is_override" boolean DEFAULT false NOT NULL,
	"override_reason" text,
	"override_by" text,
	"notes" text,
	"actual_attendance" text,
	"actual_zone_id" integer,
	"actual_workstream_id" integer,
	"actual_crew_id" integer,
	"actual_start_time" text,
	"actual_end_time" text,
	"actual_hours" text,
	"actual_notes" text,
	"actual_recorded_by" text,
	"actual_recorded_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "workforce_crew_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"crew_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"role_in_crew" text DEFAULT 'Member' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_crews" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"supervisor_id" integer,
	"supervisor_name" text,
	"default_workstream_id" integer,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_day_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"published_at" timestamp,
	"published_by" text,
	"locked_at" timestamp,
	"locked_by" text,
	"unlock_reason" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_people" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"display_name" text NOT NULL,
	"company_id" integer,
	"company_name" text NOT NULL,
	"employment_type" text DEFAULT 'Direct' NOT NULL,
	"trade_role" text NOT NULL,
	"classification" text,
	"phone" text,
	"work_email" text,
	"employment_status" text DEFAULT 'Active' NOT NULL,
	"start_date" text,
	"end_date" text,
	"default_crew_id" integer,
	"default_supervisor_name" text,
	"user_id" text,
	"profile_photo" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workforce_people_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "workforce_project_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "workforce_qualification_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"default_validity_months" integer,
	"requires_document" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "workforce_qualification_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "workforce_qualifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"type_id" integer NOT NULL,
	"type_code" text NOT NULL,
	"type_name" text NOT NULL,
	"licence_number" text NOT NULL,
	"issuing_authority" text NOT NULL,
	"jurisdiction" text DEFAULT 'VIC' NOT NULL,
	"issue_date" text NOT NULL,
	"expiry_date" text,
	"no_expiry" boolean DEFAULT false NOT NULL,
	"document_front_url" text,
	"document_back_url" text,
	"verification_status" text DEFAULT 'Pending Verification' NOT NULL,
	"verified_by" text,
	"verified_by_name" text,
	"verified_at" timestamp,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"previous_record_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_renewals" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"qualification_id" integer,
	"qualification_type_code" text NOT NULL,
	"qualification_type_name" text NOT NULL,
	"status" text DEFAULT 'Booking Requested' NOT NULL,
	"training_provider" text,
	"booking_date" text,
	"booking_time" text,
	"location" text,
	"booking_reference" text,
	"booked_by" text,
	"cost" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_role_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"trade_role" text NOT NULL,
	"qualification_type_code" text NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"project_id" integer
);
--> statement-breakpoint
CREATE TABLE "workforce_training_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"attendance_status" text DEFAULT 'Scheduled' NOT NULL,
	"certificate_status" text DEFAULT 'Awaiting Certificate' NOT NULL,
	"evidence_url" text,
	"verified_at" timestamp,
	"verified_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_training_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"booking_url" text NOT NULL,
	"courses_offered" text,
	"contact_name" text,
	"phone" text,
	"email" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_training_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"course_name" text NOT NULL,
	"qualification_type_code" text NOT NULL,
	"provider_id" integer,
	"provider_name" text NOT NULL,
	"booking_url" text,
	"session_date" text NOT NULL,
	"start_time" text DEFAULT '07:00' NOT NULL,
	"end_time" text DEFAULT '11:00' NOT NULL,
	"location" text NOT NULL,
	"booking_reference" text,
	"status" text DEFAULT 'Booked' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_workstreams" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"zone_id" integer,
	"location_id" integer,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_supervisor" text,
	"default_crew_id" integer,
	"color" text DEFAULT '#f59e0b' NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workforce_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"location_id" integer,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sequence" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cables" ADD CONSTRAINT "cables_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cables" ADD CONSTRAINT "cables_from_equipment_id_equipment_id_fk" FOREIGN KEY ("from_equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cables" ADD CONSTRAINT "cables_to_equipment_id_equipment_id_fk" FOREIGN KEY ("to_equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cables" ADD CONSTRAINT "cables_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawings" ADD CONSTRAINT "drawings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawings" ADD CONSTRAINT "drawings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_cable_id_cables_id_fk" FOREIGN KEY ("cable_id") REFERENCES "public"."cables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_itr_instance_id_itr_instances_id_fk" FOREIGN KEY ("itr_instance_id") REFERENCES "public"."itr_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itr_instances" ADD CONSTRAINT "itr_instances_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itr_instances" ADD CONSTRAINT "itr_instances_template_id_itr_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."itr_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itr_templates" ADD CONSTRAINT "itr_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_evidence" ADD CONSTRAINT "photo_evidence_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_evidence" ADD CONSTRAINT "photo_evidence_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_evidence" ADD CONSTRAINT "photo_evidence_spatial_pin_id_spatial_pins_id_fk" FOREIGN KEY ("spatial_pin_id") REFERENCES "public"."spatial_pins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spatial_pins" ADD CONSTRAINT "spatial_pins_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spatial_pins" ADD CONSTRAINT "spatial_pins_drawing_id_drawings_id_fk" FOREIGN KEY ("drawing_id") REFERENCES "public"."drawings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spatial_pins" ADD CONSTRAINT "spatial_pins_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_readings" ADD CONSTRAINT "test_readings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_readings" ADD CONSTRAINT "test_readings_itr_instance_id_itr_instances_id_fk" FOREIGN KEY ("itr_instance_id") REFERENCES "public"."itr_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_readings" ADD CONSTRAINT "test_readings_cable_id_cables_id_fk" FOREIGN KEY ("cable_id") REFERENCES "public"."cables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_readings" ADD CONSTRAINT "test_readings_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_allocations" ADD CONSTRAINT "workforce_allocations_person_id_workforce_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."workforce_people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_allocations" ADD CONSTRAINT "workforce_allocations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_allocations" ADD CONSTRAINT "workforce_allocations_zone_id_workforce_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."workforce_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_allocations" ADD CONSTRAINT "workforce_allocations_workstream_id_workforce_workstreams_id_fk" FOREIGN KEY ("workstream_id") REFERENCES "public"."workforce_workstreams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_allocations" ADD CONSTRAINT "workforce_allocations_crew_id_workforce_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."workforce_crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_allocations" ADD CONSTRAINT "workforce_allocations_actual_zone_id_workforce_zones_id_fk" FOREIGN KEY ("actual_zone_id") REFERENCES "public"."workforce_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_allocations" ADD CONSTRAINT "workforce_allocations_actual_workstream_id_workforce_workstreams_id_fk" FOREIGN KEY ("actual_workstream_id") REFERENCES "public"."workforce_workstreams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_allocations" ADD CONSTRAINT "workforce_allocations_actual_crew_id_workforce_crews_id_fk" FOREIGN KEY ("actual_crew_id") REFERENCES "public"."workforce_crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_crew_members" ADD CONSTRAINT "workforce_crew_members_crew_id_workforce_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."workforce_crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_crew_members" ADD CONSTRAINT "workforce_crew_members_person_id_workforce_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."workforce_people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_crews" ADD CONSTRAINT "workforce_crews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_crews" ADD CONSTRAINT "workforce_crews_supervisor_id_workforce_people_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."workforce_people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_crews" ADD CONSTRAINT "workforce_crews_default_workstream_id_workforce_workstreams_id_fk" FOREIGN KEY ("default_workstream_id") REFERENCES "public"."workforce_workstreams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_day_states" ADD CONSTRAINT "workforce_day_states_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_people" ADD CONSTRAINT "workforce_people_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_project_memberships" ADD CONSTRAINT "workforce_project_memberships_person_id_workforce_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."workforce_people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_project_memberships" ADD CONSTRAINT "workforce_project_memberships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_qualifications" ADD CONSTRAINT "workforce_qualifications_person_id_workforce_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."workforce_people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_qualifications" ADD CONSTRAINT "workforce_qualifications_type_id_workforce_qualification_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."workforce_qualification_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_renewals" ADD CONSTRAINT "workforce_renewals_person_id_workforce_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."workforce_people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_renewals" ADD CONSTRAINT "workforce_renewals_qualification_id_workforce_qualifications_id_fk" FOREIGN KEY ("qualification_id") REFERENCES "public"."workforce_qualifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_role_requirements" ADD CONSTRAINT "workforce_role_requirements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_training_attendees" ADD CONSTRAINT "workforce_training_attendees_session_id_workforce_training_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workforce_training_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_training_attendees" ADD CONSTRAINT "workforce_training_attendees_person_id_workforce_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."workforce_people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_training_sessions" ADD CONSTRAINT "workforce_training_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_training_sessions" ADD CONSTRAINT "workforce_training_sessions_provider_id_workforce_training_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."workforce_training_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_workstreams" ADD CONSTRAINT "workforce_workstreams_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_workstreams" ADD CONSTRAINT "workforce_workstreams_zone_id_workforce_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."workforce_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_workstreams" ADD CONSTRAINT "workforce_workstreams_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_zones" ADD CONSTRAINT "workforce_zones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workforce_zones" ADD CONSTRAINT "workforce_zones_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_project_id" ON "audit_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_cables_project_id" ON "cables" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_cables_cable_id" ON "cables" USING btree ("cable_id");--> statement-breakpoint
CREATE INDEX "idx_cables_location_id" ON "cables" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_cables_from_eq" ON "cables" USING btree ("from_equipment_id");--> statement-breakpoint
CREATE INDEX "idx_cables_to_eq" ON "cables" USING btree ("to_equipment_id");--> statement-breakpoint
CREATE INDEX "idx_cables_qa_status" ON "cables" USING btree ("qa_status");--> statement-breakpoint
CREATE INDEX "idx_cables_install_status" ON "cables" USING btree ("installation_status");--> statement-breakpoint
CREATE INDEX "idx_cables_testing_status" ON "cables" USING btree ("testing_status");--> statement-breakpoint
CREATE INDEX "idx_drawings_project_id" ON "drawings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_drawings_number" ON "drawings" USING btree ("drawing_number");--> statement-breakpoint
CREATE INDEX "idx_drawings_location_id" ON "drawings" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_equipment_project_id" ON "equipment" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_equipment_code" ON "equipment" USING btree ("equipment_code");--> statement-breakpoint
CREATE INDEX "idx_equipment_location_id" ON "equipment" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_issues_project_id" ON "issues" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_issues_status" ON "issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_itr_instances_project_id" ON "itr_instances" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_itr_instances_status" ON "itr_instances" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_itr_instances_target" ON "itr_instances" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_itr_instances_target_code" ON "itr_instances" USING btree ("target_code");--> statement-breakpoint
CREATE INDEX "idx_itr_templates_project_id" ON "itr_templates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_itr_templates_code" ON "itr_templates" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_locations_project_id" ON "locations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_locations_parent_id" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_photo_evidence_project_id" ON "photo_evidence" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_photo_evidence_entity" ON "photo_evidence" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_photo_evidence_category" ON "photo_evidence" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_project_members_project_id" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_members_user_uid" ON "project_members" USING btree ("user_uid");--> statement-breakpoint
CREATE INDEX "idx_spatial_pins_project_id" ON "spatial_pins" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_spatial_pins_drawing_id" ON "spatial_pins" USING btree ("drawing_id");--> statement-breakpoint
CREATE INDEX "idx_spatial_pins_entity" ON "spatial_pins" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_test_readings_project_id" ON "test_readings" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_test_readings_cable_id" ON "test_readings" USING btree ("cable_id");--> statement-breakpoint
CREATE INDEX "idx_test_readings_equipment_id" ON "test_readings" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "idx_wf_alloc_person_date" ON "workforce_allocations" USING btree ("person_id","date");--> statement-breakpoint
CREATE INDEX "idx_wf_alloc_project_date" ON "workforce_allocations" USING btree ("project_id","date");--> statement-breakpoint
CREATE INDEX "idx_wf_alloc_zone" ON "workforce_allocations" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "idx_wf_alloc_workstream" ON "workforce_allocations" USING btree ("workstream_id");--> statement-breakpoint
CREATE INDEX "idx_wf_crew_members_crew" ON "workforce_crew_members" USING btree ("crew_id");--> statement-breakpoint
CREATE INDEX "idx_wf_crew_members_person" ON "workforce_crew_members" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_wf_crews_project" ON "workforce_crews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_wf_day_state_proj_date" ON "workforce_day_states" USING btree ("project_id","date");--> statement-breakpoint
CREATE INDEX "idx_workforce_people_emp_id" ON "workforce_people" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_workforce_people_trade_role" ON "workforce_people" USING btree ("trade_role");--> statement-breakpoint
CREATE INDEX "idx_workforce_people_status" ON "workforce_people" USING btree ("employment_status");--> statement-breakpoint
CREATE INDEX "idx_workforce_people_company" ON "workforce_people" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "idx_wf_proj_member_person" ON "workforce_project_memberships" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_wf_proj_member_project" ON "workforce_project_memberships" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_wf_quals_person" ON "workforce_qualifications" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_wf_quals_type" ON "workforce_qualifications" USING btree ("type_code");--> statement-breakpoint
CREATE INDEX "idx_wf_quals_status" ON "workforce_qualifications" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_wf_quals_expiry" ON "workforce_qualifications" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "idx_wf_renewals_person" ON "workforce_renewals" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_wf_renewals_status" ON "workforce_renewals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wf_role_req_trade" ON "workforce_role_requirements" USING btree ("trade_role");--> statement-breakpoint
CREATE INDEX "idx_wf_training_att_sess" ON "workforce_training_attendees" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_wf_training_att_person" ON "workforce_training_attendees" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "idx_wf_training_sess_date" ON "workforce_training_sessions" USING btree ("session_date");--> statement-breakpoint
CREATE INDEX "idx_wf_training_sess_status" ON "workforce_training_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wf_workstreams_project" ON "workforce_workstreams" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_wf_workstreams_zone" ON "workforce_workstreams" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "idx_wf_zones_project" ON "workforce_zones" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_wf_zones_location" ON "workforce_zones" USING btree ("location_id");