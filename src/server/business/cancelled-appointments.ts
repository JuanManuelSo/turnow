import 'server-only';

import { and, asc, count, desc, eq, inArray, isNotNull, isNull, notExists } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { appointmentEmailNotifications, appointmentPayments, appointments } from '@/server/db/schema';

const listLimit = 10;

export async function getCancelledAppointments(businessId: string, locationId?: string, showArchived = false, page = 1) {
  const db = getDb();
  const businessConditions = [
    eq(appointments.businessId, businessId),
    eq(appointments.status, 'cancelled'),
    ...(locationId ? [eq(appointments.locationId, locationId)] : []),
  ];
  const activeConditions = [...businessConditions, isNull(appointments.archivedAt)];
  const listConditions = [...businessConditions, showArchived ? isNotNull(appointments.archivedAt) : isNull(appointments.archivedAt)];
  const [rows, totalRows, archivedRows, deletableRows] = await Promise.all([
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
      eq(appointments.businessId, businessId),
      eq(appointments.status, 'cancelled'),
      isNotNull(appointments.archivedAt),
      ...(locationId ? [eq(appointments.locationId, locationId)] : []),
    )),
    db.select({ value: count() }).from(appointments).where(and(
      eq(appointments.businessId, businessId),
      eq(appointments.status, 'cancelled'),
      isNotNull(appointments.archivedAt),
      ...(locationId ? [eq(appointments.locationId, locationId)] : []),
      notExists(db.select({ id: appointmentPayments.id }).from(appointmentPayments).where(and(
        eq(appointmentPayments.businessId, appointments.businessId),
        eq(appointmentPayments.appointmentId, appointments.id),
      ))),
      notExists(db.select({ id: appointmentEmailNotifications.id }).from(appointmentEmailNotifications).where(and(
        eq(appointmentEmailNotifications.businessId, appointments.businessId),
        eq(appointmentEmailNotifications.appointmentId, appointments.id),
        inArray(appointmentEmailNotifications.status, ['pending', 'scheduled', 'cancel_pending']),
      ))),
    )),
  ]);
  const activeEmailRows = showArchived && rows.length
    ? await db.select({ appointmentId: appointmentEmailNotifications.appointmentId })
      .from(appointmentEmailNotifications).where(and(
        eq(appointmentEmailNotifications.businessId, businessId),
        inArray(appointmentEmailNotifications.appointmentId, rows.map(row => row.id)),
        inArray(appointmentEmailNotifications.status, ['pending', 'scheduled', 'cancel_pending']),
      ))
    : [];
  const paymentRows = showArchived && rows.length
    ? await db.select({ appointmentId: appointmentPayments.appointmentId })
      .from(appointmentPayments).where(and(
        eq(appointmentPayments.businessId, businessId),
        inArray(appointmentPayments.appointmentId, rows.map(row => row.id)),
      ))
    : [];
  const retainedIds = new Set([
    ...activeEmailRows.map(row => row.appointmentId),
    ...paymentRows.map(row => row.appointmentId),
  ]);
  const paymentIds = new Set(paymentRows.map(row => row.appointmentId));
  const activeEmailIds = new Set(activeEmailRows.map(row => row.appointmentId));
  const eligibleToDelete = deletableRows[0]?.value ?? 0;
  return {
    appointments: rows.map(row => ({
      ...row,
      canDelete: showArchived && !retainedIds.has(row.id),
      deleteBlockedByPayment: paymentIds.has(row.id),
      deleteBlockedByEmail: activeEmailIds.has(row.id),
    })),
    total: showArchived ? archivedRows[0]?.value ?? 0 : totalRows[0]?.value ?? 0,
    activeTotal: totalRows[0]?.value ?? 0,
    archivedTotal: archivedRows[0]?.value ?? 0,
    deletableTotal: eligibleToDelete,
    retainedTotal: (archivedRows[0]?.value ?? 0) - eligibleToDelete,
    listLimit,
    page,
    pageCount: Math.max(1, Math.ceil((showArchived ? archivedRows[0]?.value ?? 0 : totalRows[0]?.value ?? 0) / listLimit)),
  };
}
