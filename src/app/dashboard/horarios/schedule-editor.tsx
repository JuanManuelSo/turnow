'use client';

import { useActionState, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FormFeedback } from '@/components/dashboard/form-feedback';
import { SubmitButton } from '@/components/dashboard/submit-button';
import { saveScheduleAction } from './actions';

type Interval = { weekday: number; startMinute: number; endMinute: number };
type Range = { start: string; end: string };
type ScheduleState = Record<number, Range[]>;

const days = [
  { value: 1, name: 'Lunes' },
  { value: 2, name: 'Martes' },
  { value: 3, name: 'Miércoles' },
  { value: 4, name: 'Jueves' },
  { value: 5, name: 'Viernes' },
  { value: 6, name: 'Sábado' },
  { value: 7, name: 'Domingo' },
] as const;

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function initialState(intervals: Interval[]): ScheduleState {
  const state: ScheduleState = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  for (const interval of intervals) {
    state[interval.weekday] = [...(state[interval.weekday] ?? []), {
      start: toTime(interval.startMinute),
      end: toTime(interval.endMinute),
    }];
  }
  return state;
}

export function ScheduleEditor({ locationId, professionalId, initialIntervals }: {
  locationId: string;
  professionalId: string | null;
  initialIntervals: Interval[];
}) {
  const [state, setState] = useState<ScheduleState>(() => initialState(initialIntervals));
  const [actionState, formAction] = useActionState(saveScheduleAction, {});

  const intervals = days.flatMap(day => (state[day.value] ?? [])
    .filter(range => range.start && range.end)
    .map(range => ({
      weekday: day.value,
      startMinute: toMinutes(range.start),
      endMinute: toMinutes(range.end),
    })));

  function updateRange(weekday: number, index: number, key: keyof Range, value: string) {
    setState(previous => ({
      ...previous,
      [weekday]: (previous[weekday] ?? []).map((range, rangeIndex) => rangeIndex === index ? { ...range, [key]: value } : range),
    }));
  }

  function addRange(weekday: number) {
    setState(previous => {
      const list = previous[weekday] ?? [];
      const last = list.at(-1);
      const startMinutes = last ? toMinutes(last.end) : 9 * 60;
      const endMinutes = Math.min(startMinutes + (last ? 60 : 240), 23 * 60 + 59);
      return {
        ...previous,
        [weekday]: [...list, { start: toTime(startMinutes), end: toTime(endMinutes) }],
      };
    });
  }

  function removeRange(weekday: number, index: number) {
    setState(previous => ({
      ...previous,
      [weekday]: (previous[weekday] ?? []).filter((_, rangeIndex) => rangeIndex !== index),
    }));
  }

  function useSuggested() {
    setState({
      1: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      2: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      3: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      4: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      5: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      6: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }],
      7: [],
    });
  }

  return <form action={formAction} className="panel-form grid gap-5">
    <FormFeedback state={actionState} />
    <input type="hidden" name="locationId" value={locationId} />
    <input type="hidden" name="professionalId" value={professionalId ?? ''} />
    <input type="hidden" name="payload" value={JSON.stringify(intervals)} />

    <div className="panel-schedule-tools flex flex-wrap items-center justify-between gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3">
      <p className="max-w-[44ch] text-sm leading-[1.45] text-[#56657a]">Los tramos vacíos se descartan. Un día sin tramos queda cerrado.</p>
      <button type="button" className="panel-inline-action min-h-11 rounded px-2 text-xs font-bold text-[#244f82] underline underline-offset-4" onClick={useSuggested}>Usar horario sugerido</button>
    </div>

    <div className="panel-schedule grid divide-y divide-[#dde3eb] rounded border border-[#dde3eb] bg-white">
      {days.map(day => {
        const ranges = state[day.value] ?? [];
        return <div className="panel-day grid grid-cols-[130px_minmax(0,1fr)] gap-4 p-4 max-[600px]:grid-cols-1 max-[600px]:gap-2 max-[600px]:py-3" key={day.value}>
          <p className="panel-day-name pt-[9px] text-[.8125rem] font-bold text-[#1b2839] max-[600px]:pt-0" id={`day-${day.value}`}>{day.name}</p>
          <div className="panel-day-times grid min-w-0 gap-[7px]" role="group" aria-labelledby={`day-${day.value}`}>
            {ranges.length === 0 && <p className="panel-day-closed py-[9px] text-[.8125rem] text-[#56657a]">Cerrado</p>}
            {ranges.map((range, index) => <div className="panel-time-row flex flex-wrap items-center gap-2.5 py-1" key={`${day.value}-${index}`}>
              <input
                type="time"
                 className="min-h-11 w-28 rounded border border-[#c1cad6] bg-white p-2 text-[.84375rem] tabular-nums text-[#1b2839] focus-visible:border-[#244f82] focus-visible:outline-[3px] focus-visible:outline-[#244f82] focus-visible:outline-offset-1 max-[600px]:w-[min(34vw,112px)] max-[380px]:w-[94px]"
                value={range.start}
                step={300}
                aria-label={`${day.name}: inicio del tramo ${index + 1}`}
                onChange={event => updateRange(day.value, index, 'start', event.currentTarget.value)}
              />
              <span className="panel-time-sep text-xs text-[#56657a]">a</span>
              <input
                type="time"
                 className="min-h-11 w-28 rounded border border-[#c1cad6] bg-white p-2 text-[.84375rem] tabular-nums text-[#1b2839] focus-visible:border-[#244f82] focus-visible:outline-[3px] focus-visible:outline-[#244f82] focus-visible:outline-offset-1 max-[600px]:w-[min(34vw,112px)] max-[380px]:w-[94px]"
                value={range.end}
                step={300}
                aria-label={`${day.name}: fin del tramo ${index + 1}`}
                onChange={event => updateRange(day.value, index, 'end', event.currentTarget.value)}
              />
              <button type="button" className="panel-time-remove grid size-11 place-items-center rounded text-[#66758a] hover:bg-[#f9e9eb] hover:text-[#932f3a]" aria-label={`Quitar tramo ${index + 1} del ${day.name.toLowerCase()}`} onClick={() => removeRange(day.value, index)}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>)}
            <button type="button" className="panel-add-range inline-flex min-h-11 items-center justify-self-start gap-1 px-[7px] text-xs font-bold text-[#244f82] hover:underline hover:underline-offset-4" onClick={() => addRange(day.value)}>
              <Plus size={14} aria-hidden="true" />
              Agregar tramo
            </button>
          </div>
        </div>;
      })}
    </div>

    <div className="panel-schedule-actions grid gap-3 border-t border-[#dde3eb] pt-4 max-[600px]:[&_.button]:w-full">
      <SubmitButton>Guardar horario</SubmitButton>
      <p className="panel-form-note max-w-[40ch] text-xs leading-relaxed text-[#56657a]">Podés cargar varios tramos por día para turnos partidos.</p>
    </div>
  </form>;
}
