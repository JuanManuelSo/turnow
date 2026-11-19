import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pricePattern = /^\d{1,7}(?:[.,]\d{1,2})?$/;

const text = (max: number, message: string) => z.string().trim().max(max, message);

export const locationInputSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120, 'El nombre no puede superar 120 caracteres.'),
  slug: z.string().trim().max(80, 'El slug no puede superar 80 caracteres.').regex(slugPattern, 'Usá minúsculas, números y guiones.'),
  addressText: text(300, 'La dirección no puede superar 300 caracteres.'),
  mapUrl: text(500, 'El enlace del mapa no puede superar 500 caracteres.').refine(
    value => value === '' || /^https?:\/\/\S+$/i.test(value),
    'Ingresá un enlace completo que empiece con http:// o https://.',
  ),
  contactPhone: text(40, 'El teléfono no puede superar 40 caracteres.'),
  arrivalInstructions: text(500, 'Las indicaciones no pueden superar 500 caracteres.'),
  isActive: z.boolean(),
});

export const serviceInputSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120, 'El nombre no puede superar 120 caracteres.'),
  description: text(600, 'La descripción no puede superar 600 caracteres.'),
  durationMinutes: z.coerce.number({ error: 'Ingresá una duración.' })
    .int('La duración debe ser un número entero.')
    .min(5, 'La duración mínima es de 5 minutos.')
    .max(480, 'La duración máxima es de 8 horas.'),
  price: text(20, 'El precio no puede superar 20 caracteres.').refine(
    value => value === '' || pricePattern.test(value),
    'Ingresá un precio con hasta dos decimales.',
  ),
  showPrice: z.boolean(),
  isActive: z.boolean(),
});

export const professionalInputSchema = z.object({
  displayName: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(120, 'El nombre no puede superar 120 caracteres.'),
  description: text(600, 'La descripción no puede superar 600 caracteres.'),
  isActive: z.boolean(),
  locationIds: z.array(z.uuid({ error: 'Elegí sedes válidas.' })).max(20),
  serviceIds: z.array(z.uuid({ error: 'Elegí servicios válidos.' })).max(100),
});

const dayNames = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export const scheduleIntervalSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
});

export const schedulePayloadSchema = z.object({
  locationId: z.uuid(),
  professionalId: z.uuid().nullable(),
  intervals: z.array(scheduleIntervalSchema).max(200, 'Hay demasiados tramos en este horario.'),
}).superRefine((value, ctx) => {
  const byDay = new Map<number, typeof value.intervals>();
  for (const interval of value.intervals) {
    if (interval.endMinute <= interval.startMinute) {
      ctx.addIssue({ code: 'custom', message: `El tramo del ${dayNames[interval.weekday]} termina antes de empezar.` });
      return;
    }
    const list = byDay.get(interval.weekday) ?? [];
    list.push(interval);
    byDay.set(interval.weekday, list);
  }
  for (const [weekday, intervals] of byDay) {
    const sorted = [...intervals].sort((a, b) => a.startMinute - b.startMinute);
    for (let index = 1; index < sorted.length; index++) {
      if (sorted[index].startMinute < sorted[index - 1].endMinute) {
        ctx.addIssue({ code: 'custom', message: `Los tramos del ${dayNames[weekday]} se superponen.` });
        return;
      }
    }
  }
});

const clockPattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const clockText = (message: string) => z.string().trim().regex(clockPattern, message);

const exceptionRangeSchema = z.object({
  start: clockText('Elegí un horario de inicio válido.'),
  end: clockText('Elegí un horario de fin válido.'),
});

function clockToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export const scheduleExceptionInputSchema = z.object({
  locationId: z.uuid({ error: 'Elegí una sede válida.' }),
  localDate: z.iso.date({ error: 'Elegí una fecha válida.' }),
  mode: z.enum(['closed', 'custom'], { error: 'Elegí el tipo de excepción.' }),
  reason: text(300, 'El motivo no puede superar 300 caracteres.'),
  ranges: z.array(exceptionRangeSchema).max(20, 'Hay demasiados tramos para esta fecha.'),
}).superRefine((value, ctx) => {
  if (value.mode === 'custom' && value.ranges.length === 0) {
    ctx.addIssue({ code: 'custom', message: 'Agregá al menos un tramo para el horario especial.', path: ['ranges'] });
  }
  const ranges = value.ranges.map(range => ({
    ...range,
    startMinute: clockToMinutes(range.start),
    endMinute: clockToMinutes(range.end),
  }));
  for (const range of ranges) {
    if (range.endMinute <= range.startMinute) {
      ctx.addIssue({ code: 'custom', message: 'Cada tramo debe terminar después de empezar.', path: ['ranges'] });
      return;
    }
  }
  const sorted = [...ranges].sort((a, b) => a.startMinute - b.startMinute);
  for (let index = 1; index < sorted.length; index++) {
    if (sorted[index].startMinute < sorted[index - 1].endMinute) {
      ctx.addIssue({ code: 'custom', message: 'Los tramos del horario especial se superponen.', path: ['ranges'] });
      return;
    }
  }
});

export const professionalBlockInputSchema = z.object({
  locationId: z.uuid({ error: 'Elegí una sede válida.' }),
  professionalId: z.uuid({ error: 'Elegí un profesional.' }),
  localDate: z.iso.date({ error: 'Elegí una fecha válida.' }),
  allDay: z.boolean(),
  start: text(5, 'Elegí un horario de inicio válido.'),
  end: text(5, 'Elegí un horario de fin válido.'),
  reason: text(300, 'El motivo no puede superar 300 caracteres.'),
}).superRefine((value, ctx) => {
  if (value.allDay) return;
  if (!clockPattern.test(value.start)) {
    ctx.addIssue({ code: 'custom', message: 'Elegí un horario de inicio válido.', path: ['start'] });
    return;
  }
  if (!clockPattern.test(value.end)) {
    ctx.addIssue({ code: 'custom', message: 'Elegí un horario de fin válido.', path: ['end'] });
    return;
  }
  if (clockToMinutes(value.end) <= clockToMinutes(value.start)) {
    ctx.addIssue({ code: 'custom', message: 'El bloqueo debe terminar después de empezar.', path: ['end'] });
  }
});

export const settingsInputSchema = z.object({
  slotIntervalMinutes: z.coerce.number().int().refine(
    value => [15, 30, 60].includes(value),
    'Elegí un intervalo de 15, 30 o 60 minutos.',
  ),
  bufferAfterMinutes: z.coerce.number().int().min(0, 'El margen no puede ser negativo.').max(240, 'El margen máximo es de 240 minutos.'),
  minBookingNoticeMinutes: z.coerce.number().int().min(0, 'El aviso no puede ser negativo.').max(20160, 'El aviso máximo es de 14 días.'),
  bookingHorizonDays: z.coerce.number().int().min(1, 'El horizonte mínimo es de 1 día.').max(365, 'El horizonte máximo es de 365 días.'),
  cancellationNoticeMinutes: z.coerce.number().int().min(0, 'El plazo no puede ser negativo.').max(20160, 'El plazo máximo es de 14 días.'),
  allowAnyProfessional: z.boolean(),
});

export const pageInputSchema = z.object({
  headline: text(120, 'El título no puede superar 120 caracteres.'),
  description: text(900, 'La descripción no puede superar 900 caracteres.'),
  contactEmail: text(254, 'El email no puede superar 254 caracteres.').refine(
    value => value === '' || z.email().safeParse(value).success,
    'Ingresá un email válido.',
  ),
  instagram: text(200, 'El enlace de Instagram no puede superar 200 caracteres.'),
  facebook: text(200, 'El enlace de Facebook no puede superar 200 caracteres.'),
  whatsapp: text(200, 'El enlace de WhatsApp no puede superar 200 caracteres.'),
  website: text(200, 'El sitio no puede superar 200 caracteres.'),
});

export function priceToMinor(value: string) {
  if (!value) return null;
  return Math.round(Number(value.replace(',', '.')) * 100);
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !result[key]) result[key] = issue.message;
  }
  return result;
}

export function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
