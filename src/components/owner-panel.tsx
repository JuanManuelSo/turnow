"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutTemplate,
  Plus,
  X,
} from "lucide-react";
import {
  addDays,
  available,
  baseDate,
  Booking,
  dateLabel,
  eligible,
  initialDate,
  Identity,
  locationAddress,
  locations,
  LocationId,
  minutes,
  services,
  slots,
  team,
} from "@/modules/prototype";
import { PAGE_EDITOR_ENABLED } from "@/config/features";
import { Brand, Button, Empty, Input, Select } from "./ui";
import { Summary } from "./summary";
import { IdentityEditor } from "./identity-editor";
type Props = {
  identity: Identity;
  publish: (i: Identity) => void;
  bookings: Booking[];
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  cancel: (id: string) => void;
  notify: (s: string) => void;
  openPublic: () => void;
  emptyAgenda: boolean;
  onDirty: (d: boolean) => void;
};
export function OwnerPanel({
  identity,
  publish,
  bookings,
  setBookings,
  cancel,
  notify,
  openPublic,
  emptyAgenda,
  onDirty,
}: Props) {
  const [view, setView] = useState<"agenda" | "identity">("agenda");
  const [date, setDate] = useState(initialDate);
  const [filter, setFilter] = useState("all");
  const [location, setLocation] = useState<LocationId>("urquiza");
  const [detail, setDetail] = useState<Booking | null>(null);
  const [mode, setMode] = useState<"detail" | "new" | "move" | "cancel" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [manual, setManual] = useState({
    name: "",
    phone: "",
    service: "corte",
    professional: "julia",
    location: "urquiza" as LocationId,
    date: initialDate,
    time: "",
  });
  const dialog = useRef<HTMLDialogElement>(null);
  const focusReturn = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (emptyAgenda) setDate(addDays(initialDate, 7));
  }, [emptyAgenda]);
  useEffect(() => {
    heading.current?.focus();
  }, [view]);
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (mode) {
      focusReturn.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
      focusReturn.current?.focus();
    }
  }, [!!mode]);
  function leave(action: () => void) {
    if (
      !dirty ||
      window.confirm(
        "Tenés cambios sin publicar. ¿Querés descartarlos y salir?",
      )
    ) {
      setDirty(false);
      action();
    }
  }
  function close() {
    setMode(null);
    setError("");
  }
  function create() {
    setManual({
      name: "",
      phone: "",
      service: "corte",
      professional:
        filter !== "all" &&
        eligible("corte", location).some((p) => p.id === filter)
          ? filter
          : eligible("corte", location)[0].id,
      location,
      date,
      time: "",
    });
    setMode("new");
    setError("");
  }
  const visibleStaff = team.filter(
    (p) =>
      p.location === location ||
      bookings.some(
        (b) =>
          b.location === location &&
          b.date === date &&
          b.professional === p.id &&
          b.status === "Confirmada",
      ),
  );
  const entries = bookings
    .filter(
      (b) =>
        b.date === date &&
        b.location === location &&
        b.status === "Confirmada" &&
        (filter === "all" || b.professional === filter),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  function save() {
    if (
      !manual.name.trim() ||
      manual.phone.replace(/\D/g, "").length < 8 ||
      !manual.time
    ) {
      setError("Completá nombre, teléfono válido y horario.");
      return;
    }
    if (
      !available(
        manual.date,
        manual.time,
        manual.service,
        manual.professional,
        manual.location,
        bookings,
        mode === "move" ? detail?.id : undefined,
      ).length
    ) {
      setError(
        "Ese horario no está disponible. Elegí otro; el turno original se conserva.",
      );
      return;
    }
    if (mode === "move" && detail)
      setBookings((previous) =>
        previous.map((b) =>
          b.id === detail.id
            ? {
                ...b,
                location: manual.location,
                professional: manual.professional,
                date: manual.date,
                time: manual.time,
              }
            : b,
        ),
      );
    else
      setBookings((previous) => [
        ...previous,
        {
          ...manual,
          id: crypto.randomUUID(),
          code: `HOMBRES-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          status: "Confirmada",
        },
      ]);
    setDate(manual.date);
    setLocation(manual.location);
    notify(
      mode === "move"
        ? "El turno se reprogramó."
        : "El turno se agregó a la agenda.",
    );
    close();
  }
  return (
    <>
      <aside className="sidebar col-start-1 flex min-h-[calc(100vh_-_38px)] flex-col bg-[#142b49] px-5 py-8 text-white max-[800px]:min-h-0 max-[800px]:flex-row max-[800px]:items-center max-[800px]:justify-between max-[800px]:gap-5 max-[800px]:p-5 max-[600px]:gap-3 max-[600px]:px-4">
        <button
          onClick={() => leave(() => setView("agenda"))}
          className="platform-logo px-3 text-left text-[2rem] leading-[1.2] font-extrabold tracking-[-.05em] max-[800px]:p-0 max-[800px]:text-[1.6rem] max-[600px]:text-[1.4rem]"
        >
          turnow<span className="text-[#ee707a]">.</span>
        </button>
        <div className="business-switch px-3 pt-7 pb-8 max-[800px]:hidden">
          <Brand name={identity.name} small />
          <small className="mt-2.5 ml-[46px] block text-[.6875rem] text-[#c8d7e7]">Espacio de trabajo</small>
        </div>
        <nav className="grid gap-2 max-[800px]:flex max-[800px]:gap-2" aria-label="Panel del negocio">
          <button
            className={`flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm max-[600px]:gap-2 max-[600px]:px-2.5 max-[600px]:text-xs ${view === "agenda" ? "bg-[#245487] font-bold text-white" : "text-[#d7e3ef] hover:bg-[#245487]/60"}`}
            onClick={() => leave(() => setView("agenda"))}
          >
            <CalendarDays size={19} />
            Agenda
          </button>
          {PAGE_EDITOR_ENABLED && (
            <button
              className={`flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-left text-sm max-[600px]:gap-2 max-[600px]:px-2.5 max-[600px]:text-xs ${view === "identity" ? "bg-[#245487] font-bold text-white" : "text-[#d7e3ef] hover:bg-[#245487]/60"}`}
              onClick={() => setView("identity")}
            >
              <LayoutTemplate size={19} />
              Página pública
            </button>
          )}
        </nav>
        <div className="sidebar-foot mt-auto px-3 pt-20 max-[800px]:hidden">
          <p>Tu negocio, a tu manera.</p>
          <button onClick={openPublic}>
            Abrir página de reservas
            <ExternalLink size={16} />
          </button>
          <small>Sesión de demostración · Dueño</small>
        </div>
      </aside>
      <main id="main" className="admin-main agenda-main col-start-2 flex min-h-svh min-w-0 flex-col bg-[#f4f6f9] px-10 py-12 max-[1150px]:px-6 max-[1150px]:py-9 max-[800px]:px-5 max-[800px]:py-7 min-[1600px]:px-16 min-[1600px]:py-14">
        {view === "identity" && PAGE_EDITOR_ENABLED ? (
          <IdentityEditor
            identity={identity}
            publish={publish}
            notify={notify}
            onDirty={setDirty}
          />
        ) : (
          <>
            <div className="admin-heading mb-[30px] flex items-center justify-between gap-6 max-[600px]:flex-wrap max-[600px]:gap-5">
              <div>
                <h1 className="text-[2rem] leading-[1.15] tracking-[-.055em] max-[600px]:text-[1.9rem]" ref={heading} tabIndex={-1}>
                  Tu agenda, en orden.
                </h1>
                <p className="mt-2.5 text-sm text-muted-foreground">Un día a la vez. Todo tu equipo en un mismo lugar.</p>
              </div>
              <Button onClick={create}>
                <Plus size={18} />
                Nuevo turno
              </Button>
            </div>
            <div className="agenda-toolbar flex flex-wrap items-center justify-between gap-6 border-y border-border py-5 max-[1150px]:gap-3 max-[600px]:flex-col max-[600px]:items-stretch">
              <div className="agenda-date flex items-center gap-2 max-[600px]:justify-between max-[360px]:flex-wrap">
                <Button
                  variant="secondary"
                  aria-label="Día anterior"
                  onClick={() => setDate(addDays(date, -1))}
                >
                  <ChevronLeft size={17} />
                </Button>
                <label className="flex items-center gap-2">
                  <CalendarDays size={19} />
                  <Input
                    type="date"
                    aria-label="Fecha de agenda"
                    value={date}
                    onChange={(e) => e.target.value && setDate(e.target.value)}
                  />
                </label>
                <Button
                  variant="secondary"
                  aria-label="Día siguiente"
                  onClick={() => setDate(addDays(date, 1))}
                >
                  <ChevronRight size={17} />
                </Button>
                <button
                    className="today-button min-h-11 px-2 text-xs font-bold text-brand"
                  onClick={() => setDate(baseDate)}
                >
                  Hoy
                </button>
              </div>
              <label className="professional-filter flex items-center gap-3 text-xs max-[600px]:justify-between">
                <span>Sede</span>
                <Select
                  aria-label="Sede de agenda"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value as LocationId);
                    setFilter("all");
                  }}
                >
                  {locations.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.address}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="professional-filter flex items-center gap-3 text-xs max-[600px]:justify-between">
                <span>Profesional</span>
                <Select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Todo el equipo</option>
                  {visibleStaff.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="agenda-caption flex items-center justify-between gap-4 py-5 max-[800px]:flex-col max-[800px]:items-start">
              <h2 className="text-base font-bold capitalize">
                {dateLabel(date)} · {locationAddress(location)}
              </h2>
              <span className="text-xs text-muted-foreground">{entries.length} turnos confirmados · Vista diaria</span>
            </div>
            {!entries.length ? (
              <Empty
                className="agenda-empty-state min-h-[300px] flex-1 content-center"
                title="Un día con espacio para nuevos turnos"
                action="Crear un turno"
                onAction={create}
              >
                No hay reservas para esta fecha
                {filter !== "all" ? " y este profesional" : ""}. También podés
                consultar otro día.
              </Empty>
            ) : (
              <>
                <div
                  className="schedule-desktop overflow-hidden rounded-lg border border-border bg-surface max-[800px]:hidden"
                  style={
                    {
                      "--columns": filter === "all" ? visibleStaff.length : 1,
                    } as React.CSSProperties
                  }
                >
                  <div className="schedule-heading grid grid-cols-[64px_repeat(var(--columns),minmax(0,1fr))] border-b border-border bg-[#f3f5f9]">
                    <span className="self-center text-center text-[.6875rem] text-muted-foreground">Hora</span>
                    {visibleStaff
                      .filter((p) => filter === "all" || p.id === filter)
                      .map((p) => (
                        <div className="flex items-center gap-2.5 border-l border-border p-4 max-[1150px]:px-2" key={p.id}>
                          <span className="avatar grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-[.625rem] font-bold max-[1150px]:hidden">{p.initials}</span>
                          <span className="grid gap-0.5">
                            <strong className="text-[.8125rem]">{p.name}</strong>
                            <small className="text-[.6875rem] text-muted-foreground">
                              {
                                entries.filter((b) => b.professional === p.id)
                                  .length
                              }{" "}
                              turnos
                            </small>
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="schedule-body grid grid-cols-[64px_repeat(var(--columns),minmax(0,1fr))] pb-4">
                    <div className="time-rail flex flex-col">
                      {Array.from({ length: 10 }, (_, i) => (
                        <span className="h-[114px] shrink-0 -translate-y-[9px] text-center text-[.6875rem] tabular-nums text-muted-foreground first:translate-y-0 first:pt-1 last:h-0" key={i}>{String(i + 9).padStart(2, "0")}:00</span>
                      ))}
                    </div>
                    {visibleStaff
                      .filter((p) => filter === "all" || p.id === filter)
                      .map((p) => (
                        <div className="professional-column relative border-l border-border" key={p.id}>
                          {Array.from({ length: 9 }, (_, i) => (
                            <div className="hour-line h-[114px] border-b border-[#e9edf3]" key={i} />
                          ))}
                          <div className="lunch-break absolute top-[456px] right-0 left-0 grid h-[114px] place-items-center bg-[#f5f6f8] text-[.6875rem] text-muted-foreground">
                            Descanso · 13:00–14:00
                          </div>
                          {entries
                            .filter((b) => b.professional === p.id)
                            .map((b) => {
                              const s = services.find(
                                (s) => s.id === b.service,
                              )!;
                              return (
                                <button
                                  className={`appointment absolute right-2 left-2 flex flex-col overflow-hidden rounded bg-[#e8effb] px-3 py-[7px] text-left text-[#294b83] hover:shadow-md max-[1150px]:px-2 ${s.duration === 30 ? "compact grid grid-cols-[1fr_auto] content-center items-center gap-x-1.5 px-2 py-1" : ""} ${p.id === "tomas" ? "bg-[#eaf1ee] text-[#36594a]" : p.id === "lucia" ? "bg-[#f2edf6] text-[#654b7a]" : ""}`}
                                  key={b.id}
                                  style={{
                                    top: (minutes(b.time) - 540) * 1.9,
                                    height: s.duration * 1.9 - 4,
                                  }}
                                  onClick={() => {
                                    setDetail(b);
                                    setMode("detail");
                                  }}
                                >
                                  <span className={`appointment-time flex justify-between gap-2 text-xs tabular-nums ${s.duration === 30 ? "col-start-2 row-start-1" : ""}`}>
                                    {b.time}
                                    <span>{s.duration} min</span>
                                  </span>
                                  <strong className={`mt-1 text-[.875rem] leading-[1.4] ${s.duration === 30 ? "col-start-1 row-start-1 m-0" : ""}`}>{b.name}</strong>
                                  <span className={`appointment-service mt-1 text-xs ${s.duration === 30 ? "col-span-full m-0" : ""}`}>
                                    {s.name} · Confirmada
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      ))}
                  </div>
                </div>
                <div className="schedule-mobile hidden overflow-hidden rounded-lg bg-surface max-[800px]:block">
                  {entries.map((b) => (
                    <button
                      className="grid w-full grid-cols-[56px_minmax(0,1fr)_18px] items-center gap-4 border-b border-border p-5 text-left last:border-0 hover:bg-brand-soft max-[600px]:grid-cols-[48px_minmax(0,1fr)_16px] max-[600px]:gap-3 max-[600px]:px-4"
                      key={b.id}
                      onClick={() => {
                        setDetail(b);
                        setMode("detail");
                      }}
                    >
                      <span className="mobile-time self-start text-base font-bold tabular-nums">{b.time}</span>
                      <span className="grid min-w-0 gap-1">
                        <strong className="text-sm">{b.name}</strong>
                        <span className="text-xs text-muted-foreground">
                          {services.find((s) => s.id === b.service)?.name}
                        </span>
                        <small className="text-xs text-muted-foreground">
                          {team.find((p) => p.id === b.professional)?.name} ·
                          Confirmada
                        </small>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="agenda-footnote mt-5 text-xs text-muted-foreground">
              Horarios de Rosario · Los cambios se guardan solo en este
              navegador.
            </p>
          </>
        )}
      </main>
      <dialog
        ref={dialog}
        aria-labelledby="dialog-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
        }}
        className="detail-dialog m-auto max-h-[calc(100dvh_-_32px)] w-[520px] max-w-[calc(100vw_-_32px)] overflow-y-auto rounded-[10px] border-0 bg-surface p-0 text-foreground shadow-[0_16px_64px_#182c4033] backdrop:bg-[#142b4970] max-[600px]:max-w-[calc(100vw_-_24px)]"
      >
        <div className="dialog-content relative p-9 max-[600px]:px-6 max-[600px]:py-8">
          <button
            className="dialog-close absolute top-3 right-3 grid size-11 place-items-center"
            onClick={close}
            aria-label="Cerrar detalle"
          >
            <X size={21} />
          </button>
          {mode === "new" || mode === "move" ? (
            <>
              <h2 className="pr-6 text-2xl max-[600px]:text-[1.3rem]" id="dialog-title">
                {mode === "move" ? "Reprogramar turno" : "Nuevo turno"}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {mode === "move"
                  ? "El turno original se conserva hasta guardar el nuevo horario."
                  : "Agregá una reserva a la agenda del equipo."}
              </p>
              <form
                className="manual-form mt-6 grid gap-4 [&_label]:grid [&_label]:gap-2 [&_label]:text-[.8125rem]"
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
              >
                <label>
                  Nombre y apellido
                  <Input
                    required
                    value={manual.name}
                    readOnly={mode === "move"}
                    onChange={(e) =>
                      setManual({ ...manual, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Teléfono
                  <Input
                    required
                    type="tel"
                    value={manual.phone}
                    readOnly={mode === "move"}
                    onChange={(e) =>
                      setManual({ ...manual, phone: e.target.value })
                    }
                  />
                </label>
                <label>
                  Servicio
                  <Select
                    disabled={mode === "move"}
                    value={manual.service}
                    onChange={(e) =>
                      setManual({
                        ...manual,
                        service: e.target.value,
                        professional: eligible(
                          e.target.value,
                          manual.location,
                        )[0].id,
                        time: "",
                      })
                    }
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.duration} min
                      </option>
                    ))}
                  </Select>
                </label>
                <label>
                  Sede
                  <Select
                    aria-label="Sede del turno"
                    value={manual.location}
                    onChange={(e) =>
                      setManual({
                        ...manual,
                        location: e.target.value as LocationId,
                        professional: eligible(
                          manual.service,
                          e.target.value as LocationId,
                        )[0].id,
                        time: "",
                      })
                    }
                  >
                    {locations.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.address}
                      </option>
                    ))}
                  </Select>
                </label>
                <label>
                  Profesional
                  <Select
                    value={manual.professional}
                    onChange={(e) =>
                      setManual({
                        ...manual,
                        professional: e.target.value,
                        time: "",
                      })
                    }
                  >
                    {eligible(manual.service, manual.location).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label>
                  Fecha
                  <Input
                    type="date"
                    required
                    min={baseDate}
                    value={manual.date}
                    onChange={(e) =>
                      setManual({ ...manual, date: e.target.value, time: "" })
                    }
                  />
                </label>
                <label>
                  Horario
                  <Select
                    required
                    value={manual.time}
                    onChange={(e) =>
                      setManual({ ...manual, time: e.target.value })
                    }
                  >
                    <option value="">Elegí un horario</option>
                    {manual.date &&
                      slots(
                        manual.date,
                        manual.service,
                        manual.professional,
                        manual.location,
                        bookings,
                        mode === "move" ? detail?.id : undefined,
                      ).map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </label>
                {manual.date &&
                  !slots(
                    manual.date,
                    manual.service,
                    manual.professional,
                    manual.location,
                    bookings,
                    mode === "move" ? detail?.id : undefined,
                  ).length && (
                     <p className="inline-info rounded-lg bg-surface-muted p-4 text-sm">
                      No hay horarios disponibles. Elegí otra fecha.
                    </p>
                  )}
                {error && (
                   <p role="alert" className="error rounded-lg bg-danger-soft p-4 text-sm text-danger">
                    {error}
                  </p>
                )}
                <Button type="submit">
                  {mode === "move" ? "Guardar nuevo horario" : "Crear turno"}
                </Button>
              </form>
            </>
          ) : (
            detail && (
              <>
                <h2 className="pr-6 text-2xl max-[600px]:text-[1.3rem]" id="dialog-title">
                  {mode === "cancel" ? "¿Cancelar este turno?" : detail.name}
                </h2>
                <span className="status-label mt-3 inline-block rounded bg-success-soft px-2.5 py-1 text-xs text-success">Confirmada</span>
                <p className="mt-3 text-sm text-muted-foreground">
                  {mode === "cancel"
                    ? "El horario quedará libre. No se envía ningún mensaje en esta demo."
                    : "Detalle de la reserva"}
                </p>
                <Summary {...detail} />
                {mode === "cancel" ? (
                   <div className="detail-actions mt-6 grid gap-2">
                    <Button
                      variant="danger"
                      onClick={() => {
                        cancel(detail.id);
                        notify("El turno se canceló y el horario quedó libre.");
                        close();
                      }}
                    >
                      Confirmar cancelación
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setMode("detail")}
                    >
                      Conservar turno
                    </Button>
                  </div>
                ) : (
                  <>
                     <p className="mt-3 text-sm text-muted-foreground">Teléfono: {detail.phone}</p>
                     <div className="detail-actions mt-6 grid gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setManual({
                            name: detail.name,
                            phone: detail.phone,
                            service: detail.service,
                            professional: detail.professional,
                            location: detail.location,
                            date: detail.date,
                            time: detail.time,
                          });
                          setMode("move");
                        }}
                      >
                        Reprogramar turno
                      </Button>
                      <Button variant="text" onClick={() => setMode("cancel")}>
                        Cancelar turno
                      </Button>
                    </div>
                  </>
                )}
              </>
            )
          )}
        </div>
      </dialog>
    </>
  );
}
