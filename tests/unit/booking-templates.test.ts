import { describe, expect, it } from 'vitest';
import { buildBookingEmail, type BookingEmailDetails } from '../../src/server/email/booking-templates';

const booking: BookingEmailDetails = {
  kind: 'confirmation',
  customerName: 'Ana <script>alert(1)</script>',
  businessName: 'Estudio & Co',
  serviceName: 'Corte "especial"',
  professionalName: 'Lucía',
  locationName: 'Sede Centro',
  locationAddress: 'Calle 1 & 2',
  startsAt: new Date('2026-12-05T13:30:00.000Z'),
  timezone: 'America/Argentina/Buenos_Aires',
  durationMinutes: 45,
  priceMinor: 120000,
  currency: 'ARS',
  cancellationNoticeMinutes: 1440,
  cancellationCode: 'PRIVATE-CODE-123',
  manageUrl: 'https://turnow.test/estudio/cancelar',
};

describe('plantillas de emails de reserva', () => {
  it('incluye todos los datos del turno y el código en versión HTML y texto', () => {
    const email = buildBookingEmail(booking);
    expect(email.subject).toContain('Reserva confirmada');
    for (const value of ['Corte "especial"', 'Lucía', 'Sede Centro', '05 de diciembre de 2026', '10:30', '45 min', 'PRIVATE-CODE-123']) {
      expect(email.html).toContain(value);
      expect(email.text).toContain(value);
    }
    expect(email.html).toContain('Consultar o cancelar turno');
    expect(email.text).toContain(booking.manageUrl);
  });

  it('escapa contenido dinámico y mantiene el recordatorio en presente', () => {
    const email = buildBookingEmail({ ...booking, kind: 'reminder' });
    expect(email.subject).toContain('Recordatorio: hoy');
    expect(email.html).toContain('Ana &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).toContain('Estudio &amp; Co');
    expect(email.html).not.toContain('<script>alert(1)</script>');
  });
});
