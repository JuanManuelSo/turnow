import {
  Booking,
  dateLabel,
  locationAddress,
  LocationId,
  money,
  services,
  team,
} from "@/modules/prototype";
export function Summary({
  service,
  professional,
  location,
  date,
  time,
  step,
  onEdit,
}: Pick<Booking, "service" | "professional" | "date" | "time"> & {
  location?: LocationId | "";
  step?: number;
  onEdit?: (step: number) => void;
}) {
  const s = services.find((s) => s.id === service)!;
  const visibleStep = step ?? 4;
  const editButton = (target: number, label: string) => onEdit && (
    <button className="summary-edit min-h-9 px-2 text-xs font-bold text-brand underline underline-offset-4" type="button" aria-label={`Editar ${label}`} onClick={() => onEdit(target)}>Editar</button>
  );
  return (
    <dl className="summary-list my-5 grid gap-0 border-t border-border">
      <div className={`summary-row grid gap-3 border-b border-border py-3 ${onEdit ? "grid-cols-[minmax(76px,.7fr)_minmax(0,1.3fr)_auto]" : "grid-cols-[minmax(86px,.7fr)_minmax(0,1.3fr)]"}`}>
        <dt className="text-xs font-semibold text-muted-foreground">Servicio</dt>
        <dd className="m-0 grid min-w-0 gap-1 text-sm font-bold">
          <span className="grid min-w-0 gap-1">
            {s.name}
            <small>{s.duration} minutos</small>
          </span>
        </dd>
        {editButton(0, "servicio")}
      </div>
      {visibleStep >= 1 && (
        <div className={`summary-row grid gap-3 border-b border-border py-3 ${onEdit ? "grid-cols-[minmax(76px,.7fr)_minmax(0,1.3fr)_auto]" : "grid-cols-[minmax(86px,.7fr)_minmax(0,1.3fr)]"}`}>
          <dt className="text-xs font-semibold text-muted-foreground">Profesional</dt>
          <dd className="m-0 min-w-0 text-sm font-bold">
            <span className="min-w-0">
              {team.find((p) => p.id === professional)?.name ||
                "A asignar al confirmar"}
            </span>
          </dd>
          {editButton(1, "profesional")}
        </div>
      )}
      {visibleStep >= 1 && (
        <div className={`summary-row grid gap-3 border-b border-border py-3 ${onEdit ? "grid-cols-[minmax(76px,.7fr)_minmax(0,1.3fr)_auto]" : "grid-cols-[minmax(86px,.7fr)_minmax(0,1.3fr)]"}`}>
          <dt className="text-xs font-semibold text-muted-foreground">Sede</dt>
          <dd className="m-0 min-w-0 text-sm font-bold">
            <span className="min-w-0">
              {location ? locationAddress(location) : "Todavía sin elegir"}
            </span>
          </dd>
          {editButton(1, "sede")}
        </div>
      )}
      {visibleStep >= 2 && (
        <div className={`summary-row grid gap-3 border-b border-border py-3 ${onEdit ? "grid-cols-[minmax(76px,.7fr)_minmax(0,1.3fr)_auto]" : "grid-cols-[minmax(86px,.7fr)_minmax(0,1.3fr)]"}`}>
          <dt className="text-xs font-semibold text-muted-foreground">Día y horario</dt>
          <dd className="m-0 grid min-w-0 gap-1 text-sm font-bold">
            <span className="grid min-w-0 gap-1">
              {dateLabel(date, true)}
              <small>
                {time ? `${time} h · Rosario` : "Todavía sin elegir"}
              </small>
            </span>
          </dd>
          {editButton(2, "día y horario")}
        </div>
      )}
      <div className="summary-total flex items-start justify-between gap-4 py-4">
        <dt className="text-sm font-bold">Total</dt>
        <dd className="m-0 grid justify-items-end gap-1 text-base font-extrabold">
          {money(s.price)}
          <small>Pago en el local</small>
        </dd>
      </div>
    </dl>
  );
}
