import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireSession } from '@/server/auth/access';
import { getCancelledAppointments } from '@/server/business/cancelled-appointments';
import { CancelledAppointments } from './cancelled-appointments';

export const metadata: Metadata = { title: 'Cancelados' };

export default async function CancelledAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; pagina?: string }>;
}) {
  const { membership } = await requireSession();
  const params = await searchParams;
  const showArchived = params.vista === 'archivados';
  const parsedPage = Number.parseInt(params.pagina ?? '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const data = await getCancelledAppointments(
    membership.businessId,
    membership.role === 'location_operator' ? membership.locationId ?? undefined : undefined,
    showArchived,
    page,
  );
  if (page > data.pageCount) {
    redirect(`/dashboard/cancelados?${showArchived ? 'vista=archivados&' : ''}pagina=${data.pageCount}`);
  }
  return <CancelledAppointments {...data} canArchive={membership.role === 'owner'} showArchived={showArchived} />;
}
