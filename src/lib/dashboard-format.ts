export function formatMoney(priceMinor: number | null, currency: string) {
  if (priceMinor === null) return 'Sin precio';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: priceMinor % 100 === 0 ? 0 : 2,
  }).format(priceMinor / 100);
}

export function priceToInput(priceMinor: number | null) {
  if (priceMinor === null) return '';
  const value = priceMinor / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');
}

export function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map(word => word[0] ?? '').join('').toUpperCase();
}

export function formatTimezone(timezone: string) {
  const city = timezone.split('/').at(-1)?.replaceAll('_', ' ') ?? timezone;
  try {
    const offset = new Intl.DateTimeFormat('es-AR', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value;
    return offset ? `${city} · ${offset}` : city;
  } catch {
    return city;
  }
}

export function statusLabel(status: string) {
  return ({
    draft: 'Borrador',
    active: 'Activo',
    suspended: 'Suspendido',
    archived: 'Archivado',
  } as Record<string, string>)[status] ?? status;
}
