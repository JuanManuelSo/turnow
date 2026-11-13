-- La serialización de agenda usa pg_advisory_xact_lock por negocio.
-- Runtime no necesita modificar la fila del negocio para coordinarse.
REVOKE UPDATE (updated_at) ON app.businesses FROM turnow_runtime;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'turnow_app') THEN
    REVOKE UPDATE (updated_at) ON app.businesses FROM turnow_app;
  END IF;
END;
$$;