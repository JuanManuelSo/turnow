import {
  ArrowRight,
  Clock3,
  ExternalLink,
  Instagram,
  MapPin,
  Phone,
} from "lucide-react";
import type { RefObject } from "react";
import {
  business,
  locations,
  locationMapUrl,
  services,
  type Identity,
} from "@/config/business";
import { money } from "@/modules/prototype";
import { Button, Brand } from "@/components/ui";

type StorefrontHomeProps = {
  identity: Identity;
  onBook: (service?: string) => void;
  onCancel: () => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
};

export function StorefrontHeader({
  name,
  onCancel,
}: {
  name: string;
  onCancel: () => void;
}) {
  return (
    <header className="public-header w-full border-t-4 border-t-[#af2433] border-b border-b-border">
      <div className="public-header-inner mx-auto flex min-h-20 w-full max-w-[1440px] items-center justify-between gap-4 px-[clamp(20px,5vw,72px)] py-4 max-[600px]:min-h-[72px] max-[600px]:px-4 max-[600px]:py-3">
        <a
          className="brand-home inline-flex min-h-12 min-w-0 items-center text-inherit no-underline"
          href="#main"
          aria-label={`${name}, ir al inicio`}
        >
          <Brand name={name} />
        </a>
        <Button
          variant="text"
          className="header-cancel ml-auto min-h-11 shrink-0 text-sm font-bold text-foreground underline decoration-[#8d9cb0] underline-offset-[5px]"
          onClick={onCancel}
        >
          Cancelar turno
        </Button>
      </div>
    </header>
  );
}

function HeroSection({
  identity,
  onBook,
  onCancel,
  headingRef,
}: StorefrontHomeProps) {
  return (
    <section className="welcome grid min-h-[calc(100svh_-_80px)] grid-cols-[minmax(0,1.12fr)_minmax(300px,.88fr)] items-center gap-[clamp(32px,6vw,88px)] py-[clamp(56px,7vw,96px)] max-[800px]:min-h-[calc(100svh_-_72px)] max-[800px]:grid-cols-1 max-[800px]:gap-9 max-[800px]:py-[44px] max-[600px]:gap-7 max-[600px]:py-8">
      <div className="welcome-copy min-w-0">
        <h1
          className="max-w-[720px] text-[clamp(3.5rem,7.2vw,6rem)] leading-[.98] tracking-[-.06em] max-[800px]:text-[clamp(2.75rem,10vw,4.75rem)] max-[600px]:text-[clamp(2.625rem,10.5vw,3.75rem)] max-[600px]:leading-none max-[360px]:text-[2.625rem]"
          id="welcome-title"
          ref={headingRef}
          tabIndex={-1}
        >
          {business.slogan[0]}
          <br />
          {business.slogan[1]}
        </h1>
        <p className="welcome-description mt-6 max-w-[42ch] text-[1.0625rem] leading-[1.65] text-muted-foreground max-[600px]:mt-[18px] max-[600px]:text-base">
          {identity.description}
        </p>
        <div className="welcome-actions mt-8 flex items-center gap-6 max-[600px]:mt-6 max-[600px]:flex-col max-[600px]:items-stretch max-[600px]:gap-2">
          <Button
            className="booking-primary min-h-14 px-6 text-base max-[600px]:min-h-[52px] max-[600px]:w-full"
            onClick={() => onBook()}
          >
            Reservar turno
            <ArrowRight size={19} aria-hidden="true" />
          </Button>
          <button
            className="text-link min-h-11 px-1 font-bold underline underline-offset-[5px] max-[600px]:self-start"
            onClick={onCancel}
          >
            Cancelar turno
          </button>
        </div>
        <p className="quiet-note mt-4 text-sm text-muted-foreground max-[600px]:mt-3">
          Sin cuenta. Elegís, reservás y listo.
        </p>
      </div>
      <LocationsSection />
    </section>
  );
}

