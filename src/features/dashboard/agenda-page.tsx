"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  MapPin,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { Button, FormField, Input, Select } from "@/components/ui";
import { formatMoney } from "@/lib/dashboard-format";
import {
  createManualAppointment,
  recordManualPayment,
  rescheduleAppointment,
  updateAppointmentStatus,
  type AgendaActionState,
} from "@/app/dashboard/agenda-actions";
import { ManualAppointmentForm } from "./manual-appointment-form";

type Location = {
  id: string;
  name: string;
  addressText: string | null;
  timezone: string;
};
type Professional = { id: string; name: string };
type Service = {
  id: string;
  name: string;
  duration: number;
  priceMinor: number | null;
};
type Payment = {
  id: string;
  amountMinor: number;
  currency: string;
  method: string;
  recordedAt: Date;
  note: string | null;
  reversedAt: Date | null;
  reversalReason: string | null;
};
type Booking = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  status: "confirmed" | "attended" | "no_show" | "cancelled";
  priceMinor: number | null;
  currency: string;
  source: "public" | "manual";
  version: number;
  payments: Payment[];
  paidMinor: number;
};
type ActionState = AgendaActionState;

const emptyState: ActionState = {};
const methodLabel: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function shiftDate(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function clock(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function amountInput(value: number | null) {
  return value === null ? "" : (value / 100).toFixed(2);
}

function useDialogAccessibility(
  open: boolean,
  dialogRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const getFocusable = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
        ),
      ].filter((element) => element.getAttribute("aria-hidden") !== "true");
    (
      dialog.querySelector<HTMLElement>("[data-autofocus]") ?? getFocusable()[0]
    )?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (!items.length) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    }
    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [open, dialogRef]);
}

