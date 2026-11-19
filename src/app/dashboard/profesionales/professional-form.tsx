'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { EntityFormDialog } from '@/components/dashboard/entity-form-dialog';
import { FormField, Input, Textarea } from '@/components/ui';
import { saveProfessionalAction } from './actions';

export type ProfessionalFormValue = {
  id: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  locationIds: string[];
  serviceIds: string[];
};

type Option = { id: string; name: string; isActive: boolean };

export function ProfessionalForm({ professional, locations, services }: {
  professional: ProfessionalFormValue | null;
  locations: Option[];
  services: Option[];
}) {
  const [state, formAction] = useActionState(saveProfessionalAction, {});
  const errors = state.fieldErrors ?? {};
  const prefix = professional ? `professional-${professional.id}` : 'professional-new';

  return <EntityFormDialog title={professional?.displayName ?? 'Datos del profesional'} closeHref="/dashboard/profesionales" action={formAction} state={state} submitLabel={professional ? 'Guardar cambios' : 'Agregar profesional'}>
    {professional && <input type="hidden" name="id" value={professional.id} />}

    <FormField label="Nombre visible" htmlFor={`${prefix}-name`} error={errors.displayName}>
      <Input
        id={`${prefix}-name`}
        name="displayName"
        defaultValue={professional?.displayName ?? ''}
        placeholder="Ej. Juan M."
        required
        aria-invalid={Boolean(errors.displayName)}
      />
    </FormField>

    <FormField label="Descripción" htmlFor={`${prefix}-description`} hint="Opcional. Una línea sobre su trabajo." error={errors.description}>
      <Textarea
        id={`${prefix}-description`}
        name="description"
        defaultValue={professional?.description ?? ''}
        rows={2}
        aria-invalid={Boolean(errors.description)}
      />
    </FormField>

    <fieldset className="panel-fieldset grid gap-3 border-0 border-t border-[#dde3eb] p-0 pt-4">
      <legend>Sedes donde atiende</legend>
      {locations.length === 0
         ? <p className="panel-form-note text-xs leading-[1.5] text-[#56657a] [&_a]:font-bold [&_a]:text-[#244f82]">Primero creá una sede. <Link href="/dashboard/sedes?nueva=1">Crear sede</Link></p>
        : <div className="panel-check-list grid gap-2">
          {locations.map(location => <label className="panel-check flex items-start gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3 text-sm font-semibold" key={location.id}>
            <input className="mt-1 size-4 accent-[#244f82]" type="checkbox" name="locationIds" value={location.id} defaultChecked={professional?.locationIds.includes(location.id) ?? false} />
            <span className="grid gap-1">
              {location.name}
              {!location.isActive && <small>Inactiva: no se ofrece para reservas nuevas.</small>}
            </span>
          </label>)}
        </div>}
    </fieldset>

    <fieldset className="panel-fieldset grid gap-3 border-0 border-t border-[#dde3eb] p-0 pt-4">
      <legend>Servicios que ofrece</legend>
      {services.length === 0
         ? <p className="panel-form-note text-xs leading-[1.5] text-[#56657a] [&_a]:font-bold [&_a]:text-[#244f82]">Primero creá servicios. <Link href="/dashboard/servicios?nuevo=1">Crear servicio</Link></p>
        : <div className="panel-check-list grid gap-2">
          {services.map(service => <label className="panel-check flex items-start gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3 text-sm font-semibold" key={service.id}>
            <input className="mt-1 size-4 accent-[#244f82]" type="checkbox" name="serviceIds" value={service.id} defaultChecked={professional?.serviceIds.includes(service.id) ?? false} />
            <span className="grid gap-1">
              {service.name}
              {!service.isActive && <small>Inactivo: no se ofrece para reservas nuevas.</small>}
            </span>
          </label>)}
        </div>}
    </fieldset>

    <label className="panel-check flex items-start gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3 text-sm font-semibold">
      <input className="mt-1 size-4 accent-[#244f82]" type="checkbox" name="isActive" defaultChecked={professional?.isActive ?? true} />
      <span className="grid gap-1">
        Profesional activo
        <small>Si lo desactivás, no se ofrece para reservas nuevas.</small>
      </span>
    </label>

  </EntityFormDialog>;
}
