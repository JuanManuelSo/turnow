"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
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
  RotateCw,
  UserRound,
} from "lucide-react";
import { Button, FormField, Input, Select } from "@/components/ui";
import { DailyMetric } from "@/components/dashboard/daily-metric";
import { ResponsiveDialog } from "@/components/dashboard/responsive-dialog";
import { formatMoney } from "@/lib/dashboard-format";
import {
  createManualAppointment,
  recordManualPayment,
  updateAppointmentStatus,
  type AgendaActionState,
} from "@/app/dashboard/agenda-actions";
import { ManualAppointmentForm } from "./manual-appointment-form";
import { RescheduleForm } from "./reschedule-form";

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
  locationId: string;
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
  outsideSchedule: boolean;
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

function StatusSubmit({ children, danger = false }: { children: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`agenda-text-action ${danger ? "is-danger" : ""}`} type="submit" disabled={pending} aria-disabled={pending}>
    {pending ? "Guardando…" : children}
  </button>;
}

export function AgendaPage({
  businessName,
  role,
  date,
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
  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => document.removeEventListener("visibilitychange", refreshOnReturn);
  }, [router]);
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
          <h1 className="mt-1 text-[clamp(1.8rem,3vw,2.35rem)] leading-[1.12] tracking-[-.045em]">
            Agenda diaria
          </h1>
          <p className="agenda-lede mt-2 text-sm text-[#56657a]">
            {businessName} · Turnos del equipo, atención y cobros.
          </p>
        </div>
        <div className="agenda-header-actions">
          <Button variant="secondary" onClick={() => router.refresh()}>
            <RotateCw size={16} aria-hidden="true" /> Actualizar
          </Button>
          <Button
            onClick={() => setCreating(true)}
            disabled={
              !selectedLocation || !professionals.length || !services.length
            }
          >
            <Plus size={17} aria-hidden="true" /> Nuevo turno
          </Button>
        </div>
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
         className="mb-5 grid grid-cols-1 gap-0 border-y border-border sm:grid-cols-3 sm:gap-3 sm:border-0"
         aria-label="Resumen del día"
       >
         <DailyMetric label="Turnos del día" value={appointments.length} detail={`${appointments.filter((item) => item.status === "attended").length} atendidos`} />
         <DailyMetric label="Cobrado" value={formatMoney(paidTotal, currency)} detail="Pagos cargados manualmente" />
         <DailyMetric label="Saldo previsto" value={formatMoney(Math.max(expectedTotal - paidTotal, 0), currency)} detail="Según el precio guardado en cada turno" />
      </section>

      <section
        className="agenda-board overflow-hidden rounded border border-[#dde3eb] bg-white"
        aria-label="Calendario de turnos"
      >
        <div className="agenda-controls">
          <div className="agenda-date-nav">
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
               onChange={(event) => { if (event.currentTarget.value) navigate(event.currentTarget.value); }}
            />
          </div>
          <div className="agenda-filters">
            {role === "owner" && locations.length > 1 && (
              <label className="agenda-filter agenda-filter-location">
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
            <label className="agenda-filter agenda-filter-professional">
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
         ) : !visibleAppointments.length && selectedProfessional !== "all" ? (
           <div className="agenda-empty grid justify-items-center gap-3 px-5 py-12 text-center">
             <UserRound size={25} aria-hidden="true" />
             <h3 className="text-base font-bold">No hay turnos con este filtro</h3>
             <p className="max-w-[48ch] text-sm text-[#56657a]">El equipo tiene {appointments.length} {appointments.length === 1 ? "turno" : "turnos"} en esta fecha. Podés volver a verlos todos.</p>
             <Button variant="secondary" onClick={() => setSelectedProfessional("all")}>Ver todo el equipo</Button>
           </div>
         ) : !visibleAppointments.length ? (
          <div className="agenda-empty grid justify-items-center gap-3 px-5 py-12 text-center">
            <CalendarDays size={25} />
            <h3 className="text-base font-bold">Este día está libre</h3>
             <p className="max-w-[48ch] text-sm text-[#56657a]">Elegí otra fecha o agregá un turno manualmente.</p>
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
                     className={`agenda-appointment flex min-h-16 min-w-0 items-center justify-between gap-4 rounded border border-border px-4 py-3 text-left transition-colors max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-2 max-[760px]:p-3 ${booking.status === 'attended' ? 'bg-success-soft hover:bg-success-soft' : booking.status === 'no_show' ? 'bg-danger-soft hover:bg-danger-soft' : 'bg-brand-soft hover:bg-brand-soft'}`}
                    type="button"
                    onClick={() => setSelectedBookingId(booking.id)}
                  >
                    <span className="agenda-appointment-main grid min-w-0 gap-1">
                       <strong className="overflow-visible whitespace-normal break-words text-sm font-bold text-foreground">{booking.customerName}</strong>
                       <span className="overflow-visible whitespace-normal break-words text-xs leading-relaxed text-muted-foreground">
                        {booking.serviceName} <i className="px-0.5 not-italic text-[#a5afbc]">·</i>{" "}
                        {booking.professionalName}
                      </span>
                    </span>
                    <span className="agenda-appointment-meta flex shrink-0 flex-col items-end gap-1.5 text-[.72rem] text-[#56657a] max-[760px]:flex-row max-[760px]:flex-wrap max-[760px]:items-center">
                         <span className={`agenda-status rounded-full px-2 py-1 text-xs font-bold ${booking.status === 'attended' ? 'bg-success-soft text-success' : booking.status === 'no_show' ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand'}`}>
                        {booking.status === "attended"
                          ? "Atendido"
                          : booking.status === "no_show"
                            ? "Ausente"
                            : "Confirmado"}
                      </span>
                      {booking.outsideSchedule && booking.status === "confirmed" && (
                         <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">
                          Fuera de horario
                        </span>
                      )}
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
        <ResponsiveDialog title="Nuevo turno" description="Agregalo directamente a la agenda." onClose={() => setCreating(false)}>
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
        </ResponsiveDialog>
      )}

      {selectedBooking && (
        <BookingDetails
          key={selectedBooking.id}
          booking={selectedBooking}
          timezone={timezone}
          currency={currency}
          role={role}
          locations={locations}
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
  role,
  locations,
  onClose,
}: {
  booking: Booking;
  timezone: string;
  currency: string;
  role: "owner" | "location_operator";
  locations: Location[];
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
  const outstanding =
    booking.priceMinor === null
      ? null
      : Math.max(booking.priceMinor - booking.paidMinor, 0);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);
  return (
    <ResponsiveDialog title="Detalle del turno" description={`${clock(booking.startsAt, timezone)}–${clock(booking.endsAt, timezone)} · ${booking.professionalName}`} onClose={onClose}>
        <div className="agenda-detail-body grid gap-5 pt-5">
           <div className="agenda-customer grid gap-1">
             <strong className="text-lg">{booking.customerName}</strong>
             <a className="text-[.8rem] text-[#56657a]" href={`tel:${booking.customerPhone}`}>{booking.customerPhone}</a>
             <span className="text-[.8rem] text-[#56657a]">{booking.serviceName}</span>
          </div>
            <div className="grid grid-cols-1 gap-0 border-y border-border sm:grid-cols-3 sm:gap-2 sm:border-0">
              <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border py-3 last:border-b-0 sm:grid sm:gap-1.5 sm:rounded sm:border sm:p-3 sm:last:border-b">
               <span className="text-[.68rem] text-[#56657a]">Precio del turno</span>
                <strong className="break-words text-right text-sm tabular-nums">{formatMoney(booking.priceMinor, currency)}</strong>
            </div>
              <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border py-3 last:border-b-0 sm:grid sm:gap-1.5 sm:rounded sm:border sm:p-3 sm:last:border-b">
               <span className="text-[.68rem] text-[#56657a]">Pagado</span>
                <strong className="break-words text-right text-sm tabular-nums">{formatMoney(booking.paidMinor, currency)}</strong>
            </div>
              <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border py-3 last:border-b-0 sm:grid sm:gap-1.5 sm:rounded sm:border sm:p-3 sm:last:border-b">
               <span className="text-[.68rem] text-[#56657a]">Saldo</span>
                <strong className="break-words text-right text-sm tabular-nums">
                {outstanding === null
                  ? "—"
                  : formatMoney(outstanding, currency)}
              </strong>
            </div>
          </div>

          {booking.outsideSchedule && booking.status === "confirmed" && (
            <p className="rounded border border-[#ead7ae] bg-[#fffaf0] px-3 py-2 text-xs leading-relaxed text-[#674c1d]" role="status">
              Este turno quedó fuera del horario configurado o dentro de un bloqueo. Reprogramalo o cancelalo para evitar conflictos.
            </p>
          )}

          {booking.status === "confirmed" && (
             <div className="agenda-status-actions flex flex-wrap gap-x-[18px] gap-y-[7px] border-y border-[#dde3eb] py-3">
              <form action={updateAppointmentStatus}>
                <input type="hidden" name="appointmentId" value={booking.id} />
                <input type="hidden" name="status" value="attended" />
                 <StatusSubmit>Marcar atendido</StatusSubmit>
              </form>
              <form action={updateAppointmentStatus}>
                <input type="hidden" name="appointmentId" value={booking.id} />
                <input type="hidden" name="status" value="no_show" />
                 <StatusSubmit>Marcar ausente</StatusSubmit>
              </form>
              <button
                 className="agenda-text-action min-h-10 text-xs font-bold text-[#244f82]"
                type="button"
                onClick={() => { setRescheduling((value) => !value); setConfirmCancel(false); }}
              >
                Reprogramar
              </button>
              <button
                 className="agenda-text-action min-h-10 text-xs font-bold text-[#932f3a]"
                type="button"
                 onClick={() => { setConfirmCancel((value) => !value); setRescheduling(false); }}
              >
               Cancelar turno
              </button>
             </div>
           )}
           {confirmCancel && booking.status === "confirmed" && (
             <div className="agenda-cancel-confirm" role="group" aria-label="Confirmar cancelación">
               <strong>¿Cancelar el turno de {booking.customerName}?</strong>
               <p>El horario volverá a estar disponible. Esta acción no se puede deshacer.</p>
               <div className="agenda-cancel-actions">
                 <button type="button" className="button secondary" onClick={() => setConfirmCancel(false)}>Conservar turno</button>
                 <form action={updateAppointmentStatus}>
                  <input
                    type="hidden"
                    name="appointmentId"
                    value={booking.id}
                  />
                  <input type="hidden" name="status" value="cancelled" />
                   <StatusSubmit danger>Sí, cancelar turno</StatusSubmit>
                 </form>
               </div>
             </div>
           )}

          {rescheduling && booking.status === "confirmed" && (
            <RescheduleForm
              appointmentId={booking.id}
              initialLocationId={booking.locationId}
              initialProfessionalId={booking.professionalId}
              startsAt={booking.startsAt}
              timezone={timezone}
              role={role}
              locations={locations.map((location) => ({ id: location.id, name: location.name }))}
              onCancel={() => setRescheduling(false)}
            />
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
                          className="min-h-11 rounded px-2 text-xs font-bold text-brand hover:bg-brand-soft"
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
    </ResponsiveDialog>
  );
}
