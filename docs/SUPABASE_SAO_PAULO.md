# Migrar Supabase a São Paulo (`sa-east-1`)

Supabase no permite cambiar la región de un proyecto existente. La migración
implica crear un proyecto nuevo en **South America (São Paulo)**, aplicar el
esquema, recrear el usuario runtime y volver a cargar los datos que hagan falta.

Este entorno no tiene Supabase CLI ni un access token, por lo que los pasos se
ejecutan desde el dashboard y desde esta máquina con las URLs nuevas.

## 1. Crear el proyecto

1. Entrar a <https://supabase.com/dashboard> con la cuenta dueña de la
   organización.
2. **New project**.
3. Elegir la organización, un nombre (por ejemplo `turnow-prod`) y una
   contraseña de base de datos fuerte. Guardarla: es la de `DATABASE_MIGRATION_URL`.
4. En **Region** elegir **South America (São Paulo)** — `sa-east-1`.
5. Esperar a que termine el provisioning.

Anotar del proyecto nuevo:

- Project ref ( está en la URL del dashboard).
- `Project URL` (`https://<ref>.supabase.co`).
- `Publishable key` (Settings → API Keys).
- Host del pooler y puerto que muestra **Connect**. No inventar el host: Supabase
  puede usar `aws-0-sa-east-1.pooler.supabase.com` o `aws-1-sa-east-1...`.
- Contraseña de la base.

## 2. Aplicar el esquema

En `.env.local`, apuntar temporalmente la conexión de migración al proyecto
nuevo. Usar el **session pooler** (puerto 5432) con el usuario `postgres.<ref>`:

```dotenv
DATABASE_MIGRATION_URL="postgresql://postgres.<ref>:<password>@<host-pooler>:5432/postgres"
```

Después:

```powershell
npm run db:migrate
```

La migración crea el esquema `app`, las funciones, el rol de grupo
`turnow_runtime` y los grants. No crea el login `turnow_app`; hay que crearlo a
mano (siguiente paso).

## 3. Crear el usuario runtime

En el **SQL Editor** del proyecto nuevo (o con `psql` usando la URL de
migración), ejecutar con una contraseña nueva y fuerte:

```sql
create role turnow_app login connection limit 10 password '<password-runtime>';
grant turnow_runtime to turnow_app;
```

Actualizar `DATABASE_URL` con el session pooler y el usuario runtime:

```dotenv
DATABASE_URL="postgresql://turnow_app.<ref>:<password-runtime>@<host-pooler>:5432/postgres"
```

Verificar:

```powershell
npm run db:ping
```

Debe imprimir `role: 'turnow_app'`, `app_tables: 21` y
`Conexión runtime verificada`.

> El puerto 5432 (session pooler) es intencional: permite prepared statements y
> elimina un round trip por consulta. Si más adelante se despliega en serverless
> con muchas instancias, usar 6543 y volver a `prepare: false`; el código lo
> detecta solo por el puerto.

## 4. Autenticación y datos

### Si los datos actuales son de prueba (camino recomendado)

1. En **Authentication → Users**, crear el usuario dueño con email y contraseña.
   Confirmar el email.
2. Copiar el UUID del usuario.
3. Ejecutar el alta inicial:

   ```powershell
   npm run setup:business
   ```

   Confirmar que el script imprime el project ref nuevo. Cargar nombre, slug,
   zona horaria, moneda y sedes. El script crea negocio, sedes, membresía,
   configuración y página pública en una transacción.

4. Cargar servicios, profesionales, horarios y el resto de la configuración
   desde el panel.

### Si hay datos reales que conservar

1. Pedir/descargar un backup del proyecto viejo desde
   **Database → Backups** y restaurarlo en un proyecto nuevo **de la misma
   región** no sirve para cambiar de región. Para mover datos entre regiones:
   - Volcar sólo el esquema `app` con `pg_dump` y restaurarlo en el proyecto
     nuevo (las migraciones ya crean el esquema; usar `--data-only`).
   - Recrear los usuarios de Auth en el proyecto nuevo (dashboard o Admin API).
     Los IDs nuevos no coinciden con los viejos.
   - Actualizar las referencias a usuarios en el esquema `app`:
     `business_members.user_id`, `calendar_occupancies.created_by_user_id`,
     `appointment_events.actor_user_id` y
     `appointment_payments.recorded_by_user_id`.
   - Verificar conteos y claves foráneas antes de abrir el panel.

2. Mantener `BOOKING_CODE_ENCRYPTION_KEY` **idéntica** a la actual. Si cambia,
   los códigos de cancelación ya emitidos dejan de poder descifrarse.

### Transportar sólo la configuración (sin turnos)

Cuando se quiere conservar sedes, servicios, profesionales y horarios, pero no
reservas históricas, dejar en `.env.local` la URL de migración vieja comentada:

```dotenv
# OLD_DATABASE_MIGRATION_URL="postgresql://postgres.<ref-viejo>:...@<pooler-viejo>:5432/postgres"
DATABASE_MIGRATION_URL="postgresql://postgres.<ref-nuevo>:...@<pooler-nuevo>:5432/postgres"
```

El proyecto nuevo debe tener sus migraciones aplicadas, el usuario dueño debe
existir en Auth y no deben haberse creado sedes, servicios ni profesionales.
Ejecutar primero la simulación y luego la copia confirmada:

```powershell
npm run db:migrate-config
npm run db:migrate-config -- --apply
```

Si el proyecto viejo tiene más de un negocio, indicar cuál trasladar:

```powershell
npm run db:migrate-config -- --business-slug <slug>
npm run db:migrate-config -- --business-slug <slug> --apply
```

El script copia negocio, configuración, página pública, sedes, servicios,
profesionales, asignaciones y horarios. No copia turnos, clientes, bloqueos de
agenda, códigos ni eventos. Crea la membresía de dueño para el UUID configurado
en `scripts/migrate-configuration.mjs`. Los archivos de Storage (logo, portada
y fotos) deben volverse a cargar si se usaban, porque sus objetos no se copian
entre proyectos.

## 5. Actualizar la aplicación

Editar `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
DATABASE_URL="postgresql://turnow_app.<ref>:<password-runtime>@<host-pooler>:5432/postgres"
DATABASE_MIGRATION_URL="postgresql://postgres.<ref>:<password>@<host-pooler>:5432/postgres"
# Sin cambios:
NEXT_PUBLIC_SITE_URL="..."
BOOKING_CODE_ENCRYPTION_KEY="..."
```

Reiniciar el servidor y ejecutar las verificaciones:

```powershell
npm run db:ping
npm run typecheck
npm run lint
npm run test
npm run build
npm start
```

Probar en el navegador:

- `/<slug>` carga la página pública.
- Elegir servicio, sede y profesional muestra horarios reales.
- Crear un turno de prueba y consultarlo/cancelarlo con el código.
- El panel muestra agenda, sedes, servicios y configuración.

## 6. Medir y cerrar

- Repetir la medición de disponibilidad: la latencia de red desde Argentina a
  São Paulo debería quedar en decenas de milisegundos por round trip.
- Revisar los logs del servidor por errores `prepared statement` o
  `ECONNRESET`; si aparecen, volver a `DATABASE_URL` en 6543 (el código apaga
  prepared statements automáticamente).
- Mantener el proyecto viejo una semana como rollback. Recién después pausarlo
  o eliminarlo.
