# Migraciones de Turnow

## Archivos

- `0000_initial_app_schema.sql`: 17 tablas, claves, checks e índices generados desde `src/server/db/schema/index.ts`.
- `0001_calendar_integrity.sql`: exclusiones GiST, snapshots contractuales inmutables, triggers de coherencia, actualización de timestamps y permisos.
- `0002_revoke_business_update.sql`: revoca la escritura de `businesses.updated_at` al runtime; la agenda se serializa con bloqueos asesorados.
- `0003_multi_location_support.sql`: agrega sedes y asignaciones profesional-sede; vincula agendas, reservas y ocupaciones a una sede, y migra datos existentes a una sede principal.
- `meta/`: snapshots y registro de Drizzle Kit; versionar junto con el SQL.

`auth.users` pertenece a Supabase. Se referencia mediante FK, pero estas migraciones no crean ni modifican esa tabla.

## Comandos

```sh
npm run db:generate -- --name=nombre_del_cambio
npm run db:check
npm run test:db
```

Los dos primeros comandos son locales. `db:check` revisa consistencia de los metadatos de migraciones, no reemplaza las pruebas sobre PostgreSQL.

`test:db` requiere Docker activo. Crea PostgreSQL 17 en un contenedor con nombre único y puerto local aleatorio, aplica todas las migraciones y elimina el contenedor al terminar. No lee `.env.local` ni conecta a Supabase. Simula únicamente `auth.users` y los roles públicos para probar sus referencias y permisos; no prueba el servicio Supabase Auth ni Storage.

## Aplicación a Supabase

La contraseña incluida en `DATABASE_URL` y `DATABASE_MIGRATION_URL` es la **contraseña de la base de datos del proyecto**, definida o restablecida en Settings → Database. No es la contraseña de la cuenta de Supabase, la de un PostgreSQL local ni una API key. Las cadenas del panel Connect muestran `[YOUR-PASSWORD]` y deben completarse con esa contraseña.

Antes de migrar, comprobar credenciales sin modificar datos:

```sh
npm run db:ping -- --migration
```

Después de provisionar el usuario runtime y actualizar `DATABASE_URL`:

```sh
npm run db:ping
```

El cliente de aplicación está en `src/server/db/client.ts`. `getDb()` inicializa la conexión de forma diferida, utiliza TLS y deshabilita prepared statements para el pooler transaccional. Rechaza conexiones runtime con el usuario `postgres`. Los casos de uso deben autorizar al usuario y acotar todas las consultas por negocio.

Con el proyecto de desarrollo seleccionado mediante `DATABASE_MIGRATION_URL` en `.env.local`, el comando explícito es:

```sh
npm run db:migrate
```

Este comando modifica la base configurada. Requiere una conexión de migración con permisos para crear el esquema, la extensión `btree_gist`, funciones y el rol de grupo `turnow_runtime`. No se ejecuta al iniciar la aplicación.

El esquema `app` debe permanecer fuera de los esquemas expuestos por la Data API. La migración revoca acceso a `PUBLIC`, `anon` y `authenticated`, y crea `turnow_runtime` sin login ni contraseña. La aplicación se conecta con un login miembro de ese rol; el proyecto de desarrollo usa `turnow_app`. No usar el usuario administrador para atender solicitudes web.

Para provisionar el login runtime en un entorno nuevo, conectarse como administrador y ejecutar:

```sql
CREATE ROLE turnow_app LOGIN CONNECTION LIMIT 10;
GRANT turnow_runtime TO turnow_app;
ALTER ROLE turnow_app PASSWORD '<contraseña-generada>';
```

La contraseña se genera y guarda únicamente en `.env.local`. `npm run db:ping` rechaza la conexión si `DATABASE_URL` usa `postgres` o un rol privilegiado.

El alta de negocios/membresías usa un flujo administrativo separado: runtime no puede crear propietarios ni modificar el estado comercial del negocio. Los eventos y solicitudes idempotentes solo admiten lectura e inserción para runtime.

## Evolución

- No usar `drizzle-kit push`: las exclusiones y triggers viven en SQL personalizado y no están expresados en los snapshots de Drizzle.
- Generar nuevas migraciones para cambios de tablas y migraciones `--custom` para cambios de triggers, exclusiones o permisos.
- No editar una migración que ya haya sido aplicada a un entorno compartido.
- Otorgar permisos explícitos al incorporar tablas o funciones nuevas; no se conceden automáticamente por defecto.
- La FK de ocupación a reserva tiene `ON UPDATE CASCADE` para permitir reasignar profesional en una transacción sin una inconsistencia intermedia de FK.
- Mantener la validación de permisos por negocio y el protocolo de bloqueo en los casos de uso del servidor. El rol runtime es compartido y no implementa aislamiento por fila por sí solo. `lockBusinessSchedule` en `src/server/db/locks.ts` serializa las escrituras de agenda por negocio sin requerir escritura sobre `businesses`.
- Los JSON requieren validadores de entrada y las reglas de horario requieren el motor de disponibilidad; el esquema no sustituye esos componentes.
