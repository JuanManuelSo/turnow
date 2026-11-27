'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { requireOwner } from '@/server/auth/access';
import { getDb } from '@/server/db/client';
import { locations, professionalLocations, professionalServices, professionals, services } from '@/server/db/schema';
import { formBoolean, formList, formString } from '@/server/business/form-data';
import { fieldErrors, professionalInputSchema } from '@/server/business/validation';
import type { PanelActionState } from '../action-state';

export async function saveProfessionalAction(_previous: PanelActionState, formData: FormData): Promise<PanelActionState> {
  const { membership } = await requireOwner();
  const businessId = membership.businessId;
  const id = formString(formData, 'id');

  const parsed = professionalInputSchema.safeParse({
    displayName: formString(formData, 'displayName'),
    description: formString(formData, 'description'),
    isActive: formBoolean(formData, 'isActive'),
    locationIds: [...new Set(formList(formData, 'locationIds'))],
    serviceIds: [...new Set(formList(formData, 'serviceIds'))],
  });
  if (!parsed.success) {
    return { error: 'Revisá los campos marcados para guardar el profesional.', fieldErrors: fieldErrors(parsed.error) };
  }

  const db = getDb();
  if (parsed.data.locationIds.length) {
    const rows = await db.select({ id: locations.id }).from(locations)
      .where(and(eq(locations.businessId, businessId), inArray(locations.id, parsed.data.locationIds)));
    if (rows.length !== parsed.data.locationIds.length) return { error: 'Una de las sedes elegidas no pertenece al negocio.' };
  }
  if (parsed.data.serviceIds.length) {
    const rows = await db.select({ id: services.id }).from(services)
      .where(and(eq(services.businessId, businessId), inArray(services.id, parsed.data.serviceIds)));
    if (rows.length !== parsed.data.serviceIds.length) return { error: 'Uno de los servicios elegidos no pertenece al negocio.' };
  }

  const existing = id
    ? await db.select({ id: professionals.id }).from(professionals)
      .where(and(eq(professionals.businessId, businessId), eq(professionals.id, id))).limit(1)
    : [];
  if (id && !existing.length) return { error: 'Ese profesional ya no existe.' };

  let savedId = id;
  try {
    await db.transaction(async (tx) => {
      if (id) {
        await tx.update(professionals).set({
          displayName: parsed.data.displayName,
          description: parsed.data.description || null,
          isActive: parsed.data.isActive,
          updatedAt: new Date(),
        }).where(and(eq(professionals.businessId, businessId), eq(professionals.id, id)));
      } else {
        const [order] = await tx.select({ value: sql<number>`coalesce(max(${professionals.sortOrder}), 0)::int` })
          .from(professionals).where(eq(professionals.businessId, businessId));
        const [created] = await tx.insert(professionals).values({
          businessId,
          displayName: parsed.data.displayName,
          description: parsed.data.description || null,
          isActive: parsed.data.isActive,
          sortOrder: order.value + 10,
        }).returning({ id: professionals.id });
        savedId = created.id;
      }

      const locationRows = await tx.select({ id: locations.id }).from(locations)
        .where(eq(locations.businessId, businessId));
      for (const location of locationRows) {
        if (parsed.data.locationIds.includes(location.id)) {
          await tx.insert(professionalLocations).values({
            businessId,
            locationId: location.id,
            professionalId: savedId,
            isActive: true,
          }).onConflictDoUpdate({
            target: [professionalLocations.businessId, professionalLocations.locationId, professionalLocations.professionalId],
            set: { isActive: true, updatedAt: new Date() },
          });
        } else {
          await tx.update(professionalLocations).set({ isActive: false, updatedAt: new Date() })
            .where(and(
              eq(professionalLocations.businessId, businessId),
              eq(professionalLocations.professionalId, savedId),
              eq(professionalLocations.locationId, location.id),
            ));
        }
      }

      const serviceRows = await tx.select({ id: services.id }).from(services)
        .where(eq(services.businessId, businessId));
      for (const service of serviceRows) {
        if (parsed.data.serviceIds.includes(service.id)) {
          await tx.insert(professionalServices).values({
            businessId,
            professionalId: savedId,
            serviceId: service.id,
            isActive: true,
          }).onConflictDoUpdate({
            target: [professionalServices.businessId, professionalServices.professionalId, professionalServices.serviceId],
            set: { isActive: true, updatedAt: new Date() },
          });
        } else {
          await tx.update(professionalServices).set({ isActive: false, updatedAt: new Date() })
            .where(and(
              eq(professionalServices.businessId, businessId),
              eq(professionalServices.professionalId, savedId),
              eq(professionalServices.serviceId, service.id),
            ));
        }
      }
    });
  } catch {
    return { error: 'No pudimos guardar el profesional. Intentá de nuevo.' };
  }

  revalidatePath('/dashboard/profesionales');
  revalidatePath('/dashboard/horarios');
  revalidatePath('/dashboard');
  revalidatePath(`/${membership.businessSlug}`);
  redirect(`/dashboard/profesionales?editar=${savedId}&guardado=1&v=${Date.now()}`);
}
