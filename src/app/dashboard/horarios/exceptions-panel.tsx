'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarOff, CircleAlert, Clock3, Plus, Trash2, UserRound } from 'lucide-react';
import { Button, FormField, Input, Select } from '@/components/ui';
import { FormFeedback } from '@/components/dashboard/form-feedback';
import { SubmitButton } from '@/components/dashboard/submit-button';
import {
  deleteProfessionalBlockAction,
  deleteScheduleExceptionAction,
  saveProfessionalBlockAction,
  saveScheduleExceptionAction,
  type ExceptionActionState,
} from '@/app/dashboard/horarios/exception-actions';

type ExceptionInterval = { startMinute: number; endMinute: number };
export type ScheduleExceptionItem = {
  id: string;
  localDate: string;
  mode: 'closed' | 'custom';
  reason: string | null;
  professionalId: string | null;
  intervals: ExceptionInterval[];
};
export type ProfessionalBlockItem = {
  id: string;
  professionalId: string;
  professionalName: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};
type Professional = { id: string; name: string };
type Range = { start: string; end: string };

const emptyState: ExceptionActionState = {};

function timeLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${value}T12:00:00Z`));
}

function localParts(value: Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function blockLabel(block: ProfessionalBlockItem, timezone: string) {
  const start = localParts(block.startsAt, timezone);
  const end = localParts(block.endsAt, timezone);
  if (start.time === '00:00' && end.time === '00:00' && start.date !== end.date) {
    return `${dateLabel(start.date)} · Todo el día`;
  }
  return `${dateLabel(start.date)} · ${start.time} a ${end.time}`;
}

function exceptionDetail(exception: ScheduleExceptionItem) {
  if (exception.mode === 'closed') return 'Cerrado todo el día';
  if (!exception.intervals.length) return 'Sin horario definido';
  return exception.intervals
    .map(interval => `${timeLabel(interval.startMinute)} a ${timeLabel(interval.endMinute)}`)
    .join(' · ');
}

function ConfirmationWarning({
  state,
  pending,
  onConfirm,
}: {
  state: ExceptionActionState;
  pending: boolean;
  onConfirm: () => void;
}) {
  if (!state.needsConfirmation) return null;
  return <div className="grid gap-2 rounded border border-[#ead7ae] bg-[#fffaf0] p-3 text-[#674c1d]" role="alert">
    <span className="flex items-start gap-2 text-xs leading-relaxed">
      <CircleAlert size={16} aria-hidden="true" />
      <span>{state.needsConfirmation.message}</span>
    </span>
    <Button variant="secondary" type="submit" onClick={onConfirm} disabled={pending} className="justify-self-start">
      {pending ? 'Guardando…' : 'Guardar igual'}
    </Button>
  </div>;
}

function ExceptionForm({ locationId, today }: { locationId: string; today: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveScheduleExceptionAction, emptyState);
  const [mode, setMode] = useState<'closed' | 'custom'>('closed');
  const [localDate, setLocalDate] = useState('');
  const [reason, setReason] = useState('');
  const [ranges, setRanges] = useState<Range[]>([{ start: '09:00', end: '18:00' }]);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      if (confirmRef.current) confirmRef.current.value = '0';
      router.refresh();
    }
  }, [state.success, router]);

  function resetConfirm() {
    if (confirmRef.current) confirmRef.current.value = '0';
  }

  function confirmSave() {
    if (confirmRef.current) confirmRef.current.value = '1';
  }

  function updateRange(index: number, key: keyof Range, value: string) {
    setRanges(previous => previous.map((range, rangeIndex) => rangeIndex === index ? { ...range, [key]: value } : range));
  }

  return <form action={action} className="panel-form grid gap-4 rounded border border-[#dde3eb] bg-white p-5 max-[600px]:p-4">
    <FormFeedback state={state} />
    <input type="hidden" name="locationId" value={locationId} />
    <input type="hidden" name="ranges" value={JSON.stringify(mode === 'custom' ? ranges : [])} />
    <input ref={confirmRef} type="hidden" name="confirm" defaultValue="0" />

    <div className="grid gap-1">
      <h3 className="flex items-center gap-2 text-[.9375rem] font-bold"><CalendarOff size={17} aria-hidden="true" /> Cierre u horario especial</h3>
      <p className="text-xs leading-relaxed text-[#56657a]">Aplica a la sede y a todos sus profesionales.</p>
    </div>

    <div className="panel-field-grid grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
      <FormField label="Fecha" htmlFor="exception-date">
        <Input
          id="exception-date"
          name="localDate"
          type="date"
          min={today}
          required
          value={localDate}
          onChange={event => {
            setLocalDate(event.currentTarget.value);
            resetConfirm();
          }}
        />
      </FormField>
      <FormField label="Tipo" htmlFor="exception-mode">
        <Select
          id="exception-mode"
          name="mode"
          value={mode}
          onChange={event => {
            setMode(event.currentTarget.value as 'closed' | 'custom');
            resetConfirm();
          }}
        >
          <option value="closed">Cerrado todo el día</option>
          <option value="custom">Horario especial</option>
        </Select>
      </FormField>
    </div>

    {mode === 'custom' && <div className="grid gap-2 rounded border border-[#dde3eb] bg-[#f8fafc] p-3">
      <strong className="text-xs">Tramos de atención</strong>
      {ranges.map((range, index) => <div className="flex flex-wrap items-center gap-2" key={index}>
        <Input
          aria-label={`Inicio del tramo ${index + 1}`}
          type="time"
          value={range.start}
          step={300}
          onChange={event => updateRange(index, 'start', event.currentTarget.value)}
          className="w-28"
        />
        <span className="text-xs text-[#56657a]">a</span>
        <Input
          aria-label={`Fin del tramo ${index + 1}`}
          type="time"
          value={range.end}
          step={300}
          onChange={event => updateRange(index, 'end', event.currentTarget.value)}
          className="w-28"
        />
        <button
          type="button"
          className="grid size-11 place-items-center rounded text-[#56657a] hover:bg-[#f9e9eb] hover:text-[#932f3a]"
          aria-label={`Quitar tramo ${index + 1}`}
          disabled={ranges.length === 1}
          onClick={() => setRanges(previous => previous.filter((_, rangeIndex) => rangeIndex !== index))}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>)}
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-self-start gap-1 px-2 text-xs font-bold text-[#244f82] hover:underline hover:underline-offset-4"
        onClick={() => setRanges(previous => [...previous, { start: '09:00', end: '18:00' }])}
      >
        <Plus size={14} aria-hidden="true" /> Agregar tramo
      </button>
    </div>}

    <FormField label="Motivo (opcional)" htmlFor="exception-reason" hint="Por ejemplo: feriado, capacitación o mantenimiento.">
      <Input
        id="exception-reason"
        name="reason"
        maxLength={300}
        value={reason}
        onChange={event => {
          setReason(event.currentTarget.value);
          resetConfirm();
        }}
      />
    </FormField>

    {state.needsConfirmation && !state.success && <ConfirmationWarning state={state} pending={pending} onConfirm={confirmSave} />}
    {state.success && <p className="panel-notice rounded border border-[#c9dfd3] bg-[#f1f8f3] px-3 py-2 text-xs text-[#235640]" role="status">{state.success}</p>}

    <SubmitButton>Guardar excepción</SubmitButton>
  </form>;
}

function BlockForm({ locationId, today, professionals }: {
  locationId: string;
  today: string;
  professionals: Professional[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProfessionalBlockAction, emptyState);
  const [allDay, setAllDay] = useState(true);
  const [localDate, setLocalDate] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [reason, setReason] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('13:00');
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      if (confirmRef.current) confirmRef.current.value = '0';
      router.refresh();
    }
  }, [state.success, router]);

  function resetConfirm() {
    if (confirmRef.current) confirmRef.current.value = '0';
  }

  function confirmSave() {
    if (confirmRef.current) confirmRef.current.value = '1';
  }

  return <form action={action} className="panel-form grid gap-4 rounded border border-[#dde3eb] bg-white p-5 max-[600px]:p-4">
    <FormFeedback state={state} />
    <input type="hidden" name="locationId" value={locationId} />
    <input ref={confirmRef} type="hidden" name="confirm" defaultValue="0" />
    <input type="hidden" name="professionalId" value={professionalId} />

    <div className="grid gap-1">
      <h3 className="flex items-center gap-2 text-[.9375rem] font-bold"><UserRound size={17} aria-hidden="true" /> Bloqueo de un profesional</h3>
      <p className="text-xs leading-relaxed text-[#56657a]">Para ausencias, descansos o tareas internas. No afecta al resto del equipo.</p>
    </div>

    <FormField label="Profesional" htmlFor="block-professional">
      <Select id="block-professional" value={professionalId} onChange={event => {
        setProfessionalId(event.currentTarget.value);
        resetConfirm();
      }}>
        <option value="">Elegí un profesional</option>
        {professionals.map(professional => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
      </Select>
    </FormField>

    <div className="panel-field-grid grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
      <FormField label="Fecha" htmlFor="block-date">
        <Input id="block-date" name="localDate" type="date" min={today} required value={localDate} onChange={event => {
          setLocalDate(event.currentTarget.value);
          resetConfirm();
        }} />
      </FormField>
      <FormField label="Duración" htmlFor="block-all-day">
        <Select
          id="block-all-day"
          value={allDay ? 'all' : 'range'}
          onChange={event => {
            setAllDay(event.currentTarget.value === 'all');
            resetConfirm();
          }}
        >
          <option value="all">Todo el día</option>
          <option value="range">Un rango horario</option>
        </Select>
      </FormField>
    </div>
    <input type="hidden" name="allDay" value={allDay ? 'true' : 'false'} />

    {!allDay && <div className="panel-field-grid grid grid-cols-2 gap-3 max-[600px]:grid-cols-1">
      <FormField label="Desde" htmlFor="block-start">
        <Input id="block-start" name="start" type="time" value={start} step={300} required onChange={event => {
          setStart(event.currentTarget.value);
          resetConfirm();
        }} />
      </FormField>
      <FormField label="Hasta" htmlFor="block-end">
        <Input id="block-end" name="end" type="time" value={end} step={300} required onChange={event => {
          setEnd(event.currentTarget.value);
          resetConfirm();
        }} />
      </FormField>
    </div>}

    <FormField label="Motivo (opcional)" htmlFor="block-reason" hint="Visible solo en el panel.">
      <Input id="block-reason" name="reason" maxLength={300} value={reason} onChange={event => {
        setReason(event.currentTarget.value);
        resetConfirm();
      }} />
    </FormField>

    {state.needsConfirmation && !state.success && <ConfirmationWarning state={state} pending={pending} onConfirm={confirmSave} />}
    {state.success && <p className="panel-notice rounded border border-[#c9dfd3] bg-[#f1f8f3] px-3 py-2 text-xs text-[#235640]" role="status">{state.success}</p>}

    <SubmitButton>Guardar bloqueo</SubmitButton>
  </form>;
}

export function ExceptionsPanel({
  locationId,
  locationName,
  today,
  timezone,
  exceptions,
  blocks,
  professionals,
}: {
  locationId: string;
  locationName: string;
  today: string;
  timezone: string;
  exceptions: ScheduleExceptionItem[];
  blocks: ProfessionalBlockItem[];
  professionals: Professional[];
}) {
  return <div className="grid gap-6">
    <section className="grid gap-3" aria-labelledby="exceptions-list-title">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold" id="exceptions-list-title">
          <CalendarOff size={19} aria-hidden="true" /> Cierres y horarios especiales
        </h2>
        <p className="mt-1 text-sm text-[#56657a]">Próximas fechas con horario distinto en {locationName}.</p>
      </div>
      {exceptions.length === 0
        ? <p className="rounded border border-dashed border-[#c1cad6] bg-white px-4 py-6 text-sm text-[#56657a]">No hay excepciones cargadas para esta sede.</p>
        : <ul className="m-0 grid list-none gap-2 p-0">
          {exceptions.map(exception => <li key={exception.id} className="flex flex-wrap items-start justify-between gap-3 rounded border border-[#dde3eb] bg-white px-4 py-3">
            <div className="grid min-w-0 gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <strong className="text-sm capitalize">{dateLabel(exception.localDate)}</strong>
                <span className={`rounded-full px-2 py-0.5 text-[.66rem] font-bold ${exception.mode === 'closed' ? 'bg-[#f9e9eb] text-[#932f3a]' : 'bg-[#eaf1f8] text-[#244f82]'}`}>
                  {exception.mode === 'closed' ? 'Cerrado' : 'Horario especial'}
                </span>
                {exception.professionalId && <span className="text-[.66rem] font-bold tracking-wide text-[#56657a] uppercase">Profesional</span>}
              </span>
              <span className="text-xs text-[#56657a]">{exceptionDetail(exception)}</span>
              {exception.reason && <span className="text-xs text-[#56657a]">{exception.reason}</span>}
            </div>
            <form action={deleteScheduleExceptionAction}>
              <input type="hidden" name="id" value={exception.id} />
              <input type="hidden" name="locationId" value={locationId} />
              <button className="inline-flex min-h-10 items-center gap-1 px-2 text-xs font-bold text-[#932f3a] hover:underline hover:underline-offset-4" type="submit">
                <Trash2 size={14} aria-hidden="true" /> Eliminar
              </button>
            </form>
          </li>)}
        </ul>}
    </section>

    <ExceptionForm locationId={locationId} today={today} />

    <section className="grid gap-3" aria-labelledby="blocks-list-title">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold" id="blocks-list-title">
          <Clock3 size={19} aria-hidden="true" /> Bloqueos del equipo
        </h2>
        <p className="mt-1 text-sm text-[#56657a]">Rangos sin atención de un profesional en {locationName}.</p>
      </div>
      {blocks.length === 0
        ? <p className="rounded border border-dashed border-[#c1cad6] bg-white px-4 py-6 text-sm text-[#56657a]">No hay bloqueos activos para esta sede.</p>
        : <ul className="m-0 grid list-none gap-2 p-0">
          {blocks.map(block => <li key={block.id} className="flex flex-wrap items-start justify-between gap-3 rounded border border-[#dde3eb] bg-white px-4 py-3">
            <div className="grid min-w-0 gap-1">
              <strong className="text-sm">{block.professionalName}</strong>
              <span className="text-xs capitalize text-[#56657a]">{blockLabel(block, timezone)}</span>
              {block.reason && <span className="text-xs text-[#56657a]">{block.reason}</span>}
            </div>
            <form action={deleteProfessionalBlockAction}>
              <input type="hidden" name="id" value={block.id} />
              <input type="hidden" name="locationId" value={locationId} />
              <button className="inline-flex min-h-10 items-center gap-1 px-2 text-xs font-bold text-[#932f3a] hover:underline hover:underline-offset-4" type="submit">
                <Trash2 size={14} aria-hidden="true" /> Eliminar
              </button>
            </form>
          </li>)}
        </ul>}
    </section>

    <BlockForm locationId={locationId} today={today} professionals={professionals} />
  </div>;
}
