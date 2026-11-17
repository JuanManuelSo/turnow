/** Converts a wall-clock date/time in an IANA zone to an instant without relying on the host zone. */
export function localDateTimeToInstant(date: string, time: string, timezone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    const observed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    const delta = target - observed;
    if (!delta) return new Date(instant);
    instant += delta;
  }
  const result = new Date(instant);
  const parts = Object.fromEntries(formatter.formatToParts(result).map(part => [part.type, part.value]));
  if (Number(parts.year) !== year || Number(parts.month) !== month || Number(parts.day) !== day || Number(parts.hour) !== hour || Number(parts.minute) !== minute) {
    throw new Error('Ese horario local no existe por el cambio de hora. Elegí otro momento.');
  }
  return result;
}

export function localDayBounds(date: string, timezone: string) {
  const start = localDateTimeToInstant(date, '00:00', timezone);
  const calendarNext = new Date(`${date}T12:00:00Z`);
  calendarNext.setUTCDate(calendarNext.getUTCDate() + 1);
  const nextDate = `${calendarNext.getUTCFullYear()}-${String(calendarNext.getUTCMonth() + 1).padStart(2, '0')}-${String(calendarNext.getUTCDate()).padStart(2, '0')}`;
  return { start, end: localDateTimeToInstant(nextDate, '00:00', timezone) };
}
