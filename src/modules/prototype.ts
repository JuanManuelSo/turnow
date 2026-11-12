export const services = [
  { id: 'corte', name: 'Corte y estilo', duration: 45, price: 18000, description: 'Un corte pensado para vos y tu día a día.' },
  { id: 'barba', name: 'Perfilado de barba', duration: 30, price: 10000, description: 'Forma, detalle y terminación.' },
  { id: 'combo', name: 'Corte + barba', duration: 60, price: 25000, description: 'Tu rutina completa, en un solo turno.' },
];
export const team = [{ id: 'julia', name: 'Julia Moreno', initials: 'JM', role: 'Cortes y estilo' }, { id: 'tomas', name: 'Tomás Ríos', initials: 'TR', role: 'Cortes y barbería' }, { id: 'lucia', name: 'Lucía Vidal', initials: 'LV', role: 'Cortes y barbería' }];
export type Identity = { name: string; description: string; palette: 'mineral' | 'botanica'; font: 'manrope' | 'system' };
export const initialIdentity: Identity = { name: 'Estudio Norte', description: 'Un espacio para encontrar tu estilo. Cortes cuidados, buena conversación y tiempo para vos.', palette: 'mineral', font: 'manrope' };
export type Booking = { id: string; code: string; name: string; phone: string; service: string; professional: string; date: string; time: string; status: 'Confirmada' | 'Cancelada' };
export const baseDate = '2026-11-12';
export const initialBookings: Booking[] = [
  { id: 'a1', code: 'NORTE-7K9P-2M4X', name: 'Martina López', phone: '341 555 0198', service: 'corte', professional: 'julia', date: baseDate, time: '09:00', status: 'Confirmada' },
  { id: 'a2', code: 'NORTE-8B3F-6J2Q', name: 'Nicolás Ferrero', phone: '341 555 0236', service: 'combo', professional: 'tomas', date: baseDate, time: '09:30', status: 'Confirmada' },
  { id: 'a3', code: 'NORTE-5D8L-3R7S', name: 'Valentina Ruiz', phone: '341 555 0134', service: 'corte', professional: 'lucia', date: baseDate, time: '10:00', status: 'Confirmada' },
  { id: 'a4', code: 'NORTE-4A9C-8E2H', name: 'Santiago Díaz', phone: '341 555 0456', service: 'corte', professional: 'julia', date: baseDate, time: '11:00', status: 'Confirmada' },
  { id: 'a5', code: 'NORTE-3W6N-9V2Z', name: 'Camila Acosta', phone: '341 555 0179', service: 'corte', professional: 'lucia', date: baseDate, time: '14:30', status: 'Confirmada' },
  { id: 'a6', code: 'NORTE-2H7K-4P8T', name: 'Joaquín Pérez', phone: '341 555 0248', service: 'barba', professional: 'tomas', date: baseDate, time: '16:00', status: 'Confirmada' },
];
export const money = (value: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
export const dateLabel = (date: string, short = false) => new Intl.DateTimeFormat('es-AR', { weekday: short ? 'short' : 'long', day: 'numeric', month: short ? 'short' : 'long', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
export function addDays(date: string, count: number) { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
export const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function eligible(service: string) { return team.filter(p => service === 'corte' || p.id !== 'julia'); }
export function available(date: string, time: string, service: string, professional: string, bookings: Booking[], ignore?: string) {
  const start = minutes(time), duration = services.find(s => s.id === service)!.duration;
  if (new Date(date + 'T12:00:00Z').getUTCDay() === 0 || start < 540 || start + duration > 1080 || (start < 840 && start + duration > 780)) return [];
  return eligible(service).filter(p => (professional === 'any' || p.id === professional) && !bookings.some(b => b.id !== ignore && b.status === 'Confirmada' && b.date === date && b.professional === p.id && start < minutes(b.time) + services.find(s => s.id === b.service)!.duration && start + duration > minutes(b.time)));
}
export function slots(date: string, service: string, professional: string, bookings: Booking[], ignore?: string) {
  return Array.from({ length: 18 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`).filter(t => available(date, t, service, professional, bookings, ignore).length > 0);
}
