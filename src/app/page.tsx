"use client";
import { useEffect, useState } from "react";
import { FlaskConical, X, CheckCircle2 } from "lucide-react";
import {
  Booking,
  Identity,
  initialBookings,
  initialIdentity,
  locations,
} from "@/modules/prototype";
import { PublicSite } from "@/components/public-site";
import { OwnerPanel } from "@/components/owner-panel";

export default function Page() {
  const [admin, setAdmin] = useState(false);
  const [identity, setIdentity] = useState<Identity>(initialIdentity);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [lab, setLab] = useState(false);
  const [labMode, setLabMode] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [emptyAgenda, setEmptyAgenda] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("turnow-demo-v1");
      if (raw) {
        const saved = JSON.parse(raw);
        setIdentity({
          ...saved.identity,
          name:
            saved.identity.name === "Estudio Norte"
              ? initialIdentity.name
              : saved.identity.name,
          description:
            saved.identity.description ===
            "Un espacio para encontrar tu estilo. Cortes cuidados, buena conversación y tiempo para vos."
              ? initialIdentity.description
              : saved.identity.description,
        });
        setBookings(
          saved.bookings.map((booking: Booking) => ({
            ...booking,
            location: locations.some((place) => place.id === booking.location)
              ? booking.location
              : "urquiza",
          })),
        );
      }
    } catch {
      /* Optional local storage. Existing bookings without a location belong to the original demo site. */
    }
    setAdmin(location.hash === "#panel");
    setLabMode(new URLSearchParams(location.search).get("lab") === "1");
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(
          "turnow-demo-v1",
          JSON.stringify({ identity, bookings }),
        );
      } catch {
        /* State remains available in memory. */
      }
    }
  }, [ready, identity, bookings]);
  function toggleAdmin() {
    if (
      editorDirty &&
      !window.confirm(
        "Tenés cambios sin publicar. ¿Querés descartarlos y salir?",
      )
    )
      return;
    setEditorDirty(false);
    setAdmin(!admin);
    history.replaceState(null, "", admin ? "#estudio" : "#panel");
    setNotice("");
  }
  function cancel(id: string) {
    setBookings((items) =>
      items.map((b) => (b.id === id ? { ...b, status: "Cancelada" } : b)),
    );
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Código copiado.");
    } catch {
      setNotice("Seleccioná el código y copialo manualmente.");
    }
  }
  return (
    <div
      className={`app min-h-screen bg-background text-foreground ${admin ? "admin grid grid-cols-[240px_minmax(0,1fr)] content-start [--brand:#173d70] [--brand-soft:#e5edf7] [--on-brand-soft:#173d70] [--focus-ring:#af2433] max-[1150px]:grid-cols-[205px_minmax(0,1fr)] max-[800px]:block min-[1600px]:grid-cols-[260px_minmax(0,1fr)]" : "public"}`}
      data-theme={admin ? "mineral" : identity.palette}
      data-font={admin ? "manrope" : identity.font}
    >
      <a href="#main" className="skip-link fixed -top-20 left-4 z-[100] bg-surface p-3 focus:top-3">
        Ir al contenido
      </a>
      {labMode && (
        <div className="prototype-bar col-span-full flex min-h-[38px] items-center justify-between gap-3 bg-[#142b49] px-[clamp(16px,4vw,56px)] py-1 text-xs text-[#f6f8fb] max-[600px]:text-[.6875rem]">
          <span className="flex items-center gap-2 max-[600px]:max-w-[100px] max-[600px]:leading-[1.4]">
            <FlaskConical size={14} />
            Laboratorio de demostración
          </span>
          <div className="flex items-center gap-5 max-[600px]:gap-2.5">
            {admin && <button onClick={toggleAdmin}>Ver página pública</button>}
            <button onClick={() => setLab(!lab)} aria-expanded={lab}>
              Probar estados
            </button>
            <button
              onClick={() => {
                setBookings(initialBookings);
                setIdentity(initialIdentity);
                setEmpty(false);
                setConflict(false);
                setEmptyAgenda(false);
                setNotice("Datos de ejemplo restablecidos.");
              }}
            >
              Restablecer demo
            </button>
          </div>
        </div>
      )}
      {labMode && lab && (
        <section className="demo-tools col-span-full flex flex-wrap items-center gap-4 bg-[#fff7df] px-8 py-4 text-[.8125rem] text-[#56431d] max-[600px]:gap-3 max-[600px]:px-4" aria-label="Escenarios de demostración">
          <strong>Escenarios</strong>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={empty}
              onChange={(e) => setEmpty(e.target.checked)}
            />
            Sin disponibilidad
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={conflict}
              onChange={(e) => setConflict(e.target.checked)}
            />
            Ocupar horario al confirmar
          </label>
          <button
            onClick={() => {
              setAdmin(true);
              setEmptyAgenda(true);
            }}
          >
            Agenda vacía
          </button>
          <span>
            Código de ejemplo:{" "}
            {bookings.find((b) => b.id === "a1")?.code ??
              initialBookings[0].code}
          </span>
        </section>
      )}
      {notice && (
        <div className="toast fixed bottom-6 left-1/2 z-50 flex w-max max-w-[calc(100%_-_32px)] -translate-x-1/2 items-center gap-3 rounded-lg bg-[#142b49] px-4 py-3 text-sm text-white shadow-lg max-[600px]:bottom-4" role="status">
          <CheckCircle2 size={18} />
          {notice}
          <button className="grid size-8 place-items-center text-white" aria-label="Cerrar aviso" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {admin ? (
        <OwnerPanel
          identity={identity}
          publish={setIdentity}
          bookings={bookings}
          setBookings={setBookings}
          cancel={cancel}
          notify={setNotice}
          openPublic={toggleAdmin}
          emptyAgenda={emptyAgenda}
          onDirty={setEditorDirty}
        />
      ) : (
        <PublicSite
          identity={identity}
          bookings={bookings}
          addBooking={(b) => setBookings((previous) => [...previous, b])}
          cancel={cancel}
          copy={copy}
          empty={empty}
          clearEmpty={() => setEmpty(false)}
          conflict={conflict}
          clearConflict={() => setConflict(false)}
          openPanel={toggleAdmin}
        />
      )}
    </div>
  );
}
