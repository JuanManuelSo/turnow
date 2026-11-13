import 'server-only';
import { sql, type SQLWrapper } from 'drizzle-orm';

type TransactionExecutor = {
  execute(query: SQLWrapper): PromiseLike<unknown>;
};

/**
 * Serializa las escrituras de agenda de un negocio.
 * Debe ejecutarse dentro de la misma transacción que lee reglas y escribe.
 * El bloqueo se libera automáticamente al confirmar o revertir.
 */
export async function lockBusinessSchedule(
  tx: TransactionExecutor,
  businessId: string,
): Promise<void> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`turnow:schedule:${businessId}`}, 0))`,
  );
}
