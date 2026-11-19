import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionLink } from '@/components/dashboard/action-link';
import { PanelHeader } from '@/components/dashboard/page-header';
import { PanelNotice } from '@/components/dashboard/notice';
import { requireOwner } from '@/server/auth/access';
import { getBusinessShell, getServices } from '@/server/business/queries';
import { formatMoney } from '@/lib/dashboard-format';
import { ServiceForm, type ServiceFormValue } from './service-form';

export const metadata: Metadata = { title: 'Servicios' };

export default async function ServiciosPage({ searchParams }: {
  searchParams: Promise<{ editar?: string; nuevo?: string; guardado?: string }>;
}) {
  const { membership } = await requireOwner();
  const [services, business] = await Promise.all([
    getServices(membership.businessId),
    getBusinessShell(membership.businessId),
  ]);
  const params = await searchParams;
  const editing = services.find(service => service.id === params.editar) ?? null;
  const isNew = params.nuevo === '1';
  const formValue: ServiceFormValue | null = isNew ? null : editing;
  const activeCount = services.filter(service => service.isActive).length;

  return <>
    <PanelHeader
      title="Servicios"
      description="Duración y precio del catálogo. El mismo catálogo se ofrece en todas las sedes."
      actions={<ActionLink create href="/dashboard/servicios?nuevo=1">Nuevo servicio</ActionLink>}
    />

    {params.guardado === '1' && <PanelNotice>El servicio se guardó correctamente.</PanelNotice>}

    <div className="panel-entity-list">
      <section aria-label="Catálogo de servicios" className="panel-list min-w-0 overflow-hidden rounded border border-[#dde3eb] bg-white">
        <p className="panel-list-summary border-b border-[#dde3eb] bg-[#f8fafc] px-5 py-3 text-xs text-[#56657a]">{activeCount} {activeCount === 1 ? 'servicio activo' : 'servicios activos'} de {services.length}</p>

        {services.length === 0 && <div className="panel-empty grid justify-items-start gap-3 border-b border-dashed border-[#c1cad6] bg-white p-6">
          <h2>El catálogo está vacío</h2>
          <p>Empezá por el servicio más pedido. Después vas a poder asignarlo a cada profesional.</p>
        </div>}

        {services.map(service => <article className="panel-row flex items-start justify-between gap-5 border-b border-[#dde3eb] p-5 max-[600px]:flex-col max-[600px]:gap-3" key={service.id}>
          <div className="min-w-0">
            <div className="panel-row-title flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-bold text-[#1b2839]">{service.name}</h2>
              <span className={`panel-chip inline-flex rounded-full px-2 py-1 text-[.6875rem] font-bold ${service.isActive ? 'bg-[#e7f2ec] text-[#1f5c47]' : 'bg-[#f0f2f5] text-[#56657a]'}`}>{service.isActive ? 'Activo' : 'Inactivo'}</span>
            </div>
            {service.description && <p className="panel-row-description mt-2 text-sm leading-relaxed text-[#56657a]">{service.description}</p>}
            <p className="panel-row-meta mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#56657a]">
              <span>{service.durationMinutes} min</span>
              <span>{service.showPrice ? formatMoney(service.priceMinor, business?.currency ?? 'ARS') : 'Precio no visible'}</span>
            </p>
          </div>
          <div className="panel-row-actions flex shrink-0 items-center gap-3">
            <Link href={`/dashboard/servicios?editar=${service.id}`} className="panel-row-action inline-flex min-h-10 items-center rounded border border-[#c1cad6] px-3 text-xs font-bold text-[#244f82] no-underline hover:bg-[#eaf1f8]">Editar</Link>
          </div>
        </article>)}

        {services.length > 0 && <p className="panel-list-note border-t border-[#dde3eb] bg-[#f8fafc] px-5 py-4 text-xs leading-relaxed text-[#56657a]">Los servicios no se eliminan: se desactivan para conservar las reservas ya confirmadas.</p>}
      </section>

      {params.guardado !== '1' && (formValue !== null || isNew) && <ServiceForm key={formValue?.id ?? 'new'} service={formValue} currency={business?.currency ?? 'ARS'} />}
    </div>
  </>;
}
