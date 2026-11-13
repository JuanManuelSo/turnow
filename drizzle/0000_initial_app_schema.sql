CREATE SCHEMA "app";
--> statement-breakpoint
CREATE TABLE "app"."appointment_access_codes" (
	"business_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"code_ciphertext" text NOT NULL,
	"encryption_key_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "appointment_access_codes_business_id_appointment_id_pk" PRIMARY KEY("business_id","appointment_id"),
	CONSTRAINT "appointment_access_codes_hash_unique" UNIQUE("business_id","code_hash"),
	CONSTRAINT "appointment_access_codes_hash_check" CHECK ("app"."appointment_access_codes"."code_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "appointment_access_codes_ciphertext_check" CHECK (length("app"."appointment_access_codes"."code_ciphertext") > 0 and "app"."appointment_access_codes"."encryption_key_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."appointment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_user_id" uuid,
	"appointment_version" integer NOT NULL,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_events_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "appointment_events_type_check" CHECK ("app"."appointment_events"."event_type" in ('created', 'cancelled', 'rescheduled', 'status_changed', 'corrected')),
	CONSTRAINT "appointment_events_actor_check" CHECK ("app"."appointment_events"."actor_type" in ('customer', 'owner', 'platform', 'system')),
	CONSTRAINT "appointment_events_version_check" CHECK ("app"."appointment_events"."appointment_version" > 0),
	CONSTRAINT "appointment_events_changes_check" CHECK (jsonb_typeof("app"."appointment_events"."changes") = 'object')
);
--> statement-breakpoint
CREATE TABLE "app"."appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"customer_id" uuid,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"source" text NOT NULL,
	"selection_mode" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"duration_minutes_snapshot" integer NOT NULL,
	"buffer_after_minutes_snapshot" integer NOT NULL,
	"price_minor_snapshot" integer,
	"currency_snapshot" text NOT NULL,
	"cancellation_notice_minutes_snapshot" integer NOT NULL,
	"timezone_snapshot" text NOT NULL,
	"service_name_snapshot" text NOT NULL,
	"professional_name_snapshot" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "appointments_professional_identity_unique" UNIQUE("business_id","id","professional_id"),
	CONSTRAINT "appointments_status_check" CHECK ("app"."appointments"."status" in ('confirmed', 'cancelled', 'attended', 'no_show')),
	CONSTRAINT "appointments_source_check" CHECK ("app"."appointments"."source" in ('public', 'manual')),
	CONSTRAINT "appointments_selection_check" CHECK ("app"."appointments"."selection_mode" in ('specific', 'any')),
	CONSTRAINT "appointments_duration_check" CHECK ("app"."appointments"."duration_minutes_snapshot" > 0 and "app"."appointments"."ends_at" - "app"."appointments"."starts_at" = "app"."appointments"."duration_minutes_snapshot" * interval '1 minute'),
	CONSTRAINT "appointments_snapshot_limits_check" CHECK ("app"."appointments"."buffer_after_minutes_snapshot" >= 0 and "app"."appointments"."cancellation_notice_minutes_snapshot" >= 0 and ("app"."appointments"."price_minor_snapshot" is null or "app"."appointments"."price_minor_snapshot" >= 0)),
	CONSTRAINT "appointments_currency_check" CHECK ("app"."appointments"."currency_snapshot" ~ '^[A-Z]{3}$'),
	CONSTRAINT "appointments_cancelled_at_check" CHECK (("app"."appointments"."status" = 'cancelled') = ("app"."appointments"."cancelled_at" is not null)),
	CONSTRAINT "appointments_version_check" CHECK ("app"."appointments"."version" > 0),
	CONSTRAINT "appointments_names_check" CHECK (length(trim("app"."appointments"."customer_name")) > 0 and length(trim("app"."appointments"."service_name_snapshot")) > 0 and length(trim("app"."appointments"."professional_name_snapshot")) > 0 and length(trim("app"."appointments"."timezone_snapshot")) > 0),
	CONSTRAINT "appointments_phone_check" CHECK ("app"."appointments"."customer_phone" ~ '^[+][1-9][0-9]{1,14}$')
);
--> statement-breakpoint
CREATE TABLE "app"."booking_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"appointment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_requests_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "booking_requests_key_unique" UNIQUE("business_id","idempotency_key"),
	CONSTRAINT "booking_requests_appointment_unique" UNIQUE("business_id","appointment_id"),
	CONSTRAINT "booking_requests_hash_check" CHECK ("app"."booking_requests"."request_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "app"."business_members" (
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_members_business_id_user_id_pk" PRIMARY KEY("business_id","user_id"),
	CONSTRAINT "business_members_role_check" CHECK ("app"."business_members"."role" = 'owner')
);
--> statement-breakpoint
CREATE TABLE "app"."business_pages" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"headline" text,
	"description" text,
	"address_text" text,
	"map_url" text,
	"contact_phone" text,
	"contact_email" text,
	"arrival_instructions" text,
	"logo_storage_path" text,
	"cover_storage_path" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"theme" jsonb NOT NULL,
	"visible_sections" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_pages_json_check" CHECK (jsonb_typeof("app"."business_pages"."social_links") = 'object' and jsonb_typeof("app"."business_pages"."theme") = 'object' and jsonb_typeof("app"."business_pages"."visible_sections") = 'object'),
	CONSTRAINT "business_pages_theme_version_check" CHECK ("app"."business_pages"."theme" @> '{"schema_version":1}'::jsonb),
	CONSTRAINT "business_pages_version_check" CHECK ("app"."business_pages"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."business_settings" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"slot_interval_minutes" integer NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"min_booking_notice_minutes" integer NOT NULL,
	"booking_horizon_days" integer NOT NULL,
	"cancellation_notice_minutes" integer NOT NULL,
	"allow_any_professional" boolean DEFAULT true NOT NULL,
	"public_booking_enabled" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_settings_interval_check" CHECK ("app"."business_settings"."slot_interval_minutes" > 0 and "app"."business_settings"."slot_interval_minutes" <= 1440),
	CONSTRAINT "business_settings_limits_check" CHECK ("app"."business_settings"."buffer_after_minutes" >= 0 and "app"."business_settings"."min_booking_notice_minutes" >= 0 and "app"."business_settings"."booking_horizon_days" > 0 and "app"."business_settings"."cancellation_notice_minutes" >= 0),
	CONSTRAINT "business_settings_version_check" CHECK ("app"."business_settings"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"timezone" text DEFAULT 'America/Argentina/Buenos_Aires' NOT NULL,
	"currency" text DEFAULT 'ARS' NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug"),
	CONSTRAINT "businesses_name_check" CHECK (length(trim("app"."businesses"."name")) > 0),
	CONSTRAINT "businesses_slug_check" CHECK ("app"."businesses"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "businesses_status_check" CHECK ("app"."businesses"."status" in ('draft', 'active', 'suspended', 'archived')),
	CONSTRAINT "businesses_currency_check" CHECK ("app"."businesses"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "businesses_timezone_check" CHECK (length(trim("app"."businesses"."timezone")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."calendar_occupancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"appointment_id" uuid,
	"kind" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"reason" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_occupancies_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "calendar_occupancies_appointment_unique" UNIQUE("business_id","appointment_id"),
	CONSTRAINT "calendar_occupancies_bounds_check" CHECK ("app"."calendar_occupancies"."starts_at" < "app"."calendar_occupancies"."ends_at"),
	CONSTRAINT "calendar_occupancies_kind_check" CHECK (("app"."calendar_occupancies"."kind" = 'appointment' and "app"."calendar_occupancies"."appointment_id" is not null) or ("app"."calendar_occupancies"."kind" = 'block' and "app"."calendar_occupancies"."appointment_id" is null))
);
--> statement-breakpoint
CREATE TABLE "app"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"phone_normalized" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "customers_name_check" CHECK (length(trim("app"."customers"."display_name")) > 0),
	CONSTRAINT "customers_phone_check" CHECK ("app"."customers"."phone_normalized" ~ '^[+][1-9][0-9]{1,14}$')
);
--> statement-breakpoint
CREATE TABLE "app"."exception_intervals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"exception_id" uuid NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exception_intervals_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "exception_intervals_bounds_check" CHECK ("app"."exception_intervals"."start_minute" >= 0 and "app"."exception_intervals"."start_minute" < "app"."exception_intervals"."end_minute" and "app"."exception_intervals"."end_minute" <= 1440)
);
--> statement-breakpoint
CREATE TABLE "app"."professional_services" (
	"business_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professional_services_business_id_professional_id_service_id_pk" PRIMARY KEY("business_id","professional_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "app"."professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"photo_storage_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "professionals_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "professionals_name_check" CHECK (length(trim("app"."professionals"."display_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "app"."schedule_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"local_date" date NOT NULL,
	"mode" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_exceptions_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "schedule_exceptions_date_unique" UNIQUE("business_id","schedule_id","local_date"),
	CONSTRAINT "schedule_exceptions_mode_check" CHECK ("app"."schedule_exceptions"."mode" in ('closed', 'custom'))
);
--> statement-breakpoint
CREATE TABLE "app"."schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"professional_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedules_business_id_unique" UNIQUE("business_id","id")
);
--> statement-breakpoint
CREATE TABLE "app"."services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"price_minor" integer,
	"show_price" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "services_name_check" CHECK (length(trim("app"."services"."name")) > 0),
	CONSTRAINT "services_duration_check" CHECK ("app"."services"."duration_minutes" > 0),
	CONSTRAINT "services_price_check" CHECK ("app"."services"."price_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "app"."weekly_intervals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_intervals_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "weekly_intervals_weekday_check" CHECK ("app"."weekly_intervals"."weekday" between 1 and 7),
	CONSTRAINT "weekly_intervals_bounds_check" CHECK ("app"."weekly_intervals"."start_minute" >= 0 and "app"."weekly_intervals"."start_minute" < "app"."weekly_intervals"."end_minute" and "app"."weekly_intervals"."end_minute" <= 1440)
);
--> statement-breakpoint
ALTER TABLE "app"."appointment_access_codes" ADD CONSTRAINT "appointment_access_codes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointment_access_codes" ADD CONSTRAINT "appointment_access_codes_appointment_fk" FOREIGN KEY ("business_id","appointment_id") REFERENCES "app"."appointments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointment_events" ADD CONSTRAINT "appointment_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointment_events" ADD CONSTRAINT "appointment_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointment_events" ADD CONSTRAINT "appointment_events_appointment_fk" FOREIGN KEY ("business_id","appointment_id") REFERENCES "app"."appointments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointments_assignment_fk" FOREIGN KEY ("business_id","professional_id","service_id") REFERENCES "app"."professional_services"("business_id","professional_id","service_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointments" ADD CONSTRAINT "appointments_customer_fk" FOREIGN KEY ("business_id","customer_id") REFERENCES "app"."customers"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."booking_requests" ADD CONSTRAINT "booking_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."booking_requests" ADD CONSTRAINT "booking_requests_appointment_fk" FOREIGN KEY ("business_id","appointment_id") REFERENCES "app"."appointments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."business_members" ADD CONSTRAINT "business_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."business_members" ADD CONSTRAINT "business_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."business_pages" ADD CONSTRAINT "business_pages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."business_settings" ADD CONSTRAINT "business_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."calendar_occupancies" ADD CONSTRAINT "calendar_occupancies_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."calendar_occupancies" ADD CONSTRAINT "calendar_occupancies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."calendar_occupancies" ADD CONSTRAINT "calendar_occupancies_professional_fk" FOREIGN KEY ("business_id","professional_id") REFERENCES "app"."professionals"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."calendar_occupancies" ADD CONSTRAINT "calendar_occupancies_appointment_fk" FOREIGN KEY ("business_id","appointment_id","professional_id") REFERENCES "app"."appointments"("business_id","id","professional_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "app"."customers" ADD CONSTRAINT "customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."exception_intervals" ADD CONSTRAINT "exception_intervals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."exception_intervals" ADD CONSTRAINT "exception_intervals_exception_fk" FOREIGN KEY ("business_id","exception_id") REFERENCES "app"."schedule_exceptions"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."professional_services" ADD CONSTRAINT "professional_services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."professional_services" ADD CONSTRAINT "professional_services_professional_fk" FOREIGN KEY ("business_id","professional_id") REFERENCES "app"."professionals"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."professional_services" ADD CONSTRAINT "professional_services_service_fk" FOREIGN KEY ("business_id","service_id") REFERENCES "app"."services"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."professionals" ADD CONSTRAINT "professionals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_schedule_fk" FOREIGN KEY ("business_id","schedule_id") REFERENCES "app"."schedules"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedules" ADD CONSTRAINT "schedules_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."schedules" ADD CONSTRAINT "schedules_professional_fk" FOREIGN KEY ("business_id","professional_id") REFERENCES "app"."professionals"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."services" ADD CONSTRAINT "services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."weekly_intervals" ADD CONSTRAINT "weekly_intervals_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."weekly_intervals" ADD CONSTRAINT "weekly_intervals_schedule_fk" FOREIGN KEY ("business_id","schedule_id") REFERENCES "app"."schedules"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_events_history_idx" ON "app"."appointment_events" USING btree ("business_id","appointment_id","created_at","id");--> statement-breakpoint
CREATE INDEX "appointment_events_actor_idx" ON "app"."appointment_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "appointments_agenda_idx" ON "app"."appointments" USING btree ("business_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_professional_agenda_idx" ON "app"."appointments" USING btree ("business_id","professional_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_customer_history_idx" ON "app"."appointments" USING btree ("business_id","customer_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_assignment_idx" ON "app"."appointments" USING btree ("business_id","professional_id","service_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_members_owner_unique" ON "app"."business_members" USING btree ("business_id") WHERE "app"."business_members"."role" = 'owner';--> statement-breakpoint
CREATE INDEX "business_members_user_idx" ON "app"."business_members" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE INDEX "calendar_occupancies_professional_idx" ON "app"."calendar_occupancies" USING btree ("business_id","professional_id");--> statement-breakpoint
CREATE INDEX "calendar_occupancies_creator_idx" ON "app"."calendar_occupancies" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "app"."customers" USING btree ("business_id","phone_normalized");--> statement-breakpoint
CREATE INDEX "exception_intervals_exception_idx" ON "app"."exception_intervals" USING btree ("business_id","exception_id");--> statement-breakpoint
CREATE INDEX "professional_services_service_idx" ON "app"."professional_services" USING btree ("business_id","service_id","is_active","professional_id");--> statement-breakpoint
CREATE INDEX "professionals_catalog_idx" ON "app"."professionals" USING btree ("business_id","is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "schedules_business_unique" ON "app"."schedules" USING btree ("business_id") WHERE "app"."schedules"."professional_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "schedules_professional_unique" ON "app"."schedules" USING btree ("business_id","professional_id") WHERE "app"."schedules"."professional_id" is not null;--> statement-breakpoint
CREATE INDEX "services_catalog_idx" ON "app"."services" USING btree ("business_id","is_active","sort_order");--> statement-breakpoint
CREATE INDEX "weekly_intervals_schedule_idx" ON "app"."weekly_intervals" USING btree ("business_id","schedule_id","weekday");