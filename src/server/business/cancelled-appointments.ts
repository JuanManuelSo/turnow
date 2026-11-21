import 'server-only';

import { and, asc, count, desc, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { appointments } from '@/server/db/schema';

const archiveAfterDays = 90;
const listLimit = 100;

export async function getCancelledAppointments(businessId: string, locationId?: string, showArchived = false, page = 1) {
  const db = getDb();
  const archiveCutoff = new Date(Date.now() - archiveAfterDays * 24 * 60 * 60 * 1000);
  const businessConditions = [
    eq(appointments.businessId, businessId),
    eq(appointments.status, 'cancelled'),
    ...(locationId ? [eq(appointments.locationId, locationId)] : []),
  ];
  const activeConditions = [...businessConditions, isNull(appointments.archivedAt)];
  const listConditions = [...businessConditions, showArchived ? isNotNull(appointments.archivedAt) : isNull(appointments.archivedAt)];
  const [rows, totalRows, oldRows, archivedRows] = await Promise.all([
    db.select({
      id: appointments.id,
      customerName: appointments.customerName,
      serviceName: appointments.serviceNameSnapshot,
      professionalName: appointments.professionalNameSnapshot,
      locationName: appointments.locationNameSnapshot,
      startsAt: appointments.startsAt,
      timezone: appointments.timezoneSnapshot,
      cancelledAt: appointments.cancelledAt,
      archivedAt: appointments.archivedAt,
      cancellationReason: appointments.cancellationReason,
    }).from(appointments).where(and(...listConditions))
      .orderBy(desc(appointments.cancelledAt), asc(appointments.startsAt))
      .limit(listLimit).offset((page - 1) * listLimit),
    db.select({ value: count() }).from(appointments).where(and(...activeConditions)),
    db.select({ value: count() }).from(appointments).where(and(
      ...activeConditions,
      lt(appointments.cancelledAt, archiveCutoff),
    )),
    db.select({ value: count() }).from(appointments).where(and(
      eq(appointments.businessId, businessId),
      eq(appointments.status, 'cancelled'),
      isNotNull(appointments.archivedAt),
      ...(locationId ? [eq(appointments.locationId, locationId)] : []),
    )),
  ]);
  return {
    appointments: rows,
    total: showArchived ? archivedRows[0]?.value ?? 0 : totalRows[0]?.value ?? 0,
    activeTotal: totalRows[0]?.value ?? 0,
    olderThanRetention: oldRows[0]?.value ?? 0,
    archivedTotal: archivedRows[0]?.value ?? 0,
    listLimit,
    page,
    pageCount: Math.max(1, Math.ceil((showArchived ? archivedRows[0]?.value ?? 0 : totalRows[0]?.value ?? 0) / listLimit)),
    archiveAfterDays,
  };
}
