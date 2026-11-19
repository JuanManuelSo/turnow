'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './responsive-dialog.module.css';

/** One overlay for every dashboard editor: bottom sheet on mobile, modal on desktop. */
export function ResponsiveDialog({ title, description, onClose, children }: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    if (!dialog) return;
    const inertElements: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement | null = dialog.parentElement;
    while (branch && branch !== document.body) {
      for (const sibling of Array.from(branch.parentElement?.children ?? [])) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          inertElements.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    document.body.style.overflow = 'hidden';
    dialog.focus();
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(element => element.getClientRects().length);
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first.focus();
      }
    }
    dialog.addEventListener('keydown', keydown);
    return () => {
      dialog.removeEventListener('keydown', keydown);
      inertElements.forEach(({ element, inert }) => { element.inert = inert; });
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <div className={styles.backdrop} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={ref} className={styles.surface} role="dialog" aria-modal="true" tabIndex={-1}
      aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
      <header className="panel-dialog-heading">
        <div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
        <button type="button" className="agenda-close" aria-label="Cerrar" onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className={`panel-dialog-content ${styles.content}`}>{children}</div>
    </section>
  </div>;
}
