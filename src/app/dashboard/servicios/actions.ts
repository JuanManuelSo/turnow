'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, sql } from 'drizzle-orm';
import { requireOwner } from '@/server/auth/access';
import { getDb } from '@/server/db/client';
import { services } from '@/server/db/schema';
import { formBoolean, formString } from '@/server/business/form-data';
import { fieldErrors, priceToMinor, serviceInputSchema } from '@/server/business/validation';
import type { PanelActionState } from '../action-state';

export async function saveServiceAction(_previous: PanelActionState, formData: FormData): Promise<PanelActionState> {
  const { membership } = await requireOwner();
  const businessId = membership.businessId;
  const id = formString(formData, 'id');

  const parsed = serviceInputSchema.safeParse({
    name: formString(formData, 'name'),
    description: formString(formData, 'description'),
    durationMinutes: formString(formData, 'durationMinutes'),
    price: formString(formData, 'price'),
    showPrice: formBoolean(formData, 'showPrice'),
    isActive: formBoolean(formData, 'isActive'),
  });
  if (!parsed.success) {
    return { error: 'Revisá los campos marcados para guardar el servicio.', fieldErrors: fieldErrors(parsed.error) };
  }
  if (parsed.data.showPrice && !parsed.data.price) {
    return { error: 'Ingresá un precio o desmarcá “Mostrar el precio”.', fieldErrors: { price: 'Ingresá un precio para mostrarlo.' } };
  }

  const db = getDb();
  let savedId = id;
  try {
    if (id) {
      const updated = await db.update(services).set({
        name: parsed.data.name,
        description: parsed.data.description || null,
        durationMinutes: parsed.data.durationMinutes,
        priceMinor: priceToMinor(parsed.data.price),
        showPrice: parsed.data.showPrice,
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
      }).where(and(eq(services.businessId, businessId), eq(services.id, id))).returning({ id: services.id });
      if (!updated.length) return { error: 'Ese servicio ya no existe.' };
    } else {
      const [order] = await db.select({ value: sql<number>`coalesce(max(${services.sortOrder}), 0)::int` })
        .from(services).where(eq(services.businessId, businessId));
      const [created] = await db.insert(services).values({
        businessId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        durationMinutes: parsed.data.durationMinutes,
        priceMinor: priceToMinor(parsed.data.price),
        showPrice: parsed.data.showPrice,
        isActive: parsed.data.isActive,
        sortOrder: order.value + 10,
      }).returning({ id: services.id });
      savedId = created.id;
    }
  } catch {
    return { error: 'No pudimos guardar el servicio. Intentá de nuevo.' };
  }

  revalidatePath('/dashboard/servicios');
  revalidatePath('/dashboard/profesionales');
  revalidatePath('/dashboard');
  redirect(`/dashboard/servicios?editar=${savedId}&guardado=1&v=${Date.now()}`);
}
