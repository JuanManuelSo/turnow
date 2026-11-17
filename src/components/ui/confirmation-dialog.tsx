'use client';

import { useEffect, useId, useRef } from 'react';
import { CalendarDays, MapPin, TriangleAlert } from 'lucide-react';
import { Button } from './button';

function formatBookingDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

export function ConfirmationDialog({
  date,
  time,
  location,
  pending = false,
  onCancel,
  onConfirm,
}: {
  date: string;
  time: string;
  location: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef(onCancel);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const returnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      returnFocus?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="w-[calc(100%_-_32px)] max-w-[460px] rounded-xl border border-[#d7e0ea] bg-white p-0 text-[#142b49] shadow-[0_24px_80px_#142b4940] backdrop:bg-[#142b4975]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        cancelRef.current();
      }}
    >
      <div className="grid gap-5 p-6 max-[520px]:gap-4 max-[520px]:p-5">
        <div className="flex items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fae9eb] text-[#982332]" aria-hidden="true">
            <TriangleAlert size={19} />
          </span>
          <div className="grid gap-1.5 pt-0.5">
            <h2 id={titleId} className="text-lg font-extrabold tracking-tight">¿Cancelar este turno?</h2>
            <p id={descriptionId} className="text-sm leading-relaxed text-[#4d5d71]">
              Esta acción no se puede deshacer. El horario quedará disponible para otra persona.
            </p>
          </div>
        </div>

        <dl className="m-0 grid gap-0 rounded-lg border border-[#d7e0ea] bg-[#f7f9fb] px-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#d7e0ea] py-3">
            <dt className="flex items-center gap-2 text-xs font-semibold text-[#56657a]"><CalendarDays size={15} aria-hidden="true" /> Fecha y hora</dt>
            <dd className="m-0 text-right text-sm font-bold capitalize tabular-nums">{formatBookingDate(date)} · {time}</dd>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
            <dt className="flex items-center gap-2 text-xs font-semibold text-[#56657a]"><MapPin size={15} aria-hidden="true" /> Sede</dt>
            <dd className="m-0 text-right text-sm font-bold">{location}</dd>
          </div>
        </dl>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="min-h-11" onClick={onCancel} disabled={pending} autoFocus>
            Conservar turno
          </Button>
          <Button type="button" variant="danger" className="min-h-11" onClick={onConfirm} disabled={pending}>
            {pending ? 'Cancelando…' : 'Sí, cancelar turno'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
