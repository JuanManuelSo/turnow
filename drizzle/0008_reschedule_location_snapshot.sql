CREATE OR REPLACE FUNCTION app.protect_appointment_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF ROW(NEW.business_id, NEW.service_id,
         NEW.duration_minutes_snapshot, NEW.buffer_after_minutes_snapshot,
         NEW.price_minor_snapshot, NEW.currency_snapshot,
         NEW.cancellation_notice_minutes_snapshot, NEW.service_name_snapshot)
     IS DISTINCT FROM
     ROW(OLD.business_id, OLD.service_id,
         OLD.duration_minutes_snapshot, OLD.buffer_after_minutes_snapshot,
         OLD.price_minor_snapshot, OLD.currency_snapshot,
         OLD.cancellation_notice_minutes_snapshot, OLD.service_name_snapshot) THEN
    RAISE EXCEPTION 'Appointment contractual snapshot is immutable'
      USING ERRCODE = '23514', CONSTRAINT = 'appointments_snapshot_immutable';
  END IF;

  IF current_setting('app.allow_appointment_reschedule', true) IS DISTINCT FROM 'on'
     AND ROW(NEW.location_id, NEW.timezone_snapshot,
             NEW.location_name_snapshot, NEW.location_address_snapshot)
         IS DISTINCT FROM
         ROW(OLD.location_id, OLD.timezone_snapshot,
             OLD.location_name_snapshot, OLD.location_address_snapshot) THEN
    RAISE EXCEPTION 'Appointment location snapshot can only change during a reschedule'
      USING ERRCODE = '23514', CONSTRAINT = 'appointments_snapshot_immutable';
  END IF;

  RETURN NEW;
END;
$$;
