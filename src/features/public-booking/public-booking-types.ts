export type PublicLocation = {
  id: string;
  name: string;
  addressText: string | null;
  mapUrl: string | null;
  contactPhone: string | null;
  arrivalInstructions: string | null;
  weeklyIntervals: {
    weekday: number;
    startMinute: number;
    endMinute: number;
  }[];
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  priceMinor: number | null;
  showPrice: boolean;
};

export type PublicProfessional = {
  id: string;
  name: string;
  description?: string | null;
  locationId: string;
  serviceId: string;
};

export type PublicSlot = { time: string };
