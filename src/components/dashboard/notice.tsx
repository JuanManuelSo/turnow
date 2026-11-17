import { CheckCircle2, CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

export function PanelNotice({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'warning' }) {
  const Icon = tone === 'success' ? CheckCircle2 : CircleAlert;
  return <p className={`panel-notice flex items-start gap-2 rounded border px-3 py-2.5 text-sm leading-[1.45] ${tone === 'warning' ? 'border-[#ead7ae] bg-[#fffaf0] text-[#674c1d]' : 'border-[#c9dfd3] bg-[#f1f8f3] text-[#235640]'}`} role={tone === 'warning' ? 'alert' : 'status'}>
    <Icon size={17} aria-hidden="true" />
    <span>{children}</span>
  </p>;
}
