import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const requestedNext = request.nextUrl.searchParams.get('next') ?? '/dashboard';
  const destination = new URL(requestedNext, request.url);
  const next = destination.origin === request.nextUrl.origin ? destination : new URL('/dashboard', request.url);

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(next);
    } catch {
      // Return a generic message; never expose auth provider details in the URL.
    }
  }

  return NextResponse.redirect(new URL('/login?authError=recovery', request.url));
}
