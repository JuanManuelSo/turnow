import 'server-only';
import { and, asc, desc, eq, gte, gt, inArray, isNull } from 'drizzle-orm';
import { PAGE_EDITOR_ENABLED } from '@/config/features';
import { getDb } from '@/server/db/client';
import { formatTimezone } from '@/lib/dashboard-format';
import {
  businessMembers, businessPages, businessSettings, businesses, calendarOccupancies,
  exceptionIntervals, locations, professionals, professionalLocations, professionalServices,
  scheduleExceptions, schedules, services, weeklyIntervals,
} from '@/server/db/schema';

export type BusinessShell = {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'suspended' | 'archived';
  timezone: string;
  currency: string;
};

export async function getBusinessShell(businessId: string): Promise<BusinessShell | null> {
  const [business] = await getDb().select({
    id: businesses.id,
    name: businesses.name,
    slug: businesses.slug,
    status: businesses.status,
    timezone: businesses.timezone,
    currency: businesses.currency,
  }).from(businesses).where(eq(businesses.id, businessId)).limit(1);
  return business ?? null;
}

export async function countOwners(businessId: string) {
  const rows = await getDb().select({ userId: businessMembers.userId })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.role, 'owner')));
  return rows.length;
}

export async function getLocations(businessId: string) {
  return getDb().select().from(locations)
    .where(eq(locations.businessId, businessId))
    .orderBy(desc(locations.isPrimary), asc(locations.name));
}

export async function getServices(businessId: string) {
  return getDb().select().from(services)
    .where(eq(services.businessId, businessId))
    .orderBy(asc(services.sortOrder), asc(services.name));
}

export type ProfessionalWithAssignments = {
  id: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  locationIds: string[];
  serviceIds: string[];
};

export async function getProfessionalsData(businessId: string) {
  const db = getDb();
  const [locationRows, serviceRows, professionalRows, locationAssignments, serviceAssignments] = await Promise.all([
    db.select({ id: locations.id, name: locations.name, isActive: locations.isActive }).from(locations)
      .where(eq(locations.businessId, businessId))
      .orderBy(desc(locations.isPrimary), asc(locations.name)),
    db.select({ id: services.id, name: services.name, isActive: services.isActive }).from(services)
      .where(eq(services.businessId, businessId))
      .orderBy(asc(services.sortOrder), asc(services.name)),
    db.select({
      id: professionals.id,
      displayName: professionals.displayName,
      description: professionals.description,
      isActive: professionals.isActive,
      sortOrder: professionals.sortOrder,
    }).from(professionals)
      .where(eq(professionals.businessId, businessId))
      .orderBy(asc(professionals.sortOrder), asc(professionals.displayName)),
    db.select({
      professionalId: professionalLocations.professionalId,
      locationId: professionalLocations.locationId,
    }).from(professionalLocations)
      .where(and(eq(professionalLocations.businessId, businessId), eq(professionalLocations.isActive, true))),
    db.select({
      professionalId: professionalServices.professionalId,
      serviceId: professionalServices.serviceId,
    }).from(professionalServices)
      .where(and(eq(professionalServices.businessId, businessId), eq(professionalServices.isActive, true))),
  ]);

  const locationIds = new Map<string, string[]>();
  const serviceIds = new Map<string, string[]>();
  for (const assignment of locationAssignments) {
    locationIds.set(assignment.professionalId, [...(locationIds.get(assignment.professionalId) ?? []), assignment.locationId]);
  }
  for (const assignment of serviceAssignments) {
    serviceIds.set(assignment.professionalId, [...(serviceIds.get(assignment.professionalId) ?? []), assignment.serviceId]);
  }

  const rows: ProfessionalWithAssignments[] = professionalRows.map(row => ({
    ...row,
    locationIds: locationIds.get(row.id) ?? [],
    serviceIds: serviceIds.get(row.id) ?? [],
  }));

  return { locations: locationRows, services: serviceRows, professionals: rows };
}

