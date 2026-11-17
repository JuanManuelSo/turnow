'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { PAGE_EDITOR_ENABLED } from '@/config/features';
import { requireOwner } from '@/server/auth/access';
import { getDb } from '@/server/db/client';
import { lockBusinessSchedule } from '@/server/db/locks';
import {
  businessPages, businessSettings, businesses, locations, professionalLocations,
  professionalServices, professionals, schedules, services, weeklyIntervals,
} from '@/server/db/schema';
import { formBoolean, formString } from '@/server/business/form-data';
import { fieldErrors, pageInputSchema, settingsInputSchema } from '@/server/business/validation';
import type { PanelActionState } from '../action-state';

export async function saveSettingsAction(_previous: PanelActionState, formData: FormData): Promise<PanelActionState> {
  const { membership } = await requireOwner();
  const businessId = membership.businessId;

  const parsed = settingsInputSchema.safeParse({
    slotIntervalMinutes: formString(formData, 'slotIntervalMinutes'),
    bufferAfterMinutes: formString(formData, 'bufferAfterMinutes'),
    minBookingNoticeMinutes: formString(formData, 'minBookingNoticeMinutes'),
    bookingHorizonDays: formString(formData, 'bookingHorizonDays'),
    cancellationNoticeMinutes: formString(formData, 'cancellationNoticeMinutes'),
    allowAnyProfessional: formBoolean(formData, 'allowAnyProfessional'),
  });
  if (!parsed.success) {
    return { error: 'Revisá los campos marcados para guardar las reglas.', fieldErrors: fieldErrors(parsed.error) };
  }

  const version = Number(formString(formData, 'version'));
  if (!Number.isInteger(version) || version < 1) return { error: 'Recargá la página e intentá de nuevo.' };

  const db = getDb();
  const updated = await db.update(businessSettings).set({
    ...parsed.data,
    version: version + 1,
    updatedAt: new Date(),
  }).where(and(eq(businessSettings.businessId, businessId), eq(businessSettings.version, version)))
    .returning({ version: businessSettings.version });

  if (!updated.length) return { error: 'Las reglas cambiaron en otra pestaña. Recargá la página y volvé a intentar.' };

  revalidatePath('/dashboard/configuracion');
  revalidatePath('/dashboard');
  redirect(`/dashboard/configuracion?guardado=1&v=${Date.now()}`);
}

export async function savePublicPageAction(_previous: PanelActionState, formData: FormData): Promise<PanelActionState> {
  const { membership } = await requireOwner();
  if (!PAGE_EDITOR_ENABLED) return { error: 'La edición de la página pública no está disponible en esta versión.' };

  const businessId = membership.businessId;

  const parsed = pageInputSchema.safeParse({
    headline: formString(formData, 'headline'),
    description: formString(formData, 'description'),
    contactEmail: formString(formData, 'contactEmail'),
    instagram: formString(formData, 'instagram'),
    facebook: formString(formData, 'facebook'),
    whatsapp: formString(formData, 'whatsapp'),
    website: formString(formData, 'website'),
  });
  if (!parsed.success) {
    return { error: 'Revisá los campos marcados para guardar la página.', fieldErrors: fieldErrors(parsed.error) };
  }

  const version = Number(formString(formData, 'version'));
  if (!Number.isInteger(version) || version < 1) return { error: 'Recargá la página e intentá de nuevo.' };

  const socialLinks = Object.fromEntries(
    Object.entries({
      instagram: parsed.data.instagram,
      facebook: parsed.data.facebook,
      whatsapp: parsed.data.whatsapp,
      website: parsed.data.website,
    }).filter(([, value]) => value !== ''),
  );

  const db = getDb();
  const updated = await db.update(businessPages).set({
    headline: parsed.data.headline || null,
    description: parsed.data.description || null,
    contactEmail: parsed.data.contactEmail || null,
    socialLinks,
    version: version + 1,
    updatedAt: new Date(),
  }).where(and(eq(businessPages.businessId, businessId), eq(businessPages.version, version)))
    .returning({ version: businessPages.version });

  if (!updated.length) return { error: 'La página cambió en otra pestaña. Recargá y volvé a intentar.' };

  const [business] = await db.select({ slug: businesses.slug }).from(businesses)
    .where(eq(businesses.id, businessId)).limit(1);
  revalidatePath('/dashboard/pagina-publica');
  revalidatePath('/dashboard');
  if (business) revalidatePath(`/${business.slug}`);
  redirect(`/dashboard/pagina-publica?guardado=1&v=${Date.now()}`);
}

