"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import {
  dateLabel,
  initialDate,
  initialBookings,
  locationAddress,
  team,
  type Booking,
  type LocationId,
} from "@/modules/prototype";
import { DashboardShell, type DashboardAccount } from "./dashboard-shell";
import { AgendaToolbar } from "./agenda-toolbar";
import { AgendaGrid } from "./agenda-grid";
import { BookingDialog } from "./booking-dialog";

export function DashboardHome({
  account,
  logout,
  today,
}: {
  account: DashboardAccount;
  logout: () => Promise<void>;
  today: string;
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [date, setDate] = useState(initialDate);
  const [location, setLocation] = useState<LocationId>("urquiza");
  const [professional, setProfessional] = useState("all");
  const [dialog, setDialog] = useState<{ booking: Booking | null } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const professionals = team.filter((person) => person.location === location);
  const daily = bookings.filter(
    (booking) => booking.date === date && booking.location === location,
  );
  const entries = daily
    .filter(
      (booking) =>
        booking.status === "Confirmada" &&
        (professional === "all" || booking.professional === professional),
    )
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <DashboardShell account={account} logout={logout}>
      <header className="dashboard-heading mb-7 flex items-center justify-between gap-6 max-[600px]:flex-wrap max-[600px]:gap-5">
        <div>
          <h1 className="text-[clamp(1.6rem,2.5vw,2rem)] leading-tight tracking-tight">
            Tu agenda, en orden.
          </h1>
          <p className="mt-2.5 text-sm">
            Un día a la vez. Todo tu equipo en un mismo lugar.
          </p>
        </div>
        <Button onClick={() => setDialog({ booking: null })}>
          <Plus size={18} aria-hidden="true" /> Nuevo turno
        </Button>
      </header>
      <div className="dashboard-demo-note mb-6 flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-[#d8dee7] px-4 py-3 text-xs text-[#526174]">
        <strong className="text-[#244f82]">Vista de demostración</strong>
        <span>
          Agenda de ejemplo, independiente de los datos de{" "}
          {account.businessName}. Los cambios se reinician al recargar.
        </span>
      </div>
      <section
        aria-label="Agenda diaria"
        className="dashboard-agenda overflow-hidden rounded-xl border border-[#d8dee7] bg-white"
      >
        <AgendaToolbar
          date={date}
          today={today}
          location={location}
          professional={professional}
          professionals={professionals}
          onDate={setDate}
          onLocation={(value) => {
            setLocation(value);
            setProfessional("all");
          }}
          onProfessional={setProfessional}
        />
        <div className="dashboard-agenda-caption flex flex-wrap items-center justify-between gap-4 p-6 max-[600px]:p-4">
          <div>
            <h2 className="text-lg font-bold">{dateLabel(date)}</h2>
            <p className="mt-1 text-sm text-[#526174]">
              {locationAddress(location)}
            </p>
          </div>
          <span className="text-xs text-[#526174]">
            {entries.length} turnos confirmados · Vista diaria
          </span>
        </div>
        <div className="overflow-x-auto">
          <AgendaGrid
            bookings={entries}
            professionals={professionals.filter(
              (person) => professional === "all" || person.id === professional,
            )}
            onSelect={(booking) => setDialog({ booking })}
            onCreate={() => setDialog({ booking: null })}
          />
        </div>
      </section>
      <footer className="dashboard-footnote mt-4 flex flex-wrap justify-between gap-2 text-xs text-[#526174]">
        <span>Horarios de Rosario · America/Argentina/Buenos_Aires</span>
        <span>
          {daily.filter((booking) => booking.status === "Cancelada").length}{" "}
          cancelaciones en esta sede y fecha
        </span>
      </footer>
      <p className="dashboard-feedback" role="status">
        {message}
      </p>
      {dialog && (
        <BookingDialog
          booking={dialog.booking}
          date={date}
          location={location}
          bookings={bookings}
          onClose={() => setDialog(null)}
          onSave={(booking) => {
            setBookings((previous) => [
              ...previous.filter((item) => item.id !== booking.id),
              booking,
            ]);
            setDate(booking.date);
            setProfessional("all");
            setMessage(
              dialog.booking
                ? "El turno se reprogramó en la demostración."
                : "El turno se agregó a la demostración.",
            );
            setDialog(null);
          }}
          onCancel={(id) => {
            setBookings((previous) =>
              previous.map((booking) =>
                booking.id === id
                  ? { ...booking, status: "Cancelada" }
                  : booking,
              ),
            );
            setMessage("El turno se canceló en la demostración.");
            setDialog(null);
          }}
        />
      )}
    </DashboardShell>
  );
}
