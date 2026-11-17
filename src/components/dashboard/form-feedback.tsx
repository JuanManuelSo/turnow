'use client';

import { CircleAlert } from 'lucide-react';
import type { PanelActionState } from '@/app/dashboard/action-state';

export function FormFeedback({ state }: { state: PanelActionState }) {
  if (!state.error) return null;
  return <p className="panel-form-error flex items-start gap-2 rounded border border-[#e7c5cb] bg-[#fff4f5] px-3 py-2.5 text-xs leading-relaxed text-[#852a35]" role="alert">
    <CircleAlert size={16} aria-hidden="true" />
    <span>{state.error}</span>
  </p>;
}
