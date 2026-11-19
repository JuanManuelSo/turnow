'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, X } from 'lucide-react';
import { logoutAction } from '@/app/dashboard/actions';
import { DashboardNav } from './nav';

type DashboardNavigationProps = {
  businessName: string;
  businessStatus: string | null;
  statusText: string;
  accountDescription: string | null;
  initials: string;
  email: string | undefined;
  isOwner: boolean;
};

export function DashboardNavigation(props: DashboardNavigationProps) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.querySelector<HTMLElement>('[data-drawer-close]')?.focus();

    function focusable() {
      return Array.from(drawer!.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    function keepFocus(event: FocusEvent) {
      if (event.target instanceof Node && !drawer!.contains(event.target)) {
        drawer!.querySelector<HTMLElement>('[data-drawer-close]')?.focus();
      }
    }
    function onWideScreen(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    const wideScreen = window.matchMedia('(min-width: 901px)');
    wideScreen.addEventListener('change', onWideScreen);
    drawer.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', keepFocus);
    return () => {
      wideScreen.removeEventListener('change', onWideScreen);
      drawer.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', keepFocus);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else menuButton?.focus();
    };
  }, [open]);

  function railContent(inDrawer: boolean) {
    return <>
      <div className="panel-brand-row">
        <Link href="/dashboard" onClick={inDrawer ? () => setOpen(false) : undefined} className="panel-wordmark">turnow<span>.</span></Link>
        <span className={`panel-status is-${props.businessStatus}`}>{props.statusText}</span>
        {inDrawer && <button type="button" className="panel-drawer-close" data-drawer-close aria-label="Cerrar menú" onClick={() => setOpen(false)}><X size={21} aria-hidden="true" /></button>}
      </div>
      <div className="panel-business">
        <span className="panel-monogram" aria-hidden="true">{props.initials}</span>
        <div className="panel-business-name">
          <strong>{props.businessName}</strong>
          <small>{props.accountDescription}</small>
        </div>
      </div>
      <DashboardNav isOwner={props.isOwner} onNavigate={inDrawer ? () => setOpen(false) : undefined} />
      <div className="panel-rail-foot">
        <p className="panel-account-label">Sesión</p>
        <p className="panel-account">{props.email}</p>
        <form action={logoutAction}>
          <button type="submit" className="panel-logout"><LogOut size={16} strokeWidth={1.8} aria-hidden="true" />Cerrar sesión</button>
        </form>
      </div>
    </>;
  }

  return <>
    <aside className="panel-rail">{railContent(false)}</aside>
    <header className="panel-mobile-header">
      <button ref={menuButtonRef} type="button" className="panel-menu-button" aria-label="Abrir menú" aria-expanded={open} aria-controls="panel-mobile-menu" onClick={() => setOpen(true)}>
        <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <Link href="/dashboard" className="panel-wordmark">turnow<span>.</span></Link>
      <span className="panel-mobile-business" title={props.businessName}>{props.businessName}</span>
    </header>
    <div className={`panel-drawer-layer${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <button type="button" className="panel-drawer-backdrop" aria-label="Cerrar menú" tabIndex={-1} onClick={() => setOpen(false)} />
      <aside id="panel-mobile-menu" ref={drawerRef} className="panel-drawer panel-rail" role="dialog" aria-modal={open ? 'true' : undefined} aria-label="Menú del panel" inert={!open}>
        {railContent(true)}
      </aside>
    </div>
  </>;
}
