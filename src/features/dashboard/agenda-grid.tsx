import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { Empty } from "@/components/ui";
import {
  minutes,
  services,
  type Booking,
  type team,
} from "@/modules/prototype";

type Professional = (typeof team)[number];

export function AgendaGrid({
  bookings,
  professionals,
  onSelect,
  onCreate,
}: {
  bookings: Booking[];
  professionals: Professional[];
  onSelect: (booking: Booking) => void;
  onCreate: () => void;
}) {
  if (!bookings.length)
    return (
      <Empty
        title="Un día con espacio para nuevos turnos"
        action="Crear un turno"
        onAction={onCreate}
      >
        No hay reservas para esta fecha y estos filtros. Podés elegir otro día o
        agregar un turno.
      </Empty>
    );

  return (
    <>
      <div
        className="dashboard-schedule min-w-[760px] overflow-hidden rounded-lg border border-[#d8dee7] bg-white"
        style={{ "--agenda-columns": professionals.length } as CSSProperties}
      >
        <div className="dashboard-schedule-head grid grid-cols-[72px_repeat(var(--agenda-columns),minmax(170px,1fr))] border-b border-[#d8dee7] bg-[#f7f9fb]">
          <span className="px-3 py-4 text-[.68rem] font-bold tracking-wider text-[#69788c] uppercase">
            Hora
          </span>
          {professionals.map((person) => (
            <div
              className="flex items-center gap-2.5 border-l border-[#d8dee7] px-3 py-3"
              key={person.id}
            >
              <span className="dashboard-avatar grid size-9 shrink-0 place-items-center rounded-full bg-[#eaf1f8] text-xs font-extrabold text-[#244f82]">
                {person.initials}
              </span>
              <div className="grid min-w-0 gap-1">
                <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                  {person.name}
                </strong>
                <small className="text-[.68rem] text-[#69788c]">
                  {
                    bookings.filter(
                      (booking) => booking.professional === person.id,
                    ).length
                  }{" "}
                  turnos
                </small>
              </div>
            </div>
          ))}
        </div>
        <div className="dashboard-schedule-body grid grid-cols-[72px_repeat(var(--agenda-columns),minmax(170px,1fr))]">
          <div className="dashboard-hours grid">
            {Array.from({ length: 9 }, (_, index) => (
              <span
                className="h-[144px] border-b border-dashed border-[#e6eaf0] px-3 pt-2 text-[.68rem] tabular-nums text-[#69788c]"
                key={index}
              >
                {String(index + 9).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {professionals.map((person) => (
            <div
              className="dashboard-professional relative h-[1296px] border-l border-[#e6eaf0] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_143px,#e6eaf0_143px,#e6eaf0_144px)]"
              key={person.id}
            >
              <div className="dashboard-break absolute top-[576px] right-0 left-0 z-0 border-y border-dashed border-[#dfe5ed] bg-[#f3f5f8]/90 py-1 text-center text-[.625rem] text-[#69788c]">
                Descanso · 13:00–14:00
              </div>
              {bookings
                .filter((booking) => booking.professional === person.id)
                .map((booking) => {
                  const service = services.find(
                    (item) => item.id === booking.service,
                  )!;
                  return (
                    <button
                      key={booking.id}
                      className="dashboard-appointment absolute right-1.5 left-1.5 z-10 grid content-start gap-1 overflow-hidden rounded border-l-[3px] border-[#244f82] bg-[#eaf1f8] px-2.5 py-2 text-left text-[#1d2939] transition hover:z-20 hover:brightness-[.98] focus-visible:outline-2 focus-visible:outline-[#244f82]"
                      style={{
                        top: (minutes(booking.time) - 540) * 2.4,
                        height: service.duration * 2.4 - 4,
                      }}
                      onClick={() => onSelect(booking)}
                      aria-label={`${booking.time}, ${booking.name}, ${service.name}, ${person.name}, confirmada`}
                    >
                      <span className="flex items-baseline justify-between gap-1 text-[.68rem] font-extrabold tabular-nums">
                        {booking.time}
                        <small className="text-[.62rem] font-medium text-[#526174]">
                          {service.duration} min
                        </small>
                      </span>
                      <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[.72rem]">
                        {booking.name}
                      </strong>
                      <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[.64rem] text-[#526174]">
                        {service.name} · Confirmada
                      </small>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      <div className="dashboard-agenda-list hidden max-[700px]:grid">
        {bookings.map((booking) => (
          <button
            className="flex min-h-[72px] items-center gap-3 border-b border-[#e6eaf0] px-4 py-3 text-left last:border-0"
            key={booking.id}
            onClick={() => onSelect(booking)}
          >
            <time className="text-sm font-extrabold tabular-nums text-[#244f82]">
              {booking.time}
            </time>
            <span className="grid min-w-0 flex-1 gap-1">
              <strong className="text-sm">{booking.name}</strong>
              <span className="text-xs text-[#526174]">
                {
                  services.find((service) => service.id === booking.service)
                    ?.name
                }
              </span>
              <small className="text-[.68rem] text-[#69788c]">
                {
                  professionals.find(
                    (person) => person.id === booking.professional,
                  )?.name
                }{" "}
                · Confirmada
              </small>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
    </>
  );
}
