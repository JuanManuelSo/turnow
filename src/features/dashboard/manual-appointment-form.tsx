'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, FormField, Input, Select } from '@/components/ui';
import { formatMoney } from '@/lib/dashboard-format';
import { getManualAvailability, type AgendaActionState } from '@/app/dashboard/agenda-actions';

type Professional = { id: string; name: string };
type Service = { id: string; name: string; duration: number; priceMinor: number | null };
type Slot = { time: string; professionalId: string; professionalName: string };

export function ManualAppointmentForm({
  action, state, pending, locationId, date: initialDate, professionals, services, currency, allowAnyProfessional, onCancel,
}: {
  action: (formData: FormData) => void;
  state: AgendaActionState;
  pending: boolean;
  locationId: string;
  date: string;
  professionals: Professional[];
  services: Service[];
  currency: string;
  allowAnyProfessional: boolean;
  onCancel: () => void;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [professionalId, setProfessionalId] = useState(allowAnyProfessional ? 'any' : professionals[0]?.id ?? '');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [availability, setAvailability] = useState<{ slots: Slot[]; error?: string; key: string } | null>(null);
  const key = useMemo(() => [locationId, serviceId, date, professionalId].join(':'), [locationId, serviceId, date, professionalId]);

  useEffect(() => {
    if (!locationId || !serviceId || !date || !professionalId) return;
    let active = true;
    getManualAvailability({ locationId, serviceId, date, professionalId }).then(result => {
      if (active) setAvailability({ ...result, key });
    }).catch(() => {
      if (active) setAvailability({ slots: [], error: 'No se pudo consultar la disponibilidad. Intentá de nuevo.', key });
    });
    return () => { active = false; };
  }, [locationId, serviceId, date, professionalId, key]);

  const current = availability?.key === key ? availability : null;
  const slotOptions = useMemo(() => {
    if (!current) return [];
    const byTime = new Map<string, Slot>();
    for (const slot of current.slots) if (!byTime.has(slot.time)) byTime.set(slot.time, slot);
    return [...byTime.values()];
  }, [current]);
  const selectedService = services.find(service => service.id === serviceId);

  if (submitted && state.success) return <div className="agenda-form grid gap-4 p-5">
    <p className="agenda-action-success rounded bg-[#e7f2ec] p-3 text-xs text-[#1f5c47]" role="status">{state.success}</p>
    <p className="agenda-muted text-sm text-[#56657a]">El turno ya está en la agenda.</p>
    <div className="agenda-dialog-actions flex justify-end gap-2 pt-2"><Button type="button" onClick={onCancel}>Ver agenda</Button></div>
  </div>;

  return <form action={action} className="agenda-form grid gap-[17px] p-5" onSubmit={() => setSubmitted(true)}>
    <input type="hidden" name="locationId" value={locationId} />
    <div className="agenda-form-grid grid grid-cols-2 gap-4 max-[520px]:grid-cols-1">
      <FormField label="Cliente" htmlFor="booking-name"><Input id="booking-name" name="customerName" autoComplete="name" data-autofocus required maxLength={160} aria-invalid={!!state.fields?.customerName} />{state.fields?.customerName && <small className="field-error">{state.fields.customerName}</small>}</FormField>
      <FormField label="Teléfono" htmlFor="booking-phone"><Input id="booking-phone" name="customerPhone" type="tel" placeholder="+5493415550100" autoComplete="tel" required aria-invalid={!!state.fields?.customerPhone} />{state.fields?.customerPhone && <small className="field-error">{state.fields.customerPhone}</small>}</FormField>
      <FormField label="Servicio" htmlFor="booking-service"><Select id="booking-service" name="serviceId" required value={serviceId} onChange={event => { setServiceId(event.currentTarget.value); setTime(''); }}>{services.map(service => <option key={service.id} value={service.id}>{service.name} · {service.duration} min{service.priceMinor !== null ? ` · ${formatMoney(service.priceMinor, currency)}` : ''}</option>)}</Select>{state.fields?.serviceId && <small className="field-error">{state.fields.serviceId}</small>}</FormField>
      <FormField label="Profesional" htmlFor="booking-professional"><Select id="booking-professional" name="professionalId" required value={professionalId} onChange={event => { setProfessionalId(event.currentTarget.value); setTime(''); }}>{allowAnyProfessional && <option value="any">Cualquier profesional disponible</option>}{professionals.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</Select>{state.fields?.professionalId && <small className="field-error">{state.fields.professionalId}</small>}</FormField>
      <FormField label="Fecha" htmlFor="booking-date"><Input id="booking-date" name="date" type="date" value={date} onChange={event => { setDate(event.currentTarget.value); setTime(''); }} required /></FormField>
      <FormField label="Horario disponible" htmlFor="booking-time"><Select id="booking-time" name="time" value={time} onChange={event => setTime(event.currentTarget.value)} required disabled={!current || !slotOptions.length}><option value="">{!current ? 'Consultando…' : slotOptions.length ? 'Elegí un horario' : 'Sin horarios disponibles'}</option>{slotOptions.map(slot => <option key={slot.time} value={slot.time}>{slot.time}{professionalId === 'any' ? ` · ${slot.professionalName}` : ''}</option>)}</Select></FormField>
    </div>
    {selectedService && <p className="agenda-muted text-xs leading-relaxed text-[#56657a]">Duración: {selectedService.duration} min · Precio registrado: {formatMoney(selectedService.priceMinor, currency)}. El turno guardará estos valores como snapshot.</p>}
    {current?.error && <p className="agenda-action-error rounded bg-[#f9e9eb] p-3 text-xs text-[#932f3a]" role="alert">{current.error}</p>}
    {current && !current.error && !slotOptions.length && <p className="agenda-muted text-xs text-[#56657a]" role="status">No hay horarios libres para esta combinación. Probá otra fecha o profesional.</p>}
    {state.error && submitted && <p className="agenda-action-error rounded bg-[#f9e9eb] p-3 text-xs text-[#932f3a]" role="alert">{state.error}</p>}
    <div className="agenda-dialog-actions flex justify-end gap-2 pt-2 max-[520px]:flex-col-reverse"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={pending || !time || !current || !slotOptions.length}>{pending ? 'Guardando…' : 'Guardar turno'}</Button></div>
  </form>;
}
