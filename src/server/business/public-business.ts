import 'server-only';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import {
  businessPages, businessSettings, businesses, locations,
  professionalLocations, professionalServices, professionals, schedules, services, weeklyIntervals,
} from '@/server/db/schema';

export async function getPublicBusinessBySlug(slug: string, includeInactive = false) {
  const db = getDb();
  const [business] = await db.select({
    id: businesses.id, name: businesses.name, slug: businesses.slug, status: businesses.status,
    timezone: businesses.timezone, currency: businesses.currency,
    enabled: businessSettings.publicBookingEnabled,
    anyProfessional: businessSettings.allowAnyProfessional,
    cancellationNoticeMinutes: businessSettings.cancellationNoticeMinutes,
    minNoticeMinutes: businessSettings.minBookingNoticeMinutes,
    horizonDays: businessSettings.bookingHorizonDays,
    headline: businessPages.headline, description: businessPages.description,
    contactEmail: businessPages.contactEmail, socialLinks: businessPages.socialLinks,
    theme: businessPages.theme,
  }).from(businesses)
    .innerJoin(businessSettings, eq(businessSettings.businessId, businesses.id))
    .leftJoin(businessPages, eq(businessPages.businessId, businesses.id))
    .where(eq(businesses.slug, slug)).limit(1);
  if (!business || (!includeInactive && business.status !== 'active')) return null;

  const [locationRows, serviceRows, professionalRows] = await Promise.all([
    db.select({ id: locations.id, name: locations.name, slug: locations.slug,
      addressText: locations.addressText, mapUrl: locations.mapUrl, contactPhone: locations.contactPhone,
      arrivalInstructions: locations.arrivalInstructions, timezone: locations.timezone,
      isPrimary: locations.isPrimary })
      .from(locations).where(and(eq(locations.businessId, business.id), eq(locations.isActive, true)))
      .orderBy(desc(locations.isPrimary), asc(locations.name)),
    db.select({ id: services.id, name: services.name, description: services.description,
      duration: services.durationMinutes, priceMinor: services.priceMinor, showPrice: services.showPrice })
      .from(services).where(and(eq(services.businessId, business.id), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder), asc(services.name)),
    db.select({ id: professionals.id, name: professionals.displayName, description: professionals.description,
      locationId: professionalLocations.locationId, serviceId: professionalServices.serviceId })
      .from(professionals)
      .innerJoin(professionalLocations, and(
        eq(professionalLocations.businessId, professionals.businessId),
        eq(professionalLocations.professionalId, professionals.id),
        eq(professionalLocations.isActive, true),
      ))
      .innerJoin(professionalServices, and(
        eq(professionalServices.businessId, professionals.businessId),
        eq(professionalServices.professionalId, professionals.id),
        eq(professionalServices.isActive, true),
      ))
      .where(and(eq(professionals.businessId, business.id), eq(professionals.isActive, true)))
      .orderBy(asc(professionals.sortOrder), asc(professionals.displayName)),
  ]);

  const locationSchedules = locationRows.length ? await db.select({ id: schedules.id, locationId: schedules.locationId })
    .from(schedules).where(and(
      eq(schedules.businessId, business.id), inArray(schedules.locationId, locationRows.map(location => location.id)),
      isNull(schedules.professionalId),
    )) : [];
  const scheduleIntervals = locationSchedules.length ? await db.select({
    scheduleId: weeklyIntervals.scheduleId, weekday: weeklyIntervals.weekday,
    startMinute: weeklyIntervals.startMinute, endMinute: weeklyIntervals.endMinute,
  }).from(weeklyIntervals).where(and(
    eq(weeklyIntervals.businessId, business.id), inArray(weeklyIntervals.scheduleId, locationSchedules.map(schedule => schedule.id)),
  )) : [];
  const scheduleIdByLocation = new Map(locationSchedules.map(schedule => [schedule.locationId, schedule.id]));

  return {
    ...business,
    publicBookingEnabled: business.enabled,
    allowAnyProfessional: business.anyProfessional,
    locations: locationRows.map(location => ({
      ...location,
      weeklyIntervals: scheduleIntervals.filter(interval => interval.scheduleId === scheduleIdByLocation.get(location.id))
        .map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute })),
    })),
    services: serviceRows.map(service => ({
      ...service,
      // Hidden prices stay on the server; they are only snapshotted into a confirmed appointment.
      priceMinor: service.showPrice ? service.priceMinor : null,
    })),
    professionals: professionalRows,
  };
}
