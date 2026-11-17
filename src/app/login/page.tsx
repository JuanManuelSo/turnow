import type { Metadata } from 'next';
import { LoginPrototype } from './login-prototype';

export const metadata: Metadata = {
  title: 'Ingresar · Turnow',
  description: 'Acceso para dueños y cuentas operativas de sede.',
};

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ access?: string; authError?: string }>;
}) {
  const params = await searchParams;
  const notice = params.access === 'denied'
    ? 'Iniciá sesión con una cuenta habilitada para acceder al panel.'
    : params.authError === 'recovery'
      ? 'El enlace de recuperación venció o no es válido. Solicitá uno nuevo.'
      : undefined;
  return <LoginPrototype notice={notice} />;
}
