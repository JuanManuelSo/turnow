import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentAccess } from './membership';

export const getSessionAccess = cache(getCurrentAccess);

export async function requireSession() {
  const access = await getSessionAccess();
  if (!access) redirect('/login?access=denied');
  return access;
}

export async function requireOwner() {
  const access = await requireSession();
  if (access.membership.role !== 'owner') redirect('/dashboard');
  return access;
}
