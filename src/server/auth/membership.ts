import 'server-only';

import { and, eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { businessMembers, businesses, locations } from '@/server/db/schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AccountRole = 'owner' | 'location_operator';

export async function getMembershipForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      locationId: businessMembers.locationId,
      businessName: businesses.name,
      businessSlug: businesses.slug,
      businessStatus: businesses.status,
      locationName: locations.name,
      locationSlug: locations.slug,
      locationActive: locations.isActive,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .leftJoin(locations, and(
      eq(businessMembers.businessId, locations.businessId),
      eq(businessMembers.locationId, locations.id),
    ))
    .where(eq(businessMembers.userId, userId))
    .limit(2);

  // Do not silently pick one when a future account can belong to multiple businesses.
  if (rows.length !== 1) return null;

  const membership = rows[0];
  if (membership.businessStatus === 'suspended' || membership.businessStatus === 'archived') return null;
  if (membership.role === 'location_operator' &&
      (membership.businessStatus !== 'active' || !membership.locationId || !membership.locationActive)) return null;

  return membership;
}

export async function getCurrentAccess() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const membership = await getMembershipForUser(user.id);
  if (!membership) return null;
  return { user, membership };
}
