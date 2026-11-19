"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  ExternalLink,
  Facebook,
  Globe2,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { business as referenceBusiness } from "@/config/business";
import type { PageTheme } from "@/server/db/schema";
import type {
  PublicLocation,
  PublicProfessional,
  PublicService,
} from "./public-booking-types";
import { PublicBookingWizard } from "./public-booking-wizard";
import { money } from "./public-booking-utils";
import {
  PublicPageFooter,
  PublicPageHeader,
  publicPageStyle,
} from "./public-page-chrome";

export function PublicBookingPage({
  businessSlug,
  businessName,
  headline,
  description,
  contactEmail,
  socialLinks,
  theme,
  currency,
  timezone,
  locations,
  services,
  professionals,
  allowAnyProfessional,
  cancellationNoticeMinutes,
  today,
  maxDate,
  enabled,
  idempotencyKey,
}: {
  businessSlug: string;
  businessName: string;
  headline: string | null;
  description: string | null;
  contactEmail: string | null;
  socialLinks: Record<string, string>;
  theme: PageTheme;
  currency: string;
  timezone: string;
  locations: PublicLocation[];
  services: PublicService[];
  professionals: PublicProfessional[];
  allowAnyProfessional: boolean;
  cancellationNoticeMinutes: number;
  today: string;
  maxDate: string;
  enabled: boolean;
  idempotencyKey: string;
}) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>();
  const [sessionKey, setSessionKey] = useState(idempotencyKey);
  const isReferenceBusiness = businessSlug === "peluqueria-de-hombres";
  const canBook =
    enabled &&
    services.some((service) =>
      professionals.some(
        (person) =>
          person.serviceId === service.id &&
          locations.some((location) => location.id === person.locationId),
      ),
    );

  useEffect(() => {
    if (bookingOpen) window.scrollTo({ top: 0, left: 0 });
  }, [bookingOpen]);

  function openBooking(serviceId?: string) {
    setSelectedServiceId(serviceId);
    setSessionKey(crypto.randomUUID());
    setBookingOpen(true);
  }

  function closeBooking() {
    setBookingOpen(false);
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }

  const socialTargets = [
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "website", label: "Sitio web" },
  ].flatMap((item) => {
    const value = socialLinks[item.key]?.trim();
    if (!value) return [];
    if (item.key === "instagram" && /^@[\w.]+$/.test(value)) {
      return [{ ...item, href: `https://instagram.com/${value.slice(1)}` }];
    }
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || url.protocol === "http:")
        return [{ ...item, href: url.toString() }];
    } catch {
      /* Invalid or unsafe URLs are not rendered as links. */
    }
    return [];
  });
  const firstPhone =
    locations.find((location) => location.contactPhone)?.contactPhone ?? null;
  const contactHref =
    socialTargets.find((item) => item.key === "whatsapp")?.href ??
    (firstPhone ? `tel:${firstPhone.replace(/[^+\d]/g, "")}` : null) ??
    (contactEmail ? `mailto:${contactEmail}` : null);
  const dayNames = [
    "",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  function formatHours(intervals: PublicLocation["weeklyIntervals"]) {
    const byDay = new Map<number, string[]>();
    for (const interval of intervals) {
      const range = `${String(Math.floor(interval.startMinute / 60)).padStart(2, "0")}:${String(interval.startMinute % 60).padStart(2, "0")}–${String(Math.floor(interval.endMinute / 60)).padStart(2, "0")}:${String(interval.endMinute % 60).padStart(2, "0")}`;
      byDay.set(interval.weekday, [
        ...(byDay.get(interval.weekday) ?? []),
        range,
      ]);
    }
    const groups = new Map<string, number[]>();
    for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
      const ranges = [...new Set(byDay.get(day))].sort();
      const key = ranges.join(" · ");
      groups.set(key, [...(groups.get(key) ?? []), day]);
    }
    return (
      [...groups]
        .map(([ranges, days]) => {
          const dayLabel =
            days.length > 1 &&
            days.every(
              (day, index) => index === 0 || day === days[index - 1] + 1,
            )
              ? `${dayNames[days[0]]} a ${dayNames[days.at(-1)!]}`
              : days.map((day) => dayNames[day]).join(", ");
          return `${dayLabel} · ${ranges}`;
        })
        .join("  /  ") || "Horarios por confirmar"
    );
  }
  function safeExternalUrl(value: string | null) {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:"
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  }
  function mapsHref(location: PublicLocation) {
    const explicit = safeExternalUrl(location.mapUrl);
    if (explicit) return explicit;
    const query = [
      location.addressText || location.name,
      isReferenceBusiness ? referenceBusiness.city : null,
    ]
      .filter(Boolean)
      .join(", ");
    return query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : null;
  }
  function breakEmail(value: string) {
    const at = value.lastIndexOf("@");
    if (at < 0) return value;
    return (
      <>
        {value.slice(0, at + 1)}
        <wbr />
        {value.slice(at + 1)}
      </>
    );
  }
  const pageStyle = publicPageStyle(theme, isReferenceBusiness);
  const bookingStyle = {
    ...pageStyle,
    "--brand": "var(--pb-page-brand)",
    "--on-brand": "var(--pb-page-on-brand)",
    "--brand-soft": "color-mix(in srgb, var(--pb-page-brand) 9%, white)",
    "--on-brand-soft": "var(--pb-page-brand-strong)",
    "--text-primary": "var(--pb-page-text)",
    "--text-secondary": "var(--pb-page-muted)",
    "--surface": "var(--pb-page-surface)",
    "--surface-muted": "#eef2f6",
    "--border-subtle": "#d5dfeb",
    "--border-control": "#b7c0c8",
    "--focus-ring": "var(--pb-page-brand)",
  } as CSSProperties;

  return (
    <main
      className="public-booking-page min-h-screen bg-[var(--pb-page-background)] text-[var(--pb-page-text)]"
      style={pageStyle}
    >
      {bookingOpen ? (
        <section
          id="reservar"
          style={bookingStyle}
          className="min-h-[calc(100svh-88px)] scroll-mt-8 bg-[var(--pb-page-background)] px-[clamp(20px,5vw,72px)] py-[clamp(28px,4vw,48px)] max-[600px]:px-5 max-[600px]:py-6"
          aria-label="Reserva de turno"
        >
          <div className="mx-auto w-full max-w-[1180px]">
            {canBook ? (
              <PublicBookingWizard
                key={`${selectedServiceId ?? "any"}-${sessionKey}`}
                businessSlug={businessSlug}
                currency={currency}
                timezone={timezone}
                locations={locations}
                services={services}
                professionals={professionals}
                allowAnyProfessional={allowAnyProfessional}
                cancellationNoticeMinutes={cancellationNoticeMinutes}
                today={today}
                maxDate={maxDate}
                idempotencyKey={sessionKey}
                initialServiceId={selectedServiceId}
                onExit={closeBooking}
              />
            ) : (
              <div className="max-w-[640px] py-4">
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 px-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={closeBooking}
                >
                  <ArrowLeft size={16} />
                  Volver al estudio
                </button>
                <p className="mt-6 text-xs font-extrabold tracking-[.13em] text-brand uppercase">
                  Reservas online
                </p>
                <h1
                  className="mt-3 text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-[-.05em]"
                  id="pb-booking-title"
                >
                  {enabled
                    ? "Estamos preparando la agenda."
                    : "Las reservas online todavía no están habilitadas."}
                </h1>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  {enabled
                    ? "Comunicate con el negocio para coordinar tu turno."
                    : "Podés consultar por teléfono o por los enlaces de contacto publicados."}
                </p>
                {contactHref && (
                  <a
                    href={contactHref}
                    className="mt-5 inline-flex min-h-11 items-center font-bold text-foreground underline underline-offset-4"
                  >
                    Contactar al negocio
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          <PublicPageHeader
            businessSlug={businessSlug}
            businessName={businessName}
            isReferenceBusiness={isReferenceBusiness}
            actionHref={`/${businessSlug}/cancelar`}
            actionLabel="Cancelar turno"
          />

          <section className="mx-auto grid min-h-[calc(100svh-80px)] max-w-[1440px] grid-cols-[minmax(0,1.12fr)_minmax(300px,.88fr)] items-center gap-[clamp(32px,6vw,88px)] px-[clamp(20px,5vw,72px)] py-[clamp(56px,7vw,96px)] max-[800px]:grid-cols-1 max-[800px]:gap-9 max-[600px]:gap-7 max-[600px]:px-5 max-[600px]:py-8">
            <div className="max-w-[690px]">
              <h1 className="max-w-[720px] whitespace-pre-line text-[clamp(3.5rem,7.2vw,6rem)] leading-[.98] tracking-[-.06em] max-[800px]:text-[clamp(2.75rem,10vw,4.75rem)] max-[600px]:text-[clamp(2.625rem,10.5vw,3.75rem)]">
                {headline?.trim() ||
                  (isReferenceBusiness
                    ? referenceBusiness.slogan.join("\n")
                    : `Reservá tu turno en ${businessName}`)}
              </h1>
              <p className="mt-6 max-w-[42ch] text-[1.0625rem] leading-[1.65] text-[var(--pb-page-muted)] max-[600px]:mt-[18px] max-[600px]:text-base">
                {description?.trim() ||
                  (isReferenceBusiness
                    ? referenceBusiness.description
                    : "Elegí tu sede, consultá los horarios y reservá tu próximo turno.")}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 max-[600px]:mt-7 max-[600px]:items-stretch">
                <button
                  type="button"
                  onClick={() => openBooking()}
                  className="inline-flex min-h-14 items-center justify-center gap-4 rounded bg-[var(--pb-page-brand)] px-6 text-base font-extrabold text-[var(--pb-page-on-brand)] shadow-[0_4px_12px_rgb(20_43_73_/_0.14)] transition hover:-translate-y-0.5 hover:bg-[color:var(--pb-page-brand-strong)] active:translate-y-0 max-[600px]:w-full"
                >
                  Reservar turno <ArrowRight size={19} aria-hidden="true" />
                </button>
                <a
                  href={`/${businessSlug}/cancelar`}
                  className="inline-flex min-h-11 items-center font-bold text-[var(--pb-page-text)] underline underline-offset-4 max-[600px]:justify-center"
                >
                  Cancelar turno
                </a>
              </div>
              <p className="mt-4 text-sm text-[var(--pb-page-muted)]">
                Sin cuenta. Elegís, reservás y listo.
              </p>
            </div>

            <aside
              id="informacion"
              className="rounded-lg bg-[#e8eef5] p-[clamp(24px,3vw,40px)] text-[#17385f] max-[600px]:p-5"
              aria-labelledby="pb-location-title"
            >
              <h2
                id="pb-location-title"
                className="mb-6 flex items-start gap-3.5 text-[clamp(1.375rem,2.1vw,1.75rem)] leading-[1.18] font-bold tracking-[-.04em]"
              >
                <MapPin
                  size={25}
                  className="mt-1 shrink-0 text-[var(--pb-page-brand)]"
                  aria-hidden="true"
                />
                <span>
                  Encontrá tu sede
                  {isReferenceBusiness && (
                    <>
                      <br />
                      en {referenceBusiness.city}.
                    </>
                  )}
                </span>
              </h2>
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {locations.map((location) => {
                  const mapHref = mapsHref(location);
                  const address = location.addressText || location.name;
                  return (
                    <li key={location.id}>
                      {mapHref ? (
                        <a
                          href={mapHref}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir en Google Maps"
                          className="group flex min-h-[52px] items-center justify-between gap-3 rounded border border-[#b7cbe0] bg-white px-3.5 py-2.5 text-[.95rem] font-bold text-[#17385f] no-underline transition-colors hover:border-[var(--pb-page-brand)] hover:text-[color:var(--pb-page-brand)]"
                        >
                          <span>{address}</span>
                          <ExternalLink
                            size={17}
                            className="shrink-0 text-[var(--pb-page-brand)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </a>
                      ) : (
                        <div className="flex min-h-[52px] items-center justify-between gap-3 rounded border border-[#b7cbe0] bg-white px-3.5 py-2.5 text-[.95rem] font-bold text-[#17385f]">
                          <span>{address}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
                {!locations.length && (
                  <li className="rounded border border-dashed border-[#9eb5ce] px-4 py-3 text-sm">
                    Las sedes se publicarán cuando estén configuradas.
                  </li>
                )}
              </ul>

              <div className="mt-6 border-t border-[#c6d4e3] pt-5">
                <h3 className="flex items-center gap-3 text-base font-bold">
                  <Clock3
                    size={21}
                    className="text-[var(--pb-page-brand)]"
                    aria-hidden="true"
                  />{" "}
                  Horarios de atención
                </h3>
                <ul className="mt-3 grid list-none gap-3 pl-[34px] text-sm leading-relaxed text-[#405a78]">
                  {locations.map((location) => (
                    <li key={location.id}>
                      <strong className="block text-[#17385f]">
                        {location.name}
                      </strong>
                      {formatHours(location.weeklyIntervals)}
                    </li>
                  ))}
                  {!locations.length && (
                    <li>Los horarios se mostrarán al configurar una sede.</li>
                  )}
                </ul>
                <p className="mt-3 pl-[34px] text-xs leading-relaxed text-[#516985]">
                  Los turnos disponibles pueden variar según el servicio y el
                  profesional.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-5 border-t border-[#c6d4e3] pt-5 [&_a]:min-w-0 [&_span]:min-w-0 [&_strong]:[overflow-wrap:anywhere] max-[600px]:grid-cols-1">
                {locations
                  .filter((location) => location.contactPhone)
                  .map((location) => (
                    <a
                      key={location.id}
                      href={`tel:${location.contactPhone!.replace(/[^+\d]/g, "")}`}
                      className="flex min-h-12 items-center gap-3 text-sm text-[#405a78] no-underline"
                    >
                      <Phone
                        size={21}
                        className="shrink-0 text-[var(--pb-page-brand)]"
                        aria-hidden="true"
                      />{" "}
                      <span>
                        <small className="block">
                          Teléfono · {location.name}
                        </small>
                        <strong className="text-[#17385f]">
                          {location.contactPhone}
                        </strong>
                      </span>
                    </a>
                  ))}
                {socialTargets.map((item) => {
                  const SocialIcon =
                    item.key === "instagram"
                      ? Instagram
                      : item.key === "facebook"
                        ? Facebook
                        : item.key === "whatsapp"
                          ? MessageCircle
                          : Globe2;
                  return (
                    <a
                      key={item.key}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-12 items-center gap-3 text-sm text-[#405a78] no-underline"
                    >
                      <SocialIcon
                        size={21}
                        className="shrink-0 text-[var(--pb-page-brand)]"
                        aria-hidden="true"
                      />{" "}
                      <span>
                        <small className="block">{item.label}</small>
                        <strong className="text-[#17385f]">
                          {item.key === "instagram" &&
                          socialLinks.instagram?.startsWith("@")
                            ? socialLinks.instagram
                            : `Contactar por ${item.label}`}
                        </strong>
                      </span>
                    </a>
                  );
                })}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex min-h-12 items-center gap-3 text-sm text-[#405a78] no-underline"
                  >
                    <Mail
                      size={21}
                      className="shrink-0 text-[var(--pb-page-brand)]"
                      aria-hidden="true"
                    />
                    <span>
                      <small className="block">Email</small>
                      <strong className="text-[#17385f]">
                        {breakEmail(contactEmail)}
                      </strong>
                    </span>
                  </a>
                )}
              </div>
            </aside>
          </section>

          <div className="border-t border-[#d5dfeb]" aria-hidden="true" />
          <section
            className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] gap-[clamp(40px,8vw,120px)] px-[clamp(20px,5vw,72px)] py-12 max-[900px]:grid-cols-1 max-[600px]:gap-7"
            aria-labelledby="services-title"
          >
            <div>
              <h2
                id="services-title"
                className="text-[clamp(1.8rem,2.5vw,2.25rem)] leading-[1.1] tracking-[-.05em]"
              >
                Elegí el servicio
                <br />
                para tu próximo turno.
              </h2>
              <p className="mt-4 text-[var(--pb-page-muted)]">
                Reservá en la sede que te quede mejor.
              </p>
            </div>
            <ul className="m-0 grid list-none p-0">
              {services.map((service) => (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => openBooking(service.id)}
                    aria-label={`Reservar ${service.name}`}
                    className="group flex min-h-[76px] w-full items-center justify-between gap-4 border-b border-[#d5dfeb] py-4 text-left text-sm transition-colors hover:border-[var(--pb-page-brand)] hover:text-[color:var(--pb-page-brand)]"
                  >
                    <span className="grid gap-2">
                      <strong>{service.name}</strong>
                      <small className="text-[var(--pb-page-muted)] transition-colors group-hover:text-[color:var(--pb-page-brand)]">
                        {service.duration} min
                      </small>
                    </span>
                    <span className="flex items-center gap-5 font-bold">
                      {service.showPrice &&
                        money(service.priceMinor, currency)}
                      <ArrowRight
                        size={17}
                        className="transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <PublicPageFooter
        businessName={businessName}
        isReferenceBusiness={isReferenceBusiness}
      />
    </main>
  );
}
