import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type FormFieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, hint, error, children }: FormFieldProps) {
  return <div className="form-field grid min-w-0 gap-2">
    <label className="text-sm font-bold text-foreground" htmlFor={htmlFor}>{label}</label>
    {children}
    {error && <small className="field-error block text-xs leading-[1.45] text-danger" id={`${htmlFor}-error`} role="alert">{error}</small>}
    {!error && hint && <small className="field-hint block text-xs leading-[1.45] text-muted-foreground" id={`${htmlFor}-hint`}>{hint}</small>}
  </div>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('form-control block min-h-12 w-full rounded-field border border-input bg-surface px-[13px] py-[11px] text-base leading-[1.4] text-foreground placeholder:text-muted-foreground focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:bg-surface-muted aria-[invalid=true]:border-danger aria-[invalid=true]:bg-[#fffafb]', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('form-control block min-h-12 w-full rounded-field border border-input bg-surface px-[13px] py-[11px] text-base leading-[1.4] text-foreground placeholder:text-muted-foreground focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:bg-surface-muted aria-[invalid=true]:border-danger aria-[invalid=true]:bg-[#fffafb]', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('form-control block min-h-12 w-full rounded-field border border-input bg-surface px-[13px] py-[11px] text-base leading-[1.4] text-foreground placeholder:text-muted-foreground focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:bg-surface-muted aria-[invalid=true]:border-danger aria-[invalid=true]:bg-[#fffafb]', className)} {...props} />;
}