function LocationsSection() {
  return (
    <aside
      className="visit-panel rounded-lg bg-[#e8eef5] p-[clamp(24px,3vw,40px)] max-[600px]:p-5 max-[360px]:p-[18px]"
      aria-labelledby="locations-title"
    >
      <div className="visit-info flex items-start gap-3.5">
        <MapPin className="mt-0.5 text-brand" size={23} aria-hidden="true" />
        <h2
          className="text-[clamp(1.375rem,2.1vw,1.75rem)] leading-[1.18] tracking-[-.04em]"
          id="locations-title"
        >
          Encontrá tu sede
          <br />
          en {business.city}.
        </h2>
      </div>
      <ul className="visit-location-list mt-6 grid list-none gap-2 p-0 max-[600px]:mt-[18px]">
        {locations.map(({ id, address }) => (
          <li key={id}>
            <a
              className="visit-location flex min-h-12 items-center justify-between gap-3 rounded border border-[#bbcbdc] bg-white px-3 py-2.5 text-[.9375rem] font-bold text-foreground no-underline transition hover:-translate-y-px hover:border-brand hover:text-brand-hover"
              href={locationMapUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver ${address} en Google Maps (abre una pestaña nueva)`}
            >
              <span>{address}</span>
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <div className="visit-details mt-5 grid gap-4 border-t border-[#cbd8e5] pt-[18px] max-[600px]:mt-[18px] max-[600px]:gap-3.5 max-[600px]:pt-4">
        <div className="visit-hours flex items-start gap-[11px]">
          <Clock3
            className="mt-0.5 shrink-0 text-brand"
            size={19}
            aria-hidden="true"
          />
          <div>
            <h3 className="mb-1 text-[.9375rem] font-bold">
              Horarios de ejemplo
            </h3>
            <p className="text-sm text-muted-foreground">
              {business.visitInfo.hours.days}
            </p>
            <p className="text-sm text-muted-foreground">
              {business.visitInfo.hours.schedule}
            </p>
          </div>
        </div>
        <div
          className="contact-details grid grid-cols-2 gap-4 max-[600px]:grid-cols-1"
          aria-label="Contacto de ejemplo"
        >
          <div className="contact-item flex min-w-0 items-start gap-2.5">
            <Phone
              className="mt-0.5 shrink-0 text-brand"
              size={17}
              aria-hidden="true"
            />
            <span className="grid min-w-0 gap-0.5">
              <small className="text-[.8125rem] text-muted-foreground">
                Teléfono · ejemplo
              </small>
              <strong>{business.visitInfo.phone}</strong>
            </span>
          </div>
          <div className="contact-item flex min-w-0 items-start gap-2.5">
            <Instagram
              className="mt-0.5 shrink-0 text-brand"
              size={17}
              aria-hidden="true"
            />
            <span className="grid min-w-0 gap-0.5">
              <small className="text-[.8125rem] text-muted-foreground">
                Instagram · ejemplo
              </small>
              <strong>{business.visitInfo.instagram}</strong>
            </span>
          </div>
        </div>
        <small className="visit-sample-note text-xs leading-[1.4] text-muted-foreground">
          Horarios y contactos ilustrativos; pendientes de confirmar.
        </small>
      </div>
    </aside>
  );
}

function ServicesSection({ onBook }: Pick<StorefrontHomeProps, "onBook">) {
  return (
    <section
      className="service-preview grid grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] gap-[clamp(40px,8vw,120px)] border-t border-border py-[clamp(56px,8vw,112px)] max-[900px]:grid-cols-1 max-[600px]:gap-7 max-[600px]:py-12"
      aria-labelledby="services-title"
    >
      <div className="service-preview-intro">
        <h2
          className="text-[clamp(1.8rem,3.8vw,3.25rem)] leading-[1.05] tracking-[-.05em]"
          id="services-title"
        >
          Elegí el servicio
          <br />
          para tu próximo turno.
        </h2>
        <p className="mt-4 max-w-[32ch] text-base leading-[1.6] text-muted-foreground">
          Reservá en la sede que te quede mejor.
        </p>
      </div>
      <ul className="service-preview-list m-0 grid list-none gap-2.5 p-0">
        {services.map((service) => (
          <li key={service.id}>
            <button
              className="flex min-h-[76px] w-full items-center justify-between gap-4 border-b border-border bg-transparent py-4 text-left text-sm transition-all hover:border-brand hover:bg-surface-muted hover:px-3 hover:text-brand max-[600px]:min-h-[72px]"
              type="button"
              onClick={() => onBook(service.id)}
              aria-label={`Reservar ${service.name}`}
            >
              <span className="grid gap-1">
                <strong>{service.name}</strong>
                <small className="text-xs text-muted-foreground">
                  {service.duration} min
                </small>
              </span>
              <span className="flex shrink-0 items-center gap-[18px] font-bold whitespace-nowrap">
                {money(service.price)}
                <ArrowRight size={17} aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StorefrontHome(props: StorefrontHomeProps) {
  return (
    <>
      <HeroSection {...props} />
      <ServicesSection onBook={props.onBook} />
    </>
  );
}

export function StorefrontFooter({
  name,
  onOpenPanel,
}: {
  name: string;
  onOpenPanel: () => void;
}) {
  return (
    <footer className="public-footer w-full border-t border-border bg-[#142b49] text-[#f4f6f9]">
      <div className="public-footer-inner mx-auto flex min-h-[88px] max-w-[1440px] items-center justify-between gap-4 px-[clamp(20px,5vw,72px)] py-4 text-xs max-[800px]:flex-wrap max-[600px]:items-start max-[600px]:gap-x-3 max-[600px]:gap-y-2 max-[600px]:px-4 max-[600px]:pb-[calc(18px_+_env(safe-area-inset-bottom))]">
        <span className="text-[#d3dfeb] max-[600px]:max-w-[calc(50%_-_8px)]">
          {name} · {business.city}
        </span>
        <span className="text-[#d3dfeb] max-[600px]:max-w-[calc(50%_-_8px)]">
          Reservas simples con{" "}
          <strong className="text-base text-white max-[600px]:text-sm">
            turnow.
          </strong>
        </span>
        <Button
          variant="text"
          className="ml-auto min-h-11 text-white hover:bg-white/10"
          onClick={onOpenPanel}
        >
          Panel del negocio
          <ExternalLink size={14} aria-hidden="true" />
        </Button>
      </div>
    </footer>
  );
}
