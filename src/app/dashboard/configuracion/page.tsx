import type { Metadata } from 'next';
import { PanelHeader } from '@/components/dashboard/page-header';
import { PanelNotice } from '@/components/dashboard/notice';
import { requireOwner } from '@/server/auth/access';
import { countOwners, getConfigurationData } from '@/server/business/queries';
import { formatTimezone, statusLabel } from '@/lib/dashboard-format';
import { SettingsForm } from './settings-form';
import { togglePublicBookingAction } from './actions';
import { Button, LinkButton } from '@/components/ui';
import { CopyPublicLink } from '@/features/dashboard/copy-public-link';

export const metadata: Metadata = { title: 'Configuración' };

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<{ guardado?: string; publico?: string }> }) {
  const { membership } = await requireOwner();
  const [{ business, settings }, ownerCount] = await Promise.all([
    getConfigurationData(membership.businessId),
    countOwners(membership.businessId),
  ]);
  const params = await searchParams;

  if (!business) {
    return <section className="panel-empty grid justify-items-start gap-3 rounded border border-dashed border-[#c1cad6] bg-white p-8 text-left">
      <h1>No encontramos el negocio</h1>
      <p>Volvé a iniciar sesión o contactá al soporte de Turnow.</p>
    </section>;
  }

  if (!settings) {
    return <>
      <PanelHeader title="Configuración" description="Reglas de reserva y datos del negocio." />
      <section className="panel-empty grid justify-items-start gap-3 rounded border border-dashed border-[#c1cad6] bg-white p-8 text-left">
        <h2>Falta la configuración inicial</h2>
        <p>El alta no creó las reglas de reserva. Volvé a ejecutar `npm run setup:business` con este negocio.</p>
      </section>
    </>;
  }

  return <>
    <PanelHeader
      title="Configuración"
      description="Reglas de reserva, datos del negocio y estado de publicación."
    />

    {params.guardado === '1' && <PanelNotice>Las reglas se guardaron correctamente.</PanelNotice>}

    <div className="panel-config-grid grid grid-cols-[minmax(0,1fr)_minmax(300px,380px)] items-start gap-7 max-[900px]:grid-cols-1">
      <section className="panel-section rounded border border-[#dde3eb] bg-white p-6 max-[600px]:p-4" aria-labelledby="rules-title">
        <h2 className="mb-2 text-base font-bold" id="rules-title">Reglas de reserva</h2>
        <p className="mb-5 text-sm leading-relaxed text-[#56657a]">Se aplican a la agenda y a las nuevas reservas públicas. Los turnos ya confirmados conservan sus condiciones originales.</p>
        <SettingsForm settings={{
          slotIntervalMinutes: settings.slotIntervalMinutes,
          bufferAfterMinutes: settings.bufferAfterMinutes,
          minBookingNoticeMinutes: settings.minBookingNoticeMinutes,
          bookingHorizonDays: settings.bookingHorizonDays,
          cancellationNoticeMinutes: settings.cancellationNoticeMinutes,
          allowAnyProfessional: settings.allowAnyProfessional,
          version: settings.version,
        }} />
      </section>

      <aside className="panel-aside grid gap-5" aria-label="Datos y publicación">
        <section className="panel-section rounded border border-[#dde3eb] bg-white p-5">
          <h2 className="mb-2 text-base font-bold">Datos del negocio</h2>
          <p className="mb-4 text-sm leading-relaxed text-[#56657a]">El nombre y el slug se fijaron en el alta para no romper enlaces ni turnos existentes.</p>
          <dl className="panel-definition mt-4 grid grid-cols-[minmax(90px,.7fr)_minmax(0,1.3fr)] gap-x-3 gap-y-2 text-sm [&_dd]:m-0 [&_dd]:wrap-anywhere [&_dd]:font-semibold [&_dt]:text-[#56657a] [&_small]:mt-0.5 [&_small]:block [&_small]:text-xs [&_small]:text-[#56657a]">
            <dt>Nombre</dt><dd>{business.name}</dd>
            <dt>Slug</dt><dd>/{business.slug}</dd>
            <dt>Zona horaria</dt><dd>{formatTimezone(business.timezone)}<small>{business.timezone}</small></dd>
            <dt>Moneda</dt><dd>{business.currency}</dd>
             <dt>Estado</dt><dd><span className="panel-chip inline-flex rounded-full bg-[#eaf1f8] px-2 py-1 text-[.6875rem] font-bold text-[#244f82]">{statusLabel(business.status)}</span></dd>
            <dt>Cuentas de dueño</dt><dd>{ownerCount}</dd>
          </dl>
          <p className="panel-form-note mt-4 text-xs leading-relaxed text-[#56657a]">Para cambiar el nombre, el slug o la zona horaria hace falta un procedimiento administrativo.</p>
        </section>

      <section className="panel-section rounded border border-[#dde3eb] bg-white p-5">
        <h2 className="mb-2 text-base font-bold">Publicación</h2>
          <p className="mb-4 text-sm leading-relaxed text-[#56657a]">Controlá si los clientes pueden ver los horarios y confirmar turnos. Deshabilitarlo no modifica los turnos existentes.</p>
           {params.publico === 'not-ready' && <p className="panel-form-error rounded border border-[#e7c5cb] bg-[#fff4f5] px-3 py-2.5 text-xs text-[#852a35]" role="alert">Antes de habilitar, configurá una sede con horario, un servicio activo y un profesional asignado.</p>}
           {params.publico === 'business-inactive' && <p className="panel-form-error rounded border border-[#e7c5cb] bg-[#fff4f5] px-3 py-2.5 text-xs text-[#852a35]" role="alert">El negocio debe estar activo antes de publicar las reservas.</p>}
           {params.publico === 'enabled' && <p className="panel-form-success rounded bg-[#e7f2ec] p-3 text-xs text-[#1f5c47]" role="status">Las reservas online están habilitadas.</p>}
           {params.publico === 'disabled' && <p className="panel-form-success rounded bg-[#e7f2ec] p-3 text-xs text-[#1f5c47]" role="status">Las reservas online están deshabilitadas.</p>}
           <p className="panel-public-state my-4"><span className={`panel-chip inline-flex rounded-full px-2 py-1 text-[.6875rem] font-bold ${settings.publicBookingEnabled ? 'bg-[#eaf1f8] text-[#244f82]' : 'bg-[#f0f2f5] text-[#56657a]'}`}>{settings.publicBookingEnabled ? 'Reservas habilitadas' : 'Reservas deshabilitadas'}</span></p>
          <div className="panel-form-actions flex flex-wrap gap-2.5">
            <form action={togglePublicBookingAction}>
              <input type="hidden" name="enable" value={settings.publicBookingEnabled ? 'false' : 'true'} />
              <Button type="submit" variant="secondary">{settings.publicBookingEnabled ? 'Deshabilitar reservas' : 'Habilitar reservas'}</Button>
            </form>
            <CopyPublicLink path={`/${business.slug}`} />
            <LinkButton variant="secondary" href={`/${business.slug}`} target="_blank" rel="noreferrer">Abrir página pública</LinkButton>
          </div>
          <p className="panel-form-note mt-4 text-xs leading-relaxed text-[#56657a]">Enlace: <code>/{business.slug}</code> · La vista solo acepta reservas cuando el negocio está activo y las reservas están habilitadas.</p>
      </section>
      </aside>
    </div>
  </>;
}
