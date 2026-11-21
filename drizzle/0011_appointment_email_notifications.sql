CREATE TABLE "app"."appointment_email_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"resend_email_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_email_notifications_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "appointment_email_notifications_appointment_kind_unique" UNIQUE("business_id","appointment_id","kind"),
	CONSTRAINT "appointment_email_notifications_kind_check" CHECK ("app"."appointment_email_notifications"."kind" in ('confirmation', 'reminder')),
	CONSTRAINT "appointment_email_notifications_status_check" CHECK ("app"."appointment_email_notifications"."status" in ('pending', 'scheduled', 'sent', 'cancel_pending', 'cancelled', 'skipped')),
	CONSTRAINT "appointment_email_notifications_attempts_check" CHECK ("app"."appointment_email_notifications"."attempts" >= 0),
	CONSTRAINT "appointment_email_notifications_resend_id_check" CHECK ("app"."appointment_email_notifications"."status" <> 'scheduled' or "app"."appointment_email_notifications"."resend_email_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "app"."appointment_email_notifications" ADD CONSTRAINT "appointment_email_notifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointment_email_notifications" ADD CONSTRAINT "appointment_email_notifications_appointment_fk" FOREIGN KEY ("business_id","appointment_id") REFERENCES "app"."appointments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_email_notifications_queue_idx" ON "app"."appointment_email_notifications" USING btree ("status","scheduled_at");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON app.appointment_email_notifications TO turnow_runtime;