export async function getSchedulesData(businessId: string, requestedLocationId?: string) {
  const db = getDb();
  const locationRows = await db.select({
    id: locations.id,
    name: locations.name,
    addressText: locations.addressText,
    timezone: locations.timezone,
    isPrimary: locations.isPrimary,
  }).from(locations)
    .where(and(eq(locations.businessId, businessId), eq(locations.isActive, true)))
    .orderBy(desc(locations.isPrimary), asc(locations.name));

  const selected = locationRows.find(location => location.id === requestedLocationId) ?? locationRows[0] ?? null;
  if (!selected) {
    return {
      locations: locationRows, selected: null, professionals: [], schedules: [],
      coverage: {}, exceptions: [], blocks: [], today: null,
    };
  }

  const professionalRows = await db.select({ id: professionals.id, displayName: professionals.displayName })
    .from(professionals)
    .innerJoin(professionalLocations, and(
      eq(professionalLocations.businessId, professionals.businessId),
      eq(professionalLocations.professionalId, professionals.id),
    ))
    .where(and(
      eq(professionals.businessId, businessId),
      eq(professionals.isActive, true),
      eq(professionalLocations.locationId, selected.id),
      eq(professionalLocations.isActive, true),
    ))
    .orderBy(asc(professionals.sortOrder), asc(professionals.displayName));

  const scheduleRows = await db.select({
    id: schedules.id,
    professionalId: schedules.professionalId,
  }).from(schedules)
    .where(and(eq(schedules.businessId, businessId), eq(schedules.locationId, selected.id)));

  const coverageRows = await db.select({ locationId: schedules.locationId, scheduleId: schedules.id })
    .from(schedules)
    .where(and(eq(schedules.businessId, businessId), isNull(schedules.professionalId)));
  const coverageScheduleIds = coverageRows.map(row => row.scheduleId);
  const coverageIntervals = coverageScheduleIds.length
    ? await db.select({ scheduleId: weeklyIntervals.scheduleId }).from(weeklyIntervals)
      .where(and(eq(weeklyIntervals.businessId, businessId), inArray(weeklyIntervals.scheduleId, coverageScheduleIds)))
    : [];
  const scheduleIdsWithIntervals = new Set(coverageIntervals.map(row => row.scheduleId));
  const coverage = Object.fromEntries(coverageRows.map(row => [
    row.locationId,
    scheduleIdsWithIntervals.has(row.scheduleId),
  ])) as Record<string, boolean>;

  const scheduleIds = scheduleRows.map(schedule => schedule.id);
  const intervalRows = scheduleIds.length
    ? await db.select({
      id: weeklyIntervals.id,
      scheduleId: weeklyIntervals.scheduleId,
      weekday: weeklyIntervals.weekday,
      startMinute: weeklyIntervals.startMinute,
      endMinute: weeklyIntervals.endMinute,
    }).from(weeklyIntervals)
      .where(and(eq(weeklyIntervals.businessId, businessId), inArray(weeklyIntervals.scheduleId, scheduleIds)))
      .orderBy(asc(weeklyIntervals.weekday), asc(weeklyIntervals.startMinute))
    : [];

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: selected.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  const [exceptionRows, blockRows] = await Promise.all([
    scheduleIds.length
      ? db.select({
        id: scheduleExceptions.id,
        scheduleId: scheduleExceptions.scheduleId,
        localDate: scheduleExceptions.localDate,
        mode: scheduleExceptions.mode,
        reason: scheduleExceptions.reason,
        professionalId: schedules.professionalId,
        startMinute: exceptionIntervals.startMinute,
        endMinute: exceptionIntervals.endMinute,
      }).from(scheduleExceptions)
        .innerJoin(schedules, and(
          eq(schedules.businessId, scheduleExceptions.businessId),
          eq(schedules.id, scheduleExceptions.scheduleId),
        ))
        .leftJoin(exceptionIntervals, and(
          eq(exceptionIntervals.businessId, scheduleExceptions.businessId),
          eq(exceptionIntervals.exceptionId, scheduleExceptions.id),
        ))
        .where(and(
          eq(scheduleExceptions.businessId, businessId),
          inArray(scheduleExceptions.scheduleId, scheduleIds),
          gte(scheduleExceptions.localDate, today),
        ))
        .orderBy(asc(scheduleExceptions.localDate))
      : [],
    db.select({
      id: calendarOccupancies.id,
      professionalId: calendarOccupancies.professionalId,
      professionalName: professionals.displayName,
      startsAt: calendarOccupancies.startsAt,
      endsAt: calendarOccupancies.endsAt,
      reason: calendarOccupancies.reason,
    }).from(calendarOccupancies)
      .innerJoin(professionals, and(
        eq(professionals.businessId, calendarOccupancies.businessId),
        eq(professionals.id, calendarOccupancies.professionalId),
      ))
      .where(and(
        eq(calendarOccupancies.businessId, businessId),
        eq(calendarOccupancies.locationId, selected.id),
        eq(calendarOccupancies.kind, 'block'),
        eq(calendarOccupancies.isActive, true),
        gt(calendarOccupancies.endsAt, new Date()),
      ))
      .orderBy(asc(calendarOccupancies.startsAt)),
  ]);

  const exceptionsById = new Map<string, {
    id: string; localDate: string; mode: 'closed' | 'custom'; reason: string | null;
    professionalId: string | null; intervals: Array<{ startMinute: number; endMinute: number }>;
  }>();
  for (const row of exceptionRows) {
    const exception = exceptionsById.get(row.id) ?? {
      id: row.id, localDate: row.localDate, mode: row.mode, reason: row.reason,
      professionalId: row.professionalId, intervals: [],
    };
    if (row.startMinute !== null && row.endMinute !== null) {
      exception.intervals.push({ startMinute: row.startMinute, endMinute: row.endMinute });
    }
    exceptionsById.set(row.id, exception);
  }

  return {
    locations: locationRows,
    selected,
    professionals: professionalRows,
    schedules: scheduleRows.map(schedule => ({
      ...schedule,
      intervals: intervalRows.filter(interval => interval.scheduleId === schedule.id),
    })),
    coverage,
    today,
    exceptions: [...exceptionsById.values()],
    blocks: blockRows,
  };
}

