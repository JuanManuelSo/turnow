-- Estas garantías no están representadas por drizzle-kit generate.
-- Mantener esta migración al evolucionar el esquema; no usar drizzle-kit push.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- Supabase puede instalar extensiones en el esquema extensions.
SET LOCAL search_path = app, public, extensions, pg_catalog;
--> statement-breakpoint
ALTER TABLE app.weekly_intervals ADD CONSTRAINT weekly_intervals_no_overlap
EXCLUDE USING gist (
  business_id WITH =, schedule_id WITH =, weekday WITH =,
  int4range(start_minute, end_minute, '[)') WITH &&
);
--> statement-breakpoint
ALTER TABLE app.exception_intervals ADD CONSTRAINT exception_intervals_no_overlap
EXCLUDE USING gist (
  business_id WITH =, exception_id WITH =,
  int4range(start_minute, end_minute, '[)') WITH &&
);
--> statement-breakpoint
ALTER TABLE app.calendar_occupancies ADD CONSTRAINT calendar_occupancies_no_overlap
EXCLUDE USING gist (
  business_id WITH =, professional_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (is_active);
--> statement-breakpoint
CREATE FUNCTION app.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'businesses', 'business_members', 'business_settings', 'business_pages',
    'services', 'professionals', 'professional_services', 'schedules',
    'weekly_intervals', 'schedule_exceptions', 'exception_intervals',
    'customers', 'appointments', 'calendar_occupancies'
  ] LOOP
    EXECUTE format('CREATE TRIGGER touch_updated_at BEFORE UPDATE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at()', table_name);
  END LOOP;
END;
$$;
--> statement-breakpoint
-- Precios, duración y condiciones históricas no se modifican por actualizaciones.
CREATE FUNCTION app.protect_appointment_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF ROW(NEW.business_id, NEW.service_id, NEW.duration_minutes_snapshot,
         NEW.buffer_after_minutes_snapshot, NEW.price_minor_snapshot,
         NEW.currency_snapshot, NEW.cancellation_notice_minutes_snapshot,
         NEW.timezone_snapshot, NEW.service_name_snapshot)
     IS DISTINCT FROM
     ROW(OLD.business_id, OLD.service_id, OLD.duration_minutes_snapshot,
         OLD.buffer_after_minutes_snapshot, OLD.price_minor_snapshot,
         OLD.currency_snapshot, OLD.cancellation_notice_minutes_snapshot,
         OLD.timezone_snapshot, OLD.service_name_snapshot) THEN
    RAISE EXCEPTION 'Appointment contractual snapshot is immutable'
      USING ERRCODE = '23514', CONSTRAINT = 'appointments_snapshot_immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER protect_appointment_snapshot BEFORE UPDATE ON app.appointments
FOR EACH ROW EXECUTE FUNCTION app.protect_appointment_snapshot();
--> statement-breakpoint
CREATE FUNCTION app.assert_appointment_occupancy(p_business_id uuid, p_appointment_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE
  a app.appointments%ROWTYPE;
  o app.calendar_occupancies%ROWTYPE;
BEGIN
  SELECT * INTO a FROM app.appointments
    WHERE business_id = p_business_id AND id = p_appointment_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO o FROM app.calendar_occupancies
    WHERE business_id = p_business_id AND appointment_id = p_appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment requires one occupancy'
      USING ERRCODE = '23514', CONSTRAINT = 'appointments_occupancy_consistent';
  END IF;
  IF o.kind <> 'appointment'
     OR o.professional_id <> a.professional_id
     OR o.starts_at <> a.starts_at
     OR o.ends_at <> a.ends_at + a.buffer_after_minutes_snapshot * interval '1 minute'
     OR o.is_active <> (a.status <> 'cancelled') THEN
    RAISE EXCEPTION 'Appointment and occupancy are inconsistent'
      USING ERRCODE = '23514', CONSTRAINT = 'appointments_occupancy_consistent';
  END IF;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION app.check_appointment_occupancy() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  -- Consultar el estado final, no las imágenes intermedias de las filas.
  IF TG_TABLE_NAME = 'appointments' THEN
    IF TG_OP <> 'DELETE' THEN
      PERFORM app.assert_appointment_occupancy(NEW.business_id, NEW.id);
    END IF;
    IF TG_OP <> 'INSERT' THEN
      PERFORM app.assert_appointment_occupancy(OLD.business_id, OLD.id);
    END IF;
  ELSE
    IF TG_OP <> 'DELETE' AND NEW.appointment_id IS NOT NULL THEN
      PERFORM app.assert_appointment_occupancy(NEW.business_id, NEW.appointment_id);
    END IF;
    IF TG_OP <> 'INSERT' AND OLD.appointment_id IS NOT NULL THEN
      PERFORM app.assert_appointment_occupancy(OLD.business_id, OLD.appointment_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER appointment_occupancy_consistent
AFTER INSERT OR UPDATE OR DELETE ON app.appointments
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION app.check_appointment_occupancy();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER occupancy_appointment_consistent
AFTER INSERT OR UPDATE OR DELETE ON app.calendar_occupancies
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION app.check_appointment_occupancy();
--> statement-breakpoint
REVOKE ALL ON SCHEMA app FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
--> statement-breakpoint
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA app FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA app FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM %I', role_name);
    END IF;
  END LOOP;
END;
$$;
--> statement-breakpoint
-- Rol de grupo, sin contraseña ni login. El usuario runtime se provisiona aparte.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'turnow_runtime') THEN
    CREATE ROLE turnow_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END;
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO turnow_runtime;
--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA app TO turnow_runtime;
--> statement-breakpoint
GRANT INSERT, UPDATE, DELETE ON
  app.services, app.professionals, app.professional_services,
  app.schedules, app.weekly_intervals, app.schedule_exceptions,
  app.exception_intervals, app.customers, app.calendar_occupancies
TO turnow_runtime;
--> statement-breakpoint
GRANT UPDATE ON app.business_pages, app.business_settings TO turnow_runtime;
--> statement-breakpoint
-- Permite SELECT FOR UPDATE sobre el negocio sin dar edición de su estado comercial.
GRANT UPDATE (updated_at) ON app.businesses TO turnow_runtime;
--> statement-breakpoint
GRANT INSERT, UPDATE ON app.appointments, app.appointment_access_codes TO turnow_runtime;
--> statement-breakpoint
GRANT INSERT ON app.booking_requests, app.appointment_events TO turnow_runtime;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.assert_appointment_occupancy(uuid, uuid) TO turnow_runtime;
