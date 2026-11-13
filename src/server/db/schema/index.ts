import { sql } from 'drizzle-orm';
import {
  boolean, check, date, foreignKey, index, integer, jsonb,
  pgSchema, primaryKey, text, timestamp, unique, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core';
import { authUsers } from './external-auth';

export const app = pgSchema('app');

const id = () => uuid('id').defaultRandom().primaryKey();
const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const businesses = app.table('businesses', {
  id: id(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  status: text('status', { enum: ['draft', 'active', 'suspended', 'archived'] }).default('draft').notNull(),
  timezone: text('timezone').default('America/Argentina/Buenos_Aires').notNull(),
  currency: text('currency').default('ARS').notNull(),
  category: text('category'),
  ...timestamps(),
}, (t) => [
  unique('businesses_slug_unique').on(t.slug),
  check('businesses_name_check', sql`length(trim(${t.name})) > 0`),
  check('businesses_slug_check', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('businesses_status_check', sql`${t.status} in ('draft', 'active', 'suspended', 'archived')`),
  check('businesses_currency_check', sql`${t.currency} ~ '^[A-Z]{3}$'`),
  check('businesses_timezone_check', sql`length(trim(${t.timezone})) > 0`),
]);

const businessId = () => uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' });

export const locations = app.table('locations', {
  id: id(), businessId: businessId(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  addressText: text('address_text'),
  mapUrl: text('map_url'),
  contactPhone: text('contact_phone'),
  arrivalInstructions: text('arrival_instructions'),
  timezone: text('timezone').notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps(),
}, (t) => [
  unique('locations_business_id_unique').on(t.businessId, t.id),
  unique('locations_slug_unique').on(t.businessId, t.slug),
  index('locations_active_idx').on(t.businessId, t.isActive, t.isPrimary),
  uniqueIndex('locations_primary_unique').on(t.businessId).where(sql`${t.isPrimary}`),
  check('locations_name_check', sql`length(trim(${t.name})) > 0`),
  check('locations_slug_check', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  check('locations_timezone_check', sql`length(trim(${t.timezone})) > 0`),
]);

export const businessMembers = app.table('business_members', {
  businessId: businessId(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'restrict' }),
  role: text('role', { enum: ['owner'] }).default('owner').notNull(),
  ...timestamps(),
}, (t) => [
  primaryKey({ columns: [t.businessId, t.userId] }),
  uniqueIndex('business_members_owner_unique').on(t.businessId).where(sql`${t.role} = 'owner'`),
  index('business_members_user_idx').on(t.userId, t.businessId),
  check('business_members_role_check', sql`${t.role} = 'owner'`),
]);

export const businessSettings = app.table('business_settings', {
  businessId: businessId().primaryKey(),
  slotIntervalMinutes: integer('slot_interval_minutes').notNull(),
  bufferAfterMinutes: integer('buffer_after_minutes').default(0).notNull(),
  minBookingNoticeMinutes: integer('min_booking_notice_minutes').notNull(),
  bookingHorizonDays: integer('booking_horizon_days').notNull(),
  cancellationNoticeMinutes: integer('cancellation_notice_minutes').notNull(),
  allowAnyProfessional: boolean('allow_any_professional').default(true).notNull(),
  publicBookingEnabled: boolean('public_booking_enabled').default(false).notNull(),
  version: integer('version').default(1).notNull(),
  ...timestamps(),
}, (t) => [
  check('business_settings_interval_check', sql`${t.slotIntervalMinutes} > 0 and ${t.slotIntervalMinutes} <= 1440`),
  check('business_settings_limits_check', sql`${t.bufferAfterMinutes} >= 0 and ${t.minBookingNoticeMinutes} >= 0 and ${t.bookingHorizonDays} > 0 and ${t.cancellationNoticeMinutes} >= 0`),
  check('business_settings_version_check', sql`${t.version} > 0`),
]);

export type PageTheme = {
  schema_version: 1;
  palette: Record<string, string>;
  heading_font: string;
  body_font: string;
};

export const businessPages = app.table('business_pages', {
  businessId: businessId().primaryKey(),
  headline: text('headline'),
  description: text('description'),
  contactEmail: text('contact_email'),
  logoStoragePath: text('logo_storage_path'),
  coverStoragePath: text('cover_storage_path'),
  socialLinks: jsonb('social_links').$type<Record<string, string>>().default({}).notNull(),
  theme: jsonb('theme').$type<PageTheme>().notNull(),
  visibleSections: jsonb('visible_sections').$type<Record<string, boolean>>().default({}).notNull(),
  version: integer('version').default(1).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  ...timestamps(),
}, (t) => [
  check('business_pages_json_check', sql`jsonb_typeof(${t.socialLinks}) = 'object' and jsonb_typeof(${t.theme}) = 'object' and jsonb_typeof(${t.visibleSections}) = 'object'`),
  check('business_pages_theme_version_check', sql`${t.theme} @> '{"schema_version":1}'::jsonb`),
  check('business_pages_version_check', sql`${t.version} > 0`),
]);

export const services = app.table('services', {
  id: id(), businessId: businessId(),
  name: text('name').notNull(), description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  priceMinor: integer('price_minor'),
  showPrice: boolean('show_price').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  ...timestamps(),
}, (t) => [
  unique('services_business_id_unique').on(t.businessId, t.id),
  index('services_catalog_idx').on(t.businessId, t.isActive, t.sortOrder),
  check('services_name_check', sql`length(trim(${t.name})) > 0`),
  check('services_duration_check', sql`${t.durationMinutes} > 0`),
  check('services_price_check', sql`${t.priceMinor} >= 0`),
]);

export const professionals = app.table('professionals', {
  id: id(), businessId: businessId(),
  displayName: text('display_name').notNull(), description: text('description'),
  photoStoragePath: text('photo_storage_path'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  ...timestamps(),
}, (t) => [
  unique('professionals_business_id_unique').on(t.businessId, t.id),
  index('professionals_catalog_idx').on(t.businessId, t.isActive, t.sortOrder),
  check('professionals_name_check', sql`length(trim(${t.displayName})) > 0`),
]);

export const professionalLocations = app.table('professional_locations', {
  businessId: businessId(),
  locationId: uuid('location_id').notNull(),
  professionalId: uuid('professional_id').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps(),
}, (t) => [
  primaryKey({ columns: [t.businessId, t.locationId, t.professionalId] }),
  foreignKey({ name: 'professional_locations_location_fk', columns: [t.businessId, t.locationId], foreignColumns: [locations.businessId, locations.id] }).onDelete('restrict'),
  foreignKey({ name: 'professional_locations_professional_fk', columns: [t.businessId, t.professionalId], foreignColumns: [professionals.businessId, professionals.id] }).onDelete('restrict'),
  index('professional_locations_professional_idx').on(t.businessId, t.professionalId, t.isActive, t.locationId),
]);

export const professionalServices = app.table('professional_services', {
  businessId: businessId(),
  professionalId: uuid('professional_id').notNull(),
  serviceId: uuid('service_id').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps(),
}, (t) => [
  primaryKey({ columns: [t.businessId, t.professionalId, t.serviceId] }),
  foreignKey({ name: 'professional_services_professional_fk', columns: [t.businessId, t.professionalId], foreignColumns: [professionals.businessId, professionals.id] }).onDelete('restrict'),
  foreignKey({ name: 'professional_services_service_fk', columns: [t.businessId, t.serviceId], foreignColumns: [services.businessId, services.id] }).onDelete('restrict'),
  index('professional_services_service_idx').on(t.businessId, t.serviceId, t.isActive, t.professionalId),
]);

export const schedules = app.table('schedules', {
  id: id(), businessId: businessId(),
  locationId: uuid('location_id').notNull(),
  professionalId: uuid('professional_id'),
  ...timestamps(),
}, (t) => [
  unique('schedules_business_id_unique').on(t.businessId, t.id),
  foreignKey({ name: 'schedules_location_fk', columns: [t.businessId, t.locationId], foreignColumns: [locations.businessId, locations.id] }).onDelete('restrict'),
  foreignKey({ name: 'schedules_professional_location_fk', columns: [t.businessId, t.locationId, t.professionalId], foreignColumns: [professionalLocations.businessId, professionalLocations.locationId, professionalLocations.professionalId] }).onDelete('restrict'),
  uniqueIndex('schedules_location_business_unique').on(t.businessId, t.locationId).where(sql`${t.professionalId} is null`),
  uniqueIndex('schedules_location_professional_unique').on(t.businessId, t.locationId, t.professionalId).where(sql`${t.professionalId} is not null`),
]);

export const weeklyIntervals = app.table('weekly_intervals', {
  id: id(), businessId: businessId(),
  scheduleId: uuid('schedule_id').notNull(),
  weekday: integer('weekday').notNull(),
  startMinute: integer('start_minute').notNull(),
  endMinute: integer('end_minute').notNull(),
  ...timestamps(),
}, (t) => [
  unique('weekly_intervals_business_id_unique').on(t.businessId, t.id),
  foreignKey({ name: 'weekly_intervals_schedule_fk', columns: [t.businessId, t.scheduleId], foreignColumns: [schedules.businessId, schedules.id] }).onDelete('restrict'),
  index('weekly_intervals_schedule_idx').on(t.businessId, t.scheduleId, t.weekday),
  check('weekly_intervals_weekday_check', sql`${t.weekday} between 1 and 7`),
  check('weekly_intervals_bounds_check', sql`${t.startMinute} >= 0 and ${t.startMinute} < ${t.endMinute} and ${t.endMinute} <= 1440`),
]);

export const scheduleExceptions = app.table('schedule_exceptions', {
  id: id(), businessId: businessId(),
  scheduleId: uuid('schedule_id').notNull(),
  localDate: date('local_date', { mode: 'string' }).notNull(),
  mode: text('mode', { enum: ['closed', 'custom'] }).notNull(),
  reason: text('reason'),
  ...timestamps(),
}, (t) => [
  unique('schedule_exceptions_business_id_unique').on(t.businessId, t.id),
  unique('schedule_exceptions_date_unique').on(t.businessId, t.scheduleId, t.localDate),
  foreignKey({ name: 'schedule_exceptions_schedule_fk', columns: [t.businessId, t.scheduleId], foreignColumns: [schedules.businessId, schedules.id] }).onDelete('restrict'),
  check('schedule_exceptions_mode_check', sql`${t.mode} in ('closed', 'custom')`),
]);

export const exceptionIntervals = app.table('exception_intervals', {
  id: id(), businessId: businessId(),
  exceptionId: uuid('exception_id').notNull(),
  startMinute: integer('start_minute').notNull(),
  endMinute: integer('end_minute').notNull(),
  ...timestamps(),
}, (t) => [
  unique('exception_intervals_business_id_unique').on(t.businessId, t.id),
  foreignKey({ name: 'exception_intervals_exception_fk', columns: [t.businessId, t.exceptionId], foreignColumns: [scheduleExceptions.businessId, scheduleExceptions.id] }).onDelete('restrict'),
  index('exception_intervals_exception_idx').on(t.businessId, t.exceptionId),
  check('exception_intervals_bounds_check', sql`${t.startMinute} >= 0 and ${t.startMinute} < ${t.endMinute} and ${t.endMinute} <= 1440`),
]);

export const customers = app.table('customers', {
  id: id(), businessId: businessId(),
  displayName: text('display_name').notNull(),
  phoneNormalized: text('phone_normalized').notNull(),
  email: text('email'),
  ...timestamps(),
}, (t) => [
  unique('customers_business_id_unique').on(t.businessId, t.id),
  index('customers_phone_idx').on(t.businessId, t.phoneNormalized),
  check('customers_name_check', sql`length(trim(${t.displayName})) > 0`),
  check('customers_phone_check', sql`${t.phoneNormalized} ~ '^[+][1-9][0-9]{1,14}$'`),
]);

export const appointments = app.table('appointments', {
  id: id(), businessId: businessId(),
  locationId: uuid('location_id').notNull(),
  professionalId: uuid('professional_id').notNull(),
  serviceId: uuid('service_id').notNull(),
  customerId: uuid('customer_id'),
  status: text('status', { enum: ['confirmed', 'cancelled', 'attended', 'no_show'] }).default('confirmed').notNull(),
  source: text('source', { enum: ['public', 'manual'] }).notNull(),
  selectionMode: text('selection_mode', { enum: ['specific', 'any'] }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  durationMinutesSnapshot: integer('duration_minutes_snapshot').notNull(),
  bufferAfterMinutesSnapshot: integer('buffer_after_minutes_snapshot').notNull(),
  priceMinorSnapshot: integer('price_minor_snapshot'),
  currencySnapshot: text('currency_snapshot').notNull(),
  cancellationNoticeMinutesSnapshot: integer('cancellation_notice_minutes_snapshot').notNull(),
  timezoneSnapshot: text('timezone_snapshot').notNull(),
  locationNameSnapshot: text('location_name_snapshot').notNull(),
  locationAddressSnapshot: text('location_address_snapshot'),
  serviceNameSnapshot: text('service_name_snapshot').notNull(),
  professionalNameSnapshot: text('professional_name_snapshot').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: text('cancellation_reason'),
  version: integer('version').default(1).notNull(),
  ...timestamps(),
}, (t) => [
  unique('appointments_business_id_unique').on(t.businessId, t.id),
  unique('appointments_professional_identity_unique').on(t.businessId, t.id, t.professionalId),
  unique('appointments_location_professional_identity_unique').on(t.businessId, t.id, t.professionalId, t.locationId),
  foreignKey({ name: 'appointments_assignment_fk', columns: [t.businessId, t.professionalId, t.serviceId], foreignColumns: [professionalServices.businessId, professionalServices.professionalId, professionalServices.serviceId] }).onDelete('restrict'),
  foreignKey({ name: 'appointments_professional_location_fk', columns: [t.businessId, t.locationId, t.professionalId], foreignColumns: [professionalLocations.businessId, professionalLocations.locationId, professionalLocations.professionalId] }).onDelete('restrict'),
  foreignKey({ name: 'appointments_location_fk', columns: [t.businessId, t.locationId], foreignColumns: [locations.businessId, locations.id] }).onDelete('restrict'),
  foreignKey({ name: 'appointments_customer_fk', columns: [t.businessId, t.customerId], foreignColumns: [customers.businessId, customers.id] }).onDelete('restrict'),
  index('appointments_agenda_idx').on(t.businessId, t.locationId, t.startsAt),
  index('appointments_professional_agenda_idx').on(t.businessId, t.professionalId, t.startsAt),
  index('appointments_customer_history_idx').on(t.businessId, t.customerId, t.startsAt),
  index('appointments_assignment_idx').on(t.businessId, t.professionalId, t.serviceId),
  check('appointments_status_check', sql`${t.status} in ('confirmed', 'cancelled', 'attended', 'no_show')`),
  check('appointments_source_check', sql`${t.source} in ('public', 'manual')`),
  check('appointments_selection_check', sql`${t.selectionMode} in ('specific', 'any')`),
  check('appointments_duration_check', sql`${t.durationMinutesSnapshot} > 0 and ${t.endsAt} - ${t.startsAt} = ${t.durationMinutesSnapshot} * interval '1 minute'`),
  check('appointments_snapshot_limits_check', sql`${t.bufferAfterMinutesSnapshot} >= 0 and ${t.cancellationNoticeMinutesSnapshot} >= 0 and (${t.priceMinorSnapshot} is null or ${t.priceMinorSnapshot} >= 0)`),
  check('appointments_currency_check', sql`${t.currencySnapshot} ~ '^[A-Z]{3}$'`),
  check('appointments_cancelled_at_check', sql`(${t.status} = 'cancelled') = (${t.cancelledAt} is not null)`),
  check('appointments_version_check', sql`${t.version} > 0`),
  check('appointments_names_check', sql`length(trim(${t.customerName})) > 0 and length(trim(${t.serviceNameSnapshot})) > 0 and length(trim(${t.professionalNameSnapshot})) > 0 and length(trim(${t.locationNameSnapshot})) > 0 and length(trim(${t.timezoneSnapshot})) > 0`),
  check('appointments_phone_check', sql`${t.customerPhone} ~ '^[+][1-9][0-9]{1,14}$'`),
]);

export const calendarOccupancies = app.table('calendar_occupancies', {
  id: id(), businessId: businessId(),
  locationId: uuid('location_id').notNull(),
  professionalId: uuid('professional_id').notNull(),
  appointmentId: uuid('appointment_id'),
  kind: text('kind', { enum: ['appointment', 'block'] }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  reason: text('reason'),
  createdByUserId: uuid('created_by_user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  ...timestamps(),
}, (t) => [
  unique('calendar_occupancies_business_id_unique').on(t.businessId, t.id),
  unique('calendar_occupancies_appointment_unique').on(t.businessId, t.appointmentId),
  foreignKey({ name: 'calendar_occupancies_professional_fk', columns: [t.businessId, t.professionalId], foreignColumns: [professionals.businessId, professionals.id] }).onDelete('restrict'),
  foreignKey({ name: 'calendar_occupancies_professional_location_fk', columns: [t.businessId, t.locationId, t.professionalId], foreignColumns: [professionalLocations.businessId, professionalLocations.locationId, professionalLocations.professionalId] }).onDelete('restrict'),
  foreignKey({ name: 'calendar_occupancies_appointment_fk', columns: [t.businessId, t.appointmentId, t.professionalId, t.locationId], foreignColumns: [appointments.businessId, appointments.id, appointments.professionalId, appointments.locationId] }).onDelete('restrict').onUpdate('cascade'),
  index('calendar_occupancies_professional_idx').on(t.businessId, t.professionalId, t.locationId),
  index('calendar_occupancies_creator_idx').on(t.createdByUserId),
  check('calendar_occupancies_bounds_check', sql`${t.startsAt} < ${t.endsAt}`),
  check('calendar_occupancies_kind_check', sql`(${t.kind} = 'appointment' and ${t.appointmentId} is not null) or (${t.kind} = 'block' and ${t.appointmentId} is null)`),
]);

export const appointmentAccessCodes = app.table('appointment_access_codes', {
  businessId: businessId(),
  appointmentId: uuid('appointment_id').notNull(),
  codeHash: text('code_hash').notNull(),
  codeCiphertext: text('code_ciphertext').notNull(),
  encryptionKeyVersion: integer('encryption_key_version').notNull(),
  createdAt: createdAt(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => [
  primaryKey({ columns: [t.businessId, t.appointmentId] }),
  unique('appointment_access_codes_hash_unique').on(t.businessId, t.codeHash),
  foreignKey({ name: 'appointment_access_codes_appointment_fk', columns: [t.businessId, t.appointmentId], foreignColumns: [appointments.businessId, appointments.id] }).onDelete('restrict'),
  check('appointment_access_codes_hash_check', sql`${t.codeHash} ~ '^[0-9a-f]{64}$'`),
  check('appointment_access_codes_ciphertext_check', sql`length(${t.codeCiphertext}) > 0 and ${t.encryptionKeyVersion} > 0`),
]);

export const bookingRequests = app.table('booking_requests', {
  id: id(), businessId: businessId(),
  idempotencyKey: uuid('idempotency_key').notNull(),
  requestHash: text('request_hash').notNull(),
  appointmentId: uuid('appointment_id').notNull(),
  createdAt: createdAt(),
}, (t) => [
  unique('booking_requests_business_id_unique').on(t.businessId, t.id),
  unique('booking_requests_key_unique').on(t.businessId, t.idempotencyKey),
  unique('booking_requests_appointment_unique').on(t.businessId, t.appointmentId),
  foreignKey({ name: 'booking_requests_appointment_fk', columns: [t.businessId, t.appointmentId], foreignColumns: [appointments.businessId, appointments.id] }).onDelete('restrict'),
  check('booking_requests_hash_check', sql`${t.requestHash} ~ '^[0-9a-f]{64}$'`),
]);

export const appointmentEvents = app.table('appointment_events', {
  id: id(), businessId: businessId(),
  appointmentId: uuid('appointment_id').notNull(),
  eventType: text('event_type', { enum: ['created', 'cancelled', 'rescheduled', 'status_changed', 'corrected'] }).notNull(),
  actorType: text('actor_type', { enum: ['customer', 'owner', 'platform', 'system'] }).notNull(),
  actorUserId: uuid('actor_user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  appointmentVersion: integer('appointment_version').notNull(),
  changes: jsonb('changes').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: createdAt(),
}, (t) => [
  unique('appointment_events_business_id_unique').on(t.businessId, t.id),
  foreignKey({ name: 'appointment_events_appointment_fk', columns: [t.businessId, t.appointmentId], foreignColumns: [appointments.businessId, appointments.id] }).onDelete('restrict'),
  index('appointment_events_history_idx').on(t.businessId, t.appointmentId, t.createdAt, t.id),
  index('appointment_events_actor_idx').on(t.actorUserId),
  check('appointment_events_type_check', sql`${t.eventType} in ('created', 'cancelled', 'rescheduled', 'status_changed', 'corrected')`),
  check('appointment_events_actor_check', sql`${t.actorType} in ('customer', 'owner', 'platform', 'system')`),
  check('appointment_events_version_check', sql`${t.appointmentVersion} > 0`),
  check('appointment_events_changes_check', sql`jsonb_typeof(${t.changes}) = 'object'`),
]);

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
