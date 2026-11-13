'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Clock3, MapPin } from 'lucide-react';
import { addDays, allSlots, available, baseDate, Booking, dateLabel, eligible, locationAddress, locations, LocationId, money, services, slots } from '@/modules/prototype';
import { Button, Choice, Empty } from './ui';
import { Summary } from './summary';

const steps = ['Servicio', 'Sede y profesional', 'Horario', 'Tus datos', 'Revisión'];
type Props = { initialService: string; bookings: Booking[]; back: () => void; onSuccess: (b: Booking) => void; empty: boolean; clearEmpty: () => void; conflict: boolean; clearConflict: () => void };
export function BookingFlow({ initialService, bookings, back, onSuccess, empty, clearEmpty, conflict, clearConflict }: Props) {
  const [step, setStep] = useState(0);
  const [service, setService] = useState(initialService);
  const [professional, setProfessional] = useState('any');
  const [location, setLocation] = useState<LocationId | ''>('');
  const [date, setDate] = useState(baseDate);
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);
  const selection = { service, professional, location, date, time };
  const visibleTimes = empty ? [] : allSlots(date, service);
  const isFree = (t: string) => !!location && !blocked.includes(`${location}/${date}/${t}`) && available(date, t, service, professional, location, bookings).length > 0;
  const freeTimes = visibleTimes.filter(isFree);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => { if (empty) setTime(''); }, [empty]);
  function next() {
    setError('');
    if (step === 1 && !location) { setError('Elegí una sede para continuar.'); return; }
    if (step === 2 && !time) { setError('Elegí un horario para continuar.'); return; }
    if (step === 3 && (!name.trim() || phone.replace(/\D/g, '').length < 8)) { setError(!name.trim() ? 'Ingresá tu nombre y apellido.' : 'Ingresá un teléfono con código de área (al menos 8 dígitos).'); return; }
    setStep(step + 1);
  }
  async function confirm() {
    if (lock.current || !location) return;
    lock.current = true; setBusy(true); setError('');
    await new Promise(resolve => setTimeout(resolve, 450));
    const candidates = available(date, time, service, professional, location, bookings);
    if (conflict || !candidates.length) {
      setBlocked(previous => [...previous, `${location}/${date}/${time}`]); clearConflict(); setTime(''); setStep(2);
      setError('Ese horario acaba de ocuparse. Elegí otro para continuar; conservamos tus datos.');
    } else onSuccess({ ...selection, location, id: crypto.randomUUID(), code: `NORTE-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`, name: name.trim(), phone, professional: candidates[0].id, status: 'Confirmada' });
    setBusy(false); lock.current = false;
  }
  return <section className="booking-layout"><div className="booking-work">
    <button className="back-link" onClick={() => step ? (setStep(step - 1), setError('')) : back()}><ArrowLeft size={16} />{step ? 'Volver al paso anterior' : 'Volver al estudio'}</button>
    <nav className="stepper" aria-label="Pasos de reserva">{steps.map((label, i) => <button key={label} disabled={i > step} aria-current={i === step ? 'step' : undefined} onClick={() => { setStep(i); setError(''); }}><span>{i < step ? <Check size={13} /> : i + 1}</span><b>{label}</b></button>)}</nav>
    <h1 ref={heading} tabIndex={-1}>{['¿Qué te gustaría hacer?', '¿A qué sede venís?', 'Elegí tu momento.', 'Un último dato. Bueno, dos.', 'Todo listo para confirmar.'][step]}</h1>
    <p className="section-description">{['Elegí un servicio. El precio es el mismo con todo el equipo.', 'Primero elegí la sede; después, quién te atiende allí.', 'Los horarios se muestran una sola vez, aunque haya varios profesionales libres.', 'No necesitás crear una cuenta para reservar.', 'Revisá los detalles de tu visita antes de reservar.'][step]}</p>
    {step === 0 && <div className="choices">{services.map(s => <Choice key={s.id} selected={service === s.id} onClick={() => { if (service !== s.id) { setService(s.id); setProfessional('any'); setTime(''); } }}><span className="service-choice"><span><strong>{s.name}</strong><span className="choice-description">{s.description}</span><small><Clock3 size={14} />{s.duration} min</small></span><b>{money(s.price)}</b></span></Choice>)}</div>}
    {step === 1 && <><div className="choices" role="group" aria-label="Elegí una sede">{locations.map(place => <Choice key={place.id} selected={location === place.id} onClick={() => { if (location !== place.id) { setLocation(place.id); setProfessional('any'); setTime(''); setError(''); } }}><span className="location-choice"><MapPin size={20} /><span><strong>{place.address}</strong><span className="choice-description">Rosario, Santa Fe</span></span></span></Choice>)}</div>{location && <div className="professional-options"><h2>Profesionales en {locationAddress(location)}</h2><p>Nombres de ejemplo · Elegí a alguien o dejá que te asignemos.</p><div className="choices"><Choice selected={professional === 'any'} onClick={() => { setProfessional('any'); setTime(''); }}><strong>Cualquier profesional disponible</strong><span className="choice-description">Te asignaremos un profesional de esta sede al confirmar.</span></Choice>{eligible(service, location).map(p => <Choice key={p.id} selected={professional === p.id} onClick={() => { setProfessional(p.id); setTime(''); }}><span className="person"><span className="avatar">{p.initials}</span><span><strong>{p.name}</strong><small>{p.role}</small></span></span></Choice>)}</div></div>}</>}
    {step === 2 && <><div className="date-heading"><h2>{new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(date + 'T12:00:00'))}</h2><label className="date-picker">Otra fecha<input type="date" aria-label="Elegir otra fecha" min={baseDate} max="2026-12-12" value={date} onChange={e => { if (e.target.value) { setDate(e.target.value); setTime(''); } }} /></label></div>
      <div className="day-strip">{Array.from({ length: 7 }, (_, i) => addDays(date < addDays(baseDate, 7) ? baseDate : date, i)).map(d => <button key={d} aria-pressed={date === d} className={date === d ? 'selected' : ''} onClick={() => { setDate(d); setTime(''); }}><span>{new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(new Date(d + 'T12:00:00'))}</span><strong>{Number(d.slice(-2))}</strong><small>{date === d ? 'Elegido' : d === baseDate ? 'Hoy' : ' '}</small></button>)}</div>
      <div className="availability-caption"><span>{dateLabel(date)} · {location ? locationAddress(location) : ''}</span><small>Hora de Rosario (GMT−3)</small></div>
      {!!visibleTimes.length && ['Mañana', 'Tarde'].map((period, i) => <div className="slot-group" key={period}><h3>{period}</h3><div className="slots">{visibleTimes.filter(t => i ? t >= '14:00' : t < '14:00').map(t => <button key={t} type="button" disabled={!isFree(t)} aria-pressed={isFree(t) ? time === t : undefined} className={`${time === t ? 'selected ' : ''}${!isFree(t) ? 'reserved' : ''}`} onClick={() => { setTime(t); setError(''); }}><span>{t}</span>{isFree(t) ? time === t && <Check size={14} /> : <small>Reservado</small>}</button>)}</div></div>)}
      {!freeTimes.length && <Empty title="Este día no tiene horarios disponibles" action="Ver próxima fecha disponible" onAction={() => { clearEmpty(); let nextDate = addDays(date, 1); while (!slots(nextDate, service, professional, location || 'urquiza', bookings).length) nextDate = addDays(nextDate, 1); setDate(nextDate); setTime(''); }}>Probá con otro día, sede o profesional.</Empty>}
      {professional === 'any' && <p className="inline-info"><CircleHelp size={18} />Tu profesional se asigna al confirmar, según la disponibilidad.</p>}</>}
    {step === 3 && <form id="customer-form" className="customer-form" onSubmit={e => { e.preventDefault(); next(); }}><label>Nombre y apellido<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Sofía García" required aria-invalid={!!error && !name.trim()} aria-describedby={error ? 'booking-error' : undefined} /></label><label>Teléfono con código de área<input type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ej. 341 555 0123" required aria-invalid={!!error && phone.replace(/\D/g, '').length < 8} aria-describedby={error ? 'booking-error' : undefined} /><small>Para que el estudio pueda contactarte por tu turno.</small></label><p className="inline-info">En esta demo no se envían mensajes ni se usan datos reales.</p></form>}
    {step === 4 && <div className="review-content"><Summary {...selection} /><div className="review-customer"><span><strong>{name}</strong><small>{phone}</small></span><button className="text-link" onClick={() => setStep(3)}>Editar datos</button></div><p className="policy"><strong>Si cambian tus planes</strong>Podés cancelar con tu código hasta 2 horas antes. Guardalo al confirmar. Política de ejemplo; el plazo no se aplica en esta demo.</p></div>}
    {error && <p id="booking-error" className="error" role="alert">{error}</p>}<div className="booking-footer"><span>Paso {step + 1} de {steps.length}</span>{step < 4 ? <Button key={step} type="button" onClick={next} disabled={(step === 1 && !location) || (step === 2 && !time)}>Continuar<ArrowRight size={17} /></Button> : <Button disabled={busy} onClick={confirm}>{busy ? 'Confirmando…' : 'Confirmar turno'}<Check size={18} /></Button>}</div>
  </div><aside className="booking-summary"><h2>Tu visita al estudio</h2><Summary {...selection} /><small>La selección no retiene el horario. Tu turno queda reservado al confirmar.</small></aside></section>;
}
