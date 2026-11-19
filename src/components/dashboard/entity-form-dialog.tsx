'use client';

import { useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { ResponsiveDialog } from './responsive-dialog';
import { SubmitButton } from './submit-button';
import { FormFeedback } from './form-feedback';
import type { PanelActionState } from '@/app/dashboard/action-state';

function FormActions({ label, onClose }: { label: string; onClose: () => void }) {
  const { pending } = useFormStatus();
  return <footer className="panel-dialog-actions">
    <button type="button" className="button secondary" disabled={pending} onClick={onClose}>Cancelar</button>
    <SubmitButton>{label}</SubmitButton>
  </footer>;
}

/** Keeps entity-specific fields and validation in their own form modules. */
export function EntityFormDialog({ title, closeHref, action, state, submitLabel, children }: {
  title: string;
  closeHref: string;
  action: (data: FormData) => void;
  state: PanelActionState;
  submitLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = useRef(false);
  function close() {
    if (formRef.current?.querySelector('button[type="submit"]:disabled')) return;
    if (dirty.current && !window.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?')) return;
    router.push(closeHref, { scroll: false });
  }
  return <ResponsiveDialog title={title} onClose={close}>
    <form ref={formRef} action={action} className="panel-form" onChange={() => { dirty.current = true; }}>
      <FormFeedback state={state} />
      {children}
      <FormActions label={submitLabel} onClose={close} />
    </form>
  </ResponsiveDialog>;
}
