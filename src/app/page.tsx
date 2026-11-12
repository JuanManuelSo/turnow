'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, FlaskConical, X, CheckCircle2 } from 'lucide-react';
import { Booking, Identity, initialBookings, initialIdentity } from '@/modules/prototype';
import { PublicSite } from '@/components/public-site';
import { OwnerPanel } from '@/components/owner-panel';

export default function Page() {
  const [admin, setAdmin] = useState(false);
  const [identity, setIdentity] = useState<Identity>(initialIdentity);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [lab, setLab] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [emptyAgenda, setEmptyAgenda] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem('turnow-demo-v1'); if (raw) { const saved = JSON.parse(raw); setIdentity(saved.identity); setBookings(saved.bookings); } } catch { /* Optional local storage. */ }
    setAdmin(location.hash === '#panel'); setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem('turnow-demo-v1', JSON.stringify({ identity, bookings })); } catch { /* State remains available in memory. */ } } }, [ready, identity, bookings]);
  function toggleAdmin() { if (editorDirty && !window.confirm('Tenés cambios sin publicar. ¿Querés descartarlos y salir?')) return; setEditorDirty(false); setAdmin(!admin); history.replaceState(null, '', admin ? '#estudio' : '#panel'); setNotice(''); }
  function cancel(id: string) { setBookings(items => items.map(b => b.id === id ? { ...b, status: 'Cancelada' } : b)); }
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice('Código copiado.'); } catch { setNotice('Seleccioná el código y copialo manualmente.'); } }
  return <div className={admin ? 'app admin' : 'app public'} data-theme={admin ? 'mineral' : identity.palette} data-font={admin ? 'manrope' : identity.font}>
    <a href="#main" className="skip-link">Ir al contenido</a>
    <div className="prototype-bar"><span><FlaskConical size={14} />Prototipo · datos ficticios</span><div><button onClick={toggleAdmin}>{admin ? 'Ver página pública' : 'Panel del negocio'}<ExternalLink size={14} /></button><button onClick={() => setLab(!lab)} aria-expanded={lab}>Probar estados</button></div></div>
    {lab && <section className="demo-tools" aria-label="Escenarios de demostración"><strong>Laboratorio local</strong><label><input type="checkbox" checked={empty} onChange={e => setEmpty(e.target.checked)} />Sin disponibilidad</label><label><input type="checkbox" checked={conflict} onChange={e => setConflict(e.target.checked)} />Ocupar horario al confirmar</label><button onClick={() => { setAdmin(true); setEmptyAgenda(true); }}>Agenda vacía</button><span>Código de ejemplo: NORTE-7K9P-2M4X</span><button onClick={() => { setBookings(initialBookings); setIdentity(initialIdentity); setEmpty(false); setConflict(false); setEmptyAgenda(false); setNotice('Datos de ejemplo restablecidos.'); }}>Restablecer demo</button></section>}
    {notice && <div className="toast" role="status"><CheckCircle2 size={18} />{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {admin ? <OwnerPanel identity={identity} publish={setIdentity} bookings={bookings} setBookings={setBookings} cancel={cancel} notify={setNotice} openPublic={toggleAdmin} emptyAgenda={emptyAgenda} onDirty={setEditorDirty} /> : <PublicSite identity={identity} setIdentity={setIdentity} bookings={bookings} addBooking={b => setBookings(previous => [...previous, b])} cancel={cancel} notify={setNotice} copy={copy} empty={empty} clearEmpty={() => setEmpty(false)} conflict={conflict} clearConflict={() => setConflict(false)} />}
  </div>;
}
