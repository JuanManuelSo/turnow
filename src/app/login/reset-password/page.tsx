import type { Metadata } from 'next';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = { title: 'Cambiar contraseña · Turnow' };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
