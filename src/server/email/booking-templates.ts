export type BookingEmailKind = 'confirmation' | 'reminder';

export type BookingEmailDetails = {
  kind: BookingEmailKind;
  customerName: string;
  businessName: string;
  serviceName: string;
  professionalName: string;
  locationName: string;
  locationAddress: string | null;
  startsAt: Date;
  timezone: string;
  durationMinutes: number;
  priceMinor: number | null;
  currency: string;
  cancellationNoticeMinutes: number;
  cancellationCode: string;
  manageUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function formattedDetails(booking: BookingEmailDetails) {
  const date = new Intl.DateTimeFormat('es-AR', {
    timeZone: booking.timezone,
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(booking.startsAt);
  const time = new Intl.DateTimeFormat('es-AR', {
    timeZone: booking.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(booking.startsAt);
  const price = booking.priceMinor === null ? null : new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: booking.currency,
  }).format(booking.priceMinor / 100);

  return { date: date.charAt(0).toLocaleUpperCase('es-AR') + date.slice(1), time, price };
}

function cancellationPolicy(minutes: number) {
  if (minutes <= 0) return 'Para cancelar o consultar tu turno, usá el código privado.';
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `Podés cancelar hasta ${days} ${days === 1 ? 'día' : 'días'} antes del turno.`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `Podés cancelar hasta ${hours} ${hours === 1 ? 'hora' : 'horas'} antes del turno.`;
  }
  return `Podés cancelar hasta ${minutes} minutos antes del turno.`;
}

export function buildBookingEmail(booking: BookingEmailDetails) {
  const isReminder = booking.kind === 'reminder';
  const { date, time, price } = formattedDetails(booking);
  const title = isReminder ? 'Hoy tenés turno' : 'Tu turno está confirmado';
  const preheader = isReminder
    ? `Te esperamos hoy a las ${time} en ${booking.locationName}.`
    : `Tu reserva en ${booking.businessName} ya está en la agenda.`;
  const subject = isReminder
    ? `Recordatorio: hoy a las ${time} · ${booking.businessName}`
    : `Reserva confirmada · ${booking.businessName}`;
  const safe = {
    customerName: escapeHtml(booking.customerName),
    businessName: escapeHtml(booking.businessName),
    serviceName: escapeHtml(booking.serviceName),
    professionalName: escapeHtml(booking.professionalName),
    locationName: escapeHtml(booking.locationName),
    locationAddress: booking.locationAddress ? escapeHtml(booking.locationAddress) : null,
    cancellationCode: escapeHtml(booking.cancellationCode),
    manageUrl: escapeHtml(booking.manageUrl),
    date: escapeHtml(date),
    time: escapeHtml(time),
    price: price ? escapeHtml(price) : null,
  };
  const policy = cancellationPolicy(booking.cancellationNoticeMinutes);
  const rows = [
    ['Servicio', booking.serviceName],
    ['Profesional', booking.professionalName],
    ['Fecha', date],
    ['Hora', `${time} · hora local`],
    ['Duración', `${booking.durationMinutes} min`],
    ['Sede', booking.locationName],
    ...(booking.locationAddress ? [['Dirección', booking.locationAddress] as [string, string]] : []),
    ...(price ? [['Precio', price] as [string, string]] : []),
  ];
  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:12px 0;color:#667085;font-size:13px;border-bottom:1px solid #e8edf2;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:12px 0;color:#172b4d;font-size:14px;font-weight:600;text-align:right;border-bottom:1px solid #e8edf2;vertical-align:top">${escapeHtml(value)}</td>
    </tr>`).join('');
  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:#f2f5f8;font-family:Arial,Helvetica,sans-serif;color:#172b4d">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f8;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e1e7ed;border-radius:12px;overflow:hidden">
        <tr><td style="padding:22px 28px;background:#173b67;color:#fff;font-size:14px;font-weight:700;letter-spacing:.04em">TURNOW <span style="font-weight:400;color:#cfdae8">· ${safe.businessName}</span></td></tr>
        <tr><td style="padding:32px 28px 12px">
          <div style="margin:0 0 9px;color:#32745a;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">${isReminder ? 'Un aviso para organizarte' : 'Reserva confirmada'}</div>
          <h1 style="margin:0;color:#172b4d;font-size:27px;line-height:1.2;letter-spacing:-.03em">${title}</h1>
          <p style="margin:14px 0 0;color:#526174;font-size:15px;line-height:1.6">Hola ${safe.customerName}, ${isReminder ? 'te esperamos hoy.' : 'ya reservamos este horario para vos.'}</p>
        </td></tr>
        <tr><td style="padding:16px 28px 8px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${htmlRows}</table>
        </td></tr>
        <tr><td style="padding:20px 28px 8px">
          <div style="padding:18px 20px;border:1px solid #cbd8e5;border-radius:10px;background:#f6f9fc">
            <div style="color:#526174;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Código privado de cancelación</div>
            <div style="margin-top:9px;color:#173b67;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:.07em;overflow-wrap:anywhere">${safe.cancellationCode}</div>
            <p style="margin:10px 0 0;color:#526174;font-size:12px;line-height:1.5">Guardalo. Lo vas a necesitar para consultar o cancelar tu turno.</p>
          </div>
        </td></tr>
        <tr><td align="center" style="padding:20px 28px 10px">
          <a href="${safe.manageUrl}" style="display:inline-block;padding:13px 20px;border-radius:7px;background:#173b67;color:#fff;font-size:14px;font-weight:700;text-decoration:none">Consultar o cancelar turno</a>
        </td></tr>
        <tr><td style="padding:12px 28px 28px;color:#667085;font-size:12px;line-height:1.6">${escapeHtml(policy)}<br>Si necesitás ayuda, contactá directamente a ${safe.businessName}.</td></tr>
      </table>
      <p style="margin:16px 0 0;color:#7c8795;font-size:11px;line-height:1.5">Mensaje automático de Turnow para ${safe.businessName}. No respondas a este correo.</p>
    </td></tr>
  </table>
</body></html>`;
  const text = `${title}\n\nHola ${booking.customerName}, ${isReminder ? 'te esperamos hoy.' : 'ya reservamos este horario para vos.'}\n\n${textRows}\n\nCódigo privado de cancelación: ${booking.cancellationCode}\n${policy}\nConsultar o cancelar: ${booking.manageUrl}\n\nMensaje automático de Turnow para ${booking.businessName}.`;

  return { subject, html, text };
}
