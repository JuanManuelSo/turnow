import 'server-only';
import { and, asc, desc, eq, gte, inArray, lt, ne } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { localDayBounds } from '@/lib/timezone';
import {
  appointmentPayments, appointments, businesses, locations,
  businessSettings, professionalLocations, professionals, services,
} from '@/server/db/schema';

export async function getAgendaData(businessId: string, requestedLocationId: string | undefined, date: string) {
  const db = getDb();
  const [businessRows, locationRows, settingRows] = await Promise.all([
    db.select({ timezone: businesses.timezone, currency: businesses.currency, name: businesses.name })
      .from(businesses).where(eq(businesses.id, businessId)).limit(1),
    db.select({ id: locations.id, name: locations.name, addressText: locations.addressText, timezone: locations.timezone })
      .from(locations).where(and(eq(locations.businessId, businessId), eq(locations.isActive, true)))
      .orderBy(desc(locations.isPrimary), asc(locations.name)),
    db.select({ allowAnyProfessional: businessSettings.allowAnyProfessional }).from(businessSettings)
      .where(eq(businessSettings.businessId, businessId)).limit(1),
  ]);
  const business = businessRows[0];
  const selectedLocation = locationRows.find(item => item.id === requestedLocationId) ?? locationRows[0] ?? null;
  if (!business || !selectedLocation) return { business: business ?? null, locations: locationRows, selectedLocation: null, professionals: [], services: [], appointments: [], allowAnyProfessional: false };

  const [professionalRows, serviceRows] = await Promise.all([db.select({ id: professionals.id, name: professionals.displayName })
    .from(professionals)
    .innerJoin(professionalLocations, and(
      eq(professionalLocations.businessId, professionals.businessId),
      eq(professionalLocations.professionalId, professionals.id),
      eq(professionalLocations.locationId, selectedLocation.id),
      eq(professionalLocations.isActive, true),
    ))
    .where(and(eq(professionals.businessId, businessId), eq(professionals.isActive, true)))
    .orderBy(asc(professionals.sortOrder), asc(professionals.displayName)),
  db.select({ id: services.id, name: services.name, duration: services.durationMinutes, priceMinor: services.priceMinor })
    .from(services).where(and(eq(services.businessId, businessId), eq(services.isActive, true)))
    .orderBy(asc(services.sortOrder), asc(services.name))]);

  const bounds = localDayBounds(date, selectedLocation.timezone);
  const appointmentRows = await db.select({
    id: appointments.id, startsAt: appointments.startsAt, endsAt: appointments.endsAt,
    customerName: appointments.customerName, customerPhone: appointments.customerPhone,
    serviceName: appointments.serviceNameSnapshot, professionalId: appointments.professionalId,
    professionalName: appointments.professionalNameSnapshot, status: appointments.status,
    priceMinor: appointments.priceMinorSnapshot, currency: appointments.currencySnapshot,
    source: appointments.source, version: appointments.version,
  }).from(appointments).where(and(
    eq(appointments.businessId, businessId),
    eq(appointments.locationId, selectedLocation.id),
    gte(appointments.startsAt, bounds.start), lt(appointments.startsAt, bounds.end),
    ne(appointments.status, 'cancelled'),
  )).orderBy(asc(appointments.startsAt));

  const paymentRows = appointmentRows.length ? await db.select({
    id: appointmentPayments.id, appointmentId: appointmentPayments.appointmentId,
    amountMinor: appointmentPayments.amountMinor, currency: appointmentPayments.currency,
    method: appointmentPayments.method, recordedAt: appointmentPayments.recordedAt,
    note: appointmentPayments.note, reversedAt: appointmentPayments.reversedAt,
    reversalReason: appointmentPayments.reversalReason,
  }).from(appointmentPayments).where(and(
    eq(appointmentPayments.businessId, businessId),
    inArray(appointmentPayments.appointmentId, appointmentRows.map(row => row.id)),
  )) : [];
  const visiblePayments = paymentRows.filter(payment => appointmentRows.some(row => row.id === payment.appointmentId));
  const paymentsByAppointment = new Map<string, typeof visiblePayments>();
  for (const payment of visiblePayments) paymentsByAppointment.set(payment.appointmentId, [...(paymentsByAppointment.get(payment.appointmentId) ?? []), payment]);

  return {
    business,
    locations: locationRows,
    selectedLocation,
    professionals: professionalRows,
    services: serviceRows,
    allowAnyProfessional: settingRows[0]?.allowAnyProfessional ?? false,
    appointments: appointmentRows.map(appointment => {
      const payments = paymentsByAppointment.get(appointment.id) ?? [];
      return {
        ...appointment,
        payments,
        paidMinor: payments.filter(payment => !payment.reversedAt).reduce((sum, payment) => sum + payment.amountMinor, 0),
      };
    }),
  };
}
