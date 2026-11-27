'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, ne } from 'drizzle-orm';
import { requireOwner } from '@/server/auth/access';
import { getDb } from '@/server/db/client';
import { locations } from '@/server/db/schema';
import { getBusinessShell } from '@/server/business/queries';
import { formBoolean, formString } from '@/server/business/form-data';
import { fieldErrors, isUniqueViolation, locationInputSchema } from '@/server/business/validation';
import type { PanelActionState } from '../action-state';

export async function saveLocationAction(_previous: PanelActionState, formData: FormData): Promise<PanelActionState> {
  const { membership } = await requireOwner();
  const businessId = membership.businessId;
  const id = formString(formData, 'id');

  const parsed = locationInputSchema.safeParse({
    name: formString(formData, 'name'),
    slug: formString(formData, 'slug').toLowerCase(),
    addressText: formString(formData, 'addressText'),
    mapUrl: formString(formData, 'mapUrl'),
    contactPhone: formString(formData, 'contactPhone'),
    arrivalInstructions: formString(formData, 'arrivalInstructions'),
    isActive: formBoolean(formData, 'isActive'),
  });
  if (!parsed.success) {
    return { error: 'Revisá los campos marcados para guardar la sede.', fieldErrors: fieldErrors(parsed.error) };
  }

  const db = getDb();
  const business = await getBusinessShell(businessId);
  if (!business) return { error: 'No encontramos el negocio de esta cuenta.' };

  if (id) {
    const [target] = await db.select({ id: locations.id, isPrimary: locations.isPrimary })
      .from(locations)
      .where(and(eq(locations.businessId, businessId), eq(locations.id, id)))
      .limit(1);
    if (!target) return { error: 'Esa sede ya no existe.' };
    if (!parsed.data.isActive) {
      if (target.isPrimary) return { error: 'La sede principal no se puede desactivar. Elegí otra sede como principal primero.' };
      const others = await db.select({ id: locations.id })
        .from(locations)
        .where(and(eq(locations.businessId, businessId), eq(locations.isActive, true), ne(locations.id, id)));
      if (!others.length) return { error: 'Tiene que quedar al menos una sede activa.' };
    }
  }

  let savedId = id;
  try {
    if (id) {
      await db.update(locations).set({
        name: parsed.data.name,
        slug: parsed.data.slug,
        addressText: parsed.data.addressText || null,
        mapUrl: parsed.data.mapUrl || null,
        contactPhone: parsed.data.contactPhone || null,
        arrivalInstructions: parsed.data.arrivalInstructions || null,
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
      }).where(and(eq(locations.businessId, businessId), eq(locations.id, id)));
    } else {
      const [created] = await db.insert(locations).values({
        businessId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        addressText: parsed.data.addressText || null,
        mapUrl: parsed.data.mapUrl || null,
        contactPhone: parsed.data.contactPhone || null,
        arrivalInstructions: parsed.data.arrivalInstructions || null,
        timezone: business.timezone,
        isPrimary: false,
        isActive: parsed.data.isActive,
      }).returning({ id: locations.id });
      savedId = created.id;
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: 'Ya existe una sede con ese slug en este negocio.', fieldErrors: { slug: 'Elegí otro slug.' } };
    }
    return { error: 'No pudimos guardar la sede. Intentá de nuevo.' };
  }

  revalidatePath('/dashboard/sedes');
  revalidatePath('/dashboard');
  revalidatePath(`/${membership.businessSlug}`);
  redirect(`/dashboard/sedes?editar=${savedId}&guardado=1&v=${Date.now()}`);
}

export async function setPrimaryLocationAction(formData: FormData) {
  const { membership } = await requireOwner();
  const businessId = membership.businessId;
  const id = formString(formData, 'id');
  if (!id) redirect('/dashboard/sedes?error=sede');

  const db = getDb();
  const [target] = await db.select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.businessId, businessId), eq(locations.id, id)))
    .limit(1);
  if (!target) redirect('/dashboard/sedes?error=sede');

  await db.transaction(async (tx) => {
    await tx.update(locations).set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(locations.businessId, businessId));
    await tx.update(locations).set({ isPrimary: true, isActive: true, updatedAt: new Date() })
      .where(and(eq(locations.businessId, businessId), eq(locations.id, id)));
  });

  revalidatePath('/dashboard/sedes');
  revalidatePath('/dashboard');
  revalidatePath(`/${membership.businessSlug}`);
  redirect(`/dashboard/sedes?principal=${id}`);
}
