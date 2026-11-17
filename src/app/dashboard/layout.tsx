import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { DashboardNav } from '@/components/dashboard/nav';
import { getSessionAccess } from '@/server/auth/access';
import { initials, statusLabel } from '@/lib/dashboard-format';
import { logoutAction } from './actions';
import './dashboard.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Panel · Turnow', template: '%s · Panel Turnow' },
  description: 'Panel privado para configurar el negocio y la agenda.',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const access = await getSessionAccess();
  if (!access) redirect('/login?access=denied');

  const { user, membership } = access;
  const isOwner = membership.role === 'owner';

  return <div className="panel grid min-h-svh grid-cols-[264px_minmax(0,1fr)] bg-[#f2f4f7] font-sans text-[#1b2839] [--background:#f2f4f7] [--surface:#fff] [--surface-muted:#eaf0f6] [--text-primary:#1b2839] [--text-secondary:#56657a] [--border-subtle:#dde3eb] [--border-control:#c1cad6] [--brand:#244f82] [--brand-soft:#eaf1f8] [--on-brand:#fff] [--on-brand-soft:#193b64] [--focus-ring:#244f82] [--danger:#932f3a] [--success:#1f5c47] [--radius-control:8px] [&_.button]:min-h-11 [&_.button]:gap-2 [&_.button]:rounded-[5px] [&_.button]:px-4 [&_.button]:py-0 [&_.button]:text-sm [&_.button]:tracking-tight [&_.button.primary]:shadow-[0_2px_6px_#142b4929] [&_.button.primary:hover]:translate-y-0 [&_.button.secondary:hover]:border-[#244f82] [&_.button.secondary:hover]:text-[#244f82] [&_.button.text]:min-h-9 [&_.button.text]:px-1.5 [&_.form-field]:gap-1.5 [&_.form-field>label]:text-[.8125rem] [&_.form-control]:min-h-11 [&_.form-control]:rounded-[5px] [&_.form-control]:px-[11px] [&_.form-control]:py-[9px] [&_textarea.form-control]:min-h-[92px] max-[1100px]:grid-cols-[232px_minmax(0,1fr)] max-[900px]:grid-cols-1">
    <a className="panel-skip fixed top-[-80px] left-4 z-50 rounded bg-white px-3.5 py-2.5 text-xs font-bold text-[#1b2839] focus:top-3 focus:outline-[3px] focus:outline-[#244f82] focus:outline-offset-2" href="#panel-main">Saltar al contenido</a>
    <aside className="panel-rail sticky top-0 flex h-svh flex-col gap-[26px] overflow-y-auto bg-[#132a47] px-[18px] pt-[26px] pb-[22px] text-[#e8eef5] max-[1100px]:px-3.5 max-[900px]:static max-[900px]:h-auto max-[900px]:gap-4 max-[900px]:overflow-visible max-[900px]:px-5 max-[900px]:pt-[18px] max-[900px]:pb-3.5">
      <div className="panel-brand-row flex items-center justify-between gap-3 px-2 max-[900px]:px-0">
        <Link href="/dashboard" className="panel-wordmark text-[1.4rem] leading-none font-extrabold tracking-[-.055em] text-white no-underline">turnow<span className="text-[#86acd8]">.</span></Link>
        <span className={`panel-status inline-flex min-h-[22px] items-center rounded-full border border-white/20 px-2 py-0.5 text-[.625rem] font-bold tracking-[.08em] text-[#d7e4f2] uppercase is-${membership.businessStatus}`}>{statusLabel(membership.businessStatus)}</span>
      </div>

      <div className="panel-business mx-2 flex items-center gap-3 border-t border-white/10 pt-[18px] max-[900px]:mx-0 max-[900px]:pt-3.5">
        <span className="panel-monogram grid size-10 shrink-0 place-items-center rounded bg-[#e7eef6] text-[.8125rem] font-extrabold tracking-tight text-[#142b49]" aria-hidden="true">{initials(membership.businessName)}</span>
        <div className="min-w-0">
          <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm text-white">{membership.businessName}</strong>
          <small className="text-xs text-[#bccce0]">{isOwner ? 'Cuenta de dueño' : membership.locationName}</small>
        </div>
      </div>

      <DashboardNav isOwner={isOwner} />

      <div className="panel-rail-foot mt-auto border-t border-white/10 pt-4 max-[900px]:flex max-[900px]:items-center max-[900px]:justify-between max-[900px]:gap-3 max-[900px]:pt-2.5">
        <p className="panel-account-label mb-2 text-[.6875rem] font-bold tracking-wider text-[#a9bdd3] uppercase max-[900px]:hidden">Sesión</p>
        <p className="panel-account mb-3 overflow-wrap-anywhere text-xs text-[#bccce0] max-[900px]:mb-0 max-[900px]:overflow-hidden max-[900px]:text-ellipsis max-[900px]:whitespace-nowrap">{user.email}</p>
        <form action={logoutAction}>
          <button type="submit" className="panel-logout inline-flex min-h-11 items-center gap-2 rounded px-0 text-xs font-bold text-[#e8eef5] hover:text-white max-[900px]:min-h-9">
            <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>

    <main id="panel-main" className="panel-main min-w-0 px-[clamp(20px,3vw,48px)] pt-10 pb-6 max-[1100px]:px-[30px] max-[900px]:max-w-none max-[900px]:px-5 max-[900px]:pt-8 max-[900px]:pb-14">{children}</main>
  </div>;
}
