"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  Copy,
  MapPin,
} from "lucide-react";
import {
  createPublicBooking,
  getPublicAvailability,
  type PublicBookingState,
} from "@/app/[businessSlug]/actions";
import { Button, Choice, Empty, FormField, Input } from "@/components/ui";
import type {
  PublicLocation,
  PublicProfessional,
  PublicService,
  PublicSlot,
} from "./public-booking-types";
import {
  addDays,
  dateLabel,
  initials,
  money,
  monthYearLabel,
  normalizePhone,
  shortWeekday,
  timezoneLabel,
} from "./public-booking-utils";

const steps = [
  "Servicio",
  "Sede y profesional",
  "Horario",
  "Tus datos",
  "Revisión",
];

const stepHeadings = [
  "Elegí un servicio.",
  "Elegí sede y profesional.",
  "Elegí día y horario.",
  "Tus datos de contacto.",
  "Revisá tu turno.",
];

const stepDescriptions = [
  "Elegí el servicio que querés reservar. Vas a ver el precio y la duración antes de continuar.",
  "Elegí dónde y con quién querés atenderte.",
  "Primero elegí el día; después, uno de los horarios disponibles.",
  "Completá tu nombre y teléfono para dejar la reserva a tu nombre.",
  "Confirmá que el servicio, el horario y tus datos estén bien.",
];

const initialState: PublicBookingState = {};
const phonePattern = /^\+[1-9]\d{7,14}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BookingWizardProps = {
  businessSlug: string;
  currency: string;
  timezone: string;
  locations: PublicLocation[];
  services: PublicService[];
  professionals: PublicProfessional[];
  allowAnyProfessional: boolean;
  cancellationNoticeMinutes: number;
  today: string;
  maxDate: string;
  idempotencyKey: string;
  initialServiceId?: string;
  onExit: () => void;
};

