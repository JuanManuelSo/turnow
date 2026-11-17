import { CalendarDays, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

export type DashboardAccount = {
  businessName: string;
  email: string;
  role: "owner" | "location_operator";
  locationName: string | null;
};

export function DashboardShell({
  account,
  logout,
  children,
}: {
  account: DashboardAccount;
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  return (
      <div className="dashboard grid min-h-svh grid-cols-[232px_minmax(0,1fr)] bg-[#f3f5f8] text-[#1d2939] max-[800px]:grid-cols-1">
      <a className="dashboard-skip fixed left-4 top-[-80px] z-20 bg-white p-3 text-sm focus:top-4" href="#dashboard-main">
        Ir a la agenda
      </a>
      <aside className="dashboard-rail sticky top-0 flex h-svh flex-col bg-[#172b43] px-5 pt-8 pb-6 text-white max-[800px]:static max-[800px]:h-auto max-[800px]:flex-row max-[800px]:items-center max-[800px]:justify-between max-[800px]:gap-5 max-[800px]:p-5">
        <Link
          href="/dashboard"
          className="dashboard-wordmark px-3 text-[1.75rem] font-extrabold tracking-tight text-white no-underline"
          aria-label="Turnow, inicio"
        >
          turnow<span>.</span>
        </Link>
        <div className="dashboard-business my-8 grid gap-1.5 wrap-anywhere">
          <strong>{account.businessName}</strong>
          <span>
            {account.role === "owner"
              ? "Espacio de trabajo"
              : account.locationName}
          </span>
        </div>
        <nav className="grid gap-2 max-[800px]:flex max-[800px]:gap-2" aria-label="Panel del negocio">
          <Link className="flex min-h-12 items-center gap-3 rounded-lg bg-[#2a4462] px-4 py-3 font-semibold text-white no-underline" href="/dashboard" aria-current="page">
            <CalendarDays size={19} aria-hidden="true" /> Agenda
          </Link>
        </nav>
        <div className="dashboard-account">
          <span>
            {account.role === "owner" ? "Cuenta de dueño" : "Cuenta de sede"}
          </span>
          <p>{account.email}</p>
          <form action={logout}>
            <Button type="submit" variant="text">
              <LogOut size={17} aria-hidden="true" /> Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>
      <main id="dashboard-main" className="dashboard-main min-w-0 px-10 pt-12 pb-6 max-[800px]:m-0 max-[800px]:px-6 max-[800px]:pt-8 max-[600px]:px-5 max-[600px]:py-7">
        {children}
      </main>
    </div>
  );
}
