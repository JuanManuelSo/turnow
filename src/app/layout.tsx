import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { business } from "@/config/business";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./globals.css";
export const metadata: Metadata = {
  title: `${business.name} · ${business.city} | Turnow`,
  description: `${business.slogan.join(" ")} Reservá tu turno en ${business.city}.`,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const enableVercelMetrics = process.env.VERCEL_ENV === "production";

  return (
    <html lang="es-AR">
      <body>
        {children}
        {enableVercelMetrics && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
