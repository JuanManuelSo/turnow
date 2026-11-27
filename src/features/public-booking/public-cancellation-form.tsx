"use client";

import { useState, useTransition } from "react";
import { CalendarDays, MapPin, UserRound } from "lucide-react";
import {
  cancelPublicBooking,
  lookupPublicBooking,
  type PublicCancellationLookup,
} from "@/app/[businessSlug]/actions";
import { ConfirmationDialog } from "@/components/ui";
import type { PageTheme } from "@/server/db/schema";
import {
  PublicPageFooter,
  PublicPageHeader,
} from "./public-page-chrome";
import { publicPageStyle } from "./public-page-style";

function statusText(status: string) {
  if (status === "cancelled") return "Este turno ya está cancelado.";
  if (status === "attended") return "Este turno figura como atendido.";
  if (status === "no_show") return "Este turno ya pasó.";
  return "Turno confirmado";
}

export function PublicCancellationForm({
  businessSlug,
  businessName,
  theme,
}: {
  businessSlug: string;
  businessName: string;
  theme: PageTheme | null;
}) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<PublicCancellationLookup | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirming(false);
    startTransition(async () =>
      setResult(await lookupPublicBooking(businessSlug, code)),
    );
  }

  function cancel() {
    startTransition(async () => {
      const response = await cancelPublicBooking(businessSlug, code);
      setResult(response);
      setConfirming(false);
    });
  }

  const appointment = result?.appointment;
  const isReferenceBusiness = businessSlug === "peluqueria-de-hombres";
  const pageStyle = publicPageStyle(theme ?? {
    schema_version: 1,
    palette: {},
    heading_font: "manrope",
    body_font: "manrope",
  }, isReferenceBusiness);
  return (
    <main
      className="pb-cancellation-page flex min-h-screen flex-col bg-[var(--pb-page-background)] text-[var(--pb-page-text)]"
      style={pageStyle}
    >
      <PublicPageHeader
        businessSlug={businessSlug}
        businessName={businessName}
        isReferenceBusiness={isReferenceBusiness}
        actionHref={`/${businessSlug}`}
        actionLabel="Volver a reservar"
      />
      <section className="pb-cancel-card mx-auto my-[clamp(36px,7vw,92px)] w-[calc(100%_-_40px)] max-w-[620px] flex-1 max-[560px]:my-[38px] max-[560px]:w-[calc(100%_-_32px)]">
        <h1 className="max-w-[650px] text-[clamp(2.3rem,5vw,3.6rem)] leading-[1.03] tracking-[-.065em]">
          Consultá o cancelá tu turno
        </h1>
        <p className="pb-cancel-intro my-4 mb-[26px] text-sm leading-[1.65] text-[#596879]">
          Ingresá el código privado que se mostró al confirmar. No buscamos
          reservas por nombre ni teléfono.
        </p>
        <form
          className="pb-code-form grid gap-2.5 rounded-lg border border-[#e1e4e5] bg-white p-[22px]"
          onSubmit={lookup}
        >
          <label className="pb-field grid min-w-0 gap-2">
            <span className="text-[.82rem] font-bold text-[#293b50]">
              Código privado
            </span>
            <input
              className="h-12 w-full rounded border border-[#b7c0c8] bg-white px-[13px] font-mono tracking-wide text-[#202c42] focus-visible:border-[#244e84] focus-visible:outline-[3px] focus-visible:outline-[#244e8444]"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={code}
              onChange={(event) => {
                setCode(event.currentTarget.value.toUpperCase());
                setResult(null);
                setConfirming(false);
              }}
              minLength={24}
              maxLength={64}
              pattern="[A-Z0-9_\-]+"
              required
              aria-describedby="pb-code-help"
            />
          </label>
          <small className="text-xs leading-[1.45] text-[#596879]" id="pb-code-help">
            El código distingue los turnos; mantenelo en privado.
          </small>
          <button
            className="mt-2 h-[52px] rounded bg-[#a32e3b] px-5 font-extrabold text-white transition hover:-translate-y-px hover:bg-[#842532] disabled:cursor-not-allowed disabled:opacity-55"
            type="submit"
            disabled={pending || code.trim().length < 24}
          >
            {pending ? "Buscando…" : "Consultar turno"}
          </button>
        </form>
        {result?.error && (
          <p className="pb-error mt-4 rounded border border-[#edc9ce] bg-[#fff1f2] p-3 text-sm leading-relaxed text-[#982332]" role="alert">
            {result.error}
          </p>
        )}
        {appointment && (
          <section
            className="pb-cancel-result mt-[22px] grid gap-[18px] rounded-lg border border-[#e1e4e5] bg-white p-[22px] max-[560px]:p-[17px]"
            aria-live="polite"
          >
            <p className={`pb-status text-sm font-extrabold ${appointment.status === "confirmed" ? "is-confirmed text-[#25604c]" : "text-[#526174]"}`}>
              {statusText(appointment.status)}
            </p>
            <dl className="pb-summary m-0 grid border-t border-[#e5e8e8]">
              <div className="grid grid-cols-[145px_minmax(0,1fr)] gap-3 border-b border-[#e5e8e8] py-3 max-[560px]:grid-cols-[105px_minmax(0,1fr)] max-[560px]:gap-[9px]">
                <dt className="flex items-center gap-1.5 text-[.79rem] font-semibold text-[#647181]">
                  <CalendarDays size={15} /> Fecha y hora
                </dt>
                <dd className="m-0 wrap-anywhere text-[.84rem] font-bold">
                  {appointment.date} · {appointment.time}
                </dd>
              </div>
              <div className="grid grid-cols-[145px_minmax(0,1fr)] gap-3 border-b border-[#e5e8e8] py-3 max-[560px]:grid-cols-[105px_minmax(0,1fr)] max-[560px]:gap-[9px]">
                <dt className="flex items-center gap-1.5 text-[.79rem] font-semibold text-[#647181]">Servicio</dt>
                <dd className="m-0 wrap-anywhere text-[.84rem] font-bold">{appointment.serviceName}</dd>
              </div>
              <div className="grid grid-cols-[145px_minmax(0,1fr)] gap-3 border-b border-[#e5e8e8] py-3 max-[560px]:grid-cols-[105px_minmax(0,1fr)] max-[560px]:gap-[9px]">
                <dt className="flex items-center gap-1.5 text-[.79rem] font-semibold text-[#647181]">
                  <MapPin size={15} /> Sede
                </dt>
                <dd className="m-0 wrap-anywhere text-[.84rem] font-bold">
                  {appointment.locationName}
                  {appointment.locationAddress
                    ? ` · ${appointment.locationAddress}`
                    : ""}
                </dd>
              </div>
              <div className="grid grid-cols-[145px_minmax(0,1fr)] gap-3 border-b border-[#e5e8e8] py-3 max-[560px]:grid-cols-[105px_minmax(0,1fr)] max-[560px]:gap-[9px]">
                <dt className="flex items-center gap-1.5 text-[.79rem] font-semibold text-[#647181]">
                  <UserRound size={15} /> Profesional
                </dt>
                <dd className="m-0 wrap-anywhere text-[.84rem] font-bold">{appointment.professionalName}</dd>
              </div>
            </dl>
            {appointment.status === "confirmed" &&
              appointment.cancellationAllowed &&
              !confirming && (
                <button
                  className="min-h-12 rounded bg-[#a32e3b] px-[18px] font-extrabold text-white hover:bg-[#842532] max-[560px]:w-full"
                  type="button"
                  onClick={() => setConfirming(true)}
                >
                  Cancelar este turno
                </button>
              )}
            {appointment.status === "confirmed" &&
              appointment.cancellationAllowed &&
              confirming && (
                <ConfirmationDialog
                  date={appointment.date}
                  time={appointment.time}
                  location={`${appointment.locationName}${appointment.locationAddress ? ` · ${appointment.locationAddress}` : ""}`}
                  pending={pending}
                  onCancel={() => setConfirming(false)}
                  onConfirm={cancel}
                />
              )}
            {appointment.status === "confirmed" &&
              !appointment.cancellationAllowed && (
                <p className="pb-policy text-[.79rem] leading-[1.55] text-[#5b6876]">
                  Venció el plazo de cancelación online. Para solicitar ayuda,
                  contactá a {appointment.locationName}
                  {appointment.contactPhone ? (
                    <>
                      {" "}
                      al{" "}
                      <a className="font-bold text-[#244e84] underline underline-offset-4" href={`tel:${appointment.contactPhone}`}>
                        {appointment.contactPhone}
                      </a>
                    </>
                  ) : (
                    " directamente"
                  )}
                  .
                </p>
              )}
          </section>
        )}
        <p className="pb-cancel-footnote mt-5 text-sm text-[#596879]">
          ¿Perdiste el código? Comunicate directamente con {businessName}.
        </p>
      </section>
      <PublicPageFooter
        businessName={businessName}
        isReferenceBusiness={isReferenceBusiness}
      />
    </main>
  );
}
