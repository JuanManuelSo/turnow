'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, MapPin } from 'lucide-react';
import { Identity } from '@/modules/prototype';
import { Brand, Button, Choice } from './ui';

type Props = {
  identity: Identity;
  publish: (identity: Identity) => void;
  notify: (message: string) => void;
  onDirty: (dirty: boolean) => void;
};

export function IdentityEditor({ identity, publish, notify, onDirty }: Props) {
  const [draft, setDraft] = useState(identity);
  const [mobileView, setMobileView] = useState('edit');
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(identity);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    onDirty(dirty);
    const prevent = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty, onDirty]);

  return <>
    <div className="admin-heading">
      <div><h1 ref={heading} tabIndex={-1}>Hacé que se sienta tuyo.</h1><p>La identidad de tu negocio, en cada reserva.</p></div>
      <span className={`save-status ${dirty ? 'unsaved' : ''}`} role="status">{dirty ? 'Cambios sin guardar' : 'Todos los cambios publicados'}</span>
    </div>
    <div className="editor-mobile-tabs" role="group" aria-label="Vista del editor">
      <button aria-pressed={mobileView === 'edit'} aria-controls="identity-form" onClick={() => setMobileView('edit')}>Editar información</button>
      <button aria-pressed={mobileView === 'preview'} aria-controls="identity-preview" onClick={() => setMobileView('preview')}>Vista previa</button>
    </div>
    <div className="editor-layout" data-mobile-view={mobileView}>
      <form id="identity-form" className="identity-form" onSubmit={event => {
        event.preventDefault();
        if (!draft.name.trim() || !draft.description.trim()) return;
        publish(draft);
        notify('Los cambios se publicaron en este prototipo local.');
      }}>
        <h2>Identidad del negocio</h2>
        <label>Nombre del negocio<input required pattern=".*\S.*" maxLength={60} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <fieldset>
          <legend>Paleta de color</legend>
          <div className="palette-options">
            <Choice selected={draft.palette === 'mineral'} onClick={() => setDraft({ ...draft, palette: 'mineral' })}><i className="swatch blue" /><strong>Mineral</strong><small>Azul & neutros fríos</small></Choice>
            <Choice selected={draft.palette === 'botanica'} onClick={() => setDraft({ ...draft, palette: 'botanica' })}><i className="swatch green" /><strong>Botánica</strong><small>Verde & neutros cálidos</small></Choice>
          </div>
        </fieldset>
        <label htmlFor="identity-font">Tipografía</label>
        <select id="identity-font" className="font-select" value={draft.font} onChange={e => setDraft({ ...draft, font: e.target.value as Identity['font'] })}>
          <option value="manrope">Manrope · Contemporánea</option><option value="system">Sistema · Familiar</option>
        </select>
        <label>Descripción<textarea required maxLength={220} rows={4} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /><small>{draft.description.length}/220 caracteres</small></label>
        <div className="editor-actions">
          <Button type="submit" disabled={!dirty || !draft.name.trim() || !draft.description.trim()}>Publicar cambios<Check size={17} /></Button>
          <Button variant="text" type="button" disabled={!dirty} onClick={() => setDraft(identity)}>Descartar</Button>
        </div>
        <p className="simulation-note">Publicación simulada. Solo cambia la página de este navegador.</p>
      </form>
      <section id="identity-preview" className="preview-area" aria-label="Vista previa de la página pública">
        <div className="preview-caption"><h2>Vista previa</h2><span>Así te van a ver</span></div>
        <div className="preview-browser">
          <div className="browser-bar">turnow.demo / estudio-norte</div>
          <div className="identity-preview" data-theme={draft.palette} data-font={draft.font}>
            <Brand name={draft.name || 'Tu negocio'} small />
            <h3>Tu estilo.<br />Tu momento.</h3><p>{draft.description}</p>
            <span className="preview-button">Reservar turno<ArrowRight size={16} /></span>
            <span className="preview-cancel">Cancelar turno</span>
            <div className="preview-address"><MapPin size={18} />Güemes 2048, Rosario</div>
          </div>
        </div>
        <p>Vista previa con datos ficticios. Los cambios se aplican al publicar.</p>
      </section>
    </div>
  </>;
}
