import 'server-only';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { publicRateLimits } from '@/server/db/schema';
import { hashRateLimitIdentifier } from './booking-security';

export async function consumePublicAttempt(input: {
  businessId: string;
  scope: 'booking' | 'lookup' | 'cancel';
  identifier: string;
  limit: number;
  windowMinutes: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const windowStart = new Date(now);
  windowStart.setUTCSeconds(0, 0);
  windowStart.setUTCMinutes(Math.floor(windowStart.getUTCMinutes() / input.windowMinutes) * input.windowMinutes);
  const rangeStart = new Date(now.getTime() - input.windowMinutes * 60_000);
  const identifierHash = hashRateLimitIdentifier(input.identifier);
  const db = getDb();

  return db.transaction(async tx => {
    await tx.insert(publicRateLimits).values({
      businessId: input.businessId,
      scope: input.scope,
      identifierHash,
      windowStart,
      attempts: 1,
    }).onConflictDoUpdate({
      target: [publicRateLimits.businessId, publicRateLimits.scope, publicRateLimits.identifierHash, publicRateLimits.windowStart],
      set: { attempts: sql`${publicRateLimits.attempts} + 1` },
    });

    const [result] = await tx.select({ attempts: sql<number>`coalesce(sum(${publicRateLimits.attempts}), 0)::int` })
      .from(publicRateLimits)
      .where(and(
        eq(publicRateLimits.businessId, input.businessId),
        eq(publicRateLimits.scope, input.scope),
        eq(publicRateLimits.identifierHash, identifierHash),
        gte(publicRateLimits.windowStart, rangeStart),
        lt(publicRateLimits.windowStart, new Date(windowStart.getTime() + input.windowMinutes * 60_000)),
      ));

    // Opportunistic retention: only this business is touched; no IP or plaintext code is stored.
    await tx.delete(publicRateLimits).where(and(
      eq(publicRateLimits.businessId, input.businessId),
      lt(publicRateLimits.windowStart, new Date(now.getTime() - 48 * 60 * 60_000)),
    ));
    return result.attempts <= input.limit;
  });
}