function localDateTimeParts(value: Date, timezone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function AgendaPage({
  businessName,
  role,
  date,
  today,
  locations,
  selectedLocation,
  professionals,
  services,
  appointments,
  currency,
  timezone,
  allowAnyProfessional,
}: {
  businessName: string;
  role: "owner" | "location_operator";
  date: string;
  today: string;
  locations: Location[];
  selectedLocation: Location | null;
  professionals: Professional[];
  services: Service[];
  appointments: Booking[];
  currency: string;
  timezone: string;
  allowAnyProfessional: boolean;
}) {
  const router = useRouter();
  const [selectedProfessional, setSelectedProfessional] = useState("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const createDialogRef = useRef<HTMLElement>(null);
  const [createState, createAction, createPending] = useActionState(
    createManualAppointment,
    emptyState,
  );

  const visibleAppointments = useMemo(
    () =>
      appointments.filter(
        (booking) =>
          selectedProfessional === "all" ||
          booking.professionalId === selectedProfessional,
      ),
    [appointments, selectedProfessional],
  );
  const selectedBooking =
    appointments.find((booking) => booking.id === selectedBookingId) ?? null;
  const paidTotal = appointments.reduce(
    (sum, booking) => sum + booking.paidMinor,
    0,
  );
  const expectedTotal = appointments.reduce(
    (sum, booking) => sum + (booking.priceMinor ?? 0),
    0,
  );

  useEffect(() => {
    if (createState.success) router.refresh();
  }, [createState.success, router]);
  useDialogAccessibility(creating, createDialogRef, () => setCreating(false));
  function navigate(nextDate: string, nextLocation = selectedLocation?.id) {
    const query = new URLSearchParams({ fecha: nextDate });
    if (role === "owner" && nextLocation) query.set("sede", nextLocation);
    router.push(`/dashboard?${query.toString()}`);
    setSelectedProfessional("all");
  }

  return (
    <div className="agenda-page mx-auto w-full max-w-[1440px]">
      <header className="agenda-header mb-6 flex items-end justify-between gap-6 max-[760px]:flex-col max-[760px]:items-start">
        <div>
          <p className="agenda-eyebrow text-xs font-bold tracking-wider text-[#56657a] uppercase">
            {businessName} <span className="px-1 text-[#244f82]">·</span> Agenda
          </p>
          <h1 className="mt-1 text-[clamp(1.8rem,3vw,2.35rem)] leading-[1.12] tracking-[-.045em]">
            Agenda diaria
          </h1>
          <p className="agenda-lede mt-2 text-sm text-[#56657a]">
            Turnos del equipo, atención y cobros en un mismo lugar.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          disabled={
            !selectedLocation || !professionals.length || !services.length
          }
        >
          <Plus size={17} aria-hidden="true" /> Nuevo turno
        </Button>
      </header>

      {(!professionals.length || !services.length) && (
        <aside
          className="agenda-setup-notice mb-[18px] flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded border border-[#ead7ae] bg-[#fffaf0] px-4 py-3 text-[.82rem] leading-relaxed text-[#674c1d]"
          role="status"
        >
          <CircleAlert size={18} aria-hidden="true" />
          <span>
            Para cargar turnos, configurá al menos un profesional asignado a
            esta sede y un servicio activo.
          </span>
          {role === "owner" && (
            <a
              className="ml-auto whitespace-nowrap font-bold text-[#244f82] underline underline-offset-4"
              href={
                !professionals.length
                  ? "/dashboard/profesionales"
                  : "/dashboard/servicios"
              }
            >
              Completar configuración
            </a>
          )}
        </aside>
      )}

      <section
        className="agenda-summary mb-[18px] grid grid-cols-3 gap-3 max-[760px]:grid-cols-1"
        aria-label="Resumen del día"
      >
        <div className="grid min-h-[86px] grid-cols-[1fr_auto] items-baseline gap-x-3 rounded border border-[#dde3eb] bg-white p-[15px_18px]">
          <span className="text-xs text-[#56657a]">Turnos del día</span>
          <strong className="row-span-2 text-[1.75rem] font-extrabold tabular-nums">
            {appointments.length}
          </strong>
          <small className="text-xs text-[#56657a]">
            {appointments.filter((item) => item.status === "attended").length}{" "}
            atendidos
          </small>
        </div>
        <div className="grid min-h-[86px] grid-cols-[1fr_auto] items-baseline gap-x-3 rounded border border-[#dde3eb] bg-white p-[15px_18px]">
          <span className="text-xs text-[#56657a]">Cobrado</span>
          <strong className="row-span-2 text-lg font-extrabold tabular-nums">
            {formatMoney(paidTotal, currency)}
          </strong>
          <small className="text-xs text-[#56657a]">
            Pagos cargados manualmente
          </small>
        </div>
        <div className="grid min-h-[86px] grid-cols-[1fr_auto] items-baseline gap-x-3 rounded border border-[#dde3eb] bg-white p-[15px_18px]">
          <span className="text-xs text-[#56657a]">Saldo previsto</span>
          <strong className="row-span-2 text-lg font-extrabold tabular-nums">
            {formatMoney(Math.max(expectedTotal - paidTotal, 0), currency)}
          </strong>
          <small className="text-xs text-[#56657a]">
            Según precios actuales del turno
          </small>
        </div>
      </section>

      <section
        className="agenda-board overflow-hidden rounded border border-[#dde3eb] bg-white"
        aria-label="Calendario de turnos"
      >
        <div className="agenda-controls flex flex-wrap items-center justify-between gap-4 border-b border-[#dde3eb] p-4">
          <div className="agenda-date-nav flex items-center gap-2">
            <Button
              variant="secondary"
              aria-label="Día anterior"
              onClick={() => navigate(shiftDate(date, -1))}
            >
              <ChevronLeft size={17} />
            </Button>
            <Button
              variant="secondary"
              aria-label="Día siguiente"
              onClick={() => navigate(shiftDate(date, 1))}
            >
              <ChevronRight size={17} />
            </Button>
            <Input
              aria-label="Fecha de agenda"
              type="date"
              value={date}
              onChange={(event) => navigate(event.currentTarget.value)}
            />
            <Button variant="text" onClick={() => navigate(today)}>
              Hoy
            </Button>
          </div>
          <div className="agenda-filters flex flex-wrap items-center gap-3">
            {role === "owner" && locations.length > 1 && (
              <label className="agenda-filter">
                <MapPin size={15} aria-hidden="true" />
                <span className="sr-only">Sede</span>
                <Select
                  aria-label="Filtrar por sede"
                  value={selectedLocation?.id ?? ""}
                  onChange={(event) =>
                    navigate(date, event.currentTarget.value)
                  }
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <label className="agenda-filter">
              <UserRound size={15} aria-hidden="true" />
              <span className="sr-only">Profesional</span>
              <Select
                aria-label="Filtrar por profesional"
                value={selectedProfessional}
                onChange={(event) =>
                  setSelectedProfessional(event.currentTarget.value)
                }
              >
                <option value="all">Todo el equipo</option>
                {professionals.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>

        <div className="agenda-day-heading flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <h2 className="text-base font-bold capitalize">
              {dateLabel(date)}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[#56657a]">
              <MapPin size={14} aria-hidden="true" />
              {selectedLocation?.name ?? "Sin sede activa"}
              {selectedLocation?.addressText
                ? ` · ${selectedLocation.addressText}`
                : ""}
            </p>
          </div>
          <span className="flex items-center gap-2 text-xs text-[#56657a]">
            <CalendarDays size={15} aria-hidden="true" />
            {visibleAppointments.length}{" "}
            {visibleAppointments.length === 1 ? "turno" : "turnos"}
          </span>
        </div>

        {!selectedLocation ? (
          <div className="agenda-empty grid justify-items-center gap-3 px-5 py-12 text-center">
            <MapPin size={25} />
            <h3 className="text-base font-bold">
              Configurá una sede para empezar
            </h3>
            <p className="max-w-[48ch] text-sm text-[#56657a]">
              Cuando agregues una sede, acá vas a poder organizar los turnos del
              negocio.
            </p>
            {role === "owner" && (
              <Link
                className="button secondary inline-flex min-h-11 items-center rounded border border-[#c1cad6] px-4 text-sm font-bold text-[#1b2839] no-underline"
                href="/dashboard/sedes"
              >
                Configurar sedes
              </Link>
            )}
          </div>
        ) : !visibleAppointments.length ? (
          <div className="agenda-empty grid justify-items-center gap-3 px-5 py-12 text-center">
            <CalendarDays size={25} />
            <h3 className="text-base font-bold">Este día está libre</h3>
            <p className="max-w-[48ch] text-sm text-[#56657a]">
              Elegí otra fecha o agregá un turno manualmente.
            </p>
            <Button
              onClick={() => setCreating(true)}
              disabled={!professionals.length || !services.length}
            >
              <Plus size={16} /> Crear turno
            </Button>
          </div>
        ) : (
          <ol className="agenda-list m-0 grid list-none px-5 max-[760px]:px-3">
            {visibleAppointments.map((booking) => {
              const balance =
                booking.priceMinor === null
                  ? null
                  : Math.max(booking.priceMinor - booking.paidMinor, 0);
              return (
                <li className="grid min-h-[93px] grid-cols-[86px_minmax(0,1fr)] gap-3.5 border-b border-[#e9edf2] py-3 last:border-0 max-[760px]:grid-cols-[58px_minmax(0,1fr)] max-[760px]:gap-2" key={booking.id}>
                  <time className="agenda-time flex flex-col gap-1 pt-2 text-xs tabular-nums text-[#56657a]">
                    <strong className="text-[.93rem] font-bold text-[#1b2839]">{clock(booking.startsAt, timezone)}</strong>
                    <span>{clock(booking.endsAt, timezone)}</span>
                  </time>
                  <button
                    className={`agenda-appointment flex min-h-16 min-w-0 items-center justify-between gap-[18px] rounded border-l-[3px] px-[15px] py-3 text-left transition hover:-translate-y-px max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-[9px] max-[760px]:p-[11px] ${booking.status === 'attended' ? 'border-[#327359] bg-[#f0f7f3] hover:bg-[#e8f3ed]' : booking.status === 'no_show' ? 'border-[#9e4850] bg-[#fbf3f3] hover:bg-[#f8e9ea]' : 'border-[#244f82] bg-[#f3f7fb] hover:bg-[#eaf1f8]'}`}
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                  >
                    <span className="agenda-appointment-main grid min-w-0 gap-1">
                      <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold">{booking.customerName}</strong>
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#56657a] max-[520px]:max-w-[58vw]">
                        {booking.serviceName} <i className="px-0.5 not-italic text-[#a5afbc]">·</i>{" "}
                        {booking.professionalName}
                      </span>
                    </span>
                    <span className="agenda-appointment-meta flex shrink-0 flex-col items-end gap-1.5 text-[.72rem] text-[#56657a] max-[760px]:flex-row max-[760px]:flex-wrap max-[760px]:items-center">
                      <span className={`agenda-status rounded-full px-[7px] py-[3px] text-[.66rem] font-bold ${booking.status === 'attended' ? 'bg-[#e8f3ed] text-[#285f49]' : booking.status === 'no_show' ? 'bg-[#f8e9ea] text-[#8a3741]' : 'bg-[#eaf1f8] text-[#244f82]'}`}>
                        {booking.status === "attended"
                          ? "Atendido"
                          : booking.status === "no_show"
                            ? "Ausente"
                            : "Confirmado"}
                      </span>
                      <span>
                        {balance === null
                          ? "Sin precio"
                          : balance
                            ? `Saldo ${formatMoney(balance, booking.currency)}`
                            : "Pagado"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <footer className="agenda-footnote mt-4 flex flex-wrap justify-between gap-2 text-xs text-[#56657a]">
        <span className="flex items-center gap-1.5">
          <Clock3 size={14} aria-hidden="true" />
          Hora local · {timezone}
        </span>
        <span>
          Los cobros se registran manualmente; no se realizan cargos
          automáticos.
        </span>
      </footer>

      {creating && (
        <div
          className="agenda-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#101d2c]/55 p-5 max-[600px]:items-end max-[600px]:p-0"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreating(false);
          }}
        >
          <section
            ref={createDialogRef}
            className="agenda-dialog max-h-[min(90svh,900px)] w-full max-w-[680px] overflow-y-auto rounded-lg border border-[#dde3eb] bg-white p-6 shadow-2xl max-[600px]:max-h-[94svh] max-[600px]:rounded-b-none max-[600px]:p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-appointment-title"
            tabIndex={-1}
          >
            <header className="flex items-center justify-between gap-4 border-b border-[#dde3eb] pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="agenda-dialog-icon grid size-10 shrink-0 place-items-center rounded bg-[#eaf1f8] text-[#244f82]">
                  <Plus size={18} />
                </span>
                <div>
                  <h2 className="text-lg font-bold" id="new-appointment-title">
                    Nuevo turno
                  </h2>
                  <p className="mt-1 text-sm text-[#56657a]">
                    Agregalo directamente a la agenda.
                  </p>
                </div>
              </div>
              <button
                className="agenda-close grid size-10 shrink-0 place-items-center rounded text-[#56657a] hover:bg-[#f2f4f7]"
                type="button"
                aria-label="Cerrar"
                onClick={() => setCreating(false)}
              >
                <X size={19} />
              </button>
            </header>
            <ManualAppointmentForm
              action={createAction}
              state={createState}
              pending={createPending}
              locationId={selectedLocation?.id ?? ""}
              date={date}
              professionals={professionals}
              services={services}
              currency={currency}
              allowAnyProfessional={allowAnyProfessional}
              onCancel={() => setCreating(false)}
            />
          </section>
        </div>
      )}

      {selectedBooking && (
        <BookingDetails
          key={selectedBooking.id}
          booking={selectedBooking}
          timezone={timezone}
          currency={currency}
          onClose={() => {
            setSelectedBookingId(null);
          }}
        />
      )}
    </div>
  );
}

function BookingDetails({
  booking,
  timezone,
  currency,
  onClose,
}: {
  booking: Booking;
  timezone: string;
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    recordManualPayment,
    emptyState,
  );
  const [correcting, setCorrecting] = useState<Payment | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const detailDialogRef = useRef<HTMLElement>(null);
  const [rescheduleState, rescheduleAction, reschedulePending] = useActionState(
    rescheduleAppointment,
    emptyState,
  );
  const outstanding =
    booking.priceMinor === null
      ? null
      : Math.max(booking.priceMinor - booking.paidMinor, 0);
  const scheduled = localDateTimeParts(booking.startsAt, timezone);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);
  useDialogAccessibility(true, detailDialogRef, onClose);
  return (
    <div
      className="agenda-backdrop fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#101d2c]/55 p-5 max-[600px]:items-end max-[600px]:p-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={detailDialogRef}
        className="agenda-dialog agenda-detail max-h-[min(90svh,900px)] w-full max-w-[680px] overflow-y-auto rounded-lg border border-[#dde3eb] bg-white p-6 shadow-2xl max-[600px]:max-h-[94svh] max-[600px]:rounded-b-none max-[600px]:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-detail-title"
        tabIndex={-1}
      >
        <header className="flex items-center justify-between gap-4 border-b border-[#dde3eb] pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="agenda-dialog-icon grid size-10 shrink-0 place-items-center rounded bg-[#eaf1f8] text-[#244f82]">
              <CalendarDays size={18} />
            </span>
            <div>
              <h2 className="text-lg font-bold" id="booking-detail-title">
                Detalle del turno
              </h2>
              <p className="mt-1 text-sm text-[#56657a]">
                {clock(booking.startsAt, timezone)}–
                {clock(booking.endsAt, timezone)} · {booking.professionalName}
              </p>
            </div>
          </div>
          <button
            className="agenda-close grid size-10 shrink-0 place-items-center rounded text-[#56657a] hover:bg-[#f2f4f7]"
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <div className="agenda-detail-body grid gap-5 pt-5">
           <div className="agenda-customer grid gap-1">
             <strong className="text-lg">{booking.customerName}</strong>
             <a className="text-[.8rem] text-[#56657a]" href={`tel:${booking.customerPhone}`}>{booking.customerPhone}</a>
             <span className="text-[.8rem] text-[#56657a]">{booking.serviceName}</span>
          </div>
           <div className="agenda-payment-summary grid grid-cols-3 gap-2 max-[520px]:gap-1">
             <div className="grid gap-1.5 rounded border border-[#dde3eb] p-3 max-[520px]:px-[7px] max-[520px]:py-[9px]">
               <span className="text-[.68rem] text-[#56657a]">Precio del turno</span>
               <strong className="text-[.82rem] max-[520px]:text-xs">{formatMoney(booking.priceMinor, currency)}</strong>
            </div>
             <div className="grid gap-1.5 rounded border border-[#dde3eb] p-3 max-[520px]:px-[7px] max-[520px]:py-[9px]">
               <span className="text-[.68rem] text-[#56657a]">Pagado</span>
               <strong className="text-[.82rem] max-[520px]:text-xs">{formatMoney(booking.paidMinor, currency)}</strong>
            </div>
             <div className="grid gap-1.5 rounded border border-[#dde3eb] p-3 max-[520px]:px-[7px] max-[520px]:py-[9px]">
               <span className="text-[.68rem] text-[#56657a]">Saldo</span>
               <strong className="text-[.82rem] max-[520px]:text-xs">
                {outstanding === null
                  ? "—"
                  : formatMoney(outstanding, currency)}
              </strong>
            </div>
          </div>

          {booking.status === "confirmed" && (
             <div className="agenda-status-actions flex flex-wrap gap-x-[18px] gap-y-[7px] border-y border-[#dde3eb] py-3">
              <form action={updateAppointmentStatus}>
                <input type="hidden" name="appointmentId" value={booking.id} />
                <input type="hidden" name="status" value="attended" />
                 <button className="agenda-text-action min-h-10 text-xs font-bold text-[#244f82]" type="submit">
                  Marcar atendido
                </button>
              </form>
              <form action={updateAppointmentStatus}>
                <input type="hidden" name="appointmentId" value={booking.id} />
                <input type="hidden" name="status" value="no_show" />
                 <button className="agenda-text-action min-h-10 text-xs font-bold text-[#244f82]" type="submit">
                  Marcar ausente
                </button>
              </form>
              <button
                 className="agenda-text-action min-h-10 text-xs font-bold text-[#244f82]"
                type="button"
                onClick={() => setRescheduling((value) => !value)}
              >
                Reprogramar
              </button>
              <button
                 className="agenda-text-action min-h-10 text-xs font-bold text-[#932f3a]"
                type="button"
                onClick={() => setConfirmCancel((value) => !value)}
              >
                {confirmCancel ? "Confirmar cancelación" : "Cancelar turno"}
              </button>
              {confirmCancel && (
                <form action={updateAppointmentStatus}>
                  <input
                    type="hidden"
                    name="appointmentId"
                    value={booking.id}
                  />
                  <input type="hidden" name="status" value="cancelled" />
                  <button
                     className="agenda-text-action min-h-10 text-xs font-bold text-[#932f3a]"
                    type="submit"
                  >
                    Sí, cancelar turno
                  </button>
                </form>
              )}
            </div>
          )}

          {rescheduling && booking.status === "confirmed" && (
             <form action={rescheduleAction} className="agenda-reschedule-form grid gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3.5">
               <strong className="text-[.8rem]">Nuevo horario</strong>
              <input type="hidden" name="appointmentId" value={booking.id} />
               <div className="agenda-form-grid grid grid-cols-2 gap-4 max-[520px]:grid-cols-1 max-[520px]:gap-3">
                <FormField label="Fecha" htmlFor="reschedule-date">
                  <Input
                    id="reschedule-date"
                    type="date"
                    name="date"
                    defaultValue={scheduled.date}
                    required
                  />
                </FormField>
                <FormField label="Hora" htmlFor="reschedule-time">
                  <Input
                    id="reschedule-time"
                    type="time"
                    name="time"
                    defaultValue={scheduled.time}
                    required
                  />
                </FormField>
              </div>
              {rescheduleState.error && (
                 <p className="agenda-action-error rounded bg-[#f9e9eb] p-3 text-xs text-[#932f3a]" role="alert">
                  {rescheduleState.error}
                </p>
              )}
              {rescheduleState.success && (
                 <p className="agenda-action-success rounded bg-[#e7f2ec] p-3 text-xs text-[#1f5c47]" role="status">
                  {rescheduleState.success}
                </p>
              )}
               <div className="agenda-dialog-actions flex justify-end gap-2 pt-2 max-[520px]:flex-col-reverse max-[520px]:[&_.button]:w-full">
                <Button
                  variant="secondary"
                  onClick={() => setRescheduling(false)}
                >
                  Volver
                </Button>
                <Button type="submit" disabled={reschedulePending}>
                  {reschedulePending ? "Guardando…" : "Guardar horario"}
                </Button>
              </div>
            </form>
          )}

           <section className="agenda-payment-section">
             <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
              <CreditCard size={16} /> Pagos registrados
            </h3>
            {booking.payments.length ? (
               <ul className="agenda-payment-list mb-3.5 grid list-none p-0">
                {booking.payments.map((payment) => (
                  <li
                    key={payment.id}
                     className={`flex items-center justify-between gap-3 border-t border-[#dde3eb] py-2.5 ${payment.reversedAt ? '[&_strong]:line-through' : ''}`}
                  >
                     <span className="grid gap-1">
                       <strong className="text-[.8rem]">
                        {formatMoney(payment.amountMinor, payment.currency)}
                      </strong>
                       <small className="text-[.7rem] text-[#56657a]">
                        {methodLabel[payment.method] ?? payment.method}
                        {payment.note ? ` · ${payment.note}` : ""}
                        {payment.reversalReason
                          ? ` · Corrección: ${payment.reversalReason}`
                          : ""}
                      </small>
                    </span>
                    {payment.reversedAt ? (
                       <em className="text-[.7rem] not-italic text-[#56657a]">Corregido</em>
                    ) : (
                       <button
                         className="min-h-[38px] px-2 text-xs font-bold text-[#244f82]"
                        type="button"
                        onClick={() => setCorrecting(payment)}
                      >
                        Corregir
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
               <p className="agenda-payment-empty mb-3.5 text-xs text-[#56657a]">
                Todavía no hay pagos registrados.
              </p>
            )}
            {(outstanding !== 0 || correcting !== null) && (
               <form action={action} className="agenda-payment-form grid gap-3 border-t border-[#dde3eb] pt-3">
                <input type="hidden" name="appointmentId" value={booking.id} />
                {correcting && (
                  <>
                    <input
                      type="hidden"
                      name="correctedPaymentId"
                      value={correcting.id}
                    />
                    <FormField
                      label="Motivo de corrección"
                      htmlFor="correction-reason"
                    >
                      <Input
                        id="correction-reason"
                        name="correctionReason"
                        required
                        maxLength={300}
                        placeholder="Ej. Importe cargado incorrectamente"
                      />
                    </FormField>
                  </>
                )}
                 <div className="agenda-form-grid grid grid-cols-2 gap-2.5 max-[520px]:grid-cols-1">
                  <FormField
                    label={
                      correcting
                        ? "Importe corregido (0 para revertir)"
                        : "Importe recibido"
                    }
                    htmlFor="payment-amount"
                  >
                    <Input
                      id="payment-amount"
                      name="amount"
                      type="number"
                      min={correcting ? "0" : "0.01"}
                      step="0.01"
                      max={
                        outstanding === null
                          ? undefined
                          : amountInput(
                              outstanding + (correcting?.amountMinor ?? 0),
                            )
                      }
                      defaultValue={
                        correcting
                          ? amountInput(correcting.amountMinor)
                          : outstanding === null
                            ? ""
                            : amountInput(outstanding)
                      }
                      required
                    />
                  </FormField>
                  <FormField label="Medio de pago" htmlFor="payment-method">
                    <Select
                      id="payment-method"
                      name="method"
                      defaultValue={correcting?.method ?? "cash"}
                    >
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      <option value="card">Tarjeta</option>
                      <option value="other">Otro</option>
                    </Select>
                  </FormField>
                </div>
                <FormField label="Nota (opcional)" htmlFor="payment-note">
                  <Input
                    id="payment-note"
                    name="note"
                    maxLength={500}
                    placeholder="Referencia o detalle"
                  />
                </FormField>
                {state.error && (
                   <p className="agenda-action-error rounded bg-[#f9e9eb] p-3 text-xs text-[#932f3a]" role="alert">
                    {state.error}
                  </p>
                )}
                {state.success && (
                   <p className="agenda-action-success rounded bg-[#e7f2ec] p-3 text-xs text-[#1f5c47]" role="status">
                    {state.success}
                  </p>
                )}
                 <div className="agenda-dialog-actions flex justify-end gap-2 pt-2 max-[520px]:flex-col-reverse max-[520px]:[&_.button]:w-full">
                  {correcting && (
                    <Button
                      variant="secondary"
                      onClick={() => setCorrecting(null)}
                    >
                      Volver
                    </Button>
                  )}
                  <Button type="submit" disabled={pending}>
                    {pending
                      ? "Guardando…"
                      : correcting
                        ? "Guardar corrección"
                        : "Registrar pago"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
