'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui';

export function SubmitButton({ children, pendingLabel = 'Guardando…', variant = 'primary', className }: {
  children: string;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'text';
  className?: string;
}) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant={variant} className={className} disabled={pending}>
    {pending ? pendingLabel : children}
  </Button>;
}
