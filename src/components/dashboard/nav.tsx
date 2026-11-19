'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Clock3, Globe2, MapPin, Scissors, Settings2, Users } from 'lucide-react';
import { PAGE_EDITOR_ENABLED } from '@/config/features';

const ownerItems = [
  { href: '/dashboard', label: 'Agenda', icon: CalendarDays },
  { href: '/dashboard/sedes', label: 'Sedes', icon: MapPin },
  { href: '/dashboard/servicios', label: 'Servicios', icon: Scissors },
  { href: '/dashboard/profesionales', label: 'Profesionales', icon: Users },
  { href: '/dashboard/horarios', label: 'Horarios', icon: Clock3 },
  { href: '/dashboard/pagina-publica', label: 'Página pública', icon: Globe2 },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings2 },
];

const operatorItems = [
  { href: '/dashboard', label: 'Agenda', icon: CalendarDays },
];

const visibleOwnerItems = PAGE_EDITOR_ENABLED
  ? ownerItems
  : ownerItems.filter(item => item.href !== '/dashboard/pagina-publica');

export function DashboardNav({ isOwner, onNavigate }: { isOwner: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = isOwner ? visibleOwnerItems : operatorItems;
  const navLayoutClass = items.length === 6 ? 'panel-nav-6' : '';

  return <nav className={`panel-nav ${navLayoutClass}`} aria-label="Secciones del panel">
    {items.map(item => {
      const active = item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
      const Icon = item.icon;
      return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
