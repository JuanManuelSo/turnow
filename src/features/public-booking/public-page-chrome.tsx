import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { business as referenceBusiness } from "@/config/business";
import type { PageTheme } from "@/server/db/schema";

function safeColor(value: string | undefined, fallback: string) {
  return value && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)
    ? value
    : fallback;
}

export function publicPageStyle(
  theme: PageTheme,
  isReferenceBusiness: boolean,
) {
  const palette = theme.palette;
  return {
    "--pb-page-background": isReferenceBusiness
      ? "#f4f6f9"
      : safeColor(palette.background, "#f7f7f4"),
    "--pb-page-surface": safeColor(palette.surface, "#ffffff"),
    "--pb-page-text": isReferenceBusiness
      ? "#142b49"
      : safeColor(palette.text, "#202c42"),
    "--pb-page-muted": safeColor(palette.text_secondary, "#596879"),
    "--pb-page-brand": isReferenceBusiness
      ? "#af2433"
      : safeColor(palette.brand, "#a32e3b"),
    "--pb-page-brand-strong": isReferenceBusiness
      ? "#8f1c29"
      : "color-mix(in srgb, var(--pb-page-brand) 86%, #000)",
    "--pb-page-on-brand": safeColor(palette.on_brand, "#ffffff"),
  } as CSSProperties;
}

export function PublicPageHeader({
  businessSlug,
  businessName,
  isReferenceBusiness,
  actionHref,
  actionLabel,
}: {
  businessSlug: string;
  businessName: string;
  isReferenceBusiness: boolean;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <header className="flex min-h-[88px] items-center justify-between border-t-4 border-t-[var(--pb-page-brand)] border-b border-[#d5dfeb] bg-[var(--pb-page-background)] px-[clamp(20px,5vw,72px)] max-[600px]:min-h-[72px] max-[600px]:px-4">
      <a
        href={`/${businessSlug}`}
        className="flex min-h-11 items-center gap-3 text-[1.05rem] font-extrabold tracking-tight text-[var(--pb-page-text)] no-underline"
      >
        {isReferenceBusiness ? (
          <Image
            src="/brand-silhouette.svg"
            alt=""
            width={46}
            height={52}
          />
        ) : (
          <span
            className="grid size-12 shrink-0 place-items-center rounded-sm bg-[var(--pb-page-brand)] text-xl font-extrabold text-[var(--pb-page-on-brand)]"
            aria-hidden="true"
          >
            {businessName.trim().charAt(0).toLocaleUpperCase()}
          </span>
        )}
        <span>{businessName}</span>
      </a>
      <a
        href={actionHref}
        className="min-h-11 inline-flex items-center text-sm font-semibold text-[#17385f] underline underline-offset-4"
      >
        {actionLabel}
      </a>
    </header>
  );
}

export function PublicPageFooter({
  businessName,
  isReferenceBusiness,
}: {
  businessName: string;
  isReferenceBusiness: boolean;
}) {
  return (
    <footer className="flex min-h-[88px] flex-wrap items-center justify-between gap-4 bg-[#142b49] px-[clamp(20px,5vw,72px)] py-4 text-xs text-[#d3dfeb] max-[600px]:px-4">
      <span>
        {businessName}
        {isReferenceBusiness ? ` · ${referenceBusiness.city}` : ""}
      </span>
      <span>
        Reservas simples con{" "}
        <strong className="text-base text-white">turnow.</strong>
      </span>
      <Link
        href="/dashboard"
        className="min-h-11 inline-flex items-center font-bold text-white"
      >
        Panel del negocio ↗
      </Link>
    </footer>
  );
}
