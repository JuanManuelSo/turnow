# Configurar Supabase Auth para Turnow

Esta guía acompaña la primera integración del login. **No pegues contraseñas ni claves privadas en el chat o en Git.** Para el login se usa la clave publicable (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), no la `service_role`.

## Qué está conectado en el código

- `/login`: email y contraseña mediante Supabase Auth.
- Sesión SSR en cookies seguras y renovación desde `src/proxy.ts`.
- `/dashboard`: exige sesión y una membresía válida de Turnow.
- Autorización tomada de `app.business_members`: el dueño tiene alcance de negocio y el operador queda ligado a una sede.
- Recuperación de contraseña y callback en `/auth/callback`.

El selector de rol/sede del formulario sirve para elegir el tipo de acceso esperado, pero **no concede permisos**. El servidor comprueba el rol y la sede que ya estén vinculados a ese usuario en la base.

## 1. Variables locales

En `.env.local` (archivo ignorado por Git) deben estar:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

URL y publishable key se copian desde el proyecto Supabase, sección **Connect** o **Project Settings → API Keys**. No uses una contraseña de PostgreSQL como API key. Conservá además `DATABASE_URL` y `DATABASE_MIGRATION_URL` como están; son conexiones distintas.

Si `next dev` usa otro puerto, poné el origen exacto que aparece en la terminal. Después de editar `.env.local`, reiniciá `npm run dev` para que Next lea los valores nuevos.

## 2. URL de retorno en Supabase

En el proyecto Supabase:

1. Abrí **Authentication → URL Configuration**.
2. Para desarrollo, configurá **Site URL** como `http://localhost:3000`.
3. En **Redirect URLs**, agregá `http://localhost:3000/auth/callback`.
4. Cuando exista un dominio de producción, agregá su URL exacta y configurá allí `NEXT_PUBLIC_SITE_URL` con el origen público. No uses `*` como redirect de producción.

El enlace de recuperación vuelve a `/auth/callback?next=/login/reset-password`; el callback intercambia el código por una sesión y valida el destino para impedir redirecciones externas.

## 3. Proveedor de email y primer usuario

1. En **Authentication → Providers → Email**, asegurate de que Email esté habilitado.
2. Para pruebas iniciales podés desactivar temporalmente la confirmación de email o crear un usuario ya confirmado desde **Authentication → Users → Add user**. Para un piloto real, configurá SMTP y mantené la confirmación habilitada.
3. Creá el usuario del dueño con un email que controles y confirmalo. No compartas su contraseña; el dueño debe establecer la suya.

Crear un usuario en Auth todavía no le da acceso a Turnow. Para el alta inicial, copiá el UUID del usuario desde **Authentication → Users** y ejecutá `npm run setup:business`. El comando te pedirá los datos del negocio y sus sedes y creará, en una transacción, el negocio, membresía, configuración inicial y página. Propone tres direcciones del prototipo como valores iniciales; revisalas antes de confirmar. Los slugs de esas sedes deben coincidir con las opciones del selector de acceso (`urquiza`, `febrero`, `roca`) mientras ese selector use la configuración prototipo. Verificá cuidadosamente el resumen y el destino de `DATABASE_MIGRATION_URL` antes de confirmar.

El alta inicial usa la conexión de migración solo desde tu terminal local; no incorpora `service_role` ni ejecuta operaciones administrativas desde el navegador. El negocio queda como borrador y las reservas públicas deshabilitadas. Los valores de intervalo/anticipación impresos son provisionales y deben revisarse antes de publicar. Luego el dueño ya puede entrar; invitaciones para operadores y carga de servicios/profesionales son pasos posteriores.

## 4. Probar el acceso

1. Ejecutá `npm run setup:business` y completá el alta; comprobá que `DATABASE_MIGRATION_URL` apunta al proyecto de desarrollo.
2. Ejecutá `npm run dev` y abrí `/login`.
3. Ingresá como dueño con la cuenta y contraseña creadas en Auth.
4. El dueño debe llegar a `/dashboard`. Las cuentas operativas solo podrán ingresar después de crear sus usuarios Auth y membresías ligadas a sedes.
5. Probá cerrar sesión y solicitar recuperación. El enlace solo funcionará si el origen local figura entre las Redirect URLs.

## 5. Cuentas operativas por sede

Cada sede usa una cuenta compartida, no una cuenta por profesional. Creá y confirmá el usuario en **Authentication → Users** y copiá únicamente su UUID; nunca compartas la contraseña ni claves privadas.

Con el negocio activo, vinculá los usuarios desde la terminal local:

```bash
node scripts/provision-location-operators.mjs \
  --business <slug-del-negocio> \
  --operator <slug-sede>=<uuid-auth> \
  --operator <slug-sede>=<uuid-auth> \
  --confirm
```

El comando valida negocio, sedes activas, confirmación de email y ausencia de membresías previas antes de escribir. Para activar un negocio que todavía está en borrador, agregá `--activate-business` **solo después de confirmar que no habilitarás reservas públicas**. El cambio de estado no modifica `public_booking_enabled`.

## 6. Reservas públicas y códigos privados

- Aplicá las migraciones pendientes con `npm run db:migrate` desde el entorno correcto. La migración `0007` agrega contadores persistentes de intentos públicos y concede permisos mínimos al rol runtime.
- Configurá `BOOKING_CODE_ENCRYPTION_KEY` como variable de entorno secreta en cada entorno que pueda servir reservas. Debe ser exactamente 32 bytes aleatorios expresados en hexadecimal (64 caracteres); no la compartas ni la guardes en Git. Para desarrollo se puede generar con `node -p "require('node:crypto').randomBytes(32).toString('hex')"` y guardarla en `.env.local`.
- Conservá la clave: se usa AES-256-GCM para recuperar el código si un cliente reintenta una confirmación idempotente. La base almacena además un hash para buscar y validar cancelaciones. Perder la clave impide recuperar códigos de confirmaciones reintentadas; el plan de rotación debe conservar la versión anterior hasta completar una migración de claves.
- Las reservas siguen deshabilitadas hasta que el dueño use **Habilitar reservas** en Configuración. Esa acción exige negocio activo y al menos una combinación con horario, servicio y profesional.
- `x-forwarded-for` se usa solo para limitar intentos y se guarda como hash. En despliegue, confiá ese encabezado únicamente al proxy/CDN del entorno y configurá su política para eliminar valores entrantes no confiables.

## Alcance de esta primera etapa

El login, el control de acceso, la agenda manual y el flujo público de reservas/cancelación usan PostgreSQL. Las reservas públicas se habilitan por negocio desde Configuración y permanecen deshabilitadas hasta la decisión explícita del dueño. La cuenta operativa es compartida por sede, por lo que el registro identifica esa cuenta y no a la persona física que la utilizó.
