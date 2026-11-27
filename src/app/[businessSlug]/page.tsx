import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicBookingPage } from "@/features/public-booking/public-booking-flow";
import { getPublicBusinessBySlug } from "@/server/business/public-business";
import type { PageTheme } from "@/server/db/schema";

// La página es la misma para todos hasta que el negocio edite su configuración.
// La disponibilidad real se consulta en vivo por server action al reservar.
export const revalidate = 60;

// Habilita ISR on-demand sin consultar la base durante el build: la primera
// visita de cada slug genera y cachea la página; las siguientes salen de caché
// hasta que venza el minuto o el panel invalide la ruta.
export async function generateStaticParams() {
  return [];
}

const defaultTheme: PageTheme = {
  schema_version: 1,
  palette: {
    background: "#f7f7f4",
    surface: "#ffffff",
    text: "#202c42",
    text_secondary: "#596879",
    brand: "#a32e3b",
    on_brand: "#ffffff",
  },
  heading_font: "manrope",
  body_font: "manrope",
};

function localDateInTimezone(timezone: string, date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const business = await getPublicBusinessBySlug(businessSlug);
  if (!business) return { title: "Reservas no disponibles · Turnow" };
  return {
    title: `${business.name} · Reservá tu turno`,
    description:
      business.description ??
      `Consultá horarios y reservá tu turno en ${business.name}.`,
  };
}

export default async function PublicBusinessPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getPublicBusinessBySlug(businessSlug);
  if (!business) notFound();
  const today = localDateInTimezone(business.timezone);

  return (
    <PublicBookingPage
      key={business.id}
      businessSlug={business.slug}
      businessName={business.name}
      headline={business.headline}
      description={business.description}
      contactEmail={business.contactEmail}
      socialLinks={business.socialLinks ?? {}}
      theme={business.theme ?? defaultTheme}
      currency={business.currency}
      timezone={business.timezone}
      locations={business.locations}
      services={business.services}
      professionals={business.professionals}
      allowAnyProfessional={business.allowAnyProfessional}
      cancellationNoticeMinutes={business.cancellationNoticeMinutes}
      today={today}
      maxDate={addCalendarDays(today, business.horizonDays)}
      enabled={business.publicBookingEnabled}
    />
  );
}
