"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, MapPin } from "lucide-react";
import { Identity } from "@/modules/prototype";
import { business, locationAddress } from "@/config/business";
import { Brand, Button, Choice, Input, Select, Textarea } from "./ui";

type Props = {
  identity: Identity;
  publish: (identity: Identity) => void;
  notify: (message: string) => void;
  onDirty: (dirty: boolean) => void;
};

export function IdentityEditor({ identity, publish, notify, onDirty }: Props) {
  const [draft, setDraft] = useState(identity);
  const [mobileView, setMobileView] = useState("edit");
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(identity);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    onDirty(dirty);
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, onDirty]);

  return (
    <>
      <div className="admin-heading mb-[30px] flex items-center justify-between gap-6 max-[600px]:flex-wrap max-[600px]:gap-5">
        <div>
          <h1
            className="text-[2rem] leading-[1.15] tracking-[-.055em] max-[600px]:text-[1.9rem]"
            ref={heading}
            tabIndex={-1}
          >
            Hacé que se sienta tuyo.
          </h1>
          <p className="mt-2.5 text-sm text-muted-foreground">
            La identidad de tu negocio, en cada reserva.
          </p>
        </div>
        <span
          className={`save-status shrink-0 rounded px-3 py-2 text-xs max-[600px]:max-w-none ${dirty ? "bg-[#fff1d4] text-[#76541c]" : "bg-success-soft text-success"}`}
          role="status"
        >
          {dirty ? "Cambios sin guardar" : "Todos los cambios publicados"}
        </span>
      </div>
      <div
        className="editor-mobile-tabs mb-7 hidden gap-2 rounded-lg bg-surface-muted p-1 max-[600px]:flex"
        role="group"
        aria-label="Vista del editor"
      >
        <button
          className="min-h-11 flex-1 rounded-md px-2 text-[.8125rem] aria-pressed:bg-surface aria-pressed:font-bold aria-pressed:text-brand"
          aria-pressed={mobileView === "edit"}
          aria-controls="identity-form"
          onClick={() => setMobileView("edit")}
        >
          Editar información
        </button>
        <button
          className="min-h-11 flex-1 rounded-md px-2 text-[.8125rem] aria-pressed:bg-surface aria-pressed:font-bold aria-pressed:text-brand"
          aria-pressed={mobileView === "preview"}
          aria-controls="identity-preview"
          onClick={() => setMobileView("preview")}
        >
          Vista previa
        </button>
      </div>
      <div
        className="editor-layout grid grid-cols-2 items-start gap-14 max-[1150px]:gap-6 max-[600px]:grid-cols-1 max-[600px]:gap-9 data-[mobile-view=edit]:max-[600px]:[&_.preview-area]:hidden data-[mobile-view=preview]:max-[600px]:[&_.identity-form]:hidden"
        data-mobile-view={mobileView}
      >
        <form
          id="identity-form"
          className="identity-form grid gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.name.trim() || !draft.description.trim()) return;
            publish(draft);
            notify("Los cambios se publicaron en este prototipo local.");
          }}
        >
          <h2 className="text-lg font-bold">Identidad del negocio</h2>
          <label className="grid gap-2 text-sm font-semibold">
            Nombre del negocio
            <Input
              required
              pattern=".*\S.*"
              maxLength={60}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2.5 text-sm font-semibold">
              Paleta de color
            </legend>
            <div className="palette-options grid grid-cols-2 gap-3 max-[800px]:grid-cols-1 max-[600px]:grid-cols-2">
              <Choice
                selected={draft.palette === "mineral"}
                onClick={() => setDraft({ ...draft, palette: "mineral" })}
              >
                <i className="inline-block size-4 shrink-0 rounded-full bg-[#af2433]" />
                <strong>Rojo protagonista</strong>
                <small>Rojo, azul tinta y blanco</small>
              </Choice>
              <Choice
                selected={draft.palette === "botanica"}
                onClick={() => setDraft({ ...draft, palette: "botanica" })}
              >
                <i className="inline-block size-4 shrink-0 rounded-full bg-[#173d70]" />
                <strong>Azul protagonista</strong>
                <small>Azul tinta, rojo y blanco</small>
              </Choice>
            </div>
          </fieldset>
          <label htmlFor="identity-font">Tipografía</label>
          <Select
            id="identity-font"
            className="font-select -mt-4"
            value={draft.font}
            onChange={(e) =>
              setDraft({ ...draft, font: e.target.value as Identity["font"] })
            }
          >
            <option value="manrope">Manrope · Contemporánea</option>
            <option value="system">Sistema · Familiar</option>
          </Select>
          <label className="grid gap-2 text-sm font-semibold">
            Descripción
            <Textarea
              required
              maxLength={220}
              rows={4}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
            <small className="text-xs font-normal text-muted-foreground">
              {draft.description.length}/220 caracteres
            </small>
          </label>
          <div className="editor-actions flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={
                !dirty || !draft.name.trim() || !draft.description.trim()
              }
            >
              Publicar cambios
              <Check size={17} />
            </Button>
            <Button
              variant="text"
              type="button"
              disabled={!dirty}
              onClick={() => setDraft(identity)}
            >
              Descartar
            </Button>
          </div>
          <p className="simulation-note -mt-2 text-xs text-muted-foreground">
            Publicación simulada. Solo cambia la página de este navegador.
          </p>
        </form>
        <section
          id="identity-preview"
          className="preview-area rounded-xl bg-surface-muted p-6 max-[800px]:p-4 max-[600px]:p-5"
          aria-label="Vista previa de la página pública"
        >
          <div className="preview-caption mb-5 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold">Vista previa</h2>
            <span className="text-[.6875rem] text-muted-foreground">
              Así te van a ver
            </span>
          </div>
          <div className="preview-browser overflow-hidden rounded-lg bg-surface shadow-[0_6px_20px_#25385b12]">
            <div className="browser-bar border-b border-border bg-[#f8f9fb] p-2.5 text-center text-[.625rem] text-muted-foreground">
              turnow.demo / peluqueria-de-hombres
            </div>
            <div
              className="identity-preview min-h-[440px] bg-background p-7 text-foreground max-[800px]:p-5 max-[600px]:p-7"
              data-theme={draft.palette}
              data-font={draft.font}
            >
              <Brand name={draft.name || "Tu negocio"} small />
              <h3 className="mt-10 text-[2.5rem] leading-[1.12] tracking-[-.035em] max-[800px]:text-[2.1rem] max-[600px]:text-[2.5rem]">
                {business.slogan[0]}
                <br />
                {business.slogan[1]}
              </h3>
              <p className="my-5 wrap-anywhere text-[.8125rem] leading-[1.8] text-muted-foreground">
                {draft.description}
              </p>
              <span className="preview-button flex items-center justify-center gap-3 rounded-lg bg-brand p-[13px] text-[.8125rem] font-bold text-brand-foreground">
                Reservar turno
                <ArrowRight size={16} />
              </span>
              <span className="preview-cancel mt-4 block text-center text-xs underline underline-offset-3">
                Cancelar turno
              </span>
              <div className="preview-address mt-8 flex items-center gap-2 text-[.6875rem] text-muted-foreground">
                <MapPin size={18} />
                {locationAddress("urquiza")}, {business.city}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Vista previa con datos ficticios. Los cambios se aplican al
            publicar.
          </p>
        </section>
      </div>
    </>
  );
}
