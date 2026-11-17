import type { Metadata } from 'next';
import { z } from 'zod';
import { requireSession } from '@/server/auth/access';
import { getBusinessShell } from '@/server/business/queries';
import { getAgendaData } from '@/server/business/agenda';
import { AgendaPage } from '@/features/dashboard/agenda-page';

export const metadata: Metadata = { title: 'Agenda' };

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; sede?: string }>;
}) {
  const [{ membership }, params] = await Promise.all([requireSession(), searchParams]);
  const business = await getBusinessShell(membership.businessId);
  const today = dateInTimezone(business?.timezone ?? 'America/Argentina/Buenos_Aires');
  const parsedDate = z.iso.date().safeParse(params.fecha);
  const requestedDate = parsedDate.success ? parsedDate.data : today;
  const locationId = membership.role === 'owner' ? params.sede : membership.locationId ?? undefined;
  const agenda = await getAgendaData(membership.businessId, locationId, requestedDate);

  return <AgendaPage
    businessName={membership.businessName}
    role={membership.role}
    date={requestedDate}
    today={today}
    locations={membership.role === 'owner' ? agenda.locations : agenda.selectedLocation ? [agenda.selectedLocation] : []}
    selectedLocation={agenda.selectedLocation}
    professionals={agenda.professionals}
    services={agenda.services}
    appointments={agenda.appointments}
    allowAnyProfessional={agenda.allowAnyProfessional}
    currency={agenda.business?.currency ?? 'ARS'}
    timezone={agenda.selectedLocation?.timezone ?? 'America/Argentina/Buenos_Aires'}
  />;
}
