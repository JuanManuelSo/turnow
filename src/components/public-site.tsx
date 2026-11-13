'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Copy, ExternalLink, Instagram, MapPin, Phone } from 'lucide-react';
import { Booking, Identity, dateLabel, locationAddress, locations, money, services } from '@/modules/prototype';
import { Brand, Button } from './ui';
import { Summary } from './summary';
import { BookingFlow } from './booking-flow';

type Props = { identity: Identity; setIdentity: (i: Identity) => void; bookings: Booking[]; addBooking: (b: Booking) => void; cancel: (id: string) => void; notify: (s: string) => void; copy: (s: string) => void; empty: boolean; clearEmpty: () => void; conflict: boolean; clearConflict: () => void };
export function PublicSite(props: Props) {
  const { identity, setIdentity, bookings, cancel, notify, copy } = props;
  const [view, setView] = useState<'home' | 'book' | 'success' | 'cancel'>('home');
  const [initialService, setInitialService] = useState('corte');
  const [result, setResult] = useState<Booking | null>(null);
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Booking | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); window.scrollTo(0, 0); }, [view, cancelled]);
  function navigate(next: typeof view) { setView(next); setError(''); setFound(null); setCancelled(false); }
  function start(service = 'corte') { setInitialService(service); navigate('book'); }
  return <>
    <header className="public-header"><button className="brand-home" aria-label="Ir a la bienvenida" onClick={() => navigate('home')}><Brand name={identity.name} /></button><span className="header-caption">Peluquería & barbería · Rosario</span><button className="header-cancel" onClick={() => navigate('cancel')}>Cancelar turno</button></header>
    <main id="main" className="public-main">
      {view === 'home' && <>
        <section className="welcome">
          <div className="welcome-copy">
            <h1 ref={heading} tabIndex={-1}>Tu estilo.<br />Tu momento.</h1>
            <p className="welcome-description">{identity.description}</p>
            <div className="welcome-actions"><Button onClick={() => start()}>Reservar turno<ArrowRight size={19} /></Button><button className="text-link" onClick={() => navigate('cancel')}>Cancelar turno</button></div>
            <p className="quiet-note"><CheckCircle2 size={16} />Sin cuenta. Elegís, reservás y listo.</p>
          </div>
          <aside className="visit-panel">
            <div className="visit-info"><MapPin size={23} /><div><h2>Encontrá tu sede<br />en Rosario.</h2><p>{locations.map(place => <span className="visit-location" key={place.id}>{place.address}</span>)}Rosario, Santa Fe</p></div></div>
            <div className="visit-hours"><Clock3 size={20} /><div><strong>De lunes a sábado</strong><p>9:00–13:00 y 14:00–18:00</p><small>Horarios del local. Consultá disponibilidad al reservar.</small></div></div>
            <div className="contact-links"><button onClick={() => notify('Contacto ficticio: 341 555 0100. No se envían mensajes desde este prototipo.')}><Phone size={17} />Contactar</button><button onClick={() => notify('Instagram ficticio: @estudionorte. Enlace simulado.')}><Instagram size={17} />Instagram<ExternalLink size={14} /></button></div>
          </aside>
        </section>
        <section className="service-preview"><div><h2>Un buen corte empieza<br />con un momento para vos.</h2><p>Elegí lo que necesitás. Nosotros nos ocupamos del resto.</p></div><div className="service-preview-list">{services.map(s => <button key={s.id} onClick={() => start(s.id)}><span><strong>{s.name}</strong><small>{s.duration} min</small></span><span>{money(s.price)}<ArrowRight size={17} /></span></button>)}</div></section>
        <div className="palette-demo"><span>Una estructura, distintas identidades</span>{(['mineral', 'botanica'] as const).map(p => <button key={p} aria-pressed={identity.palette === p} onClick={() => setIdentity({ ...identity, palette: p })}><i className={`swatch ${p === 'mineral' ? 'blue' : 'green'}`} />{p === 'mineral' ? 'Mineral' : 'Botánica'}{identity.palette === p && <Check size={14} />}</button>)}</div>
      </>}
      {view === 'book' && <BookingFlow {...props} initialService={initialService} back={() => navigate('home')} onSuccess={b => { props.addBooking(b); setResult(b); setView('success'); }} />}
       {view === 'success' && result && <section className="result-page"><span className="result-icon"><Check size={30} /></span><h1 ref={heading} tabIndex={-1}>Tu turno está confirmado.</h1><p>Ya tenés un momento para vos. Te esperamos.</p><div className="result-date">{dateLabel(result.date)}<strong>{result.time} h</strong></div><Summary {...result} /><div className="private-code"><h2>Guardá tu código privado</h2><p>Lo vas a necesitar si querés cancelar. No lo compartas.</p><code>{result.code}</code><Button variant="secondary" onClick={() => copy(result.code)}>Copiar código<Copy size={16} /></Button></div><p className="quiet-note"><MapPin size={16} />{locationAddress(result.location)}, Rosario</p><Button variant="text" onClick={() => navigate('home')}>Volver al estudio<ArrowRight size={16} /></Button><small className="simulation-note">Confirmación simulada. No enviamos WhatsApp ni email.</small></section>}
      {view === 'cancel' && <section className="cancel-page"><button className="back-link" onClick={() => navigate('home')}><ArrowLeft size={16} />Volver al estudio</button>{cancelled ? <><span className="result-icon"><Check size={28} /></span><h1 ref={heading} tabIndex={-1}>Tu turno fue cancelado.</h1><p>El horario vuelve a estar disponible. Cuando quieras, te esperamos de nuevo.</p><Button onClick={() => start()}>Reservar otro turno<ArrowRight size={17} /></Button></> : <><h1 ref={heading} tabIndex={-1}>¿Cambiaron tus planes?</h1><p>Ingresá el código privado de tu reserva. Vas a poder revisar el turno antes de cancelarlo.</p><form onSubmit={e => { e.preventDefault(); setError(''); const b = bookings.find(b => b.code.toUpperCase() === code.trim().toUpperCase()); setFound(b || null); if (!b) setError('No encontramos ese código. Revisá que esté completo y volvé a intentar.'); }}><label>Código privado<input value={code} onChange={e => { setCode(e.target.value); setFound(null); setError(''); }} placeholder="Ej. NORTE-7K9P-2M4X" autoCapitalize="characters" spellCheck={false} required aria-invalid={!!error} aria-describedby={error ? 'code-error' : undefined} /></label><Button type="submit" variant="secondary">Buscar turno<ArrowRight size={16} /></Button></form>{error && <p id="code-error" role="alert" className="error">{error}</p>}{found && <div className="cancel-summary">{found.status === 'Cancelada' ? <p role="status">Este turno ya está cancelado. No necesitás hacer nada más.</p> : <><h2>Encontramos tu turno</h2><Summary {...found} /><p>Al cancelar, liberás este horario. Esta acción no se puede deshacer.</p><Button variant="danger" onClick={() => { cancel(found.id); setCancelled(true); }}>Cancelar este turno</Button></>}</div>}<p className="help-copy">¿No encontrás tu código? Contactá al estudio al <strong>341 555 0100</strong> (contacto ficticio).</p></>}</section>}
    </main><footer className="public-footer"><span>{identity.name} · Rosario</span><span>Reservas simples con <strong>turnow.</strong></span></footer>
  </>;
}