export async function togglePublicBookingAction(formData: FormData): Promise<void> {
  const { membership } = await requireOwner();
  const enable = formString(formData, 'enable') === 'true';
  const db = getDb();

  if (enable) {
    const [business] = await db.select({ status: businesses.status }).from(businesses)
      .where(eq(businesses.id, membership.businessId)).limit(1);
    if (business?.status !== 'active') redirect('/dashboard/configuracion?publico=business-inactive');

    const [locationRows, serviceRows, professionalRows, locationSchedules, intervalRows, settingsRows] = await Promise.all([
      db.select({ id: locations.id }).from(locations)
        .where(and(eq(locations.businessId, membership.businessId), eq(locations.isActive, true))),
      db.select({ id: services.id, duration: services.durationMinutes }).from(services)
        .where(and(eq(services.businessId, membership.businessId), eq(services.isActive, true))),
      db.select({ id: professionals.id, locationId: professionalLocations.locationId, serviceId: professionalServices.serviceId })
        .from(professionals)
        .innerJoin(professionalLocations, and(
          eq(professionalLocations.businessId, professionals.businessId),
          eq(professionalLocations.professionalId, professionals.id), eq(professionalLocations.isActive, true),
        ))
        .innerJoin(professionalServices, and(
          eq(professionalServices.businessId, professionals.businessId),
          eq(professionalServices.professionalId, professionals.id), eq(professionalServices.isActive, true),
        ))
        .where(and(eq(professionals.businessId, membership.businessId), eq(professionals.isActive, true))),
      db.select({ id: schedules.id, locationId: schedules.locationId })
        .from(schedules).where(and(eq(schedules.businessId, membership.businessId), isNull(schedules.professionalId))),
      db.select({ scheduleId: weeklyIntervals.scheduleId, weekday: weeklyIntervals.weekday,
        startMinute: weeklyIntervals.startMinute, endMinute: weeklyIntervals.endMinute }).from(weeklyIntervals)
        .where(eq(weeklyIntervals.businessId, membership.businessId)),
      db.select({ buffer: businessSettings.bufferAfterMinutes, notice: businessSettings.minBookingNoticeMinutes,
        horizon: businessSettings.bookingHorizonDays }).from(businessSettings)
        .where(eq(businessSettings.businessId, membership.businessId)).limit(1),
    ]);
    const professionalSchedules = locationRows.length ? await db.select({
      id: schedules.id, locationId: schedules.locationId, professionalId: schedules.professionalId,
    }).from(schedules).where(and(
      eq(schedules.businessId, membership.businessId), inArray(schedules.locationId, locationRows.map(location => location.id)),
      isNotNull(schedules.professionalId),
    )) : [];
    const weeklyBySchedule = new Map<string, typeof intervalRows>();
    for (const interval of intervalRows) weeklyBySchedule.set(interval.scheduleId, [...(weeklyBySchedule.get(interval.scheduleId) ?? []), interval]);
    const settings = settingsRows[0];
    const canFit = (locationId: string, professionalId: string, serviceDuration: number) => {
      const locationSchedule = locationSchedules.find(schedule => schedule.locationId === locationId);
      if (!locationSchedule) return false;
      const locationIntervalsForSchedule = weeklyBySchedule.get(locationSchedule.id) ?? [];
      const personalSchedule = professionalSchedules.find(schedule => schedule.locationId === locationId && schedule.professionalId === professionalId);
      const professionalIntervalsForSchedule = personalSchedule
        ? weeklyBySchedule.get(personalSchedule.id) ?? []
        : locationIntervalsForSchedule;
      return locationIntervalsForSchedule.some(locationInterval => professionalIntervalsForSchedule.some(personalInterval =>
        personalInterval.weekday === locationInterval.weekday
        && Math.min(locationInterval.endMinute, personalInterval.endMinute)
          - Math.max(locationInterval.startMinute, personalInterval.startMinute) >= serviceDuration + (settings?.buffer ?? 0)));
    };
    const hasReservableCombination = Boolean(settings && settings.notice <= settings.horizon * 1440)
      && locationRows.some(location => serviceRows.some(service => professionalRows.some(person =>
        person.locationId === location.id && person.serviceId === service.id
        && canFit(location.id, person.id, service.duration))));
    if (!hasReservableCombination) redirect('/dashboard/configuracion?publico=not-ready');
  }

  const [business] = await db.select({ slug: businesses.slug }).from(businesses)
    .where(eq(businesses.id, membership.businessId)).limit(1);
  await db.transaction(async tx => {
    await lockBusinessSchedule(tx, membership.businessId);
    const [currentBusiness] = await tx.select({ status: businesses.status }).from(businesses)
      .where(eq(businesses.id, membership.businessId)).limit(1);
    if (enable && currentBusiness?.status !== 'active') redirect('/dashboard/configuracion?publico=business-inactive');
    await tx.update(businessSettings).set({ publicBookingEnabled: enable, updatedAt: new Date() })
      .where(eq(businessSettings.businessId, membership.businessId));
  });
  revalidatePath('/dashboard/configuracion');
  if (business) revalidatePath(`/${business.slug}`);
  redirect(`/dashboard/configuracion?publico=${enable ? 'enabled' : 'disabled'}`);
}
