CREATE TABLE "app"."public_rate_limits" (
	"business_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"identifier_hash" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"attempts" integer NOT NULL,
	CONSTRAINT "public_rate_limits_business_id_scope_identifier_hash_window_start_pk" PRIMARY KEY("business_id","scope","identifier_hash","window_start"),
	CONSTRAINT "public_rate_limits_scope_check" CHECK ("app"."public_rate_limits"."scope" in ('booking', 'lookup', 'cancel')),
	CONSTRAINT "public_rate_limits_identifier_check" CHECK ("app"."public_rate_limits"."identifier_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "public_rate_limits_attempts_check" CHECK ("app"."public_rate_limits"."attempts" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."public_rate_limits" ADD CONSTRAINT "public_rate_limits_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "app"."businesses"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON app.public_rate_limits TO turnow_runtime;
