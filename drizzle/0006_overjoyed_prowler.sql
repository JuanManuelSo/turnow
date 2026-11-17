CREATE TABLE "app"."appointment_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text NOT NULL,
	"method" text NOT NULL,
	"note" text,
	"corrected_payment_id" uuid,
	"recorded_by_user_id" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reversed_at" timestamp with time zone,
	"reversal_reason" text,
	CONSTRAINT "appointment_payments_business_id_unique" UNIQUE("business_id","id"),
	CONSTRAINT "appointment_payments_amount_check" CHECK ("app"."appointment_payments"."amount_minor" > 0),
	CONSTRAINT "appointment_payments_currency_check" CHECK ("app"."appointment_payments"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "appointment_payments_method_check" CHECK ("app"."appointment_payments"."method" in ('cash', 'transfer', 'card', 'other')),
	CONSTRAINT "appointment_payments_reversal_check" CHECK (("app"."appointment_payments"."reversed_at" is null) = ("app"."appointment_payments"."reversal_reason" is null)),
	CONSTRAINT "appointment_payments_note_check" CHECK ("app"."appointment_payments"."note" is null or length("app"."appointment_payments"."note") <= 500)
);
--> statement-breakpoint
ALTER TABLE "app"."appointment_payments" ADD CONSTRAINT "appointment_payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointment_payments" ADD CONSTRAINT "appointment_payments_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointment_payments" ADD CONSTRAINT "appointment_payments_appointment_fk" FOREIGN KEY ("business_id","appointment_id") REFERENCES "app"."appointments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."appointment_payments" ADD CONSTRAINT "appointment_payments_correction_fk" FOREIGN KEY ("business_id","corrected_payment_id") REFERENCES "app"."appointment_payments"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_payments_appointment_idx" ON "app"."appointment_payments" USING btree ("business_id","appointment_id","recorded_at");--> statement-breakpoint
CREATE INDEX "appointment_payments_actor_idx" ON "app"."appointment_payments" USING btree ("recorded_by_user_id");
--> statement-breakpoint
GRANT SELECT, INSERT ON app.appointment_payments TO turnow_runtime;
--> statement-breakpoint
GRANT UPDATE (reversed_at, reversal_reason) ON app.appointment_payments TO turnow_runtime;
