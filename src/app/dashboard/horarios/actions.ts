'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, isNull } from 'drizzle-orm';
import { requireOwner } from '@/server/auth/access';
import { getDb } from '@/server/db/client';
import { locations, professionalLocations, professionals, schedules, weeklyIntervals } from '@/server/db/schema';
import { formString } from '@/server/business/form-data';
import { schedulePayloadSchema } from '@/server/business/validation';
import type { PanelActionState } from '../action-state';

export async function saveScheduleAction(_previous: PanelActionState, formData: FormData): Promise<PanelActionState> {
  const { membership } = await requireOwner();
  const businessId = membership.businessId;
  const locationId = formString(formData, 'locationId');
  const professionalId = formString(formData, 'professionalId') || null;

  let intervals: unknown;
  try {
    intervals = JSON.parse(formString(formData, 'payload') || '[]');
  } catch {
    return { error: 'No pudimos leer los tramos del horario. Recargá la página e intentá de nuevo.' };
  }

  const parsed = schedulePayloadSchema.safeParse({ locationId, professionalId, intervals });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revisá los tramos del horario.' };
  }

  const db = getDb();
  const [location] = await db.select({ id: locations.id }).from(locations)
    .where(and(eq(locations.businessId, businessId), eq(locations.id, locationId))).limit(1);
  if (!location) return { error: 'La sede elegida no pertenece al negocio.' };

  if (professionalId) {
    const [assignment] = await db.select({ id: professionals.id })
      .from(professionals)
      .innerJoin(professionalLocations, and(
        eq(professionalLocations.businessId, professionals.businessId),
        eq(professionalLocations.professionalId, professionals.id),
      ))
      .where(and(
        eq(professionals.businessId, businessId),
        eq(professionals.id, professionalId),
        eq(professionalLocations.locationId, locationId),
        eq(professionalLocations.isActive, true),
      ))
      .limit(1);
    if (!assignment) return { error: 'Ese profesional no está asignado a la sede elegida.' };
  }

  try {
    await db.transaction(async (tx) => {
      const scheduleWhere = professionalId
        ? and(eq(schedules.businessId, businessId), eq(schedules.locationId, locationId), eq(schedules.professionalId, professionalId))
        : and(eq(schedules.businessId, businessId), eq(schedules.locationId, locationId), isNull(schedules.professionalId));

      let [schedule] = await tx.select({ id: schedules.id }).from(schedules).where(scheduleWhere).limit(1);
      if (!schedule) {
        const [created] = await tx.insert(schedules).values({ businessId, locationId, professionalId })
          .returning({ id: schedules.id });
        schedule = created;
      }

      await tx.delete(weeklyIntervals)
        .where(and(eq(weeklyIntervals.businessId, businessId), eq(weeklyIntervals.scheduleId, schedule.id)));

      if (parsed.data.intervals.length) {
        await tx.insert(weeklyIntervals).values(parsed.data.intervals.map(interval => ({
          businessId,
          scheduleId: schedule.id,
          weekday: interval.weekday,
          startMinute: interval.startMinute,
          endMinute: interval.endMinute,
        })));
      }

      await tx.update(schedules).set({ updatedAt: new Date() }).where(eq(schedules.id, schedule.id));
    });
  } catch {
    return { error: 'No pudimos guardar el horario. Intentá de nuevo.' };
  }

  revalidatePath('/dashboard/horarios');
  revalidatePath('/dashboard');
  redirect(`/dashboard/horarios?sede=${locationId}&ambito=${professionalId ?? 'sede'}&guardado=1&v=${Date.now()}`);
}
