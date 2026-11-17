export const business = {
  name: 'Peluquería de Hombres',
  slogan: ['No es moda...', 'es estilo.'] as const,
  description: 'Cortes y barbería para hombres en Rosario. Elegí tu sede y reservá tu turno.',
  city: 'Rosario',
  province: 'Santa Fe',
  logo: '/brand-silhouette.svg',
  visitInfo: {
    hours: { days: 'Lunes a sábado', schedule: '9:00–13:00 y 14:00–18:00' },
    phone: '341 555 0100',
    instagram: '@estudionorte',
  },
} as const;

export const locations = [
  { id: 'urquiza', address: 'Urquiza 1526' },
  { id: 'febrero', address: '3 de Febrero 2464' },
  { id: 'roca', address: 'Presidente Roca 274' },
] as const;

export type LocationId = typeof locations[number]['id'];
export type Identity = {
  name: string;
  description: string;
  palette: 'mineral' | 'botanica';
  font: 'manrope' | 'system';
};

export const locationAddress = (id: LocationId) => locations.find(location => location.id === id)?.address ?? locations[0].address;
export const locationMapUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${business.city}, ${business.province}, Argentina`)}`;

export const services = [
  { id: 'corte', name: 'Corte y estilo', duration: 45, price: 18000, description: 'Un corte pensado para vos y tu día a día.' },
  { id: 'barba', name: 'Perfilado de barba', duration: 30, price: 10000, description: 'Forma, detalle y terminación.' },
  { id: 'combo', name: 'Corte + barba', duration: 60, price: 25000, description: 'Tu rutina completa, en un solo turno.' },
];

export const initialIdentity: Identity = {
  name: business.name,
  description: business.description,
  palette: 'mineral',
  font: 'manrope',
};
