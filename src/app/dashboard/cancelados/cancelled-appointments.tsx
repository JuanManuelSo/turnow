'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, CalendarDays, Clock3, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  archiveCancelledAppointment,
  archiveOldCancelledAppointments,
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

function ArchiveOldForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<CancelledActionState, FormData>(archiveOldCancelledAppointments, {});
  useEffect(() => { if (state.success) router.refresh(); }, [state.success, router]);
  const [confirming, setConfirming] = useState(false);

  if (confirming) return <div className="cancelled-confirm" role="group" aria-label="Confirmar archivo de cancelaciones antiguas">
    <p>Se archivarán las cancelaciones de más de 90 días. No se borran; los datos y pagos quedan conservados.</p>
    <div className="cancelled-confirm-actions">
      <button type="button" className="cancelled-secondary-button" onClick={() => setConfirming(false)}>Volver</button>
      <form action={action}><SubmitButton>Confirmar archivo</SubmitButton></form>
    </div>
    {state.error && <p className="cancelled-feedback is-error" role="alert">{state.error}</p>}
    {state.success && <p className="cancelled-feedback" role="status">{state.success}</p>}
    {pending && <span className="sr-only" role="status">Archivando cancelaciones…</span>}
  </div>;

  return <>
    <button type="button" className="cancelled-secondary-button" onClick={() => setConfirming(true)}>
      <Archive size={16} aria-hidden="true" /> Archivar las de más de 90 días
    </button>
    {state.error && <p className="cancelled-feedback is-error" role="alert">{state.error}</p>}
    {state.success && <p className="cancelled-feedback" role="status">{state.success}</p>}
  </>;
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
    {canArchive && <form action={action} className="cancelled-row-action">
      <input type="hidden" name="appointmentId" value={booking.id} />
      <SubmitButton>{showArchived ? 'Restaurar' : 'Archivar'}</SubmitButton>
      {pending && <span className="sr-only" role="status">Archivando turno…</span>}
    </form>}
  </li>;
}

export function CancelledAppointments({
  appointments,
  total,
  activeTotal,
  archivedTotal,
  olderThanRetention,
  listLimit,
  page,
  pageCount,
  archiveAfterDays,
  canArchive,
  showArchived,
}: {
  appointments: CancelledBooking[];
  total: number;
  activeTotal: number;
  archivedTotal: number;
  olderThanRetention: number;
  listLimit: number;
  page: number;
  pageCount: number;
  archiveAfterDays: number;
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
      <div><span>{showArchived ? 'Visibles' : 'Para ordenar'}</span><strong>{showArchived ? Math.min(total, listLimit) : olderThanRetention}</strong><small>{showArchived ? 'Mostradas en esta vista' : `Con más de ${archiveAfterDays} días`}</small></div>
    </section>

    {canArchive && !showArchived && olderThanRetention > 0 && <section className="cancelled-maintenance" aria-label="Limpieza del historial">
      <div><strong>¿Querés despejar esta lista?</strong><p>Archivá en un paso las cancelaciones antiguas. El historial y los pagos se conservan.</p></div>
      <ArchiveOldForm />
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
      {total > listLimit && <p className="cancelled-list-note">{showArchived ? 'El archivo conserva el historial completo.' : `Archivá las cancelaciones de más de ${archiveAfterDays} días para mantener esta lista manejable.`}</p>}
    </section>
  </div>;
}
