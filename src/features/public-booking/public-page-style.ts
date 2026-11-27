import type { CSSProperties } from "react";
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
