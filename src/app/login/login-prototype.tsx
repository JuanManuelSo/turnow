'use client';

import { useActionState, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, CircleAlert, Eye, EyeOff } from 'lucide-react';
import { locations } from '@/config/business';
import { Button, FormField, Input, Select } from '@/components/ui';
import { loginAction, requestPasswordResetAction, type AuthActionState } from './actions';
import { fieldErrorsFromIssues, formString, loginEmailSchema, loginFormSchema, loginLocationSchema, loginPasswordSchema, recoveryFormSchema, type AuthFieldErrors } from './validation';

type AccountType = 'owner' | 'location';
type LoginMode = 'login' | 'recovery';
const initialState: AuthActionState = {};

export function LoginPrototype({ notice }: { notice?: string }) {
  const [accountType, setAccountType] = useState<AccountType>('owner');
  const [mode, setMode] = useState<LoginMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [validationMessage, setValidationMessage] = useState('');
  const [recoveryFieldError, setRecoveryFieldError] = useState('');
  const [recoveryValidationMessage, setRecoveryValidationMessage] = useState('');
  const [hideLoginActionErrors, setHideLoginActionErrors] = useState(false);
  const [hideRecoveryActionErrors, setHideRecoveryActionErrors] = useState(false);
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, initialState);
  const [recoveryState, recoveryFormAction, recoveryPending] = useActionState(requestPasswordResetAction, initialState);

  function validateLogin(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = loginFormSchema.safeParse({
      email: formString(data, 'email'),
      password: formString(data, 'password'),
      accountType: formString(data, 'accountType'),
      location: formString(data, 'location') || undefined,
    });

    if (!parsed.success) {
      const errors = fieldErrorsFromIssues(parsed.error.issues);
      setFieldErrors(errors);
      event.preventDefault();
      setValidationMessage('Completá los campos marcados para continuar.');
      setHideLoginActionErrors(true);
      const target = errors.email ? '#login-email'
        : errors.password ? '#login-password'
          : errors.accountType ? '#account-type-owner'
            : '#login-location';
      form.querySelector<HTMLInputElement | HTMLSelectElement>(target)?.focus();
    } else {
      setFieldErrors({});
      setValidationMessage('');
      setHideLoginActionErrors(false);
    }
  }

  function revalidateLoginField(field: 'email' | 'password' | 'location', value: string) {
    const schema = field === 'email' ? loginEmailSchema : field === 'password' ? loginPasswordSchema : loginLocationSchema;
    const result = schema.safeParse(value);
    setFieldErrors(previous => ({ ...previous, [field]: result.success ? undefined : result.error.issues[0]?.message }));
    setValidationMessage('');
    setHideLoginActionErrors(true);
  }

  function validateRecovery(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const result = recoveryFormSchema.safeParse({ email: formString(new FormData(form), 'email') });
    if (!result.success) {
      event.preventDefault();
      setRecoveryFieldError(fieldErrorsFromIssues(result.error.issues).email ?? 'Ingresá un email válido.');
      setRecoveryValidationMessage('Revisá el email marcado para continuar.');
      setHideRecoveryActionErrors(true);
      form.querySelector<HTMLInputElement>('#recovery-email')?.focus();
    } else {
      setRecoveryFieldError('');
      setRecoveryValidationMessage('');
      setHideRecoveryActionErrors(false);
    }
  }

  function revalidateRecoveryEmail(value: string) {
    const result = loginEmailSchema.safeParse(value);
    setRecoveryFieldError(result.success ? '' : result.error.issues[0]?.message ?? 'Ingresá un email válido.');
    setRecoveryValidationMessage('');
    setHideRecoveryActionErrors(true);
  }

  const loginEmailError = fieldErrors.email ?? (!hideLoginActionErrors ? loginState.fieldErrors?.email : undefined);
  const loginPasswordError = fieldErrors.password ?? (!hideLoginActionErrors ? loginState.fieldErrors?.password : undefined);
  const loginLocationError = fieldErrors.location ?? (!hideLoginActionErrors ? loginState.fieldErrors?.location : undefined);
  const loginAccountTypeError = fieldErrors.accountType ?? (!hideLoginActionErrors ? loginState.fieldErrors?.accountType : undefined);
  const recoveryEmailError = recoveryFieldError || (!hideRecoveryActionErrors ? recoveryState.fieldErrors?.email : undefined);

  return <main className="login-page grid min-h-svh grid-rows-[auto_1fr_auto] bg-[#f2f4f7] text-[#1d2939]">
    <header className="login-header mx-auto flex min-h-[60px] w-[min(100%_-_48px,1200px)] items-center justify-end max-[600px]:min-h-[52px] max-[600px]:w-[calc(100%_-_32px)]">
      <Link href="/" className="login-back inline-flex min-h-11 items-center gap-[7px] text-[.8125rem] font-semibold text-[#526174] no-underline hover:text-[#193b64]"><ArrowLeft size={16} aria-hidden="true" /> Volver al sitio</Link>
    </header>

    <section className="login-content my-5 w-[min(100%_-_40px,440px)] justify-self-center self-center rounded-lg border border-[#e0e5ec] bg-white px-7 pt-6 pb-[22px] shadow-[0_8px_22px_rgb(29_41_57_/_0.055)] max-[600px]:my-3 max-[600px]:w-[calc(100%_-_32px)] max-[600px]:px-[18px] max-[600px]:pt-5 max-[600px]:pb-[18px]" aria-labelledby="login-title">
      <Link href="/" className="login-wordmark mb-3.5 inline-flex text-lg font-extrabold tracking-[-.055em] text-[#1d2939] no-underline max-[600px]:mb-3" aria-label="Turnow, volver a la página pública">turnow<span className="login-period text-[#244f82]">.</span></Link>
      <h1 className="text-[1.625rem] tracking-[-.045em] text-[#1d2939] max-[600px]:text-2xl" id="login-title">{mode === 'login' ? 'Ingresá a tu cuenta' : 'Recuperá tu contraseña'}</h1>

      {notice && mode === 'login' && <p className="login-error mt-[-4px] flex items-start gap-2 rounded border border-[#efc9ce] bg-[#fdf0f1] p-[9px_10px] text-xs leading-[1.45] text-[#852a35]" role="status"><CircleAlert size={17} aria-hidden="true" /><span>{notice}</span></p>}

      {mode === 'login' ? <form className="login-form mt-[22px] grid gap-[13px] max-[600px]:mt-[18px] max-[600px]:gap-[11px]" action={loginFormAction} noValidate onSubmit={validateLogin}>
        <fieldset className="account-type-fieldset grid min-w-0 grid-cols-2 gap-2 border-0 p-0 max-[600px]:gap-[7px]">
          <legend className="col-span-full mb-px text-[.8125rem] font-bold text-[#1d2939]">Elegí cómo ingresar</legend>
          <label className={`account-type-option relative flex min-h-[68px] items-start gap-2 rounded-md border p-[11px_10px] has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#244f82] ${accountType === 'owner' ? 'is-selected border-[#244f82] bg-[#edf3f9]' : 'border-[#d8dee7] bg-white'} max-[600px]:min-h-16 max-[600px]:gap-1.5 max-[600px]:p-[9px_7px]`}>
            <input className="peer sr-only" id="account-type-owner" type="radio" name="accountType" value="owner" checked={accountType === 'owner'} aria-describedby={loginAccountTypeError ? 'login-account-type-error' : undefined} onChange={() => { setAccountType('owner'); setFieldErrors(previous => ({ ...previous, accountType: undefined, location: undefined })); setValidationMessage(''); setHideLoginActionErrors(true); }} />
            <span className="account-radio relative mt-px grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] border-[#8391a3] after:absolute after:size-2 after:scale-0 after:rounded-full after:bg-[#244f82] after:content-[''] peer-checked:border-[#244f82] peer-checked:after:scale-100" aria-hidden="true" />
            <span className="account-option-copy grid min-w-0 gap-[3px]"><strong className="text-[.8125rem] leading-tight text-[#1d2939]">Dueño</strong><small className="text-[.6875rem] leading-[1.35] text-[#526174]">Todo el negocio</small></span>
          </label>
          <label className={`account-type-option relative flex min-h-[68px] items-start gap-2 rounded-md border p-[11px_10px] has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#244f82] ${accountType === 'location' ? 'is-selected border-[#244f82] bg-[#edf3f9]' : 'border-[#d8dee7] bg-white'} max-[600px]:min-h-16 max-[600px]:gap-1.5 max-[600px]:p-[9px_7px]`}>
            <input className="peer sr-only" id="account-type-location" type="radio" name="accountType" value="location" checked={accountType === 'location'} aria-describedby={loginAccountTypeError ? 'login-account-type-error' : undefined} onChange={() => { setAccountType('location'); setFieldErrors(previous => ({ ...previous, accountType: undefined })); setValidationMessage(''); setHideLoginActionErrors(true); }} />
            <span className="account-radio relative mt-px grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] border-[#8391a3] after:absolute after:size-2 after:scale-0 after:rounded-full after:bg-[#244f82] after:content-[''] peer-checked:border-[#244f82] peer-checked:after:scale-100" aria-hidden="true" />
            <span className="account-option-copy grid min-w-0 gap-[3px]"><strong className="text-[.8125rem] leading-tight text-[#1d2939]">Operativa</strong><small className="text-[.6875rem] leading-[1.35] text-[#526174]">Una sede</small></span>
          </label>
        </fieldset>
        {loginAccountTypeError && <small className="login-field-error mt-px block text-xs leading-[1.35] text-[#852a35]" id="login-account-type-error">{loginAccountTypeError}</small>}

        {accountType === 'location' && <div className="location-account-field grid gap-1">
          <FormField label="Sede de esta cuenta" htmlFor="login-location">
            <Select id="login-location" name="location" defaultValue="" required aria-invalid={!!loginLocationError} aria-describedby={loginLocationError ? 'login-location-error' : undefined} onChange={event => revalidateLoginField('location', event.currentTarget.value)}>
              <option value="" disabled>Elegí la sede</option>
              {locations.map(location => <option key={location.id} value={location.id}>{location.address}</option>)}
            </Select>
            {loginLocationError && <small className="login-field-error mt-px block text-xs leading-[1.35] text-[#852a35]" id="login-location-error">{loginLocationError}</small>}
          </FormField>
          <small className="text-[.6875rem] leading-[1.35] text-[#526174]">Una cuenta operativa independiente por sede.</small>
        </div>}

        <FormField label="Email" htmlFor="login-email">
          <Input id="login-email" name="email" type="email" autoComplete="username" placeholder="nombre@ejemplo.com" required aria-invalid={!!loginEmailError} aria-describedby={loginEmailError ? 'login-email-error' : undefined} onChange={event => revalidateLoginField('email', event.currentTarget.value)} />
          {loginEmailError && <small className="login-field-error mt-px block text-xs leading-[1.35] text-[#852a35]" id="login-email-error">{loginEmailError}</small>}
        </FormField>

        <FormField label="Contraseña" htmlFor="login-password">
          <span className="password-control relative block">
            <Input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Ingresá tu contraseña" required aria-invalid={!!loginPasswordError} aria-describedby={loginPasswordError ? 'login-password-error' : undefined} onChange={event => revalidateLoginField('password', event.currentTarget.value)} className="pr-[46px]" />
            <button type="button" className="password-visibility absolute top-0 right-px grid h-11 w-[42px] place-items-center rounded text-[#526174] hover:bg-[#f3f5f8] hover:text-[#1d2939]" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPassword(value => !value)}>
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </span>
          {loginPasswordError && <small className="login-field-error mt-px block text-xs leading-[1.35] text-[#852a35]" id="login-password-error">{loginPasswordError}</small>}
        </FormField>

        {validationMessage && <p className="login-error -mt-1 flex items-start gap-2 rounded border border-[#efc9ce] bg-[#fdf0f1] p-[9px_10px] text-xs leading-[1.45] text-[#852a35]" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{validationMessage}</span></p>}
        {!hideLoginActionErrors && loginState.error && <p className="login-error -mt-1 flex items-start gap-2 rounded border border-[#efc9ce] bg-[#fdf0f1] p-[9px_10px] text-xs leading-[1.45] text-[#852a35]" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{loginState.error}</span></p>}

        <div className="login-form-meta -mt-2.5 flex justify-end">
          <button type="button" className="login-text-button min-h-[34px] py-[3px] text-xs font-bold text-[#244f82] underline underline-offset-[3px]" onClick={() => setMode('recovery')}>Olvidé mi contraseña</button>
        </div>

        <Button type="submit" className="login-submit mt-[-6px] min-h-[46px] w-full justify-center rounded-[5px] bg-[#244f82] text-sm text-white hover:bg-[#193b64]" disabled={loginPending}>{loginPending ? 'Ingresando…' : 'Ingresar'}</Button>
        <p className="login-prototype-note mt-[-7px] min-h-4 text-center text-[.6875rem] leading-[1.4] text-[#526174]">El acceso se verifica con Supabase y los permisos asociados a tu cuenta.</p>
      </form> : <form className="login-form mt-[22px] grid gap-[13px] max-[600px]:mt-[18px] max-[600px]:gap-[11px]" action={recoveryFormAction} noValidate onSubmit={validateRecovery}>
        <p className="text-sm">Te enviaremos un enlace si el email está registrado.</p>
        <FormField label="Email" htmlFor="recovery-email">
          <Input id="recovery-email" name="email" type="email" autoComplete="email" placeholder="nombre@ejemplo.com" required aria-invalid={!!recoveryEmailError} aria-describedby={recoveryEmailError ? 'recovery-email-error' : undefined} onChange={event => revalidateRecoveryEmail(event.currentTarget.value)} />
          {recoveryEmailError && <small className="login-field-error mt-px block text-xs leading-[1.35] text-[#852a35]" id="recovery-email-error">{recoveryEmailError}</small>}
        </FormField>
        {recoveryValidationMessage && <p className="login-error -mt-1 flex items-start gap-2 rounded border border-[#efc9ce] bg-[#fdf0f1] p-[9px_10px] text-xs leading-[1.45] text-[#852a35]" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{recoveryValidationMessage}</span></p>}
        {!hideRecoveryActionErrors && recoveryState.error && <p className="login-error -mt-1 flex items-start gap-2 rounded border border-[#efc9ce] bg-[#fdf0f1] p-[9px_10px] text-xs leading-[1.45] text-[#852a35]" role="alert"><CircleAlert size={17} aria-hidden="true" /><span>{recoveryState.error}</span></p>}
        {recoveryState.message && <p className="login-prototype-note min-h-4 text-center text-[.6875rem] leading-[1.4] text-[#526174]" role="status">{recoveryState.message}</p>}
        <Button type="submit" className="login-submit mt-[-6px] min-h-[46px] w-full justify-center rounded-[5px] bg-[#244f82] text-sm text-white hover:bg-[#193b64]" disabled={recoveryPending}>{recoveryPending ? 'Enviando…' : 'Enviar enlace'}</Button>
        <button type="button" className="login-text-button inline-flex min-h-[34px] items-center gap-1.5 py-[3px] text-xs font-bold text-[#244f82] underline underline-offset-[3px]" onClick={() => setMode('login')}><ArrowLeft size={15} aria-hidden="true" /> Volver al ingreso</button>
      </form>}
    </section>

    <footer className="login-footer px-6 pt-2.5 pb-3.5 text-center text-[.6875rem] text-[#526174]">Turnow · Acceso para el equipo</footer>
  </main>;
}
