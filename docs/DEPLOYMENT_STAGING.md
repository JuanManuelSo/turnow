# Staging en Vercel

Staging sirve para probar la aplicación con datos ficticios y medir el comportamiento en un despliegue real. No conectes este entorno al proyecto Supabase de desarrollo ni cargues datos de clientes.

## 1. Crear Supabase de staging

1. Crear un proyecto Supabase separado, en la región cercana al despliegue previsto.
2. Aplicar migraciones y provisionar el usuario runtime siguiendo [`../drizzle/README.md`](../drizzle/README.md).
3. Crear un usuario Auth y un negocio de prueba. No copiar usuarios, teléfonos ni reservas reales.
4. Configurar Auth URL Configuration con la URL de staging y los dominios Preview que se vayan a probar. Mantener desactivado el registro público si no se necesita.
5. Configurar SMTP de prueba o un proveedor transaccional con dominio verificado antes de probar recuperación de contraseña.

## 2. Conectar GitHub y Vercel

1. Importar el repositorio en Vercel y seleccionar el framework Next.js. Usar `npm ci` y conservar el comando de build predeterminado.
2. Conectar el repositorio de GitHub. Vercel crea despliegues Preview para PR y despliega la rama configurada en el entorno llamado Production; durante esta etapa, tratar ese proyecto/dominio como **staging**.
3. Configurar variables del proyecto solo para los entornos necesarios (Preview/Production). Nunca incluir secretos en GitHub, archivos versionados ni URLs de Preview.
4. Fijar la región de funciones de Vercel cerca de Supabase y validar la latencia desde ubicaciones relevantes para los usuarios.

## Métricas web de Vercel

El layout raíz incluye Vercel Web Analytics y Speed Insights únicamente cuando `VERCEL_ENV=production`. Por eso, la app recoge datos en el despliegue estable de staging (que Vercel clasifica como Production) y los omite en desarrollo local y Preview Deployments.

Para recibir datos, abrir el proyecto en Vercel y habilitar **Web Analytics** y **Speed Insights** desde sus secciones del dashboard. Tras desplegar, navegar por las rutas públicas y el panel; los informes pueden tardar en mostrar datos y Web Vitals se acumulan con visitas reales. No se envían nombres, teléfonos ni detalles de reservas como eventos personalizados. Revisar el aviso de privacidad aplicable antes de invitar usuarios externos.

## 3. Variables en Vercel

Valores y secretos deben pertenecer exclusivamente al proyecto Supabase de staging:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`: URL canónica estable de staging para Auth/callbacks. No asumir que cada URL efímera de Preview será válida para Auth.
- `DATABASE_URL`: usuario runtime de permisos limitados; usar transaction pooler para serverless.
- `BOOKING_CODE_ENCRYPTION_KEY`: clave aleatoria independiente de desarrollo y producción, generada con el comando de `.env.example`.
- `NEXT_PUBLIC_PAGE_EDITOR_ENABLED=false`

`DATABASE_MIGRATION_URL` no es necesaria en la aplicación web y no debe añadirse a Vercel. Las migraciones se aplican desde una sesión administrativa protegida, manualmente y contra el proyecto correcto.

## 4. CI y protección de rama

`.github/workflows/ci.yml` valida PR y pushes a `main`: instalación reproducible, consistencia de migraciones, lint, TypeScript, pruebas (incluida una base PostgreSQL descartable) y build. Los valores de CI son ficticios y no apuntan a servicios externos.

En GitHub, configurar `main` para requerir el check **Verify** antes de integrar cambios. No habilitar auto-merge hasta revisar el pipeline y el proceso de migración.

## 5. Primera publicación y comprobaciones

1. Antes del primer deploy, aplicar las migraciones pendientes a Supabase staging y comprobar `npm run db:ping` con las credenciales correspondientes.
2. Verificar login/logout, reserva pública, cancelación, agenda, correo de recuperación y permisos de operador.
3. Revisar logs en Vercel y Supabase, errores del navegador, latencia de disponibilidad y métricas Web Vitals en móvil.
4. No automatizar migraciones en cada deploy en esta primera etapa. Registrar el cambio y el resultado de la migración antes de promoverlo.

## Separación de entornos

Las claves actuales de desarrollo no se copian a Vercel. Mantener una instancia Supabase separada para producción futura, con sus propios usuarios, base, Auth, SMTP y clave de cifrado. Staging no es un lugar para datos personales reales.
