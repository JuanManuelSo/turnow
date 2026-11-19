import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { ActionLink } from '@/components/dashboard/action-link';
import { PanelHeader } from '@/components/dashboard/page-header';
import { PanelNotice } from '@/components/dashboard/notice';
import { requireOwner } from '@/server/auth/access';
import { getBusinessShell, getLocations } from '@/server/business/queries';
import { LocationForm, type LocationFormValue } from './location-form';
import { setPrimaryLocationAction } from './actions';

export const metadata: Metadata = { title: 'Sedes' };

export default async function SedesPage({ searchParams }: {
  searchParams: Promise<{ editar?: string; nueva?: string; guardado?: string; principal?: string; error?: string }>;
}) {
  const { membership } = await requireOwner();
  const [locations, business] = await Promise.all([
    getLocations(membership.businessId),
    getBusinessShell(membership.businessId),
  ]);
  const params = await searchParams;
  const editing = locations.find(location => location.id === params.editar) ?? null;
  const isNew = params.nueva === '1';
  const formValue: LocationFormValue | null = isNew ? null : editing;

  return <>
    <PanelHeader
      title="Sedes"
      description="Cada sede tiene su dirección y su propia agenda. El catálogo de servicios es el mismo para todas."
      actions={<ActionLink create href="/dashboard/sedes?nueva=1">Nueva sede</ActionLink>}
    />

    {params.guardado === '1' && <PanelNotice>La sede se guardó correctamente.</PanelNotice>}
    {params.principal && <PanelNotice>La sede principal se actualizó.</PanelNotice>}
    {params.error && <PanelNotice tone="warning">No pudimos cambiar la sede principal. Recargá e intentá de nuevo.</PanelNotice>}

    <div className="panel-entity-list">
      <section aria-label="Sedes del negocio" className="panel-list min-w-0 overflow-hidden rounded border border-[#dde3eb] bg-white">
        {locations.length === 0 && <div className="panel-empty grid justify-items-start gap-3 border-b border-dashed border-[#c1cad6] bg-white p-6">
          <h2>Todavía no hay sedes</h2>
          <p>Creá la primera sede para poder asignar profesionales y horarios.</p>
        </div>}

        {locations.map(location => <article className="panel-row flex items-start justify-between gap-5 border-b border-[#dde3eb] p-5 max-[600px]:flex-col max-[600px]:gap-3" key={location.id}>
          <div className="min-w-0">
            <div className="panel-row-title flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-bold text-[#1b2839]">{location.name}</h2>
              {location.isPrimary && <span className="panel-chip inline-flex items-center gap-1 rounded-full bg-[#eaf1f8] px-2 py-1 text-[.6875rem] font-bold text-[#244f82]"><Star size={12} aria-hidden="true" />Principal</span>}
              <span className={`panel-chip inline-flex rounded-full px-2 py-1 text-[.6875rem] font-bold ${location.isActive ? 'bg-[#e7f2ec] text-[#1f5c47]' : 'bg-[#f0f2f5] text-[#56657a]'}`}>{location.isActive ? 'Activa' : 'Inactiva'}</span>
            </div>
            <p className="panel-row-meta mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#56657a]">
              <span>{location.addressText || 'Sin dirección'}</span>
              {location.contactPhone && <span>{location.contactPhone}</span>}
            </p>
          </div>
          <div className="panel-row-actions flex shrink-0 items-center gap-3 max-[600px]:flex-wrap">
            {!location.isPrimary && location.isActive && <form action={setPrimaryLocationAction}>
              <input type="hidden" name="id" value={location.id} />
              <button type="submit" className="panel-inline-action min-h-10 rounded px-2 text-xs font-bold text-[#244f82] underline underline-offset-4">Hacer principal</button>
            </form>}
            <Link href={`/dashboard/sedes?editar=${location.id}`} className="panel-row-action inline-flex min-h-10 items-center rounded border border-[#c1cad6] px-3 text-xs font-bold text-[#244f82] no-underline hover:bg-[#eaf1f8]">Editar</Link>
          </div>
        </article>)}

        {locations.length > 0 && <p className="panel-list-note flex items-start gap-2 border-t border-[#dde3eb] bg-[#f8fafc] px-5 py-4 text-xs leading-relaxed text-[#56657a]"><MapPin size={14} aria-hidden="true" />La sede principal se usa como referencia del negocio. Podés cambiarla cuando quieras.</p>}
      </section>

      {params.guardado !== '1' && (formValue !== null || isNew) && <LocationForm key={formValue?.id ?? 'new'} location={formValue} timezone={business?.timezone ?? 'America/Argentina/Buenos_Aires'} />}
    </div>
  </>;
}
