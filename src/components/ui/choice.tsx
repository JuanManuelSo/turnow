'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Choice({ selected, children, onClick, className = '' }: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return <button type="button" aria-pressed={selected} className={cn('choice flex min-h-11 w-full items-center justify-between gap-4 rounded-field border border-border bg-surface p-4 text-left transition-colors duration-150 hover:border-input focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring', selected && 'selected border-brand bg-brand-soft', className)} onClick={onClick}>
    <span className="choice-content min-w-0 flex-1">{children}</span>
    <span className={cn('choice-check grid size-[21px] shrink-0 place-items-center rounded-full border border-input', selected && 'border-brand bg-brand text-brand-foreground')} aria-hidden="true">{selected && <Check size={16} />}</span>
  </button>;
}
