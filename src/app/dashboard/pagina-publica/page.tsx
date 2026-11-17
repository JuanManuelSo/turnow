import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PanelHeader } from '@/components/dashboard/page-header';
import { PanelNotice } from '@/components/dashboard/notice';
import { ActionLink } from '@/components/dashboard/action-link';
import { PAGE_EDITOR_ENABLED } from '@/config/features';
import { requireOwner } from '@/server/auth/access';
import { getConfigurationData } from '@/server/business/queries';
import { PublicPageForm } from './public-page-form';
import { LinkButton } from '@/components/ui';

export const metadata: Metadata = { title: 'Página pública' };

export default async function PublicPage({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const { membership } = await requireOwner();
  if (!PAGE_EDITOR_ENABLED) redirect('/dashboard');

  const { business, page } = await getConfigurationData(membership.businessId);
  const params = await searchParams;

  if (!business) {
    return <section className="panel-empty grid justify-items-start gap-3 rounded border border-dashed border-[#c1cad6] bg-white p-8 text-left">
      <h1>No encontramos el negocio</h1>
      <p>Volvé a iniciar sesión o contactá al soporte de Turnow.</p>
    </section>;
  }

  if (!page) {
    return <>
      <PanelHeader title="Página pública" description="Textos e identidad que verán tus clientes." />
      <section className="panel-empty grid justify-items-start gap-3 rounded border border-dashed border-[#c1cad6] bg-white p-8 text-left">
        <h2>Falta la ficha pública</h2>
        <p>El alta inicial no creó la página del negocio. Se puede volver a provisionar con `npm run setup:business`.</p>
      </section>
    </>;
  }

  return <>
    <PanelHeader
      title="Página pública"
      description="Editá los textos y enlaces que verán tus clientes al reservar. Los cambios se reflejan en la página pública del negocio."
      actions={<div className="flex flex-wrap gap-2">
        <LinkButton variant="secondary" href={`/${business.slug}`} target="_blank" rel="noreferrer">Abrir página pública</LinkButton>
        <ActionLink href="/dashboard" variant="secondary">Volver a la agenda</ActionLink>
      </div>}
    />

    {params.guardado === '1' && <PanelNotice>La página se guardó correctamente.</PanelNotice>}

    <PublicPageForm
      businessName={business.name}
      businessSlug={business.slug}
      page={{
        headline: page.headline ?? '',
        description: page.description ?? '',
        contactEmail: page.contactEmail ?? '',
        instagram: page.socialLinks.instagram ?? '',
        facebook: page.socialLinks.facebook ?? '',
        whatsapp: page.socialLinks.whatsapp ?? '',
        website: page.socialLinks.website ?? '',
        version: page.version,
        theme: page.theme,
      }}
    />
  </>;
}
