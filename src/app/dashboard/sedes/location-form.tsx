'use client';

import { useActionState } from 'react';
import { EntityFormDialog } from '@/components/dashboard/entity-form-dialog';
import { FormField, Input, Textarea } from '@/components/ui';
import { saveLocationAction } from './actions';

export type LocationFormValue = {
  id: string;
  name: string;
  slug: string;
  addressText: string | null;
  mapUrl: string | null;
  contactPhone: string | null;
  arrivalInstructions: string | null;
  isActive: boolean;
  isPrimary: boolean;
};

export function LocationForm({ location, timezone }: { location: LocationFormValue | null; timezone: string }) {
  const [state, formAction] = useActionState(saveLocationAction, {});
  const errors = state.fieldErrors ?? {};
  const prefix = location ? `location-${location.id}` : 'location-new';

  return <EntityFormDialog title={location?.name ?? 'Datos de la sede'} closeHref="/dashboard/sedes" action={formAction} state={state} submitLabel={location ? 'Guardar cambios' : 'Crear sede'}>
    {location && <input type="hidden" name="id" value={location.id} />}

    <FormField label="Nombre" htmlFor={`${prefix}-name`} error={errors.name}>
      <Input
        id={`${prefix}-name`}
        name="name"
        defaultValue={location?.name ?? ''}
        placeholder="Ej. Urquiza"
        required
        aria-invalid={Boolean(errors.name)}
        aria-describedby={errors.name ? `${prefix}-name-error` : undefined}
      />
    </FormField>

    <FormField label="Slug" htmlFor={`${prefix}-slug`} hint="Minúsculas, números y guiones. Se usa en el enlace público de la sede." error={errors.slug}>
      <Input
        id={`${prefix}-slug`}
        name="slug"
        defaultValue={location?.slug ?? ''}
        placeholder="urquiza"
        required
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={Boolean(errors.slug)}
        aria-describedby={errors.slug ? `${prefix}-slug-error` : `${prefix}-slug-hint`}
      />
    </FormField>

    <FormField label="Dirección" htmlFor={`${prefix}-address`} hint="Calle y número; se muestra al cliente antes de confirmar." error={errors.addressText}>
      <Input
        id={`${prefix}-address`}
        name="addressText"
        defaultValue={location?.addressText ?? ''}
        placeholder="Ej. Urquiza 1526"
        aria-invalid={Boolean(errors.addressText)}
      />
    </FormField>

    <div className="panel-field-grid grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
      <FormField label="Teléfono" htmlFor={`${prefix}-phone`} error={errors.contactPhone}>
        <Input
          id={`${prefix}-phone`}
          name="contactPhone"
          type="tel"
          defaultValue={location?.contactPhone ?? ''}
          placeholder="Ej. 341 555 0100"
          aria-invalid={Boolean(errors.contactPhone)}
        />
      </FormField>
      <FormField label="Enlace del mapa" htmlFor={`${prefix}-map`} error={errors.mapUrl}>
        <Input
          id={`${prefix}-map`}
          name="mapUrl"
          type="url"
          defaultValue={location?.mapUrl ?? ''}
          placeholder="https://maps.google.com/…"
          aria-invalid={Boolean(errors.mapUrl)}
        />
      </FormField>
    </div>

    <FormField label="Indicaciones para llegar" htmlFor={`${prefix}-arrival`} hint="Opcional. Timbre, piso, entrada o referencia." error={errors.arrivalInstructions}>
      <Textarea
        id={`${prefix}-arrival`}
        name="arrivalInstructions"
        defaultValue={location?.arrivalInstructions ?? ''}
        rows={3}
        aria-invalid={Boolean(errors.arrivalInstructions)}
      />
    </FormField>

    <label className="panel-check flex items-start gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3 text-sm font-semibold">
      <input className="mt-1 size-4 accent-[#244f82]" type="checkbox" name="isActive" defaultChecked={location?.isActive ?? true} />
      <span className="grid gap-1">
        Sede activa
        <small>Si la desactivás, deja de ofrecerse para reservas nuevas.</small>
      </span>
    </label>

    <p className="panel-form-note text-xs leading-relaxed text-[#56657a]">Zona horaria: <strong>{timezone}</strong>, heredada del negocio.</p>
    <p className="panel-form-note text-xs leading-relaxed text-[#56657a]">Slug actual: <code>/{location?.slug ?? 'nueva-sede'}</code></p>

  </EntityFormDialog>;
}
