"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import {
  available,
  dateLabel,
  eligible,
  locationAddress,
  services,
  slots,
  team,
  type Booking,
  type LocationId,
} from "@/modules/prototype";

export function BookingDialog({
  booking,
  date,
  location,
  bookings,
  onClose,
  onSave,
  onCancel,
}: {
  booking: Booking | null;
  date: string;
  location: LocationId;
  bookings: Booking[];
  onClose: () => void;
  onSave: (booking: Booking) => void;
  onCancel: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState(!booking);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: booking?.name ?? "",
    phone: booking?.phone ?? "",
    service: booking?.service ?? services[0].id,
    professional:
      booking?.professional ?? eligible(services[0].id, location)[0].id,
    date: booking?.date ?? date,
    time: booking?.time ?? "",
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || draft.phone.replace(/\D/g, "").length < 8) {
      setError("Ingresá un nombre y un teléfono de al menos 8 dígitos.");
      return;
    }
    if (
      !available(
        draft.date,
        draft.time,
        draft.service,
        draft.professional,
        location,
        bookings,
        booking?.id,
      ).length
    ) {
      setError("Ese horario no está disponible. Elegí otro para continuar.");
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      location,
      id: booking?.id ?? crypto.randomUUID(),
      code: booking?.code ?? crypto.randomUUID(),
      status: "Confirmada",
    });
  }

  return (
    <dialog
      ref={dialog}
      className="dashboard-dialog"
      aria-labelledby="booking-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="dashboard-dialog-heading">
        <h2 id="booking-dialog-title">
          {confirmCancel
            ? "¿Cancelar este turno?"
            : editing
              ? booking
                ? "Reprogramar turno"
                : "Nuevo turno"
              : booking?.name}
        </h2>
        <Button variant="text" aria-label="Cerrar detalle" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      <p className="dashboard-muted">
        {locationAddress(location)} · Datos de demostración
      </p>
      {editing ? (
        <form className="dashboard-booking-form" onSubmit={submit}>
          <label>
            Nombre y apellido
            <Input
              required
              autoComplete="name"
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label>
            Teléfono
            <Input
              required
              type="tel"
              autoComplete="tel"
              value={draft.phone}
              onChange={(event) =>
                setDraft({ ...draft, phone: event.target.value })
              }
            />
          </label>
          <label>
            Servicio
            <Select
              value={draft.service}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  service: event.target.value,
                  professional: eligible(event.target.value, location)[0].id,
                  time: "",
                })
              }
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.duration} min
                </option>
              ))}
            </Select>
          </label>
          <label>
            Profesional
            <Select
              value={draft.professional}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  professional: event.target.value,
                  time: "",
                })
              }
            >
              {eligible(draft.service, location).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Fecha
            <Input
              type="date"
              required
              value={draft.date}
              onChange={(event) =>
                setDraft({ ...draft, date: event.target.value, time: "" })
              }
            />
          </label>
          <label>
            Horario
            <Select
              required
              value={draft.time}
              onChange={(event) =>
                setDraft({ ...draft, time: event.target.value })
              }
            >
              <option value="">Elegí un horario</option>
              {draft.date &&
                slots(
                  draft.date,
                  draft.service,
                  draft.professional,
                  location,
                  bookings,
                  booking?.id,
                ).map((time) => <option key={time}>{time}</option>)}
            </Select>
          </label>
          {draft.date &&
            !slots(
              draft.date,
              draft.service,
              draft.professional,
              location,
              bookings,
              booking?.id,
            ).length && <p>No hay horarios disponibles. Elegí otra fecha.</p>}
          {error && (
            <p role="alert" className="dashboard-error">
              {error}
            </p>
          )}
          <p className="dashboard-muted">
            Los cambios de esta vista se conservan hasta recargar la página.
          </p>
          <Button type="submit">
            {booking ? "Guardar cambios" : "Crear turno"}
          </Button>
        </form>
      ) : (
        booking && (
          <>
            <dl className="dashboard-booking-details">
              <div>
                <dt>Fecha y hora</dt>
                <dd>
                  {dateLabel(booking.date)} · {booking.time}
                </dd>
              </div>
              <div>
                <dt>Servicio</dt>
                <dd>
                  {
                    services.find((service) => service.id === booking.service)
                      ?.name
                  }
                </dd>
              </div>
              <div>
                <dt>Profesional</dt>
                <dd>
                  {
                    team.find((person) => person.id === booking.professional)
                      ?.name
                  }
                </dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{booking.phone}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>Confirmada</dd>
              </div>
            </dl>
            {confirmCancel ? (
              <>
                <p>El horario quedará libre en esta demostración.</p>
                <div className="dashboard-dialog-actions">
                  <Button variant="danger" onClick={() => onCancel(booking.id)}>
                    Confirmar cancelación
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmCancel(false)}
                  >
                    Conservar turno
                  </Button>
                </div>
              </>
            ) : (
              <div className="dashboard-dialog-actions">
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Reprogramar turno
                </Button>
                <Button variant="text" onClick={() => setConfirmCancel(true)}>
                  Cancelar turno
                </Button>
              </div>
            )}
          </>
        )
      )}
    </dialog>
  );
}
