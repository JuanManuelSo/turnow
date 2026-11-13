import { Booking, dateLabel, locationAddress, LocationId, money, services, team } from '@/modules/prototype';
export function Summary({ service, professional, location, date, time }: Pick<Booking, 'service' | 'professional' | 'date' | 'time'> & { location?: LocationId | '' }) {
  const s = services.find(s => s.id === service)!;
  return <dl className="summary-list"><div><dt>Servicio</dt><dd>{s.name}<small>{s.duration} minutos</small></dd></div><div><dt>Profesional</dt><dd>{team.find(p => p.id === professional)?.name || 'A asignar al confirmar'}</dd></div><div><dt>Sede</dt><dd>{location ? locationAddress(location) : 'Todavía sin elegir'}</dd></div><div><dt>Día y horario</dt><dd>{dateLabel(date, true)}<small>{time ? `${time} h · Rosario` : 'Todavía sin elegir'}</small></dd></div><div className="summary-total"><dt>Total</dt><dd>{money(s.price)}<small>Pago en el local</small></dd></div></dl>;
}
