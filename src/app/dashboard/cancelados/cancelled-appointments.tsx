'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, CalendarDays, Clock3, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  archiveCancelledAppointment,
  archiveAllCancelledAppointments,
  purgeArchivedCancelledAppointments,
  permanentlyDeleteCancelledAppointment,
  restoreCancelledAppointment,
  type CancelledActionState,
} from './actions';

type CancelledBooking = {
  id: string;
  customerName: string;
  serviceName: string;
  professionalName: string;
  locationName: string;
  startsAt: Date;
  timezone: string;
  cancelledAt: Date | null;
  archivedAt: Date | null;
  cancellationReason: string | null;
  canDelete: boolean;
  deleteBlockedByPayment: boolean;
  deleteBlockedByEmail: boolean;
};

function formatDate(date: Date, timezone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: timezone, ...options }).format(new Date(date));
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="cancelled-action-button" type="submit" disabled={pending}>
    {pending ? 'Guardando…' : children}
  </button>;
}

function ArchiveAllForm({ total }: { total: number }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CancelledActionState, FormData>(archiveAllCancelledAppointments, {});
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  const [confirming, setConfirming] = useState(false);

  if (confirming) return <div className="cancelled-confirm" role="group" aria-label="Confirmar archivo de cancelaciones">
    <p>Se moverán {total} {total === 1 ? 'turno cancelado' : 'turnos cancelados'} a Archivadas. No se borran; sus datos y pagos quedan conservados.</p>
    <div className="cancelled-confirm-actions">
      <button type="button" className="cancelled-secondary-button" onClick={() => setConfirming(false)}>Volver</button>
      <form action={action}><SubmitButton>Confirmar archivo de todos</SubmitButton></form>
    </div>
    {state.error && <p className="cancelled-feedback is-error" role="alert">{state.error}</p>}
    {state.success && <p className="cancelled-feedback" role="status">{state.success}</p>}
    {pending && <span className="sr-only" role="status">Archivando cancelaciones…</span>}
  </div>;

  return <>
    <button type="button" className="cancelled-secondary-button" onClick={() => setConfirming(true)}>
      <Archive size={16} aria-hidden="true" /> Archivar todos
    </button>
    {state.error && <p className="cancelled-feedback is-error" role="alert">{state.error}</p>}
    {state.success && <p className="cancelled-feedback" role="status">{state.success}</p>}
  </>;
}

function PurgeArchivedForm({ eligible, retained }: { eligible: number; retained: number }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CancelledActionState, FormData>(purgeArchivedCancelledAppointments, {});
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <>
    <button type="button" className="cancelled-delete-button" onClick={() => setConfirming(true)}>Limpiar archivo</button>
    {state.error && <p className="cancelled-feedback is-error" role="alert">{state.error}</p>}
    {state.success && <p className="cancelled-feedback" role="status">{state.success}</p>}
  </>;

  return <div className="cancelled-confirm" role="group" aria-label="Confirmar eliminación definitiva">
    <p>Se eliminarán definitivamente hasta {Math.min(eligible, 500)} turnos archivados aptos, incluidos sus códigos y eventos de gestión. No se puede deshacer. Los {retained} con pagos asociados o emails pendientes se conservarán.</p>
    <div className="cancelled-confirm-actions">
      <button type="button" className="cancelled-secondary-button" onClick={() => setConfirming(false)}>Volver</button>
      <form action={action}><button className="cancelled-delete-button" type="submit" disabled={pending}>{pending ? 'Eliminando…' : 'Eliminar definitivamente'}</button></form>
    </div>
    {state.error && <p className="cancelled-feedback is-error" role="alert">{state.error}</p>}
    {state.success && <p className="cancelled-feedback" role="status">{state.success}</p>}
    {pending && <span className="sr-only" role="status">Eliminando turnos archivados…</span>}
  </div>;
}

function DeleteOneButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<CancelledActionState>({});
  if (!confirming) return <>
    <button type="button" className="cancelled-delete-button is-quiet" onClick={() => setConfirming(true)}>Eliminar</button>
    {feedback.error && <p className="cancelled-feedback is-error" role="alert">{feedback.error}</p>}
  </>;

  return <div className="cancelled-row-delete-confirm" role="group" aria-label="Confirmar eliminación definitiva">
    <p>Eliminación permanente. No se puede deshacer.</p>
    <div>
      <button type="button" className="cancelled-secondary-button" onClick={() => setConfirming(false)}>Volver</button>
      <button type="button" className="cancelled-delete-button" disabled={pending} onClick={() => startTransition(async () => {
        const result = await permanentlyDeleteCancelledAppointment(appointmentId);
        setFeedback(result);
        if (result.success) router.refresh();
      })}>{pending ? 'Eliminando…' : 'Confirmar eliminación'}</button>
    </div>
    {feedback.error && <p className="cancelled-feedback is-error" role="alert">{feedback.error}</p>}
    {pending && <span className="sr-only" role="status">Eliminando turno…</span>}
  </div>;
}

function CancelledRow({ booking, canArchive, showArchived }: { booking: CancelledBooking; canArchive: boolean; showArchived: boolean }) {
  const router = useRouter();
  const actionToUse = showArchived ? restoreCancelledAppointment : archiveCancelledAppointment;
  const [state, action, pending] = useActionState<CancelledActionState, FormData>(actionToUse, {});
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  const timezone = booking.timezone;
  const appointmentDate = formatDate(booking.startsAt, timezone, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const cancelledDate = booking.cancelledAt
    ? formatDate(booking.cancelledAt, timezone, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    : 'Fecha no disponible';

  return <li className="cancelled-row">
    <div className="cancelled-row-date">
      <span className="cancelled-label"><CalendarDays size={14} aria-hidden="true" /> Turno</span>
      <strong>{appointmentDate}</strong>
      <span className="cancelled-time"><Clock3 size={14} aria-hidden="true" />{formatDate(booking.startsAt, timezone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</span>
    </div>
    <div className="cancelled-row-main">
      <div className="cancelled-row-title">
        <strong>{booking.customerName}</strong>
        <span className="cancelled-badge">Cancelado</span>
      </div>
      <p>{booking.serviceName} <span aria-hidden="true">·</span> {booking.professionalName}</p>
      <p className="cancelled-row-meta">{booking.locationName} <span aria-hidden="true">·</span> Cancelado el {cancelledDate}</p>
      <p className="cancelled-row-reason">{booking.cancellationReason ?? 'Motivo no indicado'}</p>
      {state.error && <p className="cancelled-feedback is-error" role="alert">{state.error}</p>}
      {state.success && <p className="cancelled-feedback" role="status">{state.success}</p>}
    </div>
    {canArchive && <div className="cancelled-row-actions">
      <form action={action} className="cancelled-row-action">
        <input type="hidden" name="appointmentId" value={booking.id} />
        <SubmitButton>{showArchived ? 'Restaurar' : 'Archivar'}</SubmitButton>
        {pending && <span className="sr-only" role="status">Guardando turno…</span>}
      </form>
      {showArchived && booking.canDelete && <DeleteOneButton appointmentId={booking.id} />}
      {showArchived && !booking.canDelete && <p className="cancelled-delete-note">{booking.deleteBlockedByPayment ? 'Se conserva por tener pagos asociados.' : booking.deleteBlockedByEmail ? 'Esperá a que se cancelen sus emails.' : 'Este registro debe conservarse.'}</p>}
    </div>}
  </li>;
}

export function CancelledAppointments({
  appointments,
  total,
  activeTotal,
  archivedTotal,
  deletableTotal,
  retainedTotal,
  listLimit,
  page,
  pageCount,
  canArchive,
  showArchived,
}: {
  appointments: CancelledBooking[];
  total: number;
  activeTotal: number;
  archivedTotal: number;
  deletableTotal: number;
  retainedTotal: number;
  listLimit: number;
  page: number;
  pageCount: number;
  canArchive: boolean;
  showArchived: boolean;
}) {
  const router = useRouter();
  return <div className="cancelled-page">
    <header className="cancelled-header">
      <div>
        <p className="cancelled-eyebrow">Historial de agenda</p>
        <h1>{showArchived ? 'Cancelaciones archivadas' : 'Turnos cancelados'}</h1>
        <p className="cancelled-lede">{showArchived
          ? 'Los registros archivados se conservan y podés restaurarlos a la lista activa.'
          : 'El horario quedó libre. Conservamos los datos del turno para que puedas consultar qué pasó.'}</p>
      </div>
      <Button variant="secondary" onClick={() => router.refresh()}>
        <RotateCw size={16} aria-hidden="true" /> Actualizar
      </Button>
    </header>

    <nav className="cancelled-views" aria-label="Vistas de cancelaciones">
      <Link className={!showArchived ? 'is-active' : ''} href="/dashboard/cancelados" aria-current={!showArchived ? 'page' : undefined}>
        Activas <span>{activeTotal}</span>
      </Link>
      <Link className={showArchived ? 'is-active' : ''} href="/dashboard/cancelados?vista=archivados" aria-current={showArchived ? 'page' : undefined}>
        Archivadas <span>{archivedTotal}</span>
      </Link>
    </nav>

    <section className="cancelled-summary" aria-label="Resumen de cancelaciones">
      <div><span>{showArchived ? 'En archivo' : 'En esta lista'}</span><strong>{total}</strong><small>{showArchived ? 'Registros conservados' : 'Cancelaciones sin archivar'}</small></div>
      <div><span>{showArchived ? 'Eliminables' : 'Archivadas'}</span><strong>{showArchived ? deletableTotal : archivedTotal}</strong><small>{showArchived ? 'Sin pagos ni emails activos' : 'Fuera de la lista activa'}</small></div>
    </section>

    {canArchive && !showArchived && total > 0 && <section className="cancelled-maintenance" aria-label="Limpieza del historial">
      <div><strong>¿Querés despejar esta lista?</strong><p>Archivá todos los cancelados en un paso. El historial y los pagos se conservan.</p></div>
      <ArchiveAllForm total={total} />
    </section>}
    {canArchive && showArchived && total > 0 && <section className="cancelled-maintenance is-destructive" aria-label="Limpieza definitiva del archivo">
      <div><strong>Limpiar el archivo</strong><p>{deletableTotal
        ? `${deletableTotal} registros sin pagos ni emails pendientes se pueden eliminar. ${retainedTotal} registros se conservarán.`
        : `Los ${retainedTotal} registros tienen pagos asociados o emails pendientes; se conservan para proteger el historial.`}</p></div>
      {deletableTotal > 0 && <PurgeArchivedForm eligible={deletableTotal} retained={retainedTotal} />}
    </section>}

    <section className="cancelled-board" aria-labelledby="cancelled-list-title">
      <div className="cancelled-board-heading">
        <div><h2 id="cancelled-list-title">{showArchived ? 'Historial archivado' : 'Cancelaciones recientes'}</h2><p>Ordenadas desde la más reciente.</p></div>
        {total > 0 && <span>{(page - 1) * listLimit + 1}–{Math.min(page * listLimit, total)} de {total}</span>}
      </div>
      {appointments.length ? <ul className="cancelled-list">
        {appointments.map(booking => <CancelledRow key={booking.id} booking={booking} canArchive={canArchive} showArchived={showArchived} />)}
      </ul> : <div className="cancelled-empty">
        <Archive size={24} aria-hidden="true" />
        <h3>{showArchived ? 'Todavía no hay cancelaciones archivadas' : 'No hay cancelaciones pendientes de revisar'}</h3>
        <p>{showArchived
          ? 'Al archivar cancelaciones antiguas, aparecerán aquí. Podés restaurarlas a la lista activa cuando lo necesites.'
          : 'Cuando se cancele un turno, aparecerá aquí. Los registros archivados siguen disponibles en la vista de archivo.'}</p>
        <Link href="/dashboard">Volver a la agenda</Link>
      </div>}
      {pageCount > 1 && <nav className="cancelled-pagination" aria-label="Páginas de cancelaciones">
        {page > 1
          ? <Link href={`/dashboard/cancelados?${showArchived ? 'vista=archivados&' : ''}pagina=${page - 1}`}>Anterior</Link>
          : <span aria-disabled="true">Anterior</span>}
        <span>Página {page} de {pageCount}</span>
        {page < pageCount
          ? <Link href={`/dashboard/cancelados?${showArchived ? 'vista=archivados&' : ''}pagina=${page + 1}`}>Siguiente</Link>
          : <span aria-disabled="true">Siguiente</span>}
      </nav>}
      {total > listLimit && <p className="cancelled-list-note">{showArchived
        ? 'Se muestran 10 por página. Los registros no aptos para eliminación se conservan por tener pagos o emails activos.'
        : 'Se muestran 10 por página. Podés archivar todos los cancelados para despejar la agenda diaria.'}</p>}
    </section>
  </div>;
}