export function PublicBookingWizard({
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
  idempotencyKey: initialIdempotencyKey,
  initialServiceId,
  onExit,
}: BookingWizardProps) {
  const bookableServices = useMemo(
    () =>
      services.filter(
        (service) =>
          professionals.some((person) => person.serviceId === service.id) &&
          professionals.some(
            (person) =>
              person.serviceId === service.id &&
              locations.some((location) => location.id === person.locationId),
          ),
      ),
    [services, professionals, locations],
  );
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(() => {
    if (
      initialServiceId &&
      bookableServices.some((service) => service.id === initialServiceId)
    ) {
      return initialServiceId;
    }
    return bookableServices[0]?.id ?? "";
  });
  const [locationId, setLocationId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(today <= maxDate ? today : maxDate);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(initialIdempotencyKey);
  const [availability, setAvailability] = useState<{
    key: string;
    slots: PublicSlot[];
    error?: string;
  } | null>(null);
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);
  const [error, setError] = useState("");
  const [contactErrors, setContactErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});
  const [dismissedActionError, setDismissedActionError] = useState<string | null>(
    null,
  );
  const [showServerFields, setShowServerFields] = useState(true);
  const [copied, setCopied] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);
  const [state, action, pending] = useActionState(
    createPublicBooking.bind(null, businessSlug),
    initialState,
  );

  const selectedService = services.find((service) => service.id === serviceId);
  const selectedLocation = locations.find(
    (location) => location.id === locationId,
  );
  const serviceLocations = useMemo(
    () =>
      locations.filter((location) =>
        professionals.some(
          (person) =>
            person.locationId === location.id && person.serviceId === serviceId,
        ),
      ),
    [locations, professionals, serviceId],
  );
  const eligibleProfessionals = useMemo(
    () =>
      professionals.filter(
        (person) =>
          person.locationId === locationId && person.serviceId === serviceId,
      ),
    [professionals, locationId, serviceId],
  );
  const conflictActive = Boolean(
    state.error &&
      state.error !== dismissedActionError &&
      /acaba de ocuparse|ya pasó|ya no está disponible/i.test(state.error),
  );
  const currentStep = conflictActive ? 2 : step;
  const effectiveTime = conflictActive ? "" : time;
  const availabilityKey = [locationId, serviceId, professionalId, date].join(
    ":",
  );

  useEffect(() => {
    heading.current?.focus();
  }, [currentStep]);

  useEffect(() => {
    if (!state.result) return;
    window.scrollTo({ top: 0, left: 0 });
    confirmationHeading.current?.focus();
  }, [state.result]);

  useEffect(() => {
    if (currentStep !== 2) return;
    if (!locationId || !serviceId || !professionalId || !date) return;
    let active = true;
    getPublicAvailability(businessSlug, {
      locationId,
      serviceId,
      professionalId,
      date,
    })
      .then((result) => {
        if (active) setAvailability({ ...result, key: availabilityKey });
      })
      .catch(() => {
        if (active) {
          setAvailability({
            key: availabilityKey,
            slots: [],
            error: "No pudimos consultar los horarios. Probá nuevamente.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [
    currentStep,
    businessSlug,
    locationId,
    serviceId,
    professionalId,
    date,
    availabilityKey,
    availabilityRefresh,
  ]);

  const currentAvailability =
    availability?.key === availabilityKey ? availability : null;
  const slots = useMemo(() => {
    if (!currentAvailability) return [];
    const unique = new Map<string, PublicSlot>();
    currentAvailability.slots.forEach((slot) => {
      if (!unique.has(slot.time)) unique.set(slot.time, slot);
    });
    return [...unique.values()];
  }, [currentAvailability]);
  const slotGroups = [
    { label: "Mañana", slots: slots.filter((slot) => slot.time < "14:00") },
    { label: "Tarde", slots: slots.filter((slot) => slot.time >= "14:00") },
  ];
  const quickDateStart = date < addDays(today, 7) ? today : date;
  const quickDates = Array.from({ length: 7 }, (_, index) =>
    addDays(quickDateStart, index),
  ).filter((value) => value >= today && value <= maxDate);
  const visibleActionError =
    state.error && state.error !== dismissedActionError ? state.error : "";
  const nameError =
    contactErrors.name ??
    (showServerFields ? state.fields?.customerName : undefined);
  const phoneError =
    contactErrors.phone ??
    (showServerFields ? state.fields?.customerPhone : undefined);
  const emailError =
    contactErrors.email ??
    (showServerFields ? state.fields?.customerEmail : undefined);
  const timezoneHint = timezoneLabel(timezone, date);

  function resetIdempotencyKey() {
    setIdempotencyKey(crypto.randomUUID());
  }

  function clearFeedback() {
    setError("");
    setContactErrors({});
    setDismissedActionError(state.error ?? "");
    setShowServerFields(false);
  }

  function changeService(nextServiceId: string) {
    if (nextServiceId === serviceId) return;
    const nextLocationId =
      locationId &&
      professionals.some(
        (person) =>
          person.locationId === locationId &&
          person.serviceId === nextServiceId,
      )
        ? locationId
        : "";
    const nextEligible = professionals.filter(
      (person) =>
        person.locationId === nextLocationId &&
        person.serviceId === nextServiceId,
    );
    setServiceId(nextServiceId);
    setLocationId(nextLocationId);
    setProfessionalId(
      nextLocationId
        ? allowAnyProfessional
          ? "any"
          : (nextEligible[0]?.id ?? "")
        : "",
    );
    setTime("");
    resetIdempotencyKey();
    clearFeedback();
  }

  function changeLocation(nextLocationId: string) {
    if (nextLocationId === locationId) return;
    const nextEligible = professionals.filter(
      (person) =>
        person.locationId === nextLocationId && person.serviceId === serviceId,
    );
    setLocationId(nextLocationId);
    setProfessionalId(
      allowAnyProfessional ? "any" : (nextEligible[0]?.id ?? ""),
    );
    setTime("");
    resetIdempotencyKey();
    clearFeedback();
  }

  function changeProfessional(nextProfessionalId: string) {
    if (nextProfessionalId === professionalId) return;
    setProfessionalId(nextProfessionalId);
    setTime("");
    resetIdempotencyKey();
    clearFeedback();
  }

  function changeDate(nextDate: string) {
    if (!nextDate || nextDate === date) return;
    if (conflictActive) setStep(2);
    setDate(nextDate);
    setTime("");
    resetIdempotencyKey();
    clearFeedback();
  }

  function selectTime(nextTime: string) {
    if (conflictActive) setStep(2);
    setTime(nextTime);
    resetIdempotencyKey();
    clearFeedback();
  }

  function next() {
    setError("");
    if (currentStep === 0 && !serviceId) {
      setError("Elegí un servicio para continuar.");
      return;
    }
    if (currentStep === 1) {
      if (!locationId) {
        setError("Elegí una sede para continuar.");
        return;
      }
      if (!professionalId) {
        setError("Elegí un profesional para continuar.");
        return;
      }
    }
    if (currentStep === 2 && !effectiveTime) {
      setError("Elegí un horario para continuar.");
      return;
    }
    if (currentStep === 3) {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = normalizePhone(phone);
      const nextErrors: { name?: string; email?: string; phone?: string } = {};
      if (!cleanName) nextErrors.name = "Ingresá tu nombre y apellido.";
      if (cleanEmail.length > 254 || !emailPattern.test(cleanEmail)) {
        nextErrors.email = "Ingresá un email válido.";
      }
      if (!phonePattern.test(cleanPhone)) {
        nextErrors.phone =
          "Usá el formato internacional, por ejemplo +5493415550100.";
      }
      if (nextErrors.name || nextErrors.email || nextErrors.phone) {
        setContactErrors(nextErrors);
        return;
      }
      setName(cleanName);
      setEmail(cleanEmail);
      setPhone(cleanPhone);
      setContactErrors({});
    }
    setStep((value) => value + 1);
  }

  function goToStep(target: number) {
    if (target > currentStep) return;
    setStep(target);
    setError("");
    setContactErrors({});
    setDismissedActionError(state.error ?? "");
  }

  function submitContactForm(event: FormEvent<HTMLFormElement>) {
    if (currentStep < steps.length - 1) {
      event.preventDefault();
      next();
      return;
    }
    setDismissedActionError(null);
    setShowServerFields(true);
    setError("");
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (state.result) {
    const result = state.result;
    return (
      <section
        className="pb-confirmation mx-auto grid w-full max-w-[760px] gap-[18px] py-6 pb-16 max-[600px]:py-2 max-[600px]:pb-10"
        aria-labelledby="pb-confirmed-title"
      >
        <div
          className="pb-confirmed-mark grid size-12 place-items-center rounded-full bg-[#e7f0eb] text-[#25604c]"
          aria-hidden="true"
        >
          <Check size={25} />
        </div>
        <p className="pb-eyebrow mb-0 text-xs font-extrabold tracking-[.13em] text-[#a32e3b] uppercase">
          Reserva confirmada
        </p>
        <h1
          className="text-[2rem] leading-[1.08] tracking-[-.05em] text-[#202c42] max-[600px]:text-[1.75rem]"
          id="pb-confirmed-title"
          ref={confirmationHeading}
          tabIndex={-1}
        >
          Tu turno ya está en la agenda.
        </h1>
        <p className="pb-confirmed-intro text-[.91rem] leading-[1.55] text-[#596879]">
          Guardá el código privado: lo vas a necesitar para consultar o cancelar
          la reserva.
        </p>
        <dl className="pb-summary m-0 grid border-t border-[#e5e8e8]">
          <ConfirmationRow label="Servicio">
            {result.serviceName} · {result.duration} min
          </ConfirmationRow>
          <ConfirmationRow label="Fecha y hora">
            {result.date} · {result.time}
          </ConfirmationRow>
          <ConfirmationRow label="Sede">
            {result.locationName}
            {result.locationAddress ? ` · ${result.locationAddress}` : ""}
          </ConfirmationRow>
          <ConfirmationRow label="Profesional">
            {result.professionalName}
          </ConfirmationRow>
          <ConfirmationRow label="Email">{result.customerEmail}</ConfirmationRow>
          {result.showPrice && (
            <ConfirmationRow label="Precio">
              {money(result.priceMinor, result.currency)}
            </ConfirmationRow>
          )}
        </dl>
        <div className="pb-code-block grid grid-cols-[minmax(0,1fr)_auto] gap-x-3.5 gap-y-2.5 rounded border border-[#d8dee3] bg-[#f6f8f9] p-4 max-[560px]:grid-cols-1">
          <span className="col-span-full text-xs font-bold text-[#596879] max-[560px]:col-auto">
            Código privado de reserva
          </span>
          <code className="self-center wrap-anywhere font-mono text-[.82rem] text-[#142b49]">
            {result.code}
          </code>
          <button
            type="button"
            className="inline-flex min-h-[42px] items-center justify-center gap-1.5 justify-self-start rounded border border-[#aebbc7] bg-white px-2.5 text-xs font-bold text-[#244e84] transition-colors hover:bg-[#f0f4f8] max-[560px]:px-3.5"
            onClick={() => void copyCode(result.code)}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied ? "Copiado" : "Copiar código"}
          </button>
        </div>
        <p className="pb-policy text-[.79rem] leading-[1.55] text-[#5b6876]">
          Podés cancelar hasta {result.cancellationNoticeMinutes} minutos antes
          del turno. Después, comunicate directamente con la sede.
        </p>
        <a
          className="pb-cancel-link text-sm font-extrabold text-[#244e84] underline underline-offset-4"
          href={`/${result.businessSlug}/cancelar`}
        >
          Consultar o cancelar con mi código
        </a>
        <Button variant="text" className="justify-self-start" onClick={onExit}>
          Volver al estudio
          <ArrowRight size={16} />
        </Button>
      </section>
    );
  }

  return (
    <form
      action={action}
      className="pb-booking-form"
      onSubmit={submitContactForm}
    >
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="professionalId" value={professionalId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />
      <input type="hidden" name="customerName" value={name} />
      <input type="hidden" name="customerEmail" value={email} />
      <input type="hidden" name="customerPhone" value={phone} />

      <div className="grid grid-cols-[minmax(0,1fr)_300px] items-start gap-20 py-4 max-[1100px]:grid-cols-[minmax(0,1fr)_270px] max-[1100px]:gap-10 max-[900px]:mx-auto max-[900px]:max-w-[680px] max-[900px]:grid-cols-1 max-[900px]:pb-10">
        <div className="min-w-0">
          <button
            type="button"
            className="flex min-h-11 items-center gap-2 px-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={onExit}
          >
            <ArrowLeft size={16} />
            Volver al estudio
          </button>

          <nav
            className="my-6 mb-9 border-b border-border pb-[18px] max-[600px]:my-3 max-[600px]:mb-[26px] max-[600px]:pb-3.5"
            aria-label="Pasos de reserva"
          >
            <span
              className="hidden text-sm font-bold max-[600px]:block"
              aria-live="polite"
            >
              Paso {currentStep + 1} de {steps.length}
              <span aria-hidden="true"> · </span>
              {steps[currentStep]}
            </span>
            <div className="flex w-full items-center justify-between gap-2 max-[600px]:relative max-[600px]:mt-2 max-[600px]:grid max-[600px]:grid-cols-5 max-[600px]:before:absolute max-[600px]:before:inset-x-[10%] max-[600px]:before:top-1/2 max-[600px]:before:h-px max-[600px]:before:bg-border max-[600px]:before:content-['']">
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  disabled={index > currentStep}
                  className={`relative z-10 flex min-h-11 items-center gap-[7px] px-0 text-left text-xs disabled:opacity-100 max-[600px]:min-w-0 max-[600px]:flex-col max-[600px]:justify-center max-[600px]:gap-1.5 ${index < currentStep ? "text-[#216e4e]" : ""}`}
                  aria-label={`Paso ${index + 1}: ${label}`}
                  aria-current={index === currentStep ? "step" : undefined}
                  onClick={() => goToStep(index)}
                >
                  <span
                    className={`grid size-[23px] shrink-0 place-items-center rounded-full border-2 text-[.6875rem] max-[600px]:size-6 ${
                      index < currentStep
                        ? "border-[#216e4e] bg-[#216e4e] text-white"
                        : index === currentStep
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-surface text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? <Check size={13} /> : index + 1}
                  </span>
                  <b className="font-semibold max-[600px]:sr-only">{label}</b>
                </button>
              ))}
            </div>
          </nav>

          <h1
            className="text-[2.35rem] leading-[1.14] tracking-[-.035em] max-[600px]:text-[2rem]"
            id="pb-booking-title"
            ref={heading}
            tabIndex={-1}
          >
            {stepHeadings[currentStep]}
          </h1>
          <p className="my-4 mb-7 max-w-[580px] text-[.9375rem] text-muted-foreground max-[600px]:my-[14px] max-[600px]:mb-6 max-[600px]:text-sm">
            {stepDescriptions[currentStep]}
          </p>

          {currentStep === 0 && (
            <>
              <div
                className="grid gap-3"
                role="group"
                aria-label="Elegí un servicio"
              >
                {bookableServices.map((service) => (
                  <Choice
                    key={service.id}
                    selected={serviceId === service.id}
                    className="min-h-[116px] rounded-md p-5 transition hover:-translate-y-px"
                    onClick={() => changeService(service.id)}
                  >
                    <span className="flex w-full items-center justify-between gap-4">
                      <span className="grid min-w-0 gap-1">
                        <strong className="text-base leading-[1.35]">
                          {service.name}
                        </strong>
                        {service.description && (
                          <span className="max-w-[42ch] text-[.8125rem] leading-[1.45] text-muted-foreground">
                            {service.description}
                          </span>
                        )}
                        <small className="mt-[5px] inline-flex items-center gap-1.5 text-xs">
                          <Clock3 size={14} aria-hidden="true" />
                          {service.duration} minutos
                        </small>
                      </span>
                      {service.showPrice && (
                        <span className="shrink-0 whitespace-nowrap text-base font-extrabold tabular-nums">
                          {money(service.priceMinor, currency)}
                        </span>
                      )}
                    </span>
                  </Choice>
                ))}
              </div>
              {!bookableServices.length && (
                <p
                  className="rounded border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
                  role="status"
                >
                  Todavía no hay servicios disponibles para reservar online.
                </p>
              )}
              <p className="mt-4 flex items-center gap-2 text-[.8125rem] text-muted-foreground max-[600px]:mx-0.5 max-[600px]:mt-3.5 max-[600px]:items-start max-[600px]:text-xs">
                <Check className="shrink-0 text-brand" size={16} aria-hidden="true" />
                <span>Pagás en el local. No necesitás crear una cuenta.</span>
              </p>
            </>
          )}

          {currentStep === 1 && (
            <div className="grid gap-7">
              <section aria-labelledby="pb-location-heading">
                <div className="mb-3.5 grid gap-1">
                  <h2 className="text-base font-bold" id="pb-location-heading">
                    Sede
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Elegí dónde querés atenderte.
                  </p>
                </div>
                <div
                  className="grid grid-cols-3 gap-2.5 max-[600px]:grid-cols-1 max-[600px]:gap-[9px]"
                  role="group"
                  aria-label="Elegí una sede"
                >
                  {serviceLocations.map((location) => {
                    const staffCount = professionals.filter(
                      (person) =>
                        person.locationId === location.id &&
                        person.serviceId === serviceId,
                    ).length;
                    return (
                      <Choice
                        key={location.id}
                        selected={locationId === location.id}
                        className="min-h-[118px] rounded-md p-4 transition hover:-translate-y-px hover:border-[#75879c] max-[600px]:min-h-[78px] max-[600px]:p-3.5"
                        onClick={() => changeLocation(location.id)}
                      >
                        <span className="grid w-full min-w-0 grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5 max-[600px]:grid-cols-[20px_minmax(0,1fr)_auto] max-[600px]:items-center">
                          <MapPin
                            className="mt-0.5 shrink-0 text-brand max-[600px]:mt-0"
                            size={20}
                            aria-hidden="true"
                          />
                          <span className="grid min-w-0 gap-1">
                            <strong className="text-sm font-bold">
                              {location.name}
                            </strong>
                            {location.addressText && (
                              <span className="text-xs text-muted-foreground">
                                {location.addressText}
                              </span>
                            )}
                          </span>
                          <span className="col-start-2 text-[.6875rem] text-muted-foreground max-[600px]:col-start-3 max-[600px]:row-start-1 max-[600px]:max-w-[74px] max-[600px]:text-right">
                            {staffCount}{" "}
                            {staffCount === 1 ? "profesional" : "profesionales"}
                          </span>
                        </span>
                      </Choice>
                    );
                  })}
                </div>
                {!serviceLocations.length && (
                  <p
                    className="rounded border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
                    role="status"
                  >
                    No hay sedes disponibles para este servicio.
                  </p>
                )}
              </section>

              {locationId ? (
                <section
                  className="border-t border-border pt-6"
                  aria-labelledby="pb-professional-heading"
                >
                  <div className="mb-3.5 grid gap-1">
                    <h2
                      className="text-base font-bold"
                      id="pb-professional-heading"
                    >
                      ¿Con quién?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Elegí a alguien o dejá que te asignemos según la
                      disponibilidad.
                    </p>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-2.5 max-[600px]:grid-cols-1 max-[600px]:gap-[9px]"
                    role="group"
                    aria-label="Elegí un profesional"
                  >
                    {allowAnyProfessional && (
                      <Choice
                        selected={professionalId === "any"}
                        className="min-h-[82px] rounded-md p-4 transition hover:-translate-y-px hover:border-[#75879c] max-[600px]:min-h-[72px] max-[600px]:px-3.5"
                        onClick={() => changeProfessional("any")}
                      >
                        <span className="grid min-w-0 gap-1">
                          <strong className="text-sm font-bold">
                            Cualquier profesional
                          </strong>
                          <span className="text-xs text-muted-foreground">
                            Te asignamos quien tenga un horario disponible.
                          </span>
                        </span>
                      </Choice>
                    )}
                    {eligibleProfessionals.map((person) => (
                      <Choice
                        key={person.id}
                        selected={professionalId === person.id}
                        className="min-h-[82px] rounded-md p-4 transition hover:-translate-y-px hover:border-[#75879c] max-[600px]:min-h-[72px] max-[600px]:px-3.5"
                        onClick={() => changeProfessional(person.id)}
                      >
                        <span className="flex items-center gap-3.5">
                          <span
                            className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-bold text-muted-foreground"
                            aria-hidden="true"
                          >
                            {initials(person.name)}
                          </span>
                          <span className="grid min-w-0 gap-1">
                            <strong className="text-sm font-bold">
                              {person.name}
                            </strong>
                            {person.description && (
                              <small className="text-xs text-muted-foreground">
                                {person.description}
                              </small>
                            )}
                          </span>
                        </span>
                      </Choice>
                    ))}
                  </div>
                </section>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={16} aria-hidden="true" />
                  Primero elegí una sede para ver sus profesionales.
                </p>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <>
              <div className="flex items-center justify-between gap-3 max-[600px]:flex-wrap">
                <h2 className="text-xl">{monthYearLabel(date)}</h2>
                <label className="flex items-center gap-2 text-xs">
                  <span>Elegir fecha</span>
                  <Input
                    id="pb-date"
                    type="date"
                    aria-label="Fecha"
                    min={today}
                    max={maxDate}
                    value={date}
                    onChange={(event) => changeDate(event.currentTarget.value)}
                    className="min-h-11 w-[135px] px-2 text-xs"
                  />
                </label>
              </div>
              <div className="my-5 grid grid-cols-7 gap-2 max-[600px]:my-4 max-[600px]:gap-1">
                {quickDates.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={dateLabel(value)}
                    aria-pressed={date === value}
                    className={`flex min-w-0 flex-col items-center gap-1.5 rounded-lg border px-1 py-3 text-xs transition-colors ${
                      date === value
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border bg-surface hover:border-brand"
                    }`}
                    onClick={() => changeDate(value)}
                  >
                    <span>{shortWeekday(value)}</span>
                    <strong className="text-xl">{Number(value.slice(-2))}</strong>
                    <small className="min-h-4 text-[.625rem]">
                      {date === value
                        ? "Elegido"
                        : value === today
                          ? "Hoy"
                          : value === addDays(today, 1)
                            ? "Mañana"
                            : " "}
                    </small>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border py-3 text-xs max-[600px]:flex-col max-[600px]:items-start">
                <span className="font-semibold">
                  {dateLabel(date)}
                  {selectedLocation ? ` · ${selectedLocation.name}` : ""}
                </span>
                <small className="text-muted-foreground">
                  Hora local{timezoneHint ? ` (${timezoneHint})` : ""}
                </small>
              </div>

              {!currentAvailability && (
                <p
                  className="mt-5 text-sm text-muted-foreground"
                  role="status"
                >
                  Consultando horarios…
                </p>
              )}
              {currentAvailability?.error && (
                <div className="mt-5 grid justify-items-start gap-3">
                  <p className="text-sm leading-relaxed text-danger" role="alert">
                    {currentAvailability.error}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setAvailabilityRefresh((value) => value + 1)
                    }
                  >
                    Reintentar
                  </Button>
                </div>
              )}
              {currentAvailability &&
                !currentAvailability.error &&
                !slots.length && (
                  <Empty
                    className="mt-5"
                    title="Este día no tiene horarios disponibles"
                    action="Elegir otra fecha"
                    onAction={() => {
                      const input = document.getElementById(
                        "pb-date",
                      ) as HTMLInputElement | null;
                      input?.focus();
                      input?.showPicker?.();
                    }}
                  >
                    Probá con otro día, sede o profesional.
                  </Empty>
                )}
              {!!slots.length && (
                <>
                  {slotGroups.map((group) =>
                    group.slots.length ? (
                      <div className="mt-5" key={group.label}>
                        <h3 className="mb-2 text-sm font-bold">
                          {group.label}
                        </h3>
                        <div className="grid grid-cols-4 gap-2 max-[600px]:grid-cols-3">
                          {group.slots.map((slot) => (
                            <button
                              key={slot.time}
                              type="button"
                              aria-pressed={effectiveTime === slot.time}
                              className={`flex min-h-12 items-center justify-center gap-1.5 rounded border px-2 text-sm font-bold tabular-nums transition-colors ${
                                effectiveTime === slot.time
                                  ? "border-brand bg-brand text-brand-foreground"
                                  : "border-border bg-surface text-brand hover:border-brand hover:bg-brand-soft"
                              }`}
                              onClick={() => selectTime(slot.time)}
                            >
                              <span>{slot.time}</span>
                              {effectiveTime === slot.time && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )}
                </>
              )}
              {professionalId === "any" && (
                <p className="mt-5 flex items-start gap-2 rounded border border-[#c8d9eb] bg-[#edf3f9] p-3.5 text-sm leading-relaxed text-[#344e6b]">
                  <CircleHelp className="mt-0.5 shrink-0" size={18} />
                  Tu profesional se asigna al confirmar, según la
                  disponibilidad.
                </p>
              )}
            </>
          )}

          {currentStep === 3 && (
            <div className="grid w-full max-w-[560px] gap-[22px] max-[600px]:gap-5">
              <FormField
                label="Tu nombre"
                htmlFor="pb-customer-name"
                error={nameError}
              >
                <Input
                  id="pb-customer-name"
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={160}
                  value={name}
                  onChange={(event) => {
                    setName(event.currentTarget.value);
                    setContactErrors((current) => ({
                      ...current,
                      name: undefined,
                    }));
                    setDismissedActionError(state.error ?? "");
                    setShowServerFields(false);
                    setError("");
                    resetIdempotencyKey();
                  }}
                  placeholder="Ej. Sofía García"
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={
                    nameError ? "pb-customer-name-error" : undefined
                  }
                />
              </FormField>
              <FormField
                label="Email"
                htmlFor="pb-customer-email"
                hint="Lo guardamos con tu reserva para futuras notificaciones. La confirmación de hoy se muestra en pantalla."
                error={emailError}
              >
                <Input
                  id="pb-customer-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  enterKeyHint="done"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.currentTarget.value);
                    setContactErrors((current) => ({
                      ...current,
                      email: undefined,
                    }));
                    setDismissedActionError(state.error ?? "");
                    setShowServerFields(false);
                    setError("");
                    resetIdempotencyKey();
                  }}
                  placeholder="nombre@correo.com"
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={
                    emailError
                      ? "pb-customer-email-error"
                      : "pb-customer-email-hint"
                  }
                />
              </FormField>
              <FormField
                label="Teléfono en formato internacional"
                htmlFor="pb-customer-phone"
                hint="Ejemplo: +5493415550100. Podés escribirlo con espacios."
                error={phoneError}
              >
                <Input
                  id="pb-customer-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="done"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.currentTarget.value);
                    setContactErrors((current) => ({
                      ...current,
                      phone: undefined,
                    }));
                    setDismissedActionError(state.error ?? "");
                    setShowServerFields(false);
                    setError("");
                    resetIdempotencyKey();
                  }}
                  placeholder="+5493415550100"
                  aria-invalid={Boolean(phoneError)}
                  aria-describedby={
                    phoneError
                      ? "pb-customer-phone-error"
                      : "pb-customer-phone-hint"
                  }
                />
              </FormField>
              <p className="flex items-start gap-2 rounded border border-[#c8d9eb] bg-[#edf3f9] p-3.5 text-sm leading-relaxed text-[#344e6b]">
                <CircleHelp
                  className="shrink-0 text-brand"
                  size={18}
                  aria-hidden="true"
                />
                No necesitás crear una cuenta. Usamos estos datos para gestionar
                este turno; la confirmación aparece en pantalla.
              </p>
            </div>
          )}

          {currentStep === 4 && (
            <div className="grid gap-5 max-[600px]:gap-3">
              <section
                className="rounded border border-border bg-surface p-5 max-[600px]:px-3.5 max-[600px]:py-[15px]"
                aria-labelledby="pb-review-details-heading"
              >
                <h2
                  className="text-base font-bold"
                  id="pb-review-details-heading"
                >
                  Detalles del turno
                </h2>
                <div className="mt-3">
                  <BookingSummary
                    service={selectedService}
                    location={selectedLocation}
                    professionalId={professionalId}
                    professionals={eligibleProfessionals}
                    date={date}
                    time={effectiveTime}
                    timezone={timezoneHint}
                    currency={currency}
                    visibleStep={4}
                  />
                </div>
              </section>
              <section
                className="rounded border border-border bg-surface p-5 max-[600px]:px-3.5 max-[600px]:py-[15px]"
                aria-labelledby="pb-review-customer-heading"
              >
                <div className="grid gap-1">
                  <h2
                    className="text-base font-bold"
                    id="pb-review-customer-heading"
                  >
                    Datos de contacto
                  </h2>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Confirmá que podamos contactarte por este turno.
                  </p>
                </div>
                <dl className="mt-3 mb-1 grid border-t border-border text-sm">
                  <div className="grid grid-cols-[minmax(86px,.7fr)_minmax(0,1.3fr)] items-center gap-3 border-b border-border py-3 max-[600px]:py-2">
                    <dt className="text-xs font-semibold text-muted-foreground">
                      Nombre
                    </dt>
                    <dd className="m-0 min-w-0 text-right text-sm font-bold leading-relaxed wrap-anywhere">
                      {name}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[minmax(86px,.7fr)_minmax(0,1.3fr)] items-center gap-3 border-b border-border py-3 max-[600px]:py-2">
                    <dt className="text-xs font-semibold text-muted-foreground">
                      Email
                    </dt>
                    <dd className="m-0 min-w-0 text-right text-sm font-bold wrap-anywhere">
                      {email}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[minmax(86px,.7fr)_minmax(0,1.3fr)] items-center gap-3 border-b border-border py-3 max-[600px]:py-2">
                    <dt className="text-xs font-semibold text-muted-foreground">
                      Teléfono
                    </dt>
                    <dd className="m-0 min-w-0 text-right text-sm font-bold tabular-nums wrap-anywhere">
                      {phone}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          )}

          {currentStep === 4 && (
            <p className="mt-5 text-xs leading-[1.55] text-muted-foreground">
              Podés cancelar hasta {cancellationNoticeMinutes} minutos antes del
              turno con el código que recibirás al confirmar. Luego, contactá a
              la sede.
            </p>
          )}
          {error && currentStep !== 3 && (
            <p
              className="mt-4 rounded border border-[#edc9ce] bg-[#fff1f2] p-3 text-sm text-[#982332]"
              role="alert"
            >
              {error}
            </p>
          )}
          {visibleActionError && (
            <p
              className="pb-form-error mt-4 rounded border border-[#edc9ce] bg-[#fff1f2] p-3 text-sm leading-relaxed text-[#982332]"
              role="alert"
            >
              {visibleActionError}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5 max-[600px]:sticky max-[600px]:bottom-0 max-[600px]:z-10 max-[600px]:mx-[-20px] max-[600px]:mt-6 max-[600px]:bg-white/95 max-[600px]:px-5 max-[600px]:pt-3 max-[600px]:pb-[calc(12px_+_env(safe-area-inset-bottom))] max-[600px]:shadow-[0_-8px_22px_#142b4912] max-[600px]:backdrop-blur-md max-[360px]:mx-[-16px] max-[360px]:px-4">
            <div className="flex min-w-0 items-center gap-2 max-[600px]:gap-1">
              {currentStep > 0 && (
                <Button
                  variant="secondary"
                  className="shrink-0 px-3 max-[360px]:px-2.5"
                  aria-label={`Volver al paso ${currentStep}: ${steps[currentStep - 1]}`}
                  onClick={() => goToStep(currentStep - 1)}
                >
                  <ArrowLeft size={16} />
                  <span className="max-[360px]:sr-only">Volver</span>
                </Button>
              )}
              <span className="text-xs text-muted-foreground max-[360px]:sr-only">
                Paso {currentStep + 1} de {steps.length}
              </span>
            </div>
            {currentStep < steps.length - 1 ? (
              <Button key={currentStep} onClick={next}>
                Continuar
                <ArrowRight size={17} />
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? "Confirmando…" : "Confirmar turno"}
                <Check size={18} />
              </Button>
            )}
          </div>
          <span className="sr-only" aria-live="polite">
            {pending ? "Procesando tu reserva" : ""}
          </span>
        </div>

        <aside className="sticky top-6 rounded-lg border border-border bg-surface p-6 max-[900px]:hidden">
          <h2 className="text-base font-bold">Tu visita</h2>
          <div className="mt-5">
            <BookingSummary
              service={selectedService}
              location={selectedLocation}
              professionalId={professionalId}
              professionals={eligibleProfessionals}
              date={date}
              time={effectiveTime}
              timezone={timezoneHint}
              currency={currency}
              visibleStep={currentStep}
            />
          </div>
          <small className="text-[.75rem] leading-[1.5] text-muted-foreground">
            La selección no retiene el horario. Tu turno queda reservado al
            confirmar.
          </small>
        </aside>
      </div>
    </form>
  );
}

function ConfirmationRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[125px_minmax(0,1fr)] gap-3 border-b border-[#e5e8e8] py-3 max-[560px]:grid-cols-[105px_minmax(0,1fr)] max-[560px]:gap-[9px]">
      <dt className="flex items-center gap-1.5 text-[.79rem] font-semibold text-[#647181]">
        {label}
      </dt>
      <dd className="m-0 wrap-anywhere text-[.84rem] font-bold">{children}</dd>
    </div>
  );
}

function BookingSummary({
  service,
  location,
  professionalId,
  professionals,
  date,
  time,
  timezone,
  currency,
  visibleStep,
}: {
  service?: PublicService;
  location?: PublicLocation;
  professionalId: string;
  professionals: PublicProfessional[];
  date: string;
  time: string;
  timezone: string;
  currency: string;
  visibleStep: number;
}) {
  const professionalName =
    professionalId === "any"
      ? "A asignar al confirmar"
      : (professionals.find((person) => person.id === professionalId)?.name ??
        "A asignar al confirmar");

  return (
    <dl className="grid border-t border-border">
      <div className="flex items-center justify-between gap-4 border-b border-border py-3">
        <dt className="text-xs font-semibold text-muted-foreground">Servicio</dt>
        <dd className="m-0 grid min-w-0 justify-items-end gap-1 text-right text-sm font-bold wrap-anywhere">
          {service ? (
            <>
              <span className="min-w-0">{service.name}</span>
              <small className="text-xs font-normal text-muted-foreground">
                {service.duration} minutos
              </small>
            </>
          ) : (
            "Todavía sin elegir"
          )}
        </dd>
      </div>
      {visibleStep >= 1 && (
        <div className="flex items-center justify-between gap-4 border-b border-border py-3">
          <dt className="text-xs font-semibold text-muted-foreground">
            Profesional
          </dt>
          <dd className="m-0 min-w-0 text-right text-sm font-bold wrap-anywhere">{professionalName}</dd>
        </div>
      )}
      {visibleStep >= 1 && (
        <div className="flex items-center justify-between gap-4 border-b border-border py-3">
          <dt className="text-xs font-semibold text-muted-foreground">Sede</dt>
          <dd className="m-0 grid min-w-0 justify-items-end gap-1 text-right text-sm font-bold wrap-anywhere">
            <span className="min-w-0">
              {location
                ? location.name
                : "Todavía sin elegir"}
            </span>
            {location?.addressText && (
              <small className="text-xs font-normal text-muted-foreground">
                {location.addressText}
              </small>
            )}
          </dd>
        </div>
      )}
      {visibleStep >= 2 && (
        <div className="flex items-center justify-between gap-4 border-b border-border py-3">
          <dt className="text-xs font-semibold text-muted-foreground">
            Día y horario
          </dt>
          <dd className="m-0 grid min-w-0 justify-items-end gap-1 text-right text-sm font-bold wrap-anywhere">
            <span className="min-w-0">{dateLabel(date)}</span>
            <small className="text-xs font-normal text-muted-foreground">
              {time
                ? `${time} h${timezone ? ` · ${timezone}` : ""}`
                : "Todavía sin elegir"}
            </small>
          </dd>
        </div>
      )}
      {service?.showPrice && (
        <div className="flex items-start justify-between gap-4 py-4">
          <dt className="text-sm font-bold">Total</dt>
          <dd className="m-0 grid justify-items-end gap-1 text-base font-extrabold">
            {money(service.priceMinor, currency)}
            <small className="text-xs font-normal text-muted-foreground">
              Pago en el local
            </small>
          </dd>
        </div>
      )}
    </dl>
  );
}
