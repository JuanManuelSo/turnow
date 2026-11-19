ALTER TABLE app.calendar_occupancies DROP CONSTRAINT calendar_occupancies_no_overlap;
--> statement-breakpoint
ALTER TABLE app.calendar_occupancies ADD CONSTRAINT calendar_occupancies_appointment_no_overlap
  EXCLUDE USING gist (
    business_id WITH =, professional_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (is_active AND kind = 'appointment');
--> statement-breakpoint
ALTER TABLE app.calendar_occupancies ADD CONSTRAINT calendar_occupancies_block_no_overlap
  EXCLUDE USING gist (
    business_id WITH =, professional_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (is_active AND kind = 'block');
