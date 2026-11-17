import Link from 'next/link';
import type { ReactNode } from 'react';

export function ActionLink({ href, children, variant = 'primary' }: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'text';
}) {
  const styles = {
    primary: 'bg-[#244f82] text-white shadow-[0_2px_6px_rgb(20_43_73_/_0.16)] hover:bg-[#193b64]',
    secondary: 'border border-[#c1cad6] bg-white text-[#1b2839] hover:border-[#244f82] hover:text-[#244f82]',
    text: 'border-transparent bg-transparent px-1.5 text-[#244f82] hover:bg-[#eaf1f8]',
  };
  return <Link href={href} className={`button inline-flex min-h-11 items-center justify-center gap-2 rounded px-4 text-sm font-bold tracking-tight no-underline transition-colors ${styles[variant]}`}>{children}</Link>;
}
