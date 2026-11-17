'use server';

import { redirect } from 'next/navigation';
import { getMembershipForUser } from '@/server/auth/membership';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fieldErrorsFromIssues, formString, loginFormSchema, recoveryFormSchema, type AuthFieldErrors } from './validation';

export type AuthActionState = { error?: string; message?: string; fieldErrors?: AuthFieldErrors };

export async function loginAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginFormSchema.safeParse({
    email: formString(formData, 'email'),
    password: formString(formData, 'password'),
    accountType: formString(formData, 'accountType'),
    location: formString(formData, 'location') || undefined,
  });
  if (!parsed.success) return {
    error: 'Revisá los campos marcados para continuar.',
    fieldErrors: fieldErrorsFromIssues(parsed.error.issues),
  };

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { error: 'El acceso todavía no está configurado. Revisá las variables de Supabase.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return { error: 'Email o contraseña incorrectos. Revisá tus datos e intentá de nuevo.' };

  let membership;
  try {
    membership = await getMembershipForUser(data.user.id);
  } catch {
    await supabase.auth.signOut();
    return { error: 'No pudimos verificar los permisos de esta cuenta. Intentá de nuevo más tarde.' };
  }

  const expectedRole = parsed.data.accountType === 'owner' ? 'owner' : 'location_operator';
  const selectedLocation = 'location' in parsed.data ? parsed.data.location : undefined;
  const locationMatches = parsed.data.accountType !== 'location' ||
    membership?.locationSlug === selectedLocation;
  if (!membership || membership.role !== expectedRole || !locationMatches) {
    await supabase.auth.signOut();
    return { error: 'La cuenta no coincide con el tipo o la sede elegidos, o no tiene una membresía habilitada.' };
  }

  redirect('/dashboard');
}

export async function requestPasswordResetAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = recoveryFormSchema.safeParse({ email: formString(formData, 'email') });
  if (!email.success) return {
    error: 'Revisá el email para continuar.',
    fieldErrors: fieldErrorsFromIssues(email.error.issues),
  };

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) return { error: 'Falta configurar NEXT_PUBLIC_SITE_URL para enviar el enlace de recuperación.' };
    await supabase.auth.resetPasswordForEmail(email.data.email, {
      redirectTo: `${siteUrl.replace(/\/$/, '')}/auth/callback?next=/login/reset-password`,
    });
  } catch {
    return { error: 'No se pudo solicitar la recuperación. Intentá de nuevo más tarde.' };
  }

  // Keep the response identical whether the account exists or not.
  return { message: 'Si el email está registrado, vas a recibir un enlace para cambiar la contraseña.' };
}
