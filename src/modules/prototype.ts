import { services, type LocationId } from '@/config/business';
export { initialIdentity, locationAddress, locationMapUrl, locations, services } from '@/config/business';
export type { Identity, LocationId } from '@/config/business';
const rosarioDate = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
export const baseDate = rosarioDate();
export function addDays(date: string, count: number) { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
export const initialDate = new Date(baseDate + 'T12:00:00Z').getUTCDay() === 0 ? addDays(baseDate, 1) : baseDate;
export const team = [
  { id: 'julia', name: 'Julia Moreno', initials: 'JM', role: 'Cortes y estilo', location: 'urquiza' },
  { id: 'tomas', name: 'Tomás Ríos', initials: 'TR', role: 'Cortes y barbería', location: 'urquiza' },
  { id: 'lucia', name: 'Lucía Vidal', initials: 'LV', role: 'Cortes y barbería', location: 'urquiza' },
  { id: 'emilia', name: 'Emilia Sosa', initials: 'ES', role: 'Cortes y estilo', location: 'febrero' },
  { id: 'mateo', name: 'Mateo Vázquez', initials: 'MV', role: 'Cortes y barbería', location: 'febrero' },
  { id: 'renata', name: 'Renata Funes', initials: 'RF', role: 'Cortes y estilo', location: 'roca' },
  { id: 'ivan', name: 'Iván Cabrera', initials: 'IC', role: 'Cortes y barbería', location: 'roca' },
];
export type Booking = { id: string; code: string; name: string; phone: string; service: string; professional: string; location: LocationId; date: string; time: string; status: 'Confirmada' | 'Cancelada' };
export const initialBookings: Booking[] = [
  { id: 'a1', code: 'HOMBRES-7K9P-2M4X', name: 'Martina López', phone: '341 555 0198', service: 'corte', professional: 'julia', location: 'urquiza', date: initialDate, time: '09:00', status: 'Confirmada' },
  { id: 'a2', code: 'HOMBRES-8B3F-6J2Q', name: 'Nicolás Ferrero', phone: '341 555 0236', service: 'combo', professional: 'tomas', location: 'urquiza', date: initialDate, time: '09:30', status: 'Confirmada' },
  { id: 'a3', code: 'HOMBRES-5D8L-3R7S', name: 'Valentina Ruiz', phone: '341 555 0134', service: 'corte', professional: 'lucia', location: 'urquiza', date: initialDate, time: '10:00', status: 'Confirmada' },
  { id: 'a4', code: 'HOMBRES-4A9C-8E2H', name: 'Santiago Díaz', phone: '341 555 0456', service: 'corte', professional: 'julia', location: 'urquiza', date: initialDate, time: '11:00', status: 'Confirmada' },
  { id: 'a5', code: 'HOMBRES-3W6N-9V2Z', name: 'Camila Acosta', phone: '341 555 0179', service: 'corte', professional: 'lucia', location: 'urquiza', date: initialDate, time: '14:30', status: 'Confirmada' },
  { id: 'a6', code: 'HOMBRES-2H7K-4P8T', name: 'Joaquín Pérez', phone: '341 555 0248', service: 'barba', professional: 'tomas', location: 'urquiza', date: initialDate, time: '16:00', status: 'Confirmada' },
];
export const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
export const dateLabel = (date: string, short = false) => new Intl.DateTimeFormat('es-AR', { weekday: short ? 'short' : 'long', day: 'numeric', month: short ? 'short' : 'long', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
export const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function eligible(service: string, location?: LocationId) { return team.filter(p => (service === 'corte' || p.id !== 'julia') && (!location || p.location === location)); }
export function validSlot(date: string, time: string, service: string) {
  const start = minutes(time), duration = services.find(s => s.id === service)!.duration;
  return new Date(date + 'T12:00:00Z').getUTCDay() !== 0 && start >= 540 && start + duration <= 1080 && !(start < 840 && start + duration > 780);
}
export function available(date: string, time: string, service: string, professional: string, location: LocationId, bookings: Booking[], ignore?: string) {
  const start = minutes(time), duration = services.find(s => s.id === service)!.duration;
  if (!validSlot(date, time, service)) return [];
  return eligible(service, location).filter(p => (professional === 'any' || p.id === professional) && !bookings.some(b => b.id !== ignore && b.status === 'Confirmada' && b.date === date && b.professional === p.id && start < minutes(b.time) + services.find(s => s.id === b.service)!.duration && start + duration > minutes(b.time)));
}
export function allSlots(date: string, service: string) {
  return Array.from({ length: 18 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`).filter(t => validSlot(date, t, service));
}
export function slots(date: string, service: string, professional: string, location: LocationId, bookings: Booking[], ignore?: string) {
  return allSlots(date, service).filter(t => available(date, t, service, professional, location, bookings, ignore).length > 0);
}
