import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Manrope } from "next/font/google";
import { business } from "@/config/business";
import "./globals.css";

// Una sola fuente variable, precargada y con métricas de respaldo ajustadas:
// el texto no salta cuando termina de cargar.
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});
export const metadata: Metadata = {
  title: `${business.name} · ${business.city} | Turnow`,
  description: `${business.slogan.join(" ")} Reservá tu turno en ${business.city}.`,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const enableVercelMetrics = process.env.VERCEL_ENV === "production";

  return (
    <html lang="es-AR" className={manrope.variable}>
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
