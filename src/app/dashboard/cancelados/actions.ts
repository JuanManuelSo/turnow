'use server';

import { and, eq, inArray, isNotNull, isNull, notExists, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/server/auth/access';
import { getDb } from '@/server/db/client';
import { cancelAppointmentEmailNotifications, processAppointmentEmailNotifications } from '@/server/email/notifications';
import {
  appointmentEmailNotifications, appointmentPayments, appointments,
} from '@/server/db/schema';

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

export async function archiveAllCancelledAppointments(
  _previous: CancelledActionState,
  _formData: FormData,
): Promise<CancelledActionState> {
  void _previous;
  void _formData;
  const access = await requireSession();
  if (access.membership.role !== 'owner') return { error: 'Solo la persona dueña puede archivar cancelaciones.' };

  const updated = await getDb().update(appointments).set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(appointments.businessId, access.membership.businessId),
      eq(appointments.status, 'cancelled'),
      isNull(appointments.archivedAt),
      ...(access.membership.locationId ? [eq(appointments.locationId, access.membership.locationId)] : []),
    )).returning({ id: appointments.id });
  revalidatePath('/dashboard/cancelados');
  return { success: updated.length
    ? `${updated.length} ${updated.length === 1 ? 'cancelación archivada' : 'cancelaciones archivadas'}. El historial se conserva.`
    : 'No hay cancelaciones pendientes de archivar.' };
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

export async function purgeArchivedCancelledAppointments(
  _previous: CancelledActionState,
  _formData: FormData,
): Promise<CancelledActionState> {
  void _previous;
  void _formData;
  const access = await requireSession();
  if (access.membership.role !== 'owner') return { error: 'Solo la persona dueña puede eliminar cancelaciones.' };

  const db = getDb();
  const result = await db.transaction(async tx => {
    const eligible = and(
      eq(appointments.businessId, access.membership.businessId),
      eq(appointments.status, 'cancelled'),
      isNotNull(appointments.archivedAt),
      notExists(tx.select({ id: appointmentPayments.id }).from(appointmentPayments).where(and(
        eq(appointmentPayments.businessId, appointments.businessId),
        eq(appointmentPayments.appointmentId, appointments.id),
      ))),
      notExists(tx.select({ id: appointmentEmailNotifications.id }).from(appointmentEmailNotifications).where(and(
        eq(appointmentEmailNotifications.businessId, appointments.businessId),
        eq(appointmentEmailNotifications.appointmentId, appointments.id),
        inArray(appointmentEmailNotifications.status, ['pending', 'scheduled', 'cancel_pending']),
      ))),
    );
    const targets = await tx.select({ id: appointments.id }).from(appointments)
      .where(eligible).orderBy(appointments.cancelledAt).limit(500);
    const ids = targets.map(row => row.id);
    if (!ids.length) return { deleted: 0, remaining: 0 };

    const uuidArray = sql`ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}]::uuid[]`;
    const purgeResult = await tx.execute(sql`select app.purge_archived_cancelled_appointments(${access.membership.businessId}, ${uuidArray}) as deleted`);
    const deletedCount = Number((purgeResult as unknown as Array<{ deleted: number }>)[0]?.deleted ?? 0);
    const remainingRows = await tx.select({ id: appointments.id }).from(appointments)
      .where(eligible).limit(1);
    return { deleted: deletedCount, remaining: remainingRows.length > 0 ? 1 : 0 };
  });

  revalidatePath('/dashboard/cancelados');
  if (!result.deleted) return { success: 'No hay turnos archivados aptos para eliminar. Los que tienen pagos o emails activos se conservan.' };
  return { success: result.remaining
    ? `Se eliminaron ${result.deleted} turnos. Quedan más registros aptos; volvé a ejecutar la limpieza para continuar.`
    : `Se eliminaron definitivamente ${result.deleted} ${result.deleted === 1 ? 'turno archivado' : 'turnos archivados'}.` };
}

export async function permanentlyDeleteCancelledAppointment(appointmentId: string) {
  const access = await requireSession();
  if (access.membership.role !== 'owner') return { error: 'Solo la persona dueña puede eliminar cancelaciones.' };
  const parsedId = appointmentIdSchema.safeParse(appointmentId);
  if (!parsedId.success) return { error: 'No pudimos identificar ese turno.' };

  try {
    const db = getDb();
    const [target] = await db.select({ id: appointments.id }).from(appointments).where(and(
      eq(appointments.businessId, access.membership.businessId),
      eq(appointments.id, parsedId.data),
      eq(appointments.status, 'cancelled'),
      isNotNull(appointments.archivedAt),
    )).limit(1);
    if (!target) return { error: 'El turno debe estar cancelado y archivado en tu negocio antes de eliminarlo.' };

    await cancelAppointmentEmailNotifications(parsedId.data);
    await processAppointmentEmailNotifications(parsedId.data);
    await db.transaction(async tx => {
      const [appointment] = await tx.select({ id: appointments.id }).from(appointments).where(and(
        eq(appointments.businessId, access.membership.businessId),
        eq(appointments.id, parsedId.data),
        eq(appointments.status, 'cancelled'),
        isNotNull(appointments.archivedAt),
      )).limit(1);
      if (!appointment) throw new Error('El turno debe estar cancelado y archivado antes de eliminarlo.');

      const [payment] = await tx.select({ id: appointmentPayments.id }).from(appointmentPayments).where(and(
        eq(appointmentPayments.businessId, access.membership.businessId),
        eq(appointmentPayments.appointmentId, appointment.id),
      )).limit(1);
      if (payment) throw new Error('No se puede eliminar: el turno tiene pagos asociados. Se conserva para proteger el historial financiero.');

      const [activeEmail] = await tx.select({ id: appointmentEmailNotifications.id }).from(appointmentEmailNotifications).where(and(
        eq(appointmentEmailNotifications.businessId, access.membership.businessId),
        eq(appointmentEmailNotifications.appointmentId, appointment.id),
        inArray(appointmentEmailNotifications.status, ['pending', 'scheduled', 'cancel_pending']),
      )).limit(1);
      if (activeEmail) throw new Error('No se puede eliminar todavía: hay un email pendiente de cancelar o procesar.');

      const purgeResult = await tx.execute(sql`select app.purge_archived_cancelled_appointments(${access.membership.businessId}, ARRAY[${appointment.id}::uuid]::uuid[]) as deleted`);
      const deletedCount = Number((purgeResult as unknown as Array<{ deleted: number }>)[0]?.deleted ?? 0);
      if (deletedCount !== 1) throw new Error('No se pudo eliminar el turno. Puede tener pagos o notificaciones pendientes.');
    });
    revalidatePath('/dashboard/cancelados');
    return { success: 'Turno eliminado definitivamente.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'No se pudo eliminar el turno cancelado.' };
  }
}
