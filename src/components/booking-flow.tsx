'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, Clock3, MapPin } from 'lucide-react';
import { addDays, allSlots, available, baseDate, Booking, dateLabel, eligible, initialDate, locationAddress, locations, LocationId, money, services, slots } from '@/modules/prototype';
import { Button, Choice, Empty, FormField, Input } from './ui';
import { Summary } from './summary';

const steps = ['Servicio', 'Sede y profesional', 'Horario', 'Tus datos', 'Revisión'];
type Props = { initialService: string; bookings: Booking[]; back: () => void; onSuccess: (b: Booking) => void; empty: boolean; clearEmpty: () => void; conflict: boolean; clearConflict: () => void };
export function BookingFlow({ initialService, bookings, back, onSuccess, empty, clearEmpty, conflict, clearConflict }: Props) {
  const [step, setStep] = useState(0);
  const [service, setService] = useState(initialService);
  const [professional, setProfessional] = useState('any');
  const [location, setLocation] = useState<LocationId | ''>('');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);
  const selection = { service, professional, location, date, time };
  const maxBookingDate = addDays(baseDate, 60);
  const quickDateStart = date < addDays(baseDate, 7) ? baseDate : date;
  const quickDates = Array.from({ length: 7 }, (_, i) => addDays(quickDateStart, i)).filter(day => day <= maxBookingDate);
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
    } else onSuccess({ ...selection, location, id: crypto.randomUUID(), code: `HOMBRES-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`, name: name.trim(), phone, professional: candidates[0].id, status: 'Confirmada' });
    setBusy(false); lock.current = false;
  }
  return <section className="booking-layout grid grid-cols-[minmax(0,1fr)_300px] items-start gap-20 py-6 pb-16 max-[1150px]:grid-cols-[minmax(0,1fr)_270px] max-[1150px]:gap-10 max-[800px]:mx-auto max-[800px]:max-w-[650px] max-[800px]:grid-cols-1 max-[800px]:pb-10" data-step={step + 1}><div className="booking-work min-w-0">
    <button className="back-link flex min-h-11 items-center gap-2 px-0 text-xs text-muted-foreground" onClick={() => step ? (setStep(step - 1), setError('')) : back()}><ArrowLeft size={16} />{step ? 'Volver al paso anterior' : 'Volver al estudio'}</button>
    <nav className="stepper my-6 mb-9 border-b border-border pb-[18px] max-[600px]:my-3 max-[600px]:mb-[26px] max-[600px]:block max-[600px]:pb-3.5" aria-label="Pasos de reserva">
      <span className="stepper-mobile-status hidden text-sm font-bold max-[800px]:block" aria-live="polite">Paso {step + 1} de {steps.length}<span aria-hidden="true"> · </span>{steps[step]}</span>
       <div className="stepper-track flex w-full items-center justify-between gap-2 max-[600px]:relative max-[600px]:mt-2 max-[600px]:grid max-[600px]:grid-cols-5 max-[600px]:before:absolute max-[600px]:before:inset-x-[10%] max-[600px]:before:top-1/2 max-[600px]:before:h-px max-[600px]:before:bg-border max-[600px]:before:content-['']">{steps.map((label, i) => <button key={label} type="button" disabled={i > step} className={`relative z-10 flex min-h-11 items-center gap-[7px] px-0 text-xs disabled:opacity-100 max-[600px]:min-w-0 max-[600px]:justify-center ${i < step ? 'is-complete text-[#216e4e]' : ''}`} aria-label={`Paso ${i + 1}: ${label}`} aria-current={i === step ? 'step' : undefined} onClick={() => { setStep(i); setError(''); }}><span className={`grid size-[23px] shrink-0 place-items-center rounded-full border-2 text-[.6875rem] max-[600px]:size-6 ${i < step ? 'border-[#216e4e] bg-[#216e4e] text-white' : i === step ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted-foreground'}`}>{i < step ? <Check size={13} /> : i + 1}</span><b className="font-semibold max-[600px]:sr-only">{label}</b></button>)}</div>
    </nav>
    <h1 className="text-[2.35rem] leading-[1.14] tracking-[-.035em] max-[600px]:text-[2rem]" ref={heading} tabIndex={-1}>{['Elegí un servicio.', 'Elegí sede y profesional.', 'Elegí día y horario.', 'Tus datos de contacto.', 'Revisá tu turno.'][step]}</h1>
    <p className="section-description my-4 mb-7 max-w-[580px] text-[.9375rem] max-[600px]:my-[14px] max-[600px]:mb-6 max-[600px]:text-sm">{['Elegí el servicio que querés reservar. Vas a ver el precio y la duración antes de continuar.', 'Elegí dónde y con quién querés atenderte.', 'Primero elegí el día; después, uno de los horarios disponibles.', 'Completá tu nombre y teléfono para dejar la reserva a tu nombre.', 'Confirmá que el servicio, el horario y tus datos estén bien.'][step]}</p>
    {step === 0 && <>
      <div className="choices service-choices grid gap-3">{services.map(s => <Choice key={s.id} selected={service === s.id} className="service-option min-h-[116px] rounded-md p-5 transition hover:-translate-y-px" onClick={() => { if (service !== s.id) { setService(s.id); setProfessional('any'); setTime(''); } }}><span className="service-choice flex w-full items-center justify-between gap-4"><span className="service-choice-copy grid min-w-0 gap-1"><strong className="text-base leading-[1.35]">{s.name}</strong><span className="choice-description mt-0 max-w-[42ch] text-[.8125rem] leading-[1.45]">{s.description}</span><small className="service-duration mt-[5px] inline-flex items-center gap-1.5 text-xs"><Clock3 size={14} aria-hidden="true" />{s.duration} minutos</small></span><span className="service-price shrink-0 whitespace-nowrap text-base font-extrabold tabular-nums">{money(s.price)}</span></span></Choice>)}</div>
      <p className="service-step-note mt-4 flex items-center gap-2 text-[.8125rem] text-muted-foreground max-[600px]:mx-0.5 max-[600px]:mt-3.5 max-[600px]:items-start max-[600px]:text-xs"><Check className="text-brand" size={16} aria-hidden="true" /><span>Pagás en el local. No necesitás crear una cuenta.</span></p>
    </>}
    {step === 1 && <div className="booking-location-step grid gap-7">
       <section className="location-section" aria-labelledby="location-heading">
         <div className="booking-subheading mb-3.5 grid gap-1"><h2 className="text-base font-bold" id="location-heading">Sede</h2><p className="text-sm text-muted-foreground">Elegí dónde querés atenderte.</p></div>
         <div className="choices location-choices grid grid-cols-3 gap-2.5 max-[600px]:grid-cols-1 max-[600px]:gap-[9px]" role="group" aria-label="Elegí una sede">
           {locations.map(place => <Choice key={place.id} selected={location === place.id} className="location-option min-h-[118px] rounded-md p-4 transition hover:-translate-y-px hover:border-[#75879c] max-[600px]:min-h-[78px] max-[600px]:p-3.5 max-[360px]:px-[11px]" onClick={() => {
            if (location !== place.id) {
              setLocation(place.id);
              setProfessional('any');
              setTime('');
              setError('');
            }
          }}>
             <span className="location-choice grid w-full min-w-0 grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5 max-[600px]:grid-cols-[20px_minmax(0,1fr)_auto] max-[600px]:items-center max-[360px]:grid-cols-[18px_minmax(0,1fr)_auto]"><MapPin className="mt-0.5 shrink-0 text-brand max-[600px]:mt-0 max-[360px]:size-[18px]" size={20} aria-hidden="true" /><span className="location-copy grid min-w-0 gap-1"><strong className="text-sm font-bold max-[360px]:text-[.8125rem]">{place.address}</strong><span className="choice-description text-xs text-muted-foreground">Rosario, Santa Fe</span></span><span className="location-team-count col-start-2 text-[.6875rem] text-muted-foreground max-[600px]:col-start-3 max-[600px]:row-start-1 max-[600px]:max-w-[74px] max-[600px]:text-right max-[360px]:max-w-[66px] max-[360px]:text-[.625rem]">{eligible(service, place.id).length} profesionales</span></span>
          </Choice>)}
        </div>
      </section>
       {location ? <section className="professional-options mt-8 border-t border-border pt-6" aria-labelledby="professional-heading">
         <div className="booking-subheading mb-3.5 grid gap-1"><h2 className="text-base font-bold" id="professional-heading">¿Con quién?</h2><p className="text-sm text-muted-foreground">Elegí a alguien o dejá que te asignemos según la disponibilidad.</p></div>
         <div className="choices professional-choices grid grid-cols-2 gap-2.5 max-[600px]:grid-cols-1 max-[600px]:gap-[9px]" role="group" aria-label="Elegí un profesional">
           <Choice selected={professional === 'any'} className="any-professional-option min-h-[82px] rounded-md p-4 transition hover:-translate-y-px hover:border-[#75879c] max-[600px]:min-h-[72px] max-[600px]:px-3.5" onClick={() => { setProfessional('any'); setTime(''); }}>
             <span className="any-professional-copy grid min-w-0 gap-1"><strong className="text-sm font-bold">Cualquier profesional</strong><span className="choice-description text-xs text-muted-foreground">Te asignamos quien tenga un horario disponible.</span></span>
          </Choice>
           {eligible(service, location).map(p => <Choice key={p.id} selected={professional === p.id} className="professional-option min-h-[82px] rounded-md p-4 transition hover:-translate-y-px hover:border-[#75879c] max-[600px]:min-h-[72px] max-[600px]:px-3.5" onClick={() => { setProfessional(p.id); setTime(''); }}>
             <span className="person flex items-center gap-3.5"><span className="avatar grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-xs font-bold text-muted-foreground" aria-hidden="true">{p.initials}</span><span className="person-copy grid min-w-0 gap-1"><strong className="text-sm font-bold">{p.name}</strong><small className="text-xs text-muted-foreground">{p.role}</small></span></span>
          </Choice>)}
        </div>
       </section> : <p className="location-prompt flex items-center gap-2 text-sm text-muted-foreground"><MapPin size={16} aria-hidden="true" />Primero elegí una sede para ver sus profesionales.</p>}
    </div>}
    {step === 2 && <><div className="date-heading flex items-center justify-between gap-3 max-[600px]:flex-wrap"><h2 className="text-xl">{new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(date + 'T12:00:00'))}</h2><label className="date-picker flex items-center gap-2 text-xs"><span>Elegir fecha</span><Input type="date" aria-label="Elegir fecha" min={baseDate} max={maxBookingDate} value={date} onChange={e => { if (e.target.value) { setDate(e.target.value); setTime(''); } }} className="min-h-11 w-[135px] px-2 text-xs" /></label></div>
       <div className="day-strip my-5 grid grid-cols-7 gap-2 max-[600px]:my-4 max-[600px]:gap-1">{quickDates.map(d => <button key={d} aria-label={new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(d + 'T12:00:00'))} aria-pressed={date === d} className={`flex min-w-0 flex-col items-center gap-1.5 rounded-lg border px-1 py-3 text-xs transition-colors ${date === d ? 'selected border-brand bg-brand text-white' : 'border-border bg-surface hover:border-brand'}`} onClick={() => { setDate(d); setTime(''); }}><span>{new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(new Date(d + 'T12:00:00'))}</span><strong className="text-xl">{Number(d.slice(-2))}</strong><small className="min-h-4 text-[.625rem]">{date === d ? 'Elegido' : d === baseDate ? 'Hoy' : d === addDays(baseDate, 1) ? 'Mañana' : ' '}</small></button>)}</div>
       <div className="availability-caption flex items-center justify-between gap-3 border-b border-border py-3 text-xs max-[600px]:flex-col max-[600px]:items-start"><span className="font-semibold">{dateLabel(date)} · {location ? locationAddress(location) : ''}</span><small className="text-muted-foreground">Hora de Rosario (GMT−3)</small></div>
       {!!visibleTimes.length && ['Mañana', 'Tarde'].map((period, i) => <div className="slot-group mt-5" key={period}><h3 className="mb-2 text-sm font-bold">{period}</h3><div className="slots grid grid-cols-4 gap-2 max-[600px]:grid-cols-3">{visibleTimes.filter(t => i ? t >= '14:00' : t < '14:00').map(t => <button key={t} type="button" disabled={!isFree(t)} aria-pressed={isFree(t) ? time === t : undefined} className={`flex min-h-12 items-center justify-center gap-1 rounded border px-2 text-sm font-bold tabular-nums transition-colors ${time === t ? 'selected border-brand bg-brand text-white' : !isFree(t) ? 'reserved cursor-not-allowed border-dashed border-border bg-surface-muted text-muted-foreground' : 'border-border bg-surface text-brand hover:border-brand hover:bg-brand-soft'}`} onClick={() => { setTime(t); setError(''); }}><span>{t}</span>{isFree(t) ? time === t && <Check size={14} /> : <small className="text-[.625rem]">Reservado</small>}</button>)}</div></div>)}
      {!freeTimes.length && <Empty title="Este día no tiene horarios disponibles" action="Ver próxima fecha disponible" onAction={() => { clearEmpty(); let nextDate = addDays(date, 1); while (!slots(nextDate, service, professional, location || 'urquiza', bookings).length) nextDate = addDays(nextDate, 1); setDate(nextDate); setTime(''); }}>Probá con otro día, sede o profesional.</Empty>}
       {professional === 'any' && <p className="inline-info mt-5 flex items-start gap-2 rounded border border-[#c8d9eb] bg-[#edf3f9] p-3.5 text-sm leading-relaxed text-[#344e6b]"><CircleHelp className="mt-0.5 shrink-0" size={18} />Tu profesional se asigna al confirmar, según la disponibilidad.</p>}</>}
    {step === 3 && <form id="customer-form" className="customer-form w-full max-w-[560px]" onSubmit={e => { e.preventDefault(); next(); }}>
      <div className="customer-form-fields grid gap-[22px] max-[600px]:gap-5 [&_.form-control]:min-h-[52px]">
        <FormField label="Nombre y apellido" htmlFor="booking-name" error={error && !name.trim() ? 'Ingresá tu nombre y apellido.' : undefined}>
          <Input id="booking-name" autoComplete="name" autoCapitalize="words" value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder="Ej. Sofía García" required aria-invalid={!!error && !name.trim()} aria-describedby={error && !name.trim() ? 'booking-name-error' : undefined} />
        </FormField>
        <FormField label="Teléfono con código de área" htmlFor="booking-phone" hint="Podés escribirlo con o sin espacios." error={error && phone.replace(/\D/g, '').length < 8 ? 'Ingresá un teléfono con código de área (al menos 8 dígitos).' : undefined}>
          <Input id="booking-phone" type="tel" autoComplete="tel" inputMode="tel" enterKeyHint="done" value={phone} onChange={e => { setPhone(e.target.value); setError(''); }} placeholder="Tu número de teléfono" required aria-invalid={!!error && phone.replace(/\D/g, '').length < 8} aria-describedby={error && phone.replace(/\D/g, '').length < 8 ? 'booking-phone-error' : 'booking-phone-hint'} />
        </FormField>
      </div>
      <p className="inline-info mt-6 flex items-start gap-2 rounded border border-[#c8d9eb] bg-[#edf3f9] p-3.5 text-sm leading-relaxed text-[#344e6b]"><CircleHelp className="shrink-0 text-brand" size={18} aria-hidden="true" />En esta demo no se envían mensajes ni se usan datos reales.</p>
    </form>}
    {step === 4 && <div className="review-content grid gap-5 max-[600px]:gap-3">
      <section className="review-details rounded border border-border bg-surface p-5 max-[600px]:px-3.5 max-[600px]:py-[15px] [&_.summary-list]:mb-1 [&_.summary-list]:mt-3 [&_.summary-row]:my-0 [&_.summary-row]:items-center max-[600px]:[&_.summary-row]:gap-2 max-[600px]:[&_.summary-row]:py-2" aria-labelledby="review-details-heading">
        <h2 className="text-base font-bold" id="review-details-heading">Detalles del turno</h2>
        <Summary {...selection} />
      </section>
      <section className="review-customer block rounded border border-border bg-surface p-5 max-[600px]:px-3.5 max-[600px]:py-[15px]" aria-labelledby="review-customer-heading">
        <div className="review-customer-heading grid gap-1">
          <h2 className="text-base font-bold" id="review-customer-heading">Datos de contacto</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">Confirmá que podamos contactarte por este turno.</p>
        </div>
        <dl className="review-customer-list mt-3 mb-1 grid gap-0 border-t border-border text-sm">
          <div className="grid grid-cols-[minmax(86px,.7fr)_minmax(0,1.3fr)] items-center gap-3 border-b border-border py-3 max-[600px]:gap-2 max-[600px]:py-2">
            <dt className="text-xs font-semibold text-muted-foreground">Nombre</dt>
            <dd className="m-0 min-w-0 text-right text-sm font-bold leading-relaxed [overflow-wrap:anywhere]">{name}</dd>
          </div>
          <div className="grid grid-cols-[minmax(86px,.7fr)_minmax(0,1.3fr)] items-center gap-3 border-b border-border py-3 max-[600px]:gap-2 max-[600px]:py-2">
            <dt className="text-xs font-semibold text-muted-foreground">Teléfono</dt>
            <dd className="m-0 min-w-0 text-right text-sm font-bold tabular-nums [overflow-wrap:anywhere]">{phone}</dd>
          </div>
        </dl>
      </section>
    </div>}
    {error && step !== 3 && <p id="booking-error" className="error rounded border border-[#edc9ce] bg-[#fff1f2] p-3 text-sm text-[#982332]" role="alert">{error}</p>}<div className="booking-footer mt-8 flex items-center justify-between gap-4 border-t border-border pt-5 max-[600px]:sticky max-[600px]:bottom-0 max-[600px]:z-10 max-[600px]:mx-[-20px] max-[600px]:mt-6 max-[600px]:bg-white/95 max-[600px]:px-5 max-[600px]:pt-3 max-[600px]:pb-[calc(12px_+_env(safe-area-inset-bottom))] max-[600px]:shadow-[0_-8px_22px_#142b4912] max-[600px]:backdrop-blur-md max-[360px]:mx-[-16px] max-[360px]:px-4"><span className="text-xs text-muted-foreground">Paso {step + 1} de {steps.length}</span>{step < 4 ? <Button key={step} type="button" onClick={next} disabled={(step === 1 && !location) || (step === 2 && !time)}>Continuar<ArrowRight size={17} /></Button> : <Button disabled={busy} onClick={confirm}>{busy ? 'Confirmando…' : 'Confirmar turno'}<Check size={18} /></Button>}</div>
  </div><aside className="booking-summary sticky top-6 rounded-lg border border-border bg-surface p-6 max-[800px]:hidden"><h2 className="text-base font-bold">Tu visita al estudio</h2><Summary {...selection} step={step} /><small className="text-xs leading-[1.5]">La selección no retiene el horario. Tu turno queda reservado al confirmar.</small></aside></section>;
}
