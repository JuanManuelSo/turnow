'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { FormFeedback } from '@/components/dashboard/form-feedback';
import { SubmitButton } from '@/components/dashboard/submit-button';
import { FormField, Input, Textarea } from '@/components/ui';
import { priceToInput } from '@/lib/dashboard-format';
import { saveServiceAction } from './actions';

export type ServiceFormValue = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceMinor: number | null;
  showPrice: boolean;
  isActive: boolean;
};

export function ServiceForm({ service, currency }: { service: ServiceFormValue | null; currency: string }) {
  const [state, formAction] = useActionState(saveServiceAction, {});
  const errors = state.fieldErrors ?? {};
  const prefix = service ? `service-${service.id}` : 'service-new';

  return <form action={formAction} className="panel-form panel-editor grid gap-4 rounded border border-[#dde3eb] bg-white p-6 max-[600px]:p-[18px]">
    <div className="panel-editor-head flex items-center justify-between gap-4 border-b border-[#dde3eb] pb-4">
      <div>
        <h2>{service?.name ?? 'Datos del servicio'}</h2>
      </div>
       <Link href="/dashboard/servicios" className="panel-close inline-flex min-h-9 items-center rounded px-2 text-xs font-bold text-[#244f82] underline underline-offset-4">Cerrar</Link>
    </div>

    <FormFeedback state={state} />
    {service && <input type="hidden" name="id" value={service.id} />}

    <FormField label="Nombre" htmlFor={`${prefix}-name`} error={errors.name}>
      <Input
        id={`${prefix}-name`}
        name="name"
        defaultValue={service?.name ?? ''}
        placeholder="Ej. Corte de cabello"
        required
        aria-invalid={Boolean(errors.name)}
      />
    </FormField>

    <FormField label="Descripción" htmlFor={`${prefix}-description`} hint="Opcional. Se muestra en la página pública y al reservar." error={errors.description}>
      <Textarea
        id={`${prefix}-description`}
        name="description"
        defaultValue={service?.description ?? ''}
        rows={3}
        aria-invalid={Boolean(errors.description)}
      />
    </FormField>

    <div className="panel-field-grid grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
      <FormField label="Duración (min)" htmlFor={`${prefix}-duration`} error={errors.durationMinutes}>
        <Input
          id={`${prefix}-duration`}
          name="durationMinutes"
          type="number"
          inputMode="numeric"
          min={5}
          max={480}
          step={5}
          defaultValue={service?.durationMinutes ?? 30}
          required
          aria-invalid={Boolean(errors.durationMinutes)}
        />
      </FormField>
      <FormField label={`Precio (${currency})`} htmlFor={`${prefix}-price`} error={errors.price}>
        <Input
          id={`${prefix}-price`}
          name="price"
          inputMode="decimal"
          defaultValue={priceToInput(service?.priceMinor ?? null)}
          placeholder="Ej. 12000"
          aria-invalid={Boolean(errors.price)}
        />
      </FormField>
    </div>

    <label className="panel-check flex items-start gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3 text-sm font-semibold">
      <input className="mt-1 size-4 accent-[#244f82]" type="checkbox" name="showPrice" defaultChecked={service?.showPrice ?? false} />
      <span className="grid gap-1">
        Mostrar el precio
        <small>Aparece en la página pública y en el resumen de la reserva.</small>
      </span>
    </label>

    <label className="panel-check flex items-start gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3 text-sm font-semibold">
      <input className="mt-1 size-4 accent-[#244f82]" type="checkbox" name="isActive" defaultChecked={service?.isActive ?? true} />
      <span className="grid gap-1">
        Servicio activo
        <small>Si lo desactivás, no se ofrece para reservas nuevas.</small>
      </span>
    </label>

    <SubmitButton>{service ? 'Guardar cambios' : 'Crear servicio'}</SubmitButton>
  </form>;
}
