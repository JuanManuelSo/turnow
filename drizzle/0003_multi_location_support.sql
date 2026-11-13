CREATE TABLE app.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES app.businesses(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  address_text text,
  map_url text,
  contact_phone text,
  arrival_instructions text,
  timezone text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT locations_business_id_unique UNIQUE (business_id, id),
  CONSTRAINT locations_slug_unique UNIQUE (business_id, slug),
  CONSTRAINT locations_name_check CHECK (length(trim(name)) > 0),
  CONSTRAINT locations_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT locations_timezone_check CHECK (length(trim(timezone)) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX locations_primary_unique ON app.locations (business_id) WHERE is_primary;
--> statement-breakpoint
CREATE INDEX locations_active_idx ON app.locations (business_id, is_active, is_primary);
--> statement-breakpoint
CREATE TABLE app.professional_locations (
  business_id uuid NOT NULL REFERENCES app.businesses(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT professional_locations_pk PRIMARY KEY (business_id, location_id, professional_id),
  CONSTRAINT professional_locations_location_fk FOREIGN KEY (business_id, location_id)
    REFERENCES app.locations (business_id, id) ON DELETE RESTRICT,
  CONSTRAINT professional_locations_professional_fk FOREIGN KEY (business_id, professional_id)
    REFERENCES app.professionals (business_id, id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX professional_locations_professional_idx
  ON app.professional_locations (business_id, professional_id, is_active, location_id);
--> statement-breakpoint
-- Cada negocio existente recibe una sede principal. La dirección previamente guardada
-- en business_pages se traslada a esa sede para conservar la información pública.
INSERT INTO app.locations (business_id, name, slug, address_text, map_url, contact_phone, arrival_instructions, timezone, is_primary)
SELECT b.id, b.name || ' — Sede principal', 'principal', p.address_text, p.map_url,
       p.contact_phone, p.arrival_instructions, b.timezone, true
FROM app.businesses b
LEFT JOIN app.business_pages p ON p.business_id = b.id;
--> statement-breakpoint
INSERT INTO app.professional_locations (business_id, location_id, professional_id, is_active)
SELECT p.business_id, l.id, p.id, p.is_active
FROM app.professionals p
JOIN app.locations l ON l.business_id = p.business_id AND l.is_primary;
--> statement-breakpoint
ALTER TABLE app.appointments ADD COLUMN location_id uuid;
--> statement-breakpoint
ALTER TABLE app.appointments ADD COLUMN location_name_snapshot text;
--> statement-breakpoint
ALTER TABLE app.appointments ADD COLUMN location_address_snapshot text;
--> statement-breakpoint
ALTER TABLE app.calendar_occupancies ADD COLUMN location_id uuid;
--> statement-breakpoint
ALTER TABLE app.schedules ADD COLUMN location_id uuid;
--> statement-breakpoint
UPDATE app.appointments a SET
  location_id = l.id,
  location_name_snapshot = l.name,
  location_address_snapshot = l.address_text,
  timezone_snapshot = l.timezone
FROM app.locations l
WHERE l.business_id = a.business_id AND l.is_primary;
--> statement-breakpoint
UPDATE app.calendar_occupancies o SET location_id = a.location_id
FROM app.appointments a
WHERE a.business_id = o.business_id AND a.id = o.appointment_id;
--> statement-breakpoint
UPDATE app.calendar_occupancies o SET location_id = l.id
FROM app.locations l
WHERE l.business_id = o.business_id AND l.is_primary AND o.location_id IS NULL;
--> statement-breakpoint
UPDATE app.schedules s SET location_id = l.id
FROM app.locations l
WHERE l.business_id = s.business_id AND l.is_primary;
--> statement-breakpoint
ALTER TABLE app.appointments ALTER COLUMN location_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE app.appointments ALTER COLUMN location_name_snapshot SET NOT NULL;
--> statement-breakpoint
ALTER TABLE app.calendar_occupancies ALTER COLUMN location_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE app.schedules ALTER COLUMN location_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE app.appointments DROP CONSTRAINT appointments_names_check;
--> statement-breakpoint
ALTER TABLE app.calendar_occupancies DROP CONSTRAINT calendar_occupancies_appointment_fk;
--> statement-breakpoint
ALTER TABLE app.schedules DROP CONSTRAINT schedules_professional_fk;
--> statement-breakpoint
DROP INDEX app.schedules_business_unique;
--> statement-breakpoint
DROP INDEX app.schedules_professional_unique;
--> statement-breakpoint
DROP INDEX app.appointments_agenda_idx;
--> statement-breakpoint
DROP INDEX app.calendar_occupancies_professional_idx;
--> statement-breakpoint
ALTER TABLE app.schedules ADD CONSTRAINT schedules_location_fk
  FOREIGN KEY (business_id, location_id) REFERENCES app.locations (business_id, id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE app.schedules ADD CONSTRAINT schedules_professional_location_fk
  FOREIGN KEY (business_id, location_id, professional_id)
  REFERENCES app.professional_locations (business_id, location_id, professional_id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE UNIQUE INDEX schedules_location_business_unique ON app.schedules (business_id, location_id) WHERE professional_id IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX schedules_location_professional_unique ON app.schedules (business_id, location_id, professional_id) WHERE professional_id IS NOT NULL;
--> statement-breakpoint
ALTER TABLE app.appointments ADD CONSTRAINT appointments_location_professional_identity_unique
  UNIQUE (business_id, id, professional_id, location_id);
--> statement-breakpoint
ALTER TABLE app.appointments ADD CONSTRAINT appointments_location_fk
  FOREIGN KEY (business_id, location_id) REFERENCES app.locations (business_id, id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE app.appointments ADD CONSTRAINT appointments_professional_location_fk
  FOREIGN KEY (business_id, location_id, professional_id)
  REFERENCES app.professional_locations (business_id, location_id, professional_id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE app.calendar_occupancies ADD CONSTRAINT calendar_occupancies_professional_location_fk
  FOREIGN KEY (business_id, location_id, professional_id)
  REFERENCES app.professional_locations (business_id, location_id, professional_id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE app.calendar_occupancies ADD CONSTRAINT calendar_occupancies_appointment_fk
  FOREIGN KEY (business_id, appointment_id, professional_id, location_id)
  REFERENCES app.appointments (business_id, id, professional_id, location_id)
  ON DELETE RESTRICT ON UPDATE CASCADE;
--> statement-breakpoint
CREATE INDEX appointments_agenda_idx ON app.appointments (business_id, location_id, starts_at);
--> statement-breakpoint
CREATE INDEX calendar_occupancies_professional_idx ON app.calendar_occupancies (business_id, professional_id, location_id);
--> statement-breakpoint
ALTER TABLE app.appointments ADD CONSTRAINT appointments_names_check CHECK (
  length(trim(customer_name)) > 0 AND length(trim(service_name_snapshot)) > 0
  AND length(trim(professional_name_snapshot)) > 0 AND length(trim(location_name_snapshot)) > 0
  AND length(trim(timezone_snapshot)) > 0
);
--> statement-breakpoint
-- Ya no hay una dirección única a nivel de marca: es información de cada sede.
ALTER TABLE app.business_pages DROP COLUMN address_text;
--> statement-breakpoint
ALTER TABLE app.business_pages DROP COLUMN map_url;
--> statement-breakpoint
ALTER TABLE app.business_pages DROP COLUMN contact_phone;
--> statement-breakpoint
ALTER TABLE app.business_pages DROP COLUMN arrival_instructions;
--> statement-breakpoint
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON app.locations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON app.professional_locations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.protect_appointment_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF ROW(NEW.business_id, NEW.service_id, NEW.location_id,
         NEW.duration_minutes_snapshot, NEW.buffer_after_minutes_snapshot,
         NEW.price_minor_snapshot, NEW.currency_snapshot,
         NEW.cancellation_notice_minutes_snapshot, NEW.timezone_snapshot,
         NEW.service_name_snapshot, NEW.location_name_snapshot, NEW.location_address_snapshot)
     IS DISTINCT FROM
     ROW(OLD.business_id, OLD.service_id, OLD.location_id,
         OLD.duration_minutes_snapshot, OLD.buffer_after_minutes_snapshot,
         OLD.price_minor_snapshot, OLD.currency_snapshot,
         OLD.cancellation_notice_minutes_snapshot, OLD.timezone_snapshot,
         OLD.service_name_snapshot, OLD.location_name_snapshot, OLD.location_address_snapshot) THEN
    RAISE EXCEPTION 'Appointment contractual snapshot is immutable'
      USING ERRCODE = '23514', CONSTRAINT = 'appointments_snapshot_immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.assert_appointment_occupancy(p_business_id uuid, p_appointment_id uuid)
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
     OR o.location_id <> a.location_id
     OR o.starts_at <> a.starts_at
     OR o.ends_at <> a.ends_at + a.buffer_after_minutes_snapshot * interval '1 minute'
     OR o.is_active <> (a.status <> 'cancelled') THEN
    RAISE EXCEPTION 'Appointment and occupancy are inconsistent'
      USING ERRCODE = '23514', CONSTRAINT = 'appointments_occupancy_consistent';
  END IF;
END;
$$;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON app.locations, app.professional_locations TO turnow_runtime;
