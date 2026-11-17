'use client';

import { useActionState, useState, type CSSProperties } from 'react';
import { FormFeedback } from '@/components/dashboard/form-feedback';
import { SubmitButton } from '@/components/dashboard/submit-button';
import { FormField, Input, Textarea } from '@/components/ui';
import type { PageTheme } from '@/server/db/schema';
import { savePublicPageAction } from '../configuracion/actions';

type PageValue = {
  headline: string;
  description: string;
  contactEmail: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  website: string;
  version: number;
  theme: PageTheme;
};

export function PublicPageForm({ businessName, businessSlug, page }: {
  businessName: string;
  businessSlug: string;
  page: PageValue;
}) {
  const [state, formAction] = useActionState(savePublicPageAction, {});
  const errors = state.fieldErrors ?? {};
  const [headline, setHeadline] = useState(page.headline);
  const [description, setDescription] = useState(page.description);
  const [contactEmail, setContactEmail] = useState(page.contactEmail);
  const [instagram, setInstagram] = useState(page.instagram);
  const [facebook, setFacebook] = useState(page.facebook);
  const [whatsapp, setWhatsapp] = useState(page.whatsapp);
  const [website, setWebsite] = useState(page.website);

  const palette = page.theme.palette;
  const previewStyle = {
    '--preview-bg': palette.background ?? '#f4f5f7',
    '--preview-surface': palette.surface ?? '#ffffff',
    '--preview-ink': palette.text ?? '#1d2939',
    '--preview-muted': palette.text_secondary ?? '#526174',
    '--preview-brand': palette.brand ?? '#244f82',
    '--preview-on-brand': palette.on_brand ?? '#ffffff',
  } as CSSProperties;

  const socials = [
    { key: 'instagram', label: 'Instagram', value: instagram },
    { key: 'facebook', label: 'Facebook', value: facebook },
    { key: 'whatsapp', label: 'WhatsApp', value: whatsapp },
    { key: 'website', label: 'Sitio', value: website },
  ].filter(item => item.value);

  return <div className="panel-page-grid grid grid-cols-[minmax(0,1fr)_minmax(300px,420px)] items-start gap-8 max-[900px]:grid-cols-1">
    <form action={formAction} className="panel-form grid gap-5">
      <FormFeedback state={state} />
      <input type="hidden" name="version" value={page.version} />

      <div className="panel-form-section grid gap-1 border-b border-[#dde3eb] pb-3">
        <h2 className="text-base font-bold">Bienvenida</h2>
        <p className="text-sm leading-relaxed text-[#56657a]">Lo primero que lee el cliente en el enlace público de reservas. Si dejás un campo vacío, se muestra un texto predeterminado.</p>
      </div>

      <FormField label="Título" htmlFor="page-headline" hint="Una frase corta con personalidad." error={errors.headline}>
        <Input
          id="page-headline"
          name="headline"
          value={headline}
          onChange={event => setHeadline(event.currentTarget.value)}
          placeholder="No es moda. Es estilo."
          maxLength={120}
          aria-invalid={Boolean(errors.headline)}
        />
      </FormField>

      <FormField label="Descripción" htmlFor="page-description" hint="Dos o tres líneas sobre el negocio." error={errors.description}>
        <Textarea
          id="page-description"
          name="description"
          value={description}
          onChange={event => setDescription(event.currentTarget.value)}
          rows={4}
          maxLength={900}
          placeholder="Cortes y barbería para hombres en Rosario. Elegí tu sede y reservá tu turno."
          aria-invalid={Boolean(errors.description)}
        />
      </FormField>

      <FormField label="Email de contacto" htmlFor="page-email" hint="Opcional. No se muestra si está vacío." error={errors.contactEmail}>
        <Input
          id="page-email"
          name="contactEmail"
          type="email"
          value={contactEmail}
          onChange={event => setContactEmail(event.currentTarget.value)}
          placeholder="hola@negocio.com"
          aria-invalid={Boolean(errors.contactEmail)}
        />
      </FormField>

      <div className="panel-form-section grid gap-1 border-b border-[#dde3eb] pb-3">
        <h2 className="text-base font-bold">Redes y enlaces</h2>
        <p className="text-sm leading-relaxed text-[#56657a]">Se muestran con menor jerarquía que la acción de reservar.</p>
      </div>

      <div className="panel-field-grid grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
        <FormField label="Instagram" htmlFor="page-instagram" error={errors.instagram}>
          <Input
            id="page-instagram"
            name="instagram"
            value={instagram}
            onChange={event => setInstagram(event.currentTarget.value)}
            placeholder="@estudionorte"
            maxLength={200}
            aria-invalid={Boolean(errors.instagram)}
          />
        </FormField>
        <FormField label="Facebook" htmlFor="page-facebook" error={errors.facebook}>
          <Input
            id="page-facebook"
            name="facebook"
            value={facebook}
            onChange={event => setFacebook(event.currentTarget.value)}
            placeholder="https://facebook.com/…"
            maxLength={200}
            aria-invalid={Boolean(errors.facebook)}
          />
        </FormField>
        <FormField label="WhatsApp" htmlFor="page-whatsapp" error={errors.whatsapp}>
          <Input
            id="page-whatsapp"
            name="whatsapp"
            value={whatsapp}
            onChange={event => setWhatsapp(event.currentTarget.value)}
            placeholder="https://wa.me/549341…"
            maxLength={200}
            aria-invalid={Boolean(errors.whatsapp)}
          />
        </FormField>
        <FormField label="Sitio web" htmlFor="page-website" error={errors.website}>
          <Input
            id="page-website"
            name="website"
            value={website}
            onChange={event => setWebsite(event.currentTarget.value)}
            placeholder="https://…"
            maxLength={200}
            aria-invalid={Boolean(errors.website)}
          />
        </FormField>
      </div>

      <div className="panel-form-actions grid gap-3">
        <SubmitButton>Guardar página</SubmitButton>
        <p className="panel-form-note text-xs leading-relaxed text-[#56657a]">Los cambios se guardan en el negocio y se reflejan en su página pública. La disponibilidad de reservas se controla desde Configuración.</p>
      </div>
    </form>

    <aside aria-label="Vista previa de la página pública" className="panel-preview-wrap sticky top-6 max-[900px]:static max-[900px]:order-2">
      <div className="panel-preview overflow-hidden rounded-lg border border-[#cfd7e2] bg-[var(--preview-bg)] shadow-[0_14px_34px_rgb(20_43_73_/_0.10)] max-[900px]:max-w-[440px]" style={previewStyle}>
        <div className="panel-preview-bar flex items-center justify-between gap-3 border-b border-[#d5dce6] bg-[#e9edf3] px-3.5 py-[9px] text-[.59375rem] font-bold tracking-[.12em] text-[#5a687b] uppercase">
          <span>Vista previa</span>
          <span>Borrador</span>
        </div>
        <div className="panel-preview-body bg-[var(--preview-bg)] px-[26px] pt-[34px] pb-[30px] text-[var(--preview-ink)] max-[600px]:p-4">
          <p className="panel-preview-brand text-sm font-extrabold tracking-[-.04em] text-[var(--preview-ink)]">{businessName}</p>
          <p className="panel-preview-slug mt-0.5 text-[.6875rem] text-[var(--preview-muted)]">/{businessSlug}</p>
          <h2 className="mt-[30px] mb-3.5 text-[clamp(1.7rem,2.6vw,2.15rem)] leading-[1.03] tracking-[-.055em] text-[var(--preview-ink)]">{headline || 'Tu próxima visita empieza acá.'}</h2>
          <p className="text-sm leading-[1.55] text-[var(--preview-muted)]">{description || 'Elegí tu sede, el servicio y el horario que mejor te quede. La confirmación es inmediata.'}</p>
          <div className="panel-preview-actions mt-[26px] flex flex-wrap items-center gap-[18px]">
            <span className="panel-preview-cta inline-flex min-h-11 items-center rounded bg-[var(--preview-brand)] px-[18px] text-[.8125rem] font-bold text-[var(--preview-on-brand)]">Reservar turno</span>
            <span className="panel-preview-secondary text-xs font-bold text-[var(--preview-muted)] underline underline-offset-4">Cancelar turno</span>
          </div>
          {socials.length > 0 && <p className="panel-preview-socials mt-[30px] text-[.65625rem] font-bold tracking-wider text-[var(--preview-muted)] uppercase">{socials.map(item => item.label).join(' · ')}</p>}
        </div>
      </div>
      <p className="panel-preview-note mt-3 text-xs leading-[1.5] text-[#56657a]">Vista aproximada de los textos. Abrí la página pública para comprobar el flujo real y el estado de publicación.</p>
    </aside>
  </div>;
}
