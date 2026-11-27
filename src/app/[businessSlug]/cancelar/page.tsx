import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCancellationForm } from "@/features/public-booking/public-cancellation-form";
import { getPublicBusinessBySlug } from "@/server/business/public-business";

// Sólo cambia el nombre o el tema del negocio; el turno se consulta en vivo.
export const revalidate = 60;

// ISR on-demand: cachea la primera visita de cada slug sin tocar la base en build.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const business = await getPublicBusinessBySlug(businessSlug, true);
  return {
    title: business
      ? `Consultar o cancelar · ${business.name}`
      : "Gestión de reserva · Turnow",
  };
}

export default async function PublicCancellationPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getPublicBusinessBySlug(businessSlug, true);
  if (!business) notFound();
  return (
    <PublicCancellationForm
      businessSlug={business.slug}
      businessName={business.name}
      theme={business.theme}
    />
  );
}
