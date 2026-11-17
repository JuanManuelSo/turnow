'use client';

import { useActionState } from 'react';
import { FormFeedback } from '@/components/dashboard/form-feedback';
import { SubmitButton } from '@/components/dashboard/submit-button';
import { FormField, Input, Select } from '@/components/ui';
import { saveSettingsAction } from './actions';

type SettingsValue = {
  slotIntervalMinutes: number;
  bufferAfterMinutes: number;
  minBookingNoticeMinutes: number;
  bookingHorizonDays: number;
  cancellationNoticeMinutes: number;
  allowAnyProfessional: boolean;
  version: number;
};

export function SettingsForm({ settings }: { settings: SettingsValue }) {
  const [state, formAction] = useActionState(saveSettingsAction, {});
  const errors = state.fieldErrors ?? {};

  return <form action={formAction} className="panel-form grid gap-5">
    <FormFeedback state={state} />
    <input type="hidden" name="version" value={settings.version} />

    <div className="panel-field-grid grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
      <FormField label="Intervalo de turnos" htmlFor="settings-interval" hint="Cada cuánto se ofrece un horario." error={errors.slotIntervalMinutes}>
        <Select id="settings-interval" name="slotIntervalMinutes" defaultValue={settings.slotIntervalMinutes}>
          <option value={15}>Cada 15 minutos</option>
          <option value={30}>Cada 30 minutos</option>
          <option value={60}>Cada 60 minutos</option>
        </Select>
      </FormField>
      <FormField label="Margen después de cada turno" htmlFor="settings-buffer" hint="Minutos entre un turno y el siguiente. 0 = sin margen." error={errors.bufferAfterMinutes}>
        <Input id="settings-buffer" name="bufferAfterMinutes" type="number" inputMode="numeric" min={0} max={240} step={5} defaultValue={settings.bufferAfterMinutes} />
      </FormField>
    </div>

    <div className="panel-field-grid grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
      <FormField label="Anticipación mínima (min)" htmlFor="settings-notice" hint="Con cuánta anticipación se puede reservar." error={errors.minBookingNoticeMinutes}>
        <Input id="settings-notice" name="minBookingNoticeMinutes" type="number" inputMode="numeric" min={0} max={20160} step={15} defaultValue={settings.minBookingNoticeMinutes} />
      </FormField>
      <FormField label="Horizonte de reservas (días)" htmlFor="settings-horizon" hint="Cuántos días hacia adelante se muestra disponibilidad." error={errors.bookingHorizonDays}>
        <Input id="settings-horizon" name="bookingHorizonDays" type="number" inputMode="numeric" min={1} max={365} defaultValue={settings.bookingHorizonDays} />
      </FormField>
    </div>

    <FormField label="Plazo de cancelación (min)" htmlFor="settings-cancellation" hint="Hasta cuándo el cliente puede cancelar por su cuenta." error={errors.cancellationNoticeMinutes}>
      <Input id="settings-cancellation" name="cancellationNoticeMinutes" type="number" inputMode="numeric" min={0} max={20160} step={15} defaultValue={settings.cancellationNoticeMinutes} />
    </FormField>

    <label className="panel-check flex items-start gap-3 rounded border border-[#dde3eb] bg-[#f8fafc] p-3 text-sm font-semibold">
      <input className="mt-1 size-4 accent-[#244f82]" type="checkbox" name="allowAnyProfessional" defaultChecked={settings.allowAnyProfessional} />
      <span className="grid gap-1">
        Permitir “Cualquier profesional disponible”
        <small>El cliente ve la disponibilidad combinada y el profesional se asigna al confirmar.</small>
      </span>
    </label>

    <div className="panel-form-actions grid gap-3">
      <SubmitButton>Guardar reglas</SubmitButton>
      <p className="panel-form-note text-xs leading-relaxed text-[#56657a]">Los cambios afectan la disponibilidad futura, no los turnos ya confirmados.</p>
    </div>
  </form>;
}
