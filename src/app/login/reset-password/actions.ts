'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type PasswordActionState = { error?: string };

export async function updatePasswordAction(_previous: PasswordActionState, formData: FormData): Promise<PasswordActionState> {
  const parsed = z.object({
    password: z.string().min(8).max(128),
    confirmation: z.string().min(8).max(128),
  }).safeParse({
    password: formData.get('password'),
    confirmation: formData.get('confirmation'),
  });

  if (!parsed.success) return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (parsed.data.password !== parsed.data.confirmation) return { error: 'Las contraseñas no coinciden.' };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'El enlace venció o ya fue utilizado. Solicitá uno nuevo.' };
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { error: 'No se pudo cambiar la contraseña. Solicitá un enlace nuevo e intentá otra vez.' };
  } catch {
    return { error: 'No se pudo cambiar la contraseña. Intentá de nuevo más tarde.' };
  }

  redirect('/dashboard');
}
