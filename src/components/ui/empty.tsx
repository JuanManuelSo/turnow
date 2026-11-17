import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button';

export function Empty({ title, children, action, onAction, className = '' }: { title: string; children: ReactNode; action: string; onAction: () => void; className?: string }) {
  return <div className={`empty grid justify-items-center rounded-xl bg-surface-muted px-6 py-14 text-center ${className}`}>
    <h3 className="text-lg font-bold text-foreground">{title}</h3>
    <p className="mt-3 mb-6 max-w-[460px] text-sm text-muted-foreground">{children}</p>
    <Button variant="secondary" onClick={onAction}>{action}<ArrowRight size={16} /></Button>
  </div>;
}
