import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import {
  addDays,
  locations,
  type LocationId,
  type team,
} from "@/modules/prototype";

export function AgendaToolbar({
  date,
  today,
  location,
  professional,
  professionals,
  onDate,
  onLocation,
  onProfessional,
}: {
  date: string;
  today: string;
  location: LocationId;
  professional: string;
  professionals: typeof team;
  onDate: (date: string) => void;
  onLocation: (location: LocationId) => void;
  onProfessional: (id: string) => void;
}) {
  return (
    <div className="dashboard-toolbar flex flex-wrap items-end justify-between gap-4 border-b border-[#d8dee7] p-5 max-[600px]:p-4">
      <div className="dashboard-date-controls flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          aria-label="Día anterior"
          onClick={() => onDate(addDays(date, -1))}
        >
          <ChevronLeft size={18} />
        </Button>
        <Input
          aria-label="Fecha de agenda"
          type="date"
          value={date}
          onChange={(event) => event.target.value && onDate(event.target.value)}
        />
        <Button
          variant="secondary"
          aria-label="Día siguiente"
          onClick={() => onDate(addDays(date, 1))}
        >
          <ChevronRight size={18} />
        </Button>
        <Button variant="text" onClick={() => onDate(today)}>
          Hoy
        </Button>
      </div>
      <label className="grid min-w-[160px] gap-1.5 text-xs font-bold text-[#526174] max-[600px]:min-w-0 max-[600px]:flex-1">
        Sede
        <Select
          value={location}
          onChange={(event) => onLocation(event.target.value as LocationId)}
        >
          {locations.map((place) => (
            <option key={place.id} value={place.id}>
              {place.address}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid min-w-[160px] gap-1.5 text-xs font-bold text-[#526174] max-[600px]:min-w-0 max-[600px]:flex-1">
        Profesional
        <Select
          value={professional}
          onChange={(event) => onProfessional(event.target.value)}
        >
          <option value="all">Todo el equipo</option>
          {professionals.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
