'use server';

import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/server/auth/access';
import { getDb } from '@/server/db/client';
import { appointments } from '@/server/db/schema';

export type CancelledActionState = { error?: string; success?: string };

const appointmentIdSchema = z.uuid();

export async function archiveCancelledAppointment(
  _previous: CancelledActionState,
  formData: FormData,
): Promise<CancelledActionState> {
  const access = await requireSession();
  if (access.membership.role !== 'owner') return { error: 'Solo la persona dueña puede archivar cancelaciones.' };
  const parsedId = appointmentIdSchema.safeParse(formData.get('appointmentId'));
  if (!parsedId.success) return { error: 'No pudimos identificar ese turno.' };

  const updated = await getDb().update(appointments).set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(appointments.businessId, access.membership.businessId),
      eq(appointments.id, parsedId.data),
      eq(appointments.status, 'cancelled'),
      isNull(appointments.archivedAt),
      ...(access.membership.locationId ? [eq(appointments.locationId, access.membership.locationId)] : []),
    )).returning({ id: appointments.id });
  if (!updated.length) return { error: 'Ese turno ya no está disponible para archivar.' };
  revalidatePath('/dashboard/cancelados');
  return { success: 'Cancelación archivada. El historial se conserva.' };
}

export async function archiveOldCancelledAppointments(
  _previous: CancelledActionState,
  _formData: FormData,
): Promise<CancelledActionState> {
  void _previous;
  void _formData;
  const access = await requireSession();
  if (access.membership.role !== 'owner') return { error: 'Solo la persona dueña puede archivar cancelaciones.' };

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const updated = await getDb().update(appointments).set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(appointments.businessId, access.membership.businessId),
      eq(appointments.status, 'cancelled'),
      isNull(appointments.archivedAt),
      lt(appointments.cancelledAt, cutoff),
      ...(access.membership.locationId ? [eq(appointments.locationId, access.membership.locationId)] : []),
    )).returning({ id: appointments.id });
  revalidatePath('/dashboard/cancelados');
  return { success: updated.length
    ? `${updated.length} ${updated.length === 1 ? 'cancelación archivada' : 'cancelaciones archivadas'}. El historial se conserva.`
    : 'No hay cancelaciones con más de 90 días para archivar.' };
}

export async function restoreCancelledAppointment(
  _previous: CancelledActionState,
  formData: FormData,
): Promise<CancelledActionState> {
  const access = await requireSession();
  if (access.membership.role !== 'owner') return { error: 'Solo la persona dueña puede restaurar cancelaciones.' };
  const parsedId = appointmentIdSchema.safeParse(formData.get('appointmentId'));
  if (!parsedId.success) return { error: 'No pudimos identificar ese turno.' };

  const updated = await getDb().update(appointments).set({ archivedAt: null, updatedAt: new Date() })
    .where(and(
      eq(appointments.businessId, access.membership.businessId),
      eq(appointments.id, parsedId.data),
      eq(appointments.status, 'cancelled'),
      isNotNull(appointments.archivedAt),
      ...(access.membership.locationId ? [eq(appointments.locationId, access.membership.locationId)] : []),
    )).returning({ id: appointments.id, archivedAt: appointments.archivedAt });
  if (!updated.length) return { error: 'Ese turno ya no está archivado.' };
  revalidatePath('/dashboard/cancelados');
  return { success: 'Cancelación restaurada a la lista activa.' };
}
