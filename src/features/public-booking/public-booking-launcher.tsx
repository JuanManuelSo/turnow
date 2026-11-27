"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import type { BookingWizardProps } from "./public-booking-wizard";

let wizardModule: Promise<typeof import("./public-booking-wizard")> | null = null;

function loadWizard() {
  wizardModule ??= import("./public-booking-wizard");
  return wizardModule;
}

const PublicBookingWizard = dynamic(
  () => loadWizard().then((module) => module.PublicBookingWizard),
  { ssr: false, loading: () => <WizardSkeleton /> },
);

type BookingContextValue = {
  openBooking: (serviceId?: string) => void;
  prefetch: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("Los botones de reserva deben estar dentro de BookingProvider.");
  }
  return context;
}

export function BookButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { openBooking, prefetch } = useBooking();
  return (
    <button
      type="button"
      onClick={() => openBooking()}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      className={className}
    >
      {children}
    </button>
  );
}

export function ServiceButton({
  serviceId,
  label,
  className,
  children,
}: {
  serviceId: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const { openBooking, prefetch } = useBooking();
  return (
    <button
      type="button"
      onClick={() => openBooking(serviceId)}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      aria-label={label}
      className={className}
    >
      {children}
    </button>
  );
}

export function BookingProvider({
  businessSlug,
  currency,
  timezone,
  locations,
  services,
  professionals,
  allowAnyProfessional,
  cancellationNoticeMinutes,
  today,
  maxDate,
  canBook,
  enabled,
  contactHref,
  bookingStyle,
  children,
}: Omit<BookingWizardProps, "idempotencyKey" | "initialServiceId" | "onExit"> & {
  canBook: boolean;
  enabled: boolean;
  contactHref: string | null;
  bookingStyle: CSSProperties;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>();
  // Se genera en el navegador al abrir la reserva: así la página se puede cachear.
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const prefetch = useCallback(() => {
    void loadWizard();
  }, []);

  const openBooking = useCallback((serviceId?: string) => {
    setSelectedServiceId(serviceId);
    setSessionKey(crypto.randomUUID());
    setOpen(true);
  }, []);

  // Esperamos dos frames para que el esqueleto llegue a pintarse y recién ahí
  // montamos el wizard en una transición. Sin esto, el render pesado del wizard
  // bloquea el hilo antes del primer paint y el clic se siente lento.
  useEffect(() => {
    if (!open) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        startTransition(() => setShowWizard(true));
      });
    });
    return () => {
      cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
    };
  }, [open, startTransition]);

  const closeBooking = useCallback(() => {
    setOpen(false);
    setShowWizard(false);
    setSelectedServiceId(undefined);
    setSessionKey(null);
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }, []);

  useEffect(() => {
    if (open) window.scrollTo({ top: 0, left: 0 });
  }, [open]);

  // Precarga el wizard cuando el navegador está libre: al hacer clic ya está listo.
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => void loadWizard(), {
        timeout: 2500,
      });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => void loadWizard(), 1500);
    return () => window.clearTimeout(id);
  }, []);

  const contextValue = useMemo(
    () => ({ openBooking, prefetch }),
    [openBooking, prefetch],
  );

  return (
    <BookingContext.Provider value={contextValue}>
      {open ? (
        <section
          id="reservar"
          style={bookingStyle}
          className="min-h-[calc(100svh-88px)] scroll-mt-8 bg-[var(--pb-page-background)] px-[clamp(20px,5vw,72px)] py-[clamp(28px,4vw,48px)] max-[600px]:px-5 max-[600px]:py-6"
          aria-label="Reserva de turno"
        >
          <div className="mx-auto w-full max-w-[1180px]">
            {canBook && sessionKey ? (
              showWizard ? (
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
                <WizardSkeleton />
              )
            ) : (
              <BookingUnavailable
                enabled={enabled}
                contactHref={contactHref}
                onExit={closeBooking}
              />
            )}
          </div>
        </section>
      ) : (
        children
      )}
    </BookingContext.Provider>
  );
}

function BookingUnavailable({
  enabled,
  contactHref,
  onExit,
}: {
  enabled: boolean;
  contactHref: string | null;
  onExit: () => void;
}) {
  return (
    <div className="max-w-[640px] py-4">
      <button
        type="button"
        className="flex min-h-11 items-center gap-2 px-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
        onClick={onExit}
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
  );
}

function WizardSkeleton() {
  return (
    <div className="py-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando la reserva…</span>
      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-20 max-[1100px]:grid-cols-[minmax(0,1fr)_270px] max-[1100px]:gap-10 max-[900px]:mx-auto max-[900px]:max-w-[680px] max-[900px]:grid-cols-1 max-[900px]:pb-10">
        <div
          className="min-w-0 animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        >
          <div className="flex min-h-11 items-center gap-2">
            <div className="size-4 rounded-sm bg-[#dfe6ee]" />
            <div className="h-3 w-32 rounded-full bg-[#dfe6ee]" />
          </div>

          <div className="my-6 mb-9 flex items-center justify-between gap-2 border-b border-border pb-[18px] max-[600px]:my-3 max-[600px]:mb-[26px] max-[600px]:pb-3.5">
            {[0, 1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center gap-[7px]">
                <div
                  className={`size-[23px] shrink-0 rounded-full border-2 ${
                    step === 0
                      ? "border-[#af2433] bg-[#f3dfe1]"
                      : "border-border bg-surface"
                  }`}
                />
                <div className="hidden h-2.5 w-16 rounded-full bg-[#dfe6ee] min-[901px]:block" />
              </div>
            ))}
          </div>

          <div className="h-[2.35rem] w-[min(420px,80%)] rounded-md bg-[#dfe6ee]" />
          <div className="mt-4 h-4 w-[min(560px,90%)] rounded-full bg-[#e8eef5]" />
          <div className="mt-2 h-4 w-[min(420px,70%)] rounded-full bg-[#e8eef5]" />

          <div className="mt-7 grid gap-3">
            {[0, 1, 2].map((card) => (
              <div
                key={card}
                className="flex min-h-[116px] items-center justify-between gap-4 rounded-md border border-border bg-surface p-5"
              >
                <div className="grid w-full gap-2.5">
                  <div className="h-4 w-40 max-w-full rounded-full bg-[#dfe6ee]" />
                  <div className="h-3 w-56 max-w-full rounded-full bg-[#e8eef5]" />
                  <div className="h-3 w-24 rounded-full bg-[#e8eef5]" />
                </div>
                <div className="h-4 w-16 shrink-0 rounded-full bg-[#dfe6ee]" />
              </div>
            ))}
          </div>
        </div>

        <aside
          className="sticky top-6 hidden rounded-lg border border-border bg-surface p-6 min-[901px]:block"
          aria-hidden="true"
        >
          <div className="h-4 w-20 rounded-full bg-[#dfe6ee]" />
          <div className="mt-6 grid gap-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="grid gap-2">
                <div className="h-2.5 w-16 rounded-full bg-[#e8eef5]" />
                <div className="h-3.5 w-36 max-w-full rounded-full bg-[#dfe6ee]" />
              </div>
            ))}
          </div>
          <div className="mt-7 border-t border-border pt-5">
            <div className="h-2.5 w-full rounded-full bg-[#e8eef5]" />
            <div className="mt-2 h-2.5 w-4/5 rounded-full bg-[#e8eef5]" />
          </div>
        </aside>
      </div>
    </div>
  );
}
