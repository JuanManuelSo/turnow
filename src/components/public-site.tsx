"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  MapPin,
} from "lucide-react";
import {
  Booking,
  Identity,
  dateLabel,
  locationAddress,
  locationMapUrl,
} from "@/modules/prototype";
import { Button, ConfirmationDialog, FormField, Input } from "./ui";
import { Summary } from "./summary";
import { BookingFlow } from "./booking-flow";
import {
  StorefrontFooter,
  StorefrontHeader,
  StorefrontHome,
} from "@/features/storefront/storefront-home";

type Props = {
  identity: Identity;
  bookings: Booking[];
  addBooking: (b: Booking) => void;
  cancel: (id: string) => void;
  copy: (s: string) => void;
  empty: boolean;
  clearEmpty: () => void;
  conflict: boolean;
  clearConflict: () => void;
  openPanel: () => void;
};
export function PublicSite(props: Props) {
  const { identity, bookings, cancel, copy } = props;
  const [view, setView] = useState<"home" | "book" | "success" | "cancel">(
    "home",
  );
  const [initialService, setInitialService] = useState("corte");
  const [result, setResult] = useState<Booking | null>(null);
  const [code, setCode] = useState("");
  const [found, setFound] = useState<Booking | null>(null);
  const [confirmingCancellation, setConfirmingCancellation] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo(0, 0);
  }, [view, cancelled]);
  function navigate(next: typeof view) {
    setView(next);
    setError("");
    setFound(null);
    setConfirmingCancellation(false);
    setCancelled(false);
  }
  function start(service = "corte") {
    setInitialService(service);
    navigate("book");
  }
  return (
    <>
      {view !== "book" && (
        <StorefrontHeader
          name={identity.name}
          onCancel={() => navigate("cancel")}
        />
      )}
      <main id="main" className="public-main mx-auto w-full max-w-[1440px] px-[clamp(20px,5vw,72px)] max-[600px]:px-5">
        {view === "home" && (
          <StorefrontHome
            identity={identity}
            onBook={(service) => start(service)}
            onCancel={() => navigate("cancel")}
            headingRef={heading}
          />
        )}
        {view === "book" && (
          <BookingFlow
            bookings={bookings}
            initialService={initialService}
            back={() => navigate("home")}
            onSuccess={(b) => {
              props.addBooking(b);
              setResult(b);
              setView("success");
            }}
            empty={props.empty}
            clearEmpty={props.clearEmpty}
            conflict={props.conflict}
            clearConflict={props.clearConflict}
          />
        )}
        {view === "success" && result && (
          <section className="result-page mx-auto my-8 grid w-full max-w-[680px] justify-items-start gap-3.5 max-[600px]:my-4 max-[600px]:gap-3">
            <span className="result-icon grid size-11 place-items-center rounded-full bg-[#eaf3ed] text-success max-[600px]:size-9">
              <Check size={30} />
            </span>
            <h1 className="text-[clamp(1.8rem,5vw,3.25rem)] leading-[1.04] tracking-[-.055em]" ref={heading} tabIndex={-1}>
              Tu turno está confirmado.
            </h1>
            <p className="text-sm leading-relaxed">Ya tenés un momento para vos. Te esperamos.</p>
            <div className="result-date flex w-full items-center justify-between gap-3 rounded-lg bg-surface-muted px-5 py-3.5 text-sm font-bold capitalize max-[600px]:px-4 max-[600px]:py-3">
              <span>{dateLabel(result.date)}</span>
              <strong className="shrink-0 text-xl tabular-nums max-[600px]:text-lg">{result.time} h</strong>
            </div>
            <div className="private-code grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 rounded-lg border border-[#c9d8e8] bg-surface p-4 max-[600px]:grid-cols-1 max-[600px]:gap-2.5 max-[600px]:p-3.5">
              <div className="min-w-0">
                <h2 className="text-base font-bold leading-snug">Guardá tu código de cancelación</h2>
                <p className="mt-1 text-xs leading-relaxed">Lo necesitás para cancelar este turno. No lo compartas.</p>
              </div>
              <code className="col-span-1 row-start-2 block w-full rounded bg-surface-muted px-3 py-2.5 font-mono text-sm font-bold tracking-wide text-foreground [overflow-wrap:anywhere] max-[600px]:text-center">{result.code}</code>
              <Button variant="secondary" className="row-span-2 min-h-11 whitespace-nowrap max-[600px]:row-span-1 max-[600px]:w-full" onClick={() => copy(result.code)}>
                Copiar código
                <Copy size={16} />
              </Button>
            </div>
            <div className="result-booking-details w-full rounded-lg border border-border bg-surface px-4 py-1 max-[600px]:px-3.5">
              <Summary {...result} />
            </div>
            <p className="quiet-note flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={16} />
              <a
                className="confirmation-location inline-flex min-h-11 items-center gap-2 font-bold text-brand underline underline-offset-4"
                href={locationMapUrl(locationAddress(result.location))}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver ${locationAddress(result.location)} en Google Maps (abre una pestaña nueva)`}
              >
                {locationAddress(result.location)}, Rosario
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </p>
            <Button variant="text" onClick={() => navigate("home")}>
              Volver al estudio
              <ArrowRight size={16} />
            </Button>
            <small className="simulation-note block text-xs text-muted-foreground">
              Confirmación simulada. No enviamos WhatsApp ni email.
            </small>
          </section>
        )}
        {view === "cancel" && (
          <section className="cancel-page mx-auto my-8 grid w-full max-w-[620px] content-start gap-5">
            <button className="back-link flex min-h-11 items-center gap-2 text-sm text-muted-foreground" onClick={() => navigate("home")}>
              <ArrowLeft size={16} />
              Volver al estudio
            </button>
            {cancelled ? (
              <>
                <span className="result-icon grid size-14 place-items-center rounded-full bg-[#eaf3ed] text-success">
                  <Check size={28} />
                </span>
                <h1 className="text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-[-.05em]" ref={heading} tabIndex={-1}>
                  Tu turno fue cancelado.
                </h1>
                <p className="text-base leading-relaxed">
                  El horario vuelve a estar disponible. Cuando quieras, te
                  esperamos de nuevo.
                </p>
                <Button onClick={() => start()}>
                  Reservar otro turno
                  <ArrowRight size={17} />
                </Button>
              </>
            ) : (
              <>
                <h1 className="text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] tracking-[-.05em]" ref={heading} tabIndex={-1}>
                  ¿Cambiaron tus planes?
                </h1>
                <p className="text-base leading-relaxed">
                  Ingresá el código privado de tu reserva. Vas a poder revisar
                  el turno antes de cancelarlo.
                </p>
                <form
                  className="grid gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setError("");
                    const b = bookings.find(
                      (b) => b.code.toUpperCase() === code.trim().toUpperCase(),
                    );
                    setFound(b || null);
                    if (!b)
                      setError(
                        "No encontramos ese código. Revisá que esté completo y volvé a intentar.",
                      );
                  }}
                >
                  <FormField
                    label="Código privado"
                    htmlFor="cancel-code"
                    error={error || undefined}
                  >
                    <Input
                      id="cancel-code"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setFound(null);
                        setError("");
                      }}
                      placeholder="Ej. HOMBRES-7K9P-2M4X"
                      autoCapitalize="characters"
                      spellCheck={false}
                      required
                      aria-invalid={!!error}
                      aria-describedby={error ? "cancel-code-error" : undefined}
                    />
                  </FormField>
                  <Button type="submit" variant="secondary">
                    Buscar turno
                    <ArrowRight size={16} />
                  </Button>
                </form>
                {found && (
                  <div className="cancel-summary grid gap-4 rounded-lg border border-border bg-surface p-5 max-[600px]:p-4">
                    {found.status === "Cancelada" ? (
                      <p role="status">
                        Este turno ya está cancelado. No necesitás hacer nada
                        más.
                      </p>
                    ) : (
                      <>
                        <h2 className="text-lg font-bold">Encontramos tu turno</h2>
                        <Summary {...found} />
                          <p className="text-sm leading-relaxed">
                          Al cancelar, liberás este horario. Esta acción no se
                          puede deshacer.
                        </p>
                        <Button
                          variant="danger"
                          onClick={() => setConfirmingCancellation(true)}
                        >
                          Cancelar este turno
                        </Button>
                        {confirmingCancellation && (
                          <ConfirmationDialog
                            date={found.date}
                            time={found.time}
                            location={locationAddress(found.location)}
                            onCancel={() => setConfirmingCancellation(false)}
                            onConfirm={() => {
                              cancel(found.id);
                              setConfirmingCancellation(false);
                              setCancelled(true);
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
                <p className="help-copy text-sm text-muted-foreground">
                  ¿No encontrás tu código? Contactá al estudio para recibir
                  ayuda.
                </p>
              </>
            )}
          </section>
        )}
      </main>
      <StorefrontFooter name={identity.name} onOpenPanel={props.openPanel} />
    </>
  );
}
