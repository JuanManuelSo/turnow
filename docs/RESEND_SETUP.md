# Configurar emails de reservas con Resend

Turnow envía una confirmación al reservar y programa un recordatorio para las 8:00 a. m. del día del turno, según la zona horaria guardada en la reserva. Los emails incluyen los detalles, el código privado y el enlace para consultar o cancelar.

## 1. Crear la cuenta y API key

1. Entrá a [Resend](https://resend.com/) y creá tu cuenta.
2. Confirmá el correo de la cuenta. Para esta primera prueba, usá `chinxsa4@gmail.com` como email de la cuenta de Resend: el dominio de prueba solo puede enviar a ese email.
3. En **API Keys**, creá una key con permiso de envío y copiala una sola vez. No la compartas por chat ni la subas al repositorio.

La dirección `onboarding@resend.dev` sirve solo para probar envíos al mismo email de la cuenta Resend. No sirve para enviar al dueño ni a clientes. Para esos destinatarios, habrá que verificar un dominio que controle el negocio y usar, por ejemplo, `turnos@dominio-del-negocio.com`.

## 2. Variables de entorno

En `.env.local` para desarrollo y en **Vercel → Project → Settings → Environment Variables** para producción, configurar:

| Variable | Valor |
| --- | --- |
| `RESEND_API_KEY` | La API key de Resend; mantenerla secreta. |
| `RESEND_FROM_EMAIL` | `Turnow <onboarding@resend.dev>` para la prueba, o una dirección del dominio verificado. |
| `CRON_SECRET` | Un secreto aleatorio largo para proteger el Cron. |
| `NEXT_PUBLIC_SITE_URL` | La URL pública completa, sin `/` al final. |
| `BOOKING_CODE_ENCRYPTION_KEY` | Clave AES de 64 caracteres hex; necesaria para recuperar con seguridad el código en los emails/reintentos. |

Para generar secretos localmente, ejecutá `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` una vez por cada clave. No reutilices ni publiques el resultado.

En Vercel, configurar `RESEND_FROM_EMAIL` como texto literal, por ejemplo `Turnow <onboarding@resend.dev>`. Agregar las variables en los entornos que correspondan y volver a desplegar.

## 3. Base de datos y despliegue

La tabla de cola se incorpora mediante la migración `0011_appointment_email_notifications`. Revisá la URL objetivo y aplicá las migraciones de forma explícita con `npm run db:migrate`; no se aplican automáticamente al desplegar.

`vercel.json` configura un Cron diario para procesar la cola. Al crear una reserva, Turnow intenta enviar/programar los emails inmediatamente; el Cron prepara recordatorios que todavía están fuera de la ventana de programación de Resend y reintenta notificaciones pendientes. Un error de email no revierte una reserva confirmada.

## 4. Probar

1. Confirmá en el panel de Resend que `chinxsa4@gmail.com` es el email de la cuenta.
2. Reservá un turno próximo usando ese email como cliente.
3. Revisá **Emails** en Resend: la confirmación debe enviarse y el recordatorio debe quedar programado para las 8:00 locales del día de la cita.
4. Revisá el email recibido y verificá todos los datos y el código privado. Probá el enlace de consulta/cancelación.
5. Cancelá o reprogramá otro turno y verificá que el recordatorio anterior se cancele o reprograme.

En la prueba local no hay Cron de Vercel; los recordatorios dentro de la ventana de Resend se programan directamente. La ejecución real del Cron se verifica después del despliegue. No usar el código privado de clientes reales en registros o capturas compartidas.
