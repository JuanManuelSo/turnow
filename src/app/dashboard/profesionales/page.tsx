import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionLink } from '@/components/dashboard/action-link';
import { PanelHeader } from '@/components/dashboard/page-header';
import { PanelNotice } from '@/components/dashboard/notice';
import { requireOwner } from '@/server/auth/access';
import { getProfessionalsData } from '@/server/business/queries';
import { ProfessionalForm, type ProfessionalFormValue } from './professional-form';

export const metadata: Metadata = { title: 'Profesionales' };

export default async function ProfesionalesPage({ searchParams }: {
  searchParams: Promise<{ editar?: string; nuevo?: string; guardado?: string }>;
}) {
  const { membership } = await requireOwner();
  const data = await getProfessionalsData(membership.businessId);
  const params = await searchParams;
  const editing = data.professionals.find(professional => professional.id === params.editar) ?? null;
  const isNew = params.nuevo === '1';
  const formValue: ProfessionalFormValue | null = isNew ? null : editing;
  const locationNames = new Map(data.locations.map(location => [location.id, location.name]));
  const activeCount = data.professionals.filter(professional => professional.isActive).length;

  return <>
    <PanelHeader
      title="Profesionales"
      description="Quiénes atienden, en qué sedes y qué servicios ofrecen. No necesitan una cuenta propia en esta etapa."
      actions={<ActionLink create href="/dashboard/profesionales?nuevo=1">Nuevo profesional</ActionLink>}
    />

    {params.guardado === '1' && <PanelNotice>El profesional se guardó correctamente.</PanelNotice>}

    <div className="panel-entity-list">
      <section aria-label="Equipo" className="panel-list min-w-0 overflow-hidden rounded border border-[#dde3eb] bg-white">
        <p className="panel-list-summary border-b border-[#dde3eb] bg-[#f8fafc] px-5 py-3 text-xs text-[#56657a]">{activeCount} {activeCount === 1 ? 'profesional activo' : 'profesionales activos'} de {data.professionals.length}</p>

        {data.professionals.length === 0 && <div className="panel-empty grid justify-items-start gap-3 border-b border-dashed border-[#c1cad6] bg-white p-6">
          <h2>Todavía no hay profesionales</h2>
          <p>Agregá a la primera persona del equipo y asignale sus sedes y servicios.</p>
        </div>}

        {data.professionals.map(professional => {
          const locationList = professional.locationIds.map(id => locationNames.get(id)).filter(Boolean).join(' · ');
          return <article className="panel-row flex items-start justify-between gap-5 border-b border-[#dde3eb] p-5 max-[600px]:flex-col max-[600px]:gap-3" key={professional.id}>
            <div className="min-w-0">
              <div className="panel-row-title flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-bold text-[#1b2839]">{professional.displayName}</h2>
                <span className={`panel-chip inline-flex rounded-full px-2 py-1 text-[.6875rem] font-bold ${professional.isActive ? 'bg-[#e7f2ec] text-[#1f5c47]' : 'bg-[#f0f2f5] text-[#56657a]'}`}>{professional.isActive ? 'Activo' : 'Inactivo'}</span>
                {professional.locationIds.length === 0 && <span className="panel-chip inline-flex rounded-full bg-[#fbf1df] px-2 py-1 text-[.6875rem] font-bold text-[#855816]">Sin sede</span>}
              </div>
              {professional.description && <p className="panel-row-description mt-2 text-sm leading-relaxed text-[#56657a]">{professional.description}</p>}
              <p className="panel-row-meta mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#56657a]">
                <span>{locationList || 'Sin sede asignada'}</span>
                <span>{professional.serviceIds.length} {professional.serviceIds.length === 1 ? 'servicio' : 'servicios'}</span>
              </p>
            </div>
            <div className="panel-row-actions flex shrink-0 items-center gap-3">
              <Link href={`/dashboard/profesionales?editar=${professional.id}`} className="panel-row-action inline-flex min-h-10 items-center rounded border border-[#c1cad6] px-3 text-xs font-bold text-[#244f82] no-underline hover:bg-[#eaf1f8]">Editar</Link>
            </div>
          </article>;
        })}

        {data.professionals.length > 0 && <p className="panel-list-note border-t border-[#dde3eb] bg-[#f8fafc] px-5 py-4 text-xs leading-relaxed text-[#56657a]">Desactivar a un profesional no borra sus turnos ni su historial: deja de ofrecerse para reservas nuevas.</p>}
      </section>

      {params.guardado !== '1' && (formValue !== null || isNew) && <ProfessionalForm key={formValue?.id ?? 'new'} professional={formValue} locations={data.locations} services={data.services} />}
    </div>
  </>;
}
