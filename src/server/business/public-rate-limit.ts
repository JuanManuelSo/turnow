import 'server-only';
import { sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { hashRateLimitIdentifier } from './booking-security';

function windows(now: Date, windowMinutes: number) {
  const windowStart = new Date(now);
  windowStart.setUTCSeconds(0, 0);
  windowStart.setUTCMinutes(Math.floor(windowStart.getUTCMinutes() / windowMinutes) * windowMinutes);
  return {
    windowStart,
    rangeStart: new Date(now.getTime() - windowMinutes * 60_000),
    windowEnd: new Date(windowStart.getTime() + windowMinutes * 60_000),
    retentionStart: new Date(now.getTime() - 48 * 60 * 60_000),
  };
}

export async function consumePublicAttempt(input: {
  businessId: string;
  scope: 'booking' | 'lookup' | 'cancel';
  identifier: string;
  limit: number;
  windowMinutes: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const { windowStart, rangeStart, windowEnd, retentionStart } = windows(now, input.windowMinutes);
  const identifierHash = hashRateLimitIdentifier(input.identifier);

  // One statement instead of a transaction: prior windows + the increment for
  // the current window are combined in the database, so a lookup costs a
  // single round trip. The cleanup is opportunistic and only touches this
  // business; no IP or plaintext code is stored.
  //
  // Timestamps travel as ISO strings with explicit casts. postgres.js cannot
  // infer the wire type of a bare Date inside a raw parameter list and fails
  // before the query reaches Postgres.
  const rows = await getDb().execute(sql`
    with prior as (
      select coalesce(sum(attempts), 0)::int as attempts
      from app.public_rate_limits
      where business_id = ${input.businessId}
        and scope = ${input.scope}
        and identifier_hash = ${identifierHash}
        and window_start >= ${rangeStart.toISOString()}::timestamptz
        and window_start < ${windowEnd.toISOString()}::timestamptz
        and window_start <> ${windowStart.toISOString()}::timestamptz
    ),
    upsert as (
      insert into app.public_rate_limits as limits
        (business_id, scope, identifier_hash, window_start, attempts)
      values (
        ${input.businessId}, ${input.scope}, ${identifierHash},
        ${windowStart.toISOString()}::timestamptz, 1
      )
      on conflict (business_id, scope, identifier_hash, window_start)
      do update set attempts = limits.attempts + 1
      returning attempts
    ),
    cleanup as (
      delete from app.public_rate_limits
      where business_id = ${input.businessId}
        and window_start < ${retentionStart.toISOString()}::timestamptz
      returning 1
    )
    select (select attempts from prior) + (select attempts from upsert) as attempts
  `);

  const attempts = Number((rows[0] as { attempts?: number | string } | undefined)?.attempts ?? 0);
  return attempts > 0 && attempts <= input.limit;
}

/**
 * Availability reads are the hottest public path. Resolve the business and
 * consume the rate-limit attempt in one statement so a date change costs one
 * fewer sequential round trip. Returns null when the business is missing or
 * has online booking disabled, matching the previous two-step behavior.
 */
export async function consumePublicAvailabilityAttempt(input: {
  slug: string;
  identifier: string;
  limit: number;
  windowMinutes: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const { windowStart, rangeStart, windowEnd, retentionStart } = windows(now, input.windowMinutes);
  const identifierHash = hashRateLimitIdentifier(input.identifier);

  const rows = await getDb().execute(sql`
    with business as (
      select b.id
      from app.businesses b
      inner join app.business_settings s on s.business_id = b.id
      where b.slug = ${input.slug}
        and b.status = 'active'
        and s.public_booking_enabled
      limit 1
    ),
    prior as (
      select coalesce(sum(attempts), 0)::int as attempts
      from app.public_rate_limits
      where business_id = (select id from business)
        and scope = 'lookup'
        and identifier_hash = ${identifierHash}
        and window_start >= ${rangeStart.toISOString()}::timestamptz
        and window_start < ${windowEnd.toISOString()}::timestamptz
        and window_start <> ${windowStart.toISOString()}::timestamptz
    ),
    upsert as (
      insert into app.public_rate_limits as limits
        (business_id, scope, identifier_hash, window_start, attempts)
      select id, 'lookup', ${identifierHash}, ${windowStart.toISOString()}::timestamptz, 1
      from business
      on conflict (business_id, scope, identifier_hash, window_start)
      do update set attempts = limits.attempts + 1
      returning attempts
    ),
    cleanup as (
      delete from app.public_rate_limits
      where business_id = (select id from business)
        and window_start < ${retentionStart.toISOString()}::timestamptz
      returning 1
    )
    select
      (select id from business) as business_id,
      (select attempts from prior) + (select attempts from upsert) as attempts
  `);

  const row = rows[0] as { business_id?: string; attempts?: number | string } | undefined;
  if (!row?.business_id) return null;
  const attempts = Number(row.attempts ?? 0);
  return { businessId: row.business_id, permitted: attempts > 0 && attempts <= input.limit };
}
