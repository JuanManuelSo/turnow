import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionLink } from '@/components/dashboard/action-link';
import { PanelHeader } from '@/components/dashboard/page-header';
import { PanelNotice } from '@/components/dashboard/notice';
import { requireOwner } from '@/server/auth/access';
import { getSchedulesData } from '@/server/business/queries';
import { ScheduleEditor } from './schedule-editor';

export const metadata: Metadata = { title: 'Horarios' };

export default async function HorariosPage({ searchParams }: {
  searchParams: Promise<{ sede?: string; ambito?: string; guardado?: string }>;
}) {
  const { membership } = await requireOwner();
  const params = await searchParams;
  const data = await getSchedulesData(membership.businessId, params.sede);

  if (!data.selected) {
    return <>
      <PanelHeader
        title="Horarios"
        description="Franjas semanales por sede y por profesional, con turnos partidos cuando haga falta."
      />
       <section className="panel-empty grid justify-items-start gap-3 rounded border border-dashed border-[#c1cad6] bg-white p-8 text-left">
        <h2>No hay sedes activas</h2>
        <p>Activá una sede para poder cargar sus horarios.</p>
        <ActionLink href="/dashboard/sedes" variant="secondary">Ir a sedes</ActionLink>
      </section>
    </>;
  }

  const selectedLocation = data.selected;
  const requestedScope = params.ambito ?? 'sede';
  const selectedProfessional = requestedScope === 'sede'
    ? null
    : data.professionals.find(professional => professional.id === requestedScope) ?? null;
  const scope = selectedProfessional?.id ?? 'sede';
  const scopeSelected = Boolean(params.ambito);
  const schedule = data.schedules.find(item => item.professionalId === (selectedProfessional?.id ?? null));
  const businessSchedule = data.schedules.find(item => item.professionalId === null);
  const title = selectedProfessional ? selectedProfessional.displayName : 'Horario de la sede';
  const description = selectedProfessional
    ? 'Se usa junto con el horario general de la sede. Si no cargás uno propio, el profesional toma el horario de la sede.'
    : 'Base para todas las reservas de esta sede. Cada profesional puede sumar su propio horario.';

  return <>
    <PanelHeader
      title="Horarios"
      description="Franjas semanales por sede y por profesional, con turnos partidos cuando haga falta."
      actions={<ActionLink href="/dashboard/profesionales" variant="secondary">Ver equipo</ActionLink>}
    />

    {params.guardado === '1' && <PanelNotice>El horario se guardó correctamente.</PanelNotice>}

     <nav className="panel-tabs mb-5 flex gap-2 overflow-x-auto border-b border-[#dde3eb] pb-2 [scrollbar-width:thin] max-[600px]:grid max-[600px]:grid-cols-2 max-[600px]:overflow-visible" aria-label="Sedes">
      {data.locations.map(location => <Link
        key={location.id}
        href={`/dashboard/horarios?sede=${location.id}&ambito=sede`}
         aria-current={location.id === selectedLocation.id ? 'true' : undefined}
          className="inline-flex min-h-11 shrink-0 flex-col items-start justify-center rounded border border-transparent px-3 py-[7px] text-[.8125rem] leading-[1.15] font-semibold whitespace-nowrap text-[#56657a] no-underline hover:bg-[#e9edf3] hover:text-[#1b2839] aria-[current=true]:border-[#c1cad6] aria-[current=true]:bg-white aria-[current=true]:text-[#1b2839] max-[600px]:items-center max-[600px]:border-[#dde3eb] max-[600px]:text-center max-[600px]:whitespace-normal max-[600px]:aria-[current=true]:border-[#1b2839]"
      >
        {location.name}
         <span className="panel-tab-state mt-[3px] block text-[.625rem] font-bold tracking-[.05em] text-[#56657a] uppercase">{data.coverage[location.id] ? 'Con horario' : 'Sin horario'}</span>
      </Link>)}
    </nav>

    <div className={`panel-split panel-split-wide panel-split-horarios grid grid-cols-[minmax(0,1fr)_minmax(340px,390px)] items-start gap-8 max-[1100px]:grid-cols-1${scopeSelected ? ' is-focused' : ''}`}>
      <section aria-label={`Horarios de ${selectedLocation.name}`} className="panel-list min-w-0 rounded border border-[#dde3eb] bg-white p-4">
         <p className="panel-list-summary border-b border-[#dde3eb] bg-[#f8fafc] px-5 py-3 text-xs text-[#56657a]">{selectedLocation.addressText || selectedLocation.name}</p>

        <Link
          href={`/dashboard/horarios?sede=${selectedLocation.id}&ambito=sede`}
           className="panel-scope flex items-center justify-between gap-[18px] border-b border-l border-b-[#dde3eb] border-l-transparent px-3 py-[15px] text-[#1b2839] no-underline hover:bg-[#f8fafc] aria-[current=true]:border-l-[#244f82] aria-[current=true]:bg-[#eaf1f8] aria-[current=true]:[&_strong]:font-extrabold max-[600px]:px-2"
          aria-current={scope === 'sede' ? 'true' : undefined}
        >
           <span>
             <strong className="block text-[.9375rem] tracking-[-.02em] text-[#1b2839]">Horario de la sede</strong>
             <small className="mt-[3px] block text-xs text-[#56657a]">Base para todas las reservas.</small>
          </span>
           <span className="panel-scope-state shrink-0 text-[.71875rem] font-bold tracking-[.03em] text-[#56657a] uppercase max-[600px]:text-[.65625rem]">{businessSchedule?.intervals.length ? `${businessSchedule.intervals.length} ${businessSchedule.intervals.length === 1 ? 'tramo' : 'tramos'}` : 'Sin configurar'}</span>
        </Link>

         {data.professionals.length === 0 && <p className="panel-list-note border-t border-[#dde3eb] bg-[#f8fafc] px-5 py-4 text-xs leading-relaxed text-[#56657a]">Todavía no hay profesionales asignados a esta sede. Podés cargar el horario base ahora y sumar los individuales después.</p>}

        {data.professionals.map(professional => {
          const professionalSchedule = data.schedules.find(item => item.professionalId === professional.id);
          return <Link
            key={professional.id}
            href={`/dashboard/horarios?sede=${selectedLocation.id}&ambito=${professional.id}`}
              className="panel-scope flex items-center justify-between gap-[18px] border-b border-l border-b-[#dde3eb] border-l-transparent px-3 py-[15px] text-[#1b2839] no-underline hover:bg-[#f8fafc] aria-[current=true]:border-l-[#244f82] aria-[current=true]:bg-[#eaf1f8] aria-[current=true]:[&_strong]:font-extrabold max-[600px]:px-2"
            aria-current={scope === professional.id ? 'true' : undefined}
          >
             <span>
               <strong className="block text-[.9375rem] tracking-[-.02em] text-[#1b2839]">{professional.displayName}</strong>
               <small className="mt-[3px] block text-xs text-[#56657a]">{professionalSchedule?.intervals.length ? 'Horario propio' : 'Usa el horario de la sede'}</small>
            </span>
             <span className="panel-scope-state shrink-0 text-[.71875rem] font-bold tracking-[.03em] text-[#56657a] uppercase max-[600px]:text-[.65625rem]">{professionalSchedule?.intervals.length ? `${professionalSchedule.intervals.length} ${professionalSchedule.intervals.length === 1 ? 'tramo' : 'tramos'}` : 'Heredado'}</span>
          </Link>;
        })}
      </section>

      <aside aria-label="Editor de horario">
        <div className="panel-editor rounded border border-[#dde3eb] bg-white p-6 max-[600px]:p-[18px]">
          <div className="panel-editor-head flex items-center justify-between gap-4 border-b border-[#dde3eb] pb-4">
            <div>
              <h2>{title}</h2>
            </div>
          </div>
          <p className="panel-editor-lede py-4 text-sm leading-relaxed text-[#56657a]">{description}</p>
          <ScheduleEditor
            key={`${selectedLocation.id}-${scope}-${schedule?.id ?? 'new'}`}
            locationId={selectedLocation.id}
            professionalId={selectedProfessional?.id ?? null}
            initialIntervals={(schedule?.intervals ?? []).map(interval => ({
              weekday: interval.weekday,
              startMinute: interval.startMinute,
              endMinute: interval.endMinute,
            }))}
          />
        </div>
      </aside>
    </div>
  </>;
}
