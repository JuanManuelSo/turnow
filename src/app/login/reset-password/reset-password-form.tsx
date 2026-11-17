'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CircleAlert } from 'lucide-react';
import { Button, FormField, Input } from '@/components/ui';
import { updatePasswordAction, type PasswordActionState } from './actions';

const initialState: PasswordActionState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  return <main className="login-page grid min-h-svh grid-rows-[auto_1fr_auto] bg-[#f2f4f7] text-[#1d2939]">
    <header className="login-header mx-auto flex min-h-[60px] w-[min(100%_-_48px,1200px)] items-center justify-end max-[600px]:min-h-[52px] max-[600px]:w-[calc(100%_-_32px)]"><Link href="/login" className="login-back inline-flex min-h-11 items-center gap-[7px] text-[.8125rem] font-semibold text-[#526174] no-underline hover:text-[#193b64]"><ArrowLeft size={16} aria-hidden="true" /> Volver al ingreso</Link></header>
    <section className="login-content my-5 w-[min(100%_-_40px,440px)] justify-self-center self-center rounded-lg border border-[#e0e5ec] bg-white px-7 pt-6 pb-[22px] shadow-[0_8px_22px_rgb(29_41_57_/_0.055)] max-[600px]:my-3 max-[600px]:w-[calc(100%_-_32px)] max-[600px]:px-[18px] max-[600px]:pt-5 max-[600px]:pb-[18px]" aria-labelledby="reset-title">
      <Link href="/" className="login-wordmark mb-3.5 inline-flex text-lg font-extrabold tracking-[-.055em] text-[#1d2939] no-underline max-[600px]:mb-3">turnow<span className="login-period text-[#244f82]">.</span></Link>
      <h1 className="text-[1.625rem] tracking-[-.045em] text-[#1d2939] max-[600px]:text-2xl" id="reset-title">Elegí una nueva contraseña</h1>
      <form className="login-form mt-[22px] grid gap-[13px] max-[600px]:mt-[18px] max-[600px]:gap-[11px]" action={formAction}>
        <FormField label="Nueva contraseña" htmlFor="new-password">
          <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </FormField>
        <FormField label="Repetí la contraseña" htmlFor="confirm-password">
          <Input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
        </FormField>
        {state.error && <p className="login-error mt-[-4px] flex items-start gap-2 rounded border border-[#efc9ce] bg-[#fdf0f1] p-[9px_10px] text-xs leading-[1.45] text-[#852a35]" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{state.error}</span></p>}
        <Button type="submit" className="login-submit mt-[-6px] min-h-[46px] w-full justify-center rounded-[5px] bg-[#244f82] text-sm text-white hover:bg-[#193b64]" disabled={pending}>{pending ? 'Guardando…' : 'Cambiar contraseña'}</Button>
      </form>
    </section>
    <footer className="login-footer px-6 pt-2.5 pb-3.5 text-center text-[.6875rem] text-[#526174]">Turnow · Acceso para el equipo</footer>
  </main>;
}
