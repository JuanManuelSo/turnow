export function money(minor: number | null, currency: string) {
  if (minor === null) return "Consultar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}

export function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("es-AR") + value.slice(1);
}

export function dateLabel(date: string) {
  return capitalize(
    formatDate(date, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
  );
}

export function monthYearLabel(date: string) {
  return capitalize(formatDate(date, { month: "long", year: "numeric" }));
}

export function shortWeekday(date: string) {
  return capitalize(formatDate(date, { weekday: "short" }));
}

export function timezoneLabel(timezone: string, date: string) {
  try {
    return (
      new Intl.DateTimeFormat("es-AR", {
        timeZone: timezone,
        timeZoneName: "short",
      })
        .formatToParts(new Date(`${date}T12:00:00Z`))
        .find((part) => part.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

export function normalizePhone(value: string) {
  return value.trim().replace(/[\s().-]/g, "");
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-AR"))
    .join("");
}
