CREATE OR REPLACE FUNCTION app.purge_archived_cancelled_appointments(
  p_business_id uuid,
  p_appointment_ids uuid[]
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_appointment_id uuid;
  deleted_count integer := 0;
BEGIN
  IF p_appointment_ids IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH v_appointment_id IN ARRAY p_appointment_ids LOOP
    PERFORM 1 FROM app.appointments
    WHERE business_id = p_business_id
      AND id = v_appointment_id
      AND status = 'cancelled'
      AND archived_at IS NOT NULL
    FOR UPDATE;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Keep accounting records and any email that may still be delivered/cancelled.
    IF EXISTS (
      SELECT 1 FROM app.appointment_payments AS payment
      WHERE payment.business_id = p_business_id AND payment.appointment_id = v_appointment_id
    ) OR EXISTS (
      SELECT 1 FROM app.appointment_email_notifications AS notification
      WHERE notification.business_id = p_business_id
        AND notification.appointment_id = v_appointment_id
        AND notification.status IN ('pending', 'scheduled', 'cancel_pending')
    ) THEN
      CONTINUE;
    END IF;

    DELETE FROM app.appointment_email_notifications AS notification
    WHERE notification.business_id = p_business_id AND notification.appointment_id = v_appointment_id;
    DELETE FROM app.booking_requests AS request
    WHERE request.business_id = p_business_id AND request.appointment_id = v_appointment_id;
    DELETE FROM app.appointment_events AS event
    WHERE event.business_id = p_business_id AND event.appointment_id = v_appointment_id;
    DELETE FROM app.appointment_access_codes AS access_code
    WHERE access_code.business_id = p_business_id AND access_code.appointment_id = v_appointment_id;
    DELETE FROM app.calendar_occupancies AS occupancy
    WHERE occupancy.business_id = p_business_id AND occupancy.appointment_id = v_appointment_id;
    DELETE FROM app.appointments AS appointment
    WHERE appointment.business_id = p_business_id AND appointment.id = v_appointment_id;

    IF FOUND THEN
      deleted_count := deleted_count + 1;
    END IF;
  END LOOP;

  RETURN deleted_count;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.purge_archived_cancelled_appointments(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.purge_archived_cancelled_appointments(uuid, uuid[]) TO turnow_runtime;
