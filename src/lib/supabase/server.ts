import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function supabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  return { url, key };
}

export async function createSupabaseServerClient() {
  const { url, key } = supabaseEnvironment();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies; src/proxy.ts refreshes sessions.
        }
      },
    },
  });
}

export function getSupabasePublicEnvironment() {
  return supabaseEnvironment();
}
