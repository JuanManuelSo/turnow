'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { Button, FormField, Input, Select } from '@/components/ui';
import {
  getRescheduleOptions,
  rescheduleAppointment,
  type AgendaActionState,
  type RescheduleOptionsResult,
} from '@/app/dashboard/agenda-actions';

const emptyState: AgendaActionState = {};
const emptyOptions: RescheduleOptionsResult = { locations: [], professionals: [], slots: [] };

function localDate(value: Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

type Slot = RescheduleOptionsResult['slots'][number];

export function RescheduleForm({
  appointmentId,
  initialLocationId,
  initialProfessionalId,
  startsAt,
  timezone,
  role,
  locations,
  onCancel,
}: {
  appointmentId: string;
  initialLocationId: string;
  initialProfessionalId: string;
  startsAt: Date;
  timezone: string;
  role: 'owner' | 'location_operator';
  locations: Array<{ id: string; name: string }>;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(rescheduleAppointment, emptyState);
  const [locationId, setLocationId] = useState(initialLocationId);
  const [professionalId, setProfessionalId] = useState<string>(initialProfessionalId);
  const [date, setDate] = useState(() => localDate(startsAt, timezone));
  const [chosen, setChosen] = useState<Slot | null>(null);
  const [loaded, setLoaded] = useState<{ key: string; result: RescheduleOptionsResult } | null>(null);
  const requestRef = useRef(0);
  const requestKey = `${locationId}|${professionalId}|${date}`;
  const options = loaded?.key === requestKey ? loaded.result : emptyOptions;
  const loading = loaded?.key !== requestKey;
  const loadError = loaded?.key === requestKey ? loaded.result.error ?? '' : '';

  useEffect(() => {
    const requestId = ++requestRef.current;
    getRescheduleOptions({ appointmentId, locationId, professionalId, date })
      .then(result => {
        if (requestId !== requestRef.current) return;
        setLoaded({ key: requestKey, result });
      })
      .catch(() => {
        if (requestId !== requestRef.current) return;
        setLoaded({
          key: requestKey,
          result: { ...emptyOptions, error: 'No pudimos consultar la disponibilidad. Intentá de nuevo.' },
        });
      });
  }, [appointmentId, locationId, professionalId, date, requestKey]);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  const ownerLocations = options.locations.length ? options.locations : locations;

  return <form action={action} className="agenda-reschedule-form grid gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3.5">
    <strong className="flex items-center gap-2 text-[.8rem]"><CalendarClock size={15} aria-hidden="true" /> Reprogramar turno</strong>
    <input type="hidden" name="appointmentId" value={appointmentId} />
    <input type="hidden" name="locationId" value={locationId} />
    <input type="hidden" name="date" value={date} />
    <input type="hidden" name="time" value={chosen?.time ?? ''} />
    <input type="hidden" name="professionalId" value={chosen?.professionalId ?? ''} />

    {role === 'owner' && ownerLocations.length > 1 && <FormField label="Sede" htmlFor="reschedule-location">
      <Select
        id="reschedule-location"
        value={locationId}
        onChange={event => {
          setLocationId(event.currentTarget.value);
          setProfessionalId('any');
          setChosen(null);
        }}
      >
        {ownerLocations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
      </Select>
    </FormField>}

    <div className="agenda-form-grid grid grid-cols-2 gap-4 max-[520px]:grid-cols-1 max-[520px]:gap-3">
      <FormField label="Profesional" htmlFor="reschedule-professional">
        <Select
          id="reschedule-professional"
          value={professionalId}
          onChange={event => {
            setProfessionalId(event.currentTarget.value);
            setChosen(null);
          }}
        >
          <option value="any">Cualquier profesional disponible</option>
          {options.professionals.map(professional => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
        </Select>
      </FormField>
      <FormField label="Fecha" htmlFor="reschedule-date">
        <Input
          id="reschedule-date"
          type="date"
          value={date}
          required
          onChange={event => {
            setDate(event.currentTarget.value);
            setChosen(null);
          }}
        />
      </FormField>
    </div>

    <FormField
      label="Horario disponible"
      htmlFor="reschedule-time"
      hint={loading ? 'Buscando horarios…' : undefined}
    >
      <Select
        id="reschedule-time"
        value={chosen ? `${chosen.professionalId}|${chosen.time}` : ''}
        required
        disabled={loading || !options.slots.length}
        onChange={event => {
          const slot = options.slots.find(item => `${item.professionalId}|${item.time}` === event.currentTarget.value) ?? null;
          setChosen(slot);
        }}
      >
        <option value="">
          {loading ? 'Buscando horarios…' : options.slots.length ? 'Elegí un horario' : 'Sin horarios disponibles'}
        </option>
        {options.slots.map(slot => <option key={`${slot.professionalId}-${slot.time}`} value={`${slot.professionalId}|${slot.time}`}>
          {slot.time}{professionalId === 'any' ? ` · ${slot.professionalName}` : ''}
        </option>)}
      </Select>
    </FormField>

    {(loadError || state.error) && <p className="agenda-action-error rounded bg-[#f9e9eb] p-3 text-xs text-[#932f3a]" role="alert">
      {loadError || state.error}
    </p>}
    {state.success && <p className="agenda-action-success rounded bg-[#e7f2ec] p-3 text-xs text-[#1f5c47]" role="status">
      {state.success}
    </p>}

    <div className="agenda-dialog-actions flex justify-end gap-2 pt-2 max-[520px]:flex-col-reverse max-[520px]:[&_.button]:w-full">
      <Button variant="secondary" onClick={onCancel}>Volver</Button>
      <Button type="submit" disabled={!chosen || pending}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </div>
  </form>;
}
