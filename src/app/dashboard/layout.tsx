import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { getSessionAccess } from '@/server/auth/access';
import { initials, statusLabel } from '@/lib/dashboard-format';
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

  return <div className="panel">
    <a className="panel-skip" href="#panel-main">Saltar al contenido</a>
    <DashboardNavigation
      businessName={membership.businessName}
      businessStatus={membership.businessStatus}
      statusText={statusLabel(membership.businessStatus)}
      accountDescription={isOwner ? 'Cuenta de dueño' : membership.locationName}
      initials={initials(membership.businessName)}
      email={user.email}
      isOwner={isOwner}
    />

    <main id="panel-main" className="panel-main">{children}</main>
  </div>;
}