export type SetupStep = {
  key: string;
  number: string;
  title: string;
  description: string;
  detail: string;
  state: 'done' | 'pending' | 'later';
  href: string;
};

export async function getOverview(businessId: string) {
  const db = getDb();
  const [business, locationRows, serviceRows, professionalRows, assignments, scheduleRows, intervalRows, settingsRows, pageRows] = await Promise.all([
    getBusinessShell(businessId),
    db.select().from(locations).where(eq(locations.businessId, businessId)),
    db.select().from(services).where(eq(services.businessId, businessId)),
    db.select().from(professionals).where(eq(professionals.businessId, businessId)),
    db.select({
      professionalId: professionalLocations.professionalId,
      locationId: professionalLocations.locationId,
    }).from(professionalLocations)
      .where(and(eq(professionalLocations.businessId, businessId), eq(professionalLocations.isActive, true))),
    db.select({ id: schedules.id, locationId: schedules.locationId, professionalId: schedules.professionalId })
      .from(schedules).where(eq(schedules.businessId, businessId)),
    db.select({ scheduleId: weeklyIntervals.scheduleId }).from(weeklyIntervals)
      .where(eq(weeklyIntervals.businessId, businessId)),
    db.select().from(businessSettings).where(eq(businessSettings.businessId, businessId)).limit(1),
    db.select().from(businessPages).where(eq(businessPages.businessId, businessId)).limit(1),
  ]);

  const activeLocations = locationRows.filter(location => location.isActive);
  const activeLocationIds = new Set(activeLocations.map(location => location.id));
  const activeServices = serviceRows.filter(service => service.isActive);
  const activeProfessionals = professionalRows.filter(professional => professional.isActive);
  const assignedProfessionals = new Set(
    assignments
      .filter(assignment => activeLocationIds.has(assignment.locationId))
      .map(assignment => assignment.professionalId),
  );
  const professionalsWithLocation = activeProfessionals.filter(professional => assignedProfessionals.has(professional.id));

  const pageRow = pageRows[0] ?? null;
  const hasPageDraft = Boolean(pageRow && (
    pageRow.headline
    || pageRow.description
    || pageRow.contactEmail
    || Object.keys(pageRow.socialLinks ?? {}).length
  ));

  const scheduleIdsWithIntervals = new Set(intervalRows.map(interval => interval.scheduleId));
  const businessSchedules = scheduleRows.filter(schedule => schedule.professionalId === null);
  const locationsWithSchedule = new Set(
    businessSchedules
      .filter(schedule => scheduleIdsWithIntervals.has(schedule.id) && activeLocationIds.has(schedule.locationId))
      .map(schedule => schedule.locationId),
  );
  const pendingScheduleLocation = activeLocations.find(location => !locationsWithSchedule.has(location.id)) ?? null;

  const steps: SetupStep[] = [
    {
      key: 'negocio',
      number: '01',
      title: 'Datos del negocio',
      description: 'Identidad, zona horaria y moneda. El nombre y el slug se fijaron en el alta para no romper enlaces.',
      detail: `${business?.currency ?? 'ARS'} · ${business ? formatTimezone(business.timezone) : 'Sin zona horaria'}`,
      state: 'done',
      href: '/dashboard/configuracion',
    },
    {
      key: 'sedes',
      number: '02',
      title: 'Sedes',
      description: 'Cada sede tiene su dirección y su propia agenda. Los clientes eligen una al reservar.',
      detail: `${activeLocations.length} de ${locationRows.length} ${locationRows.length === 1 ? 'sede activa' : 'sedes activas'}`,
      state: activeLocations.length > 0 ? 'done' : 'pending',
      href: '/dashboard/sedes',
    },
    {
      key: 'servicios',
      number: '03',
      title: 'Servicios',
      description: 'Duración y precio del catálogo. El mismo catálogo se ofrece en todas las sedes.',
      detail: `${activeServices.length} ${activeServices.length === 1 ? 'servicio activo' : 'servicios activos'}`,
      state: activeServices.length > 0 ? 'done' : 'pending',
      href: '/dashboard/servicios',
    },
    {
      key: 'profesionales',
      number: '04',
      title: 'Profesionales',
      description: 'Quiénes atienden, en qué sedes y qué servicios ofrecen.',
      detail: `${professionalsWithLocation.length} ${professionalsWithLocation.length === 1 ? 'profesional con sede' : 'profesionales con sede'}`,
      state: professionalsWithLocation.length > 0 ? 'done' : 'pending',
      href: '/dashboard/profesionales',
    },
    {
      key: 'horarios',
      number: '05',
      title: 'Horarios',
      description: 'Franjas semanales por sede y por profesional, con turnos partidos cuando haga falta.',
      detail: `${locationsWithSchedule.size} de ${activeLocations.length} ${activeLocations.length === 1 ? 'sede con horario' : 'sedes con horario'}`,
      state: activeLocations.length > 0 && locationsWithSchedule.size === activeLocations.length ? 'done' : 'pending',
      href: pendingScheduleLocation
        ? `/dashboard/horarios?sede=${pendingScheduleLocation.id}&ambito=sede`
        : '/dashboard/horarios',
    },
    {
      key: 'pagina',
      number: '06',
      title: 'Textos de la página pública',
      description: 'Editá la bienvenida y los enlaces que aparecen en tu página de reservas.',
      detail: hasPageDraft ? 'Contenido guardado' : 'Usando presentación predeterminada',
      state: hasPageDraft ? 'done' : 'pending',
      href: '/dashboard/pagina-publica',
    },
  ];

  const visibleSteps = PAGE_EDITOR_ENABLED ? steps : steps.filter(step => step.key !== 'pagina');
  const trackable = visibleSteps.filter(step => step.state !== 'later');
  const done = trackable.filter(step => step.state === 'done').length;
  const nextStep = visibleSteps.find(step => step.state === 'pending') ?? null;

  return {
    business,
    locationCount: locationRows.length,
    activeLocationCount: activeLocations.length,
    serviceCount: serviceRows.length,
    activeServiceCount: activeServices.length,
    professionalCount: professionalRows.length,
    activeProfessionalCount: activeProfessionals.length,
    professionalsWithLocation: professionalsWithLocation.length,
    locationsWithSchedule: locationsWithSchedule.size,
    settings: settingsRows[0] ?? null,
    page: pageRows[0] ?? null,
    steps: visibleSteps,
    progress: trackable.length ? Math.round((done / trackable.length) * 100) : 0,
    nextStep,
  };
}

export async function getConfigurationData(businessId: string) {
  const db = getDb();
  const [business, settingsRows, pageRows] = await Promise.all([
    getBusinessShell(businessId),
    db.select().from(businessSettings).where(eq(businessSettings.businessId, businessId)).limit(1),
    db.select().from(businessPages).where(eq(businessPages.businessId, businessId)).limit(1),
  ]);
  return { business, settings: settingsRows[0] ?? null, page: pageRows[0] ?? null };
}
