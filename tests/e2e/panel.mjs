import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createDecipheriv, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local', quiet: true });

const testFile = process.env.PANEL_TEST_FILE
  ?? 'C:/Users/usuario/AppData/Local/Temp/opencode/panel-test.json';
const { email, password, businessId } = JSON.parse(await readFile(testFile, 'utf8'));
const base = process.env.PANEL_URL ?? 'http://localhost:3000';

const sql = postgres(process.env.DATABASE_MIGRATION_URL, {
  ssl: 'require', prepare: false, max: 1, connect_timeout: 10,
});

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
function replaceFormPart(body, name, value) {
  const source = body.toString('utf8');
  const pattern = new RegExp(`(name="(?:_\\d+_)?${name}"\\r\\n\\r\\n)[^\\r]*`);
  assert(pattern.test(source), `Captured form includes ${name}`);
  return Buffer.from(source.replace(pattern, `$1${value}`));
}
function decryptTestCode(ciphertext, keyVersion) {
  assert.equal(keyVersion, 1);
  const key = Buffer.from(process.env.BOOKING_CODE_ENCRYPTION_KEY, 'hex');
  const packed = Buffer.from(ciphertext, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, packed.subarray(0, 12));
  decipher.setAuthTag(packed.subarray(12, 28));
  return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8');
}
page.on('pageerror', error => errors.push(error.message));

const settle = async () => {
  await page.waitForFunction(() => !Array.from(document.querySelectorAll('button'))
    .some(button => /Guardando/.test(button.textContent ?? '')));
  await page.evaluate(async () => {
    document.querySelectorAll('nextjs-portal').forEach(node => {
      node.style.display = 'none';
    });
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
};
const screenshot = async name => {
  if (process.env.SAVE_REVIEW_SHOTS !== '1') return;
  await mkdir('.impeccable/review', { recursive: true });
  await settle();
  await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true, animations: 'disabled' });
};
const noOverflow = async () => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(overflow <= 0, `Horizontal overflow of ${overflow}px at ${page.url()}`);
};
const row = text => page.locator('.panel-row', { hasText: text });
const saveWith = async (locator, path) => {
  const [response] = await Promise.all([
    page.waitForResponse(item => item.request().method() === 'POST' && item.url().includes(path)),
    locator.click(),
  ]);
  assert.equal(response.status(), 200, `POST ${path} responded ${response.status()}`);
  await page.waitForTimeout(700);
};
const waitForQuery = async (query, message) => {
  for (let attempt = 0; attempt < 24; attempt++) {
    const rows = await query();
    if (rows.length) return rows[0];
    await page.waitForTimeout(250);
  }
  const errors = await page.locator('.panel-form-error').allInnerTexts();
  throw new Error(`${message}${errors.length ? ` · ${errors.join(' ')}` : ''}`);
};

let locationId;
let serviceId;
let operatorMembershipRestore = null;

async function resetTestBusiness() {
  await sql.begin(async tx => {
    await tx`update app.businesses set status = 'active', updated_at = now() where id = ${businessId}`;
    await tx`delete from app.appointment_payments where business_id = ${businessId}`;
    await tx`delete from app.appointment_events where business_id = ${businessId}`;
    await tx`delete from app.appointment_access_codes where business_id = ${businessId}`;
    await tx`delete from app.booking_requests where business_id = ${businessId}`;
    await tx`delete from app.public_rate_limits where business_id = ${businessId}`;
    await tx`delete from app.calendar_occupancies where business_id = ${businessId}`;
    await tx`delete from app.appointments where business_id = ${businessId}`;
    await tx`delete from app.customers where business_id = ${businessId}`;
    await tx`delete from app.exception_intervals where business_id = ${businessId}`;
    await tx`delete from app.schedule_exceptions where business_id = ${businessId}`;
    await tx`delete from app.weekly_intervals where business_id = ${businessId}`;
    await tx`delete from app.schedules where business_id = ${businessId}`;
    await tx`delete from app.professional_services where business_id = ${businessId}`;
    await tx`delete from app.professional_locations where business_id = ${businessId}`;
    await tx`delete from app.professionals where business_id = ${businessId}`;
    await tx`delete from app.services where business_id = ${businessId}`;
    await tx`delete from app.locations where business_id = ${businessId} and slug not in ('urquiza', 'febrero', 'roca')`;
    await tx`update app.locations set is_primary = false, is_active = true, updated_at = now() where business_id = ${businessId}`;
    await tx`update app.locations set is_primary = true, updated_at = now() where business_id = ${businessId} and slug = 'urquiza'`;
    await tx`update app.business_settings set slot_interval_minutes = 30, buffer_after_minutes = 0,
      min_booking_notice_minutes = 60, booking_horizon_days = 60, cancellation_notice_minutes = 60,
      allow_any_professional = true, public_booking_enabled = false, version = 1, updated_at = now()
      where business_id = ${businessId}`;
    await tx`update app.business_pages set headline = null, description = null, contact_email = null,
      social_links = '{}'::jsonb, version = 1, updated_at = now() where business_id = ${businessId}`;
  });
}

try {
  await resetTestBusiness();
  const [testBusiness] = await sql`select slug from app.businesses where id = ${businessId}`;

  // Login
  await page.goto(`${base}/login`);
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { level: 1, name: 'Agenda diaria' }).waitFor();
  await page.locator('.agenda-day-heading h2').waitFor();
  await page.getByRole('link', { name: 'Agenda', exact: true }).waitFor();
  await screenshot('panel-01-agenda-empty');

  // Sedes: create
  await page.getByRole('link', { name: 'Sedes', exact: true }).click();
  await page.waitForURL('**/dashboard/sedes');
  await page.getByRole('link', { name: 'Nueva sede' }).click();
  await page.getByRole('heading', { level: 2, name: 'Datos de la sede' }).waitFor();
  await page.getByLabel('Nombre').fill('Sede de prueba');
  await page.getByLabel('Slug').fill('prueba');
  await page.getByLabel('Dirección').fill('Córdoba 1000');
  await page.getByLabel('Teléfono').fill('341 555 0199');
  await page.getByRole('button', { name: 'Crear sede' }).click();
  await page.waitForURL(/\/dashboard\/sedes\?editar=/);
  await page.getByText('La sede se guardó correctamente.').waitFor();
  locationId = new URL(page.url()).searchParams.get('editar');
  const [createdLocation] = await sql`select name, slug, address_text, contact_phone, is_active
    from app.locations where id = ${locationId} and business_id = ${businessId}`;
  assert.deepEqual(createdLocation, {
    name: 'Sede de prueba', slug: 'prueba', address_text: 'Córdoba 1000',
    contact_phone: '341 555 0199', is_active: true,
  }, 'Location persisted through the runtime role');

  // Sedes: edit
  await row('Sede de prueba').getByRole('link', { name: 'Editar', exact: true }).click();
  await page.getByRole('dialog', { name: 'Sede de prueba', exact: true }).waitFor();
  await page.getByLabel('Dirección').fill('Córdoba 1000 bis');
  await saveWith(page.getByRole('button', { name: 'Guardar cambios' }), '/dashboard/sedes');
  const [editedLocation] = await sql`select address_text from app.locations where id = ${locationId}`;
  assert.equal(editedLocation.address_text, 'Córdoba 1000 bis', 'Location edit persisted');

  // Sedes: primary switch and restore
  await saveWith(row('Sede de prueba').getByRole('button', { name: 'Hacer principal' }), '/dashboard/sedes');
  const primaries = await sql`select name from app.locations where business_id = ${businessId} and is_primary`;
  assert.deepEqual(primaries.map(item => item.name), ['Sede de prueba'], 'Only one primary location');
  await saveWith(row('Urquiza').getByRole('button', { name: 'Hacer principal' }), '/dashboard/sedes');
  await screenshot('panel-02-sedes');

  // Servicios: create and edit
  await page.getByRole('link', { name: 'Servicios', exact: true }).click();
  await page.waitForURL('**/dashboard/servicios');
  await page.getByRole('link', { name: 'Nuevo servicio' }).click();
  await page.getByLabel('Nombre').fill('Corte de prueba');
  await page.getByLabel('Descripción').fill('Servicio temporal para validar el panel de configuración.');
  await page.getByLabel('Duración (min)').fill('30');
  await page.getByLabel('Precio (ARS)').fill('12000');
  await page.getByRole('checkbox', { name: /Mostrar el precio/ }).check();
  await page.getByRole('button', { name: 'Crear servicio' }).click();
  await page.waitForURL(/\/dashboard\/servicios\?editar=/);
  await page.getByText('El servicio se guardó correctamente.').waitFor();
  serviceId = new URL(page.url()).searchParams.get('editar');
  const [createdService] = await sql`select name, duration_minutes, price_minor, show_price, is_active
    from app.services where id = ${serviceId} and business_id = ${businessId}`;
  assert.deepEqual(createdService, {
    name: 'Corte de prueba', duration_minutes: 30, price_minor: 1200000,
    show_price: true, is_active: true,
  }, 'Service persisted with minor-unit price');

  await row('Corte de prueba').getByRole('link', { name: 'Editar', exact: true }).click();
  await page.getByRole('dialog', { name: 'Corte de prueba', exact: true }).waitFor();
  await page.getByLabel('Precio (ARS)').fill('15000');
  await saveWith(page.getByRole('button', { name: 'Guardar cambios' }), '/dashboard/servicios');
  const [editedService] = await sql`select price_minor from app.services where id = ${serviceId}`;
  assert.equal(editedService.price_minor, 1500000, 'Service price edit persisted');
  await screenshot('panel-03-servicios');

  // Profesionales: create with assignments
  await page.getByRole('link', { name: 'Profesionales', exact: true }).click();
  await page.waitForURL('**/dashboard/profesionales');
  await page.getByRole('link', { name: 'Nuevo profesional' }).click();
  await page.getByLabel('Nombre visible').fill('Profesional de prueba');
  await page.getByLabel('Descripción').fill('Equipo temporal para validar asignaciones y horarios.');
  await page.getByRole('checkbox', { name: 'Urquiza', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Corte de prueba', exact: true }).check();
  await page.getByRole('button', { name: 'Agregar profesional' }).click();
  await page.waitForURL(/\/dashboard\/profesionales\?editar=/);
  await page.getByText('El profesional se guardó correctamente.').waitFor();
  const professionalId = new URL(page.url()).searchParams.get('editar');
  const [professional] = await sql`select display_name, is_active from app.professionals
    where id = ${professionalId} and business_id = ${businessId}`;
  assert.equal(professional.display_name, 'Profesional de prueba');
  assert.equal(professional.is_active, true);
  const locationAssignments = await sql`select location_id from app.professional_locations
    where professional_id = ${professionalId} and is_active`;
  assert.equal(locationAssignments.length, 1, 'Professional assigned to one location');
  const serviceAssignments = await sql`select service_id from app.professional_services
    where professional_id = ${professionalId} and is_active`;
  assert.deepEqual(serviceAssignments.map(item => item.service_id), [serviceId], 'Professional assigned to the test service');
  await screenshot('panel-04-profesionales');

  // Horarios: professional split schedule
  await page.getByRole('link', { name: 'Horarios', exact: true }).click();
  await page.waitForURL('**/dashboard/horarios');
  await page.getByRole('link', { name: /Profesional de prueba/ }).click();
  await page.getByRole('heading', { level: 2, name: 'Profesional de prueba' }).waitFor();
  await page.getByRole('button', { name: 'Usar horario sugerido' }).click();
  await saveWith(page.getByRole('button', { name: 'Guardar horario' }), '/dashboard/horarios');
  await page.getByText('El horario se guardó correctamente.').waitFor();
  const professionalSchedule = await waitForQuery(
    () => sql`select id from app.schedules where business_id = ${businessId} and professional_id = ${professionalId}`,
    'Professional schedule not created',
  );
  const intervalCount = await sql`select count(*)::int as count from app.weekly_intervals
    where schedule_id = ${professionalSchedule.id}`;
  assert.equal(intervalCount[0].count, 12, 'Suggested schedule stores twelve ranges');

  // Horarios: edit one range
  const mondayStartInput = page.getByLabel('Lunes: inicio del tramo 1');
  await mondayStartInput.click();
  await mondayStartInput.fill('08:00');
  assert.equal(await mondayStartInput.inputValue(), '08:00', 'Monday start is staged in the form');
  await saveWith(page.getByRole('button', { name: 'Guardar horario' }), '/dashboard/horarios');
  const mondayStart = await waitForQuery(
    () => sql`select start_minute from app.weekly_intervals
      where schedule_id = ${professionalSchedule.id} and weekday = 1 order by start_minute limit 1`,
    'Edited range not persisted',
  );
  assert.equal(mondayStart.start_minute, 480, 'Edited range persisted at minute granularity');
  await page.getByText('El horario se guardó correctamente.').waitFor();
  await screenshot('panel-05-horarios');

  // Horarios: location-level schedule for the location where the professional works
  await page.locator('.panel-tabs a').filter({ hasText: 'Urquiza' }).click();
  await page.getByRole('heading', { level: 2, name: 'Horario de la sede' }).waitFor();
  await page.getByRole('button', { name: 'Usar horario sugerido' }).click();
  await saveWith(page.getByRole('button', { name: 'Guardar horario' }), '/dashboard/horarios');
  const [agendaLocationRow] = await sql`select id from app.locations
    where business_id = ${businessId} and slug = 'urquiza'`;
  const [locationSchedule] = await sql`select id from app.schedules
    where business_id = ${businessId} and location_id = ${agendaLocationRow.id} and professional_id is null`;
  assert(locationSchedule, 'Location-level schedule created');

  // Configuración: booking rules
  await page.goto(`${base}/dashboard/configuracion`);
  await page.getByLabel('Intervalo de turnos').selectOption('15');
  await page.getByLabel('Margen después de cada turno').fill('5');
  await page.getByLabel('Anticipación mínima (min)').fill('120');
  await page.getByLabel('Horizonte de reservas (días)').fill('30');
  await page.getByLabel('Plazo de cancelación (min)').fill('120');
  await page.getByRole('checkbox', { name: /Permitir/ }).uncheck();
  await saveWith(page.getByRole('button', { name: 'Guardar reglas' }), '/dashboard/configuracion');
  const [settings] = await sql`select slot_interval_minutes, buffer_after_minutes, min_booking_notice_minutes,
    booking_horizon_days, cancellation_notice_minutes, allow_any_professional, version
    from app.business_settings where business_id = ${businessId}`;
  assert.deepEqual(settings, {
    slot_interval_minutes: 15, buffer_after_minutes: 5, min_booking_notice_minutes: 120,
    booking_horizon_days: 30, cancellation_notice_minutes: 120,
    allow_any_professional: false, version: 2,
  }, 'Booking rules persisted with optimistic version bump');

  await page.getByRole('button', { name: 'Habilitar reservas', exact: true }).click();
  await page.waitForURL('**/dashboard/configuracion?publico=enabled');
  const [publishedSettings] = await sql`select public_booking_enabled from app.business_settings where business_id = ${businessId}`;
  assert.equal(publishedSettings.public_booking_enabled, true, 'Owner can explicitly enable public booking');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
  await page.getByRole('button', { name: 'Copiar enlace público' }).click();
  await page.getByRole('button', { name: 'Enlace copiado' }).waitFor();
  const copiedPublicLink = await page.evaluate(() => navigator.clipboard.readText());
  assert(copiedPublicLink.endsWith(`/${testBusiness.slug}`), 'Public page control copies its canonical relative path');
  await screenshot('panel-06-configuracion');

  // Agenda: availability-driven manual booking and payment.
  const [agendaLocation] = await sql`select id from app.locations where business_id = ${businessId} and slug = 'urquiza'`;
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  const appointmentDate = new Date(`${todayParts.year}-${todayParts.month}-${todayParts.day}T12:00:00Z`);
  const daysUntilMonday = (8 - appointmentDate.getUTCDay()) % 7 || 7;
  appointmentDate.setUTCDate(appointmentDate.getUTCDate() + daysUntilMonday);
  const dateValue = `${appointmentDate.getUTCFullYear()}-${String(appointmentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getUTCDate()).padStart(2, '0')}`;
  await page.goto(`${base}/dashboard?fecha=${dateValue}&sede=${agendaLocation.id}`);
  await page.getByRole('button', { name: 'Nuevo turno' }).click();
  await page.getByLabel('Cliente').fill('Cliente de prueba agenda');
  await page.getByLabel('Teléfono').fill('+5493415550199');
  await page.getByLabel('Servicio', { exact: true }).selectOption(serviceId);
  await page.getByLabel('Profesional', { exact: true }).selectOption(professionalId);
  await page.getByLabel('Fecha', { exact: true }).fill(dateValue);
  await page.getByLabel('Horario disponible').locator('option[value="12:00"]').waitFor({ state: 'attached' });
  await page.getByLabel('Horario disponible').selectOption('12:00');
  await page.getByRole('button', { name: 'Guardar turno' }).click();
  await page.getByRole('status').filter({ hasText: 'Turno creado y guardado.' }).waitFor();
  await page.getByRole('button', { name: 'Ver agenda' }).click();
  const [savedAppointment] = await sql`select id, status, source, price_minor_snapshot from app.appointments
    where business_id = ${businessId} and customer_name = 'Cliente de prueba agenda'`;
  assert(savedAppointment, 'Manual appointment persisted');
  assert.equal(savedAppointment.source, 'manual');
  assert.equal(savedAppointment.price_minor_snapshot, 1500000);
  await page.getByRole('button', { name: /Cliente de prueba agenda/ }).click();
  await page.getByRole('heading', { name: 'Detalle del turno' }).waitFor();
  await page.getByRole('button', { name: 'Registrar pago' }).click();
  const savedPayment = await waitForQuery(
    () => sql`select amount_minor, method from app.appointment_payments
      where business_id = ${businessId} and appointment_id = ${savedAppointment.id} and reversed_at is null`,
    'Manual payment not recorded',
  );
  assert.equal(savedPayment.amount_minor, 1500000);
  assert.equal(savedPayment.method, 'cash');
  await page.getByRole('button', { name: 'Marcar atendido' }).click();
  for (let attempt = 0; attempt < 20; attempt++) {
    const [updated] = await sql`select status from app.appointments where id = ${savedAppointment.id}`;
    if (updated.status === 'attended') break;
    await page.waitForTimeout(150);
  }
  const [attendedAppointment] = await sql`select status from app.appointments where id = ${savedAppointment.id}`;
  assert.equal(attendedAppointment.status, 'attended');
  await page.keyboard.press('Escape');
  await screenshot('panel-05-agenda-payment');

  // Public booking: confirm, persist idempotency/access code, and cancel with the private code.
  await page.goto(`${base}/${testBusiness.slug}`);
  await page.getByRole('button', { name: 'Reservar turno', exact: true }).click();
  const booking = page.locator('#reservar');
  await booking.getByRole('heading', { name: 'Elegí un servicio.' }).waitFor();
  await booking.getByRole('button', { name: /Corte de prueba/ }).click();
  await booking.getByRole('button', { name: 'Continuar' }).click();
  await booking.getByRole('heading', { name: 'Elegí sede y profesional.' }).waitFor();
  await booking.getByRole('button', { name: 'Volver al paso 1: Servicio' }).click();
  await booking.getByRole('heading', { name: 'Elegí un servicio.' }).waitFor();
  assert.equal(await booking.getByRole('button', { name: /Corte de prueba/ }).getAttribute('aria-pressed'), 'true',
    'Going back keeps the chosen service selected');
  assert.equal(await booking.getByRole('button', { name: 'Volver al estudio' }).count(), 1,
    'The step-back action remains distinct from leaving the booking wizard');
  await booking.getByRole('button', { name: 'Continuar' }).click();
  await booking.getByRole('heading', { name: 'Elegí sede y profesional.' }).waitFor();
  await booking.getByRole('button', { name: /Urquiza/ }).click();
  await booking.getByRole('button', { name: /Profesional de prueba/ }).click();
  await booking.getByRole('button', { name: 'Continuar' }).click();
  await booking.getByRole('heading', { name: 'Elegí día y horario.' }).waitFor();
  await booking.getByLabel('Fecha').fill(dateValue);
  await booking.getByRole('button', { name: '09:00' }).waitFor();
  await booking.getByRole('button', { name: '09:00' }).click();
  await booking.getByRole('button', { name: 'Continuar' }).click();
  await booking.getByRole('heading', { name: 'Tus datos de contacto.' }).waitFor();
  await booking.getByLabel('Tu nombre').fill('Cliente reserva pública');
  await booking.getByLabel('Teléfono en formato internacional').fill('+5493415550188');
  await booking.getByRole('button', { name: 'Continuar' }).click();
  await booking.getByRole('heading', { name: 'Revisá tu turno.' }).waitFor();
  assert.equal(await page.locator('#informacion').count(), 0,
    'The dedicated booking view hides the landing information');
  assert.equal(await booking.locator('.summary-edit').count(), 0,
    'Review step has no edit buttons');
  await booking.getByRole('heading', { name: 'Datos de contacto' }).waitFor();
  let bookingActionRequest;
  const captureBookingAction = request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === `/${testBusiness.slug}`) {
      bookingActionRequest = Promise.all([request.url(), request.headers(), request.postDataBuffer()]);
    }
  };
  page.on('request', captureBookingAction);
  await booking.getByRole('button', { name: 'Confirmar turno' }).click();
  await page.getByRole('heading', { name: 'Tu turno ya está en la agenda.' }).waitFor();
  page.off('request', captureBookingAction);
  const publicCode = await page.locator('.pb-code-block code').innerText();
  assert.match(publicCode, /^[A-Z0-9_-]{32}$/);
  const [publicAppointment] = await sql`select id, status, source, selection_mode, professional_id, starts_at,
    duration_minutes_snapshot, price_minor_snapshot, cancellation_notice_minutes_snapshot
    from app.appointments where business_id = ${businessId} and customer_name = 'Cliente reserva pública'`;
  assert(publicAppointment, 'Public booking persisted');
  assert.equal(publicAppointment.source, 'public');
  assert.equal(publicAppointment.status, 'confirmed');
  assert.equal(publicAppointment.selection_mode, 'specific');
  assert.equal(publicAppointment.professional_id, professionalId);
  await page.goto(`${base}/dashboard?fecha=${dateValue}&sede=${agendaLocation.id}`);
  await page.getByRole('button', { name: /Cliente reserva pública/ }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Cliente reserva pública/ }).count(), 1,
    'Public booking configured through the dashboard appears in the selected agenda');
  await sql.begin(async tx => {
    await tx`update app.services set duration_minutes = 45, price_minor = 1800000
      where business_id = ${businessId} and id = ${serviceId}`;
    await tx`update app.business_settings set cancellation_notice_minutes = 240 where business_id = ${businessId}`;
  });
  const [preservedSnapshot] = await sql`select duration_minutes_snapshot, price_minor_snapshot,
    cancellation_notice_minutes_snapshot from app.appointments where id = ${publicAppointment.id}`;
  assert.deepEqual(preservedSnapshot, {
    duration_minutes_snapshot: 30, price_minor_snapshot: 1500000, cancellation_notice_minutes_snapshot: 120,
  }, 'Catalog and policy edits cannot change the confirmed booking snapshots');
  await sql.begin(async tx => {
    await tx`update app.services set duration_minutes = 30, price_minor = 1500000
      where business_id = ${businessId} and id = ${serviceId}`;
    await tx`update app.business_settings set cancellation_notice_minutes = 120 where business_id = ${businessId}`;
  });
  const [publicRequest] = await sql`select appointment_id from app.booking_requests
    where business_id = ${businessId} and appointment_id = ${publicAppointment.id}`;
  assert(publicRequest, 'Idempotency request persisted');
  assert(bookingActionRequest, 'Captured the submitted action for an identical retry');
  const [actionUrl, actionHeaders, actionBody] = await bookingActionRequest;
  const replayResponse = await context.request.post(actionUrl, {
    headers: {
      'content-type': actionHeaders['content-type'],
      'next-action': actionHeaders['next-action'],
      'next-router-state-tree': actionHeaders['next-router-state-tree'],
      origin: actionHeaders.origin,
      referer: actionHeaders.referer,
    },
    data: actionBody,
  });
  assert.equal(replayResponse.status(), 200, 'Retrying the exact confirmation returns safely');
  const [bookingCount] = await sql`select count(*)::int as count from app.appointments
    where business_id = ${businessId} and customer_name = 'Cliente reserva pública'`;
  assert.equal(bookingCount.count, 1, 'Idempotent retry does not duplicate the appointment');
  const staleBody = actionBody.toString('utf8').replace(
    /(name="(?:_\d+_)?idempotencyKey"\r\n\r\n)[0-9a-f-]{36}/i,
    `$1${randomUUID()}`,
  );
  assert.notEqual(staleBody, actionBody.toString('utf8'), 'Built a new request key for a stale-slot attempt');
  const staleSlotResponse = await context.request.post(actionUrl, {
    headers: {
      'content-type': actionHeaders['content-type'],
      'next-action': actionHeaders['next-action'],
      'next-router-state-tree': actionHeaders['next-router-state-tree'],
      origin: actionHeaders.origin,
      referer: actionHeaders.referer,
    },
    data: Buffer.from(staleBody),
  });
  assert.equal(staleSlotResponse.status(), 200, 'A stale-slot submission returns a handled conflict');
  const [afterStaleAttempt] = await sql`select count(*)::int as count from app.appointments
    where business_id = ${businessId} and customer_name = 'Cliente reserva pública'`;
  assert.equal(afterStaleAttempt.count, 1, 'A stale slot cannot create an overlapping appointment');
  const [accessCode] = await sql`select code_hash, code_ciphertext from app.appointment_access_codes
    where business_id = ${businessId} and appointment_id = ${publicAppointment.id}`;
  assert.equal(accessCode.code_hash.length, 64);
  assert(!accessCode.code_ciphertext.includes(publicCode), 'Plain cancellation code is not stored');

  await page.goto(`${base}/${testBusiness.slug}/cancelar`);
  await page.getByLabel('Código privado').fill(publicCode);
  await page.getByRole('button', { name: 'Consultar turno' }).click();
  await page.getByText('Turno confirmado', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cancelar este turno' }).click();
  await page.getByRole('button', { name: 'Sí, cancelar turno' }).click();
  await page.getByText('Este turno ya está cancelado.', { exact: true }).waitFor();
  const [cancelledPublicAppointment] = await sql`select status, cancelled_at from app.appointments
    where id = ${publicAppointment.id}`;
  assert.equal(cancelledPublicAppointment.status, 'cancelled');
  assert(cancelledPublicAppointment.cancelled_at);
  const [releasedOccupancy] = await sql`select is_active from app.calendar_occupancies
    where business_id = ${businessId} and appointment_id = ${publicAppointment.id}`;
  assert.equal(releasedOccupancy.is_active, false, 'Cancelled booking releases the calendar slot');
  await page.getByRole('button', { name: 'Consultar turno' }).click();
  await page.getByText('Este turno ya está cancelado.', { exact: true }).waitFor();
  await screenshot('panel-05-public-booking-cancellation');

  // Two distinct requests race for the newly released slot; only one may persist.
  const concurrentPayloads = [
    ['Cliente carrera A', '+5493415550111', randomUUID()],
    ['Cliente carrera B', '+5493415550122', randomUUID()],
  ].map(([name, phone, key]) => {
    let body = replaceFormPart(actionBody, 'idempotencyKey', key);
    body = replaceFormPart(body, 'customerName', name);
    body = replaceFormPart(body, 'customerPhone', phone);
    return context.request.post(actionUrl, {
      headers: {
        'content-type': actionHeaders['content-type'],
        'next-action': actionHeaders['next-action'],
        'next-router-state-tree': actionHeaders['next-router-state-tree'],
        origin: actionHeaders.origin,
        referer: actionHeaders.referer,
      },
      data: body,
    });
  });
  const raceResponses = await Promise.all(concurrentPayloads);
  assert(raceResponses.every(response => response.status() === 200), 'Concurrent actions return handled results');
  const raceWinners = await sql`select id, customer_name from app.appointments where business_id = ${businessId}
    and customer_name in ('Cliente carrera A', 'Cliente carrera B') and status = 'confirmed'`;
  assert.equal(raceWinners.length, 1, 'Business schedule lock admits only one concurrent booking for a slot');
  const [raceCodeRow] = await sql`select code_ciphertext, encryption_key_version from app.appointment_access_codes
    where business_id = ${businessId} and appointment_id = ${raceWinners[0].id}`;
  const raceCode = decryptTestCode(raceCodeRow.code_ciphertext, raceCodeRow.encryption_key_version);
  await page.goto(`${base}/${testBusiness.slug}/cancelar`);
  await page.getByLabel('Código privado').fill(raceCode);
  await page.getByRole('button', { name: 'Consultar turno' }).click();
  await page.getByText('Turno confirmado', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cancelar este turno' }).click();
  await page.getByRole('button', { name: 'Sí, cancelar turno' }).click();
  await page.getByText('Este turno ya está cancelado.', { exact: true }).waitFor();

  // Any-professional deduplicates the time and assigns the eligible person with lower daily workload.
  const [secondProfessional] = await sql.begin(async tx => {
    const [person] = await tx`insert into app.professionals (business_id, display_name, description)
      values (${businessId}, 'Profesional libre', 'Fixture para probar la asignación automática') returning id`;
    await tx`insert into app.professional_locations (business_id, location_id, professional_id)
      values (${businessId}, ${agendaLocation.id}, ${person.id})`;
    await tx`insert into app.professional_services (business_id, professional_id, service_id)
      values (${businessId}, ${person.id}, ${serviceId})`;
    const [schedule] = await tx`insert into app.schedules (business_id, location_id, professional_id)
      values (${businessId}, ${agendaLocation.id}, ${person.id}) returning id`;
    await tx`insert into app.weekly_intervals (business_id, schedule_id, weekday, start_minute, end_minute)
      values (${businessId}, ${schedule.id}, 1, 540, 780)`;
    await tx`update app.business_settings set allow_any_professional = true, updated_at = now()
      where business_id = ${businessId}`;
    return [person];
  });
  await page.goto(`${base}/${testBusiness.slug}`);
  await page.getByRole('button', { name: 'Reservar turno', exact: true }).click();
  const anyBooking = page.locator('#reservar');
  await anyBooking.getByRole('button', { name: /Corte de prueba/ }).click();
  await anyBooking.getByRole('button', { name: 'Continuar' }).click();
  await anyBooking.getByRole('button', { name: /Urquiza/ }).click();
  await anyBooking.getByRole('button', { name: 'Cualquier profesional' }).click();
  await anyBooking.getByRole('button', { name: 'Continuar' }).click();
  await anyBooking.getByLabel('Fecha').fill(dateValue);
  await anyBooking.getByRole('button', { name: '09:00' }).waitFor();
  await anyBooking.getByRole('button', { name: '09:00' }).click();
  await anyBooking.getByRole('button', { name: 'Continuar' }).click();
  await anyBooking.getByLabel('Tu nombre').fill('Cliente cualquier profesional');
  await anyBooking.getByLabel('Teléfono en formato internacional').fill('+5493415550177');
  await anyBooking.getByRole('button', { name: 'Continuar' }).click();
  await anyBooking.getByRole('button', { name: 'Confirmar turno' }).click();
  await page.getByRole('heading', { name: 'Tu turno ya está en la agenda.' }).waitFor();
  const [anyProfessionalBooking] = await sql`select id, professional_id, selection_mode from app.appointments
    where business_id = ${businessId} and customer_name = 'Cliente cualquier profesional'`;
  assert.equal(anyProfessionalBooking.selection_mode, 'any');
  assert.equal(anyProfessionalBooking.professional_id, secondProfessional.id,
    'Any-professional assignment chooses the eligible person with no daily workload');
  const anyProfessionalCode = await page.locator('.pb-code-block code').innerText();
  await page.goto(`${base}/${testBusiness.slug}/cancelar`);
  await page.getByLabel('Código privado').fill(anyProfessionalCode);
  await page.getByRole('button', { name: 'Consultar turno' }).click();
  await page.getByText('Turno confirmado', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cancelar este turno' }).click();
  await page.getByRole('button', { name: 'Sí, cancelar turno' }).click();
  await page.getByText('Este turno ya está cancelado.', { exact: true }).waitFor();
  await page.goto(`${base}/dashboard`);
  await page.getByRole('heading', { level: 1, name: 'Agenda diaria' }).waitFor();

  // Página pública: el editor está oculto para el MVP.
  assert.equal(await page.getByRole('link', { name: 'Página pública', exact: true }).count(), 0,
    'Page editor is hidden from the dashboard navigation');
  await page.goto(`${base}/dashboard/pagina-publica`);
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { level: 1, name: 'Agenda diaria' }).waitFor();

  // La página pública sigue disponible con la presentación predeterminada.
  await page.goto(`${base}/${testBusiness.slug}`);
  const mapsHref = await page.locator('#informacion ul a').first().getAttribute('href');
  assert.match(mapsHref ?? '', /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/, 'Addresses link to Google Maps');
  await page.getByRole('button', { name: 'Reservar Corte de prueba', exact: true }).click();
  const publicBooking = page.locator('#reservar');
  await publicBooking.getByRole('heading', { name: 'Elegí un servicio.' }).waitFor();
  const selectedServiceChoice = publicBooking.getByRole('button', { name: /Corte de prueba/ });
  assert.equal(await selectedServiceChoice.getAttribute('aria-pressed'), 'true',
    'The service chosen on the landing opens preselected in the booking flow');
  await publicBooking.getByRole('button', { name: 'Continuar' }).click();
  await publicBooking.getByRole('heading', { name: 'Elegí sede y profesional.' }).waitFor();
  await publicBooking.getByRole('button', { name: /Urquiza/ }).waitFor();
  assert.equal(await publicBooking.getByRole('button', { name: /Urquiza/ }).count(), 1,
    'Active location created in the dashboard appears on the booking page');

  await page.goto(`${base}/dashboard/configuracion`);
  await page.getByRole('button', { name: 'Deshabilitar reservas', exact: true }).click();
  await page.waitForURL('**/dashboard/configuracion?publico=disabled');
  const [disabledSettings] = await sql`select public_booking_enabled from app.business_settings where business_id = ${businessId}`;
  assert.equal(disabledSettings.public_booking_enabled, false);
  await page.goto(`${base}/${testBusiness.slug}`);
  await page.getByRole('button', { name: 'Reservar turno', exact: true }).click();
  await page.getByRole('heading', { name: 'Las reservas online todavía no están habilitadas.' }).waitFor();
  assert.equal(await page.locator('input[name="time"]').count(), 0, 'Disabled public bookings cannot submit reservations');

  // Agenda remains the home route after configuration.
  await page.goto(`${base}/dashboard`);
  await page.getByRole('heading', { level: 1, name: 'Agenda diaria' }).waitFor();
  await screenshot('panel-08-agenda-final');

  // A1/A2: excepciones, bloqueos y reprogramación entre sedes.
  await page.goto(`${base}/dashboard?fecha=${dateValue}&sede=${agendaLocation.id}`);
  await page.getByRole('button', { name: 'Nuevo turno' }).click();
  await page.getByLabel('Cliente').fill('Cliente reprogramación');
  await page.getByLabel('Teléfono').fill('+5493415550166');
  await page.getByLabel('Servicio', { exact: true }).selectOption(serviceId);
  await page.getByLabel('Profesional', { exact: true }).selectOption(professionalId);
  await page.getByLabel('Fecha', { exact: true }).fill(dateValue);
  await page.getByLabel('Horario disponible').locator('option[value="16:00"]').waitFor({ state: 'attached' });
  await page.getByLabel('Horario disponible').selectOption('16:00');
  await page.getByRole('button', { name: 'Guardar turno' }).click();
  await page.getByRole('status').filter({ hasText: 'Turno creado y guardado.' }).waitFor();
  await page.getByRole('button', { name: 'Ver agenda' }).click();
  const [rescheduleCandidate] = await sql`select id, starts_at, ends_at, location_id, professional_id, version
    from app.appointments where business_id = ${businessId} and customer_name = 'Cliente reprogramación'`;
  assert(rescheduleCandidate, 'Reschedule fixture appointment persisted');

  // Fixture for the target location: assignment, weekly hours and no existing occupancy.
  const [febreroLocation] = await sql`select id, name from app.locations
    where business_id = ${businessId} and slug = 'febrero'`;
  await sql.begin(async tx => {
    await tx`insert into app.professional_locations (business_id, location_id, professional_id)
      values (${businessId}, ${febreroLocation.id}, ${professionalId})`;
    const [locationSchedule] = await tx`insert into app.schedules (business_id, location_id, professional_id)
      values (${businessId}, ${febreroLocation.id}, null) returning id`;
    await tx`insert into app.weekly_intervals (business_id, schedule_id, weekday, start_minute, end_minute)
      values (${businessId}, ${locationSchedule.id}, 1, 540, 1080)`;
    const [personalSchedule] = await tx`insert into app.schedules (business_id, location_id, professional_id)
      values (${businessId}, ${febreroLocation.id}, ${professionalId}) returning id`;
    await tx`insert into app.weekly_intervals (business_id, schedule_id, weekday, start_minute, end_minute)
      values (${businessId}, ${personalSchedule.id}, 1, 540, 1080)`;
  });

  // Closed exception: the first save warns about the confirmed appointment.
  await page.goto(`${base}/dashboard/horarios?sede=${agendaLocation.id}&vista=excepciones`);
  await page.getByRole('heading', { name: 'Cierres y horarios especiales' }).waitFor();
  await page.waitForTimeout(300);
  await page.locator('#exception-date').fill(dateValue);
  await page.locator('#exception-reason').fill('Feriado interno de prueba');
  assert.equal(await page.locator('#exception-date').inputValue(), dateValue, 'Exception form retains the selected date');
  assert.equal(await page.locator('#exception-date').evaluate(input => input.form.checkValidity()), true,
    'Exception form is valid before saving');
  await saveWith(page.getByRole('button', { name: 'Guardar excepción' }), '/dashboard/horarios');
  await page.getByText(/Hay 1 turno confirmado/).waitFor();
  await saveWith(page.getByRole('button', { name: 'Guardar igual' }), '/dashboard/horarios');
  await page.getByText('Cierre guardado. La agenda ya no ofrece turnos ese día.').waitFor();
  const [closedException] = await sql`select se.mode, se.reason, s.location_id from app.schedule_exceptions se
    join app.schedules s on s.id = se.schedule_id and s.business_id = se.business_id
    where se.business_id = ${businessId} and se.local_date = ${dateValue} and s.location_id = ${agendaLocation.id}`;
  assert.equal(closedException.mode, 'closed', 'Closed exception persisted for the location schedule');
  assert.equal(closedException.reason, 'Feriado interno de prueba');

  await page.goto(`${base}/dashboard?fecha=${dateValue}&sede=${agendaLocation.id}`);
  const urquizaAppointment = page.getByRole('button', { name: /Cliente reprogramación/ });
  await urquizaAppointment.waitFor();
  assert.equal(await urquizaAppointment.getByText('Fuera de horario', { exact: true }).count(), 1,
    'A closed exception marks the confirmed appointment as outside schedule');

  // Reschedule to another location, keeping the duration snapshot and moving the occupancy.
  await urquizaAppointment.click();
  await page.getByRole('heading', { name: 'Detalle del turno' }).waitFor();
  await page.getByRole('button', { name: 'Reprogramar' }).click();
  const rescheduleForm = page.locator('.agenda-reschedule-form');
  await rescheduleForm.getByLabel('Sede').selectOption(febreroLocation.id);
  await rescheduleForm.getByLabel('Horario disponible')
    .locator(`option[value="${professionalId}|10:00"]`).waitFor({ state: 'attached' });
  await rescheduleForm.getByLabel('Horario disponible').selectOption(`${professionalId}|10:00`);
  await saveWith(rescheduleForm.getByRole('button', { name: 'Guardar cambios' }), '/dashboard');
  const rescheduleErrors = await rescheduleForm.locator('[role="alert"]').allInnerTexts();
  assert.deepEqual(rescheduleErrors, [], `Reschedule action has no errors${rescheduleErrors.length ? `: ${rescheduleErrors.join(' ')}` : ''}`);
  const movedAppointment = await waitForQuery(
    () => sql`select location_id, professional_id, starts_at, ends_at, timezone_snapshot,
      location_name_snapshot, duration_minutes_snapshot, version
      from app.appointments where id = ${rescheduleCandidate.id} and location_id = ${febreroLocation.id}`,
    'Appointment was not moved to the target location',
  );
  assert.equal(movedAppointment.professional_id, professionalId);
  assert.equal(movedAppointment.timezone_snapshot, 'America/Argentina/Buenos_Aires');
  assert.equal(movedAppointment.location_name_snapshot, '3 de Febrero');
  assert.equal(movedAppointment.duration_minutes_snapshot, 30, 'Reschedule keeps the duration snapshot');
  assert.equal(movedAppointment.version, 2);
  const movedLocalTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(movedAppointment.starts_at);
  assert.equal(movedLocalTime, '10:00');
  const [movedOccupancy] = await sql`select location_id, professional_id, starts_at, ends_at, is_active
    from app.calendar_occupancies where business_id = ${businessId} and appointment_id = ${rescheduleCandidate.id}`;
  assert.equal(movedOccupancy.location_id, febreroLocation.id, 'Occupancy follows the appointment to the new location');
  assert.equal(movedOccupancy.professional_id, professionalId);
  assert.equal(movedOccupancy.is_active, true);
  const occupancyLocalTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(movedOccupancy.starts_at);
  assert.equal(occupancyLocalTime, '10:00');
  const [moveEvent] = await sql`select changes, appointment_version from app.appointment_events
    where business_id = ${businessId} and appointment_id = ${rescheduleCandidate.id} and event_type = 'rescheduled'`;
  assert.equal(moveEvent.appointment_version, 2, 'Reschedule event records the new version');
  assert.equal(moveEvent.changes.from.locationId, agendaLocation.id);
  assert.equal(moveEvent.changes.to.locationId, febreroLocation.id);
  assert.equal(moveEvent.changes.to.professionalId, professionalId);

  await page.goto(`${base}/dashboard?fecha=${dateValue}&sede=${febreroLocation.id}`);
  const febreroAppointment = page.getByRole('button', { name: /Cliente reprogramación/ });
  await febreroAppointment.waitFor();
  assert.equal(await febreroAppointment.getByText('Fuera de horario', { exact: true }).count(), 0,
    'Rescheduled appointment is back inside the target schedule');

  // Professional block: warns about the overlapping confirmed appointment, then marks it outside schedule.
  await page.goto(`${base}/dashboard/horarios?sede=${febreroLocation.id}&vista=excepciones`);
  await page.getByRole('heading', { name: 'Bloqueos del equipo' }).waitFor();
  await page.waitForTimeout(300);
  await page.locator('#block-professional').selectOption(professionalId);
  await page.locator('#block-date').fill(dateValue);
  await page.locator('#block-all-day').selectOption('range');
  await page.locator('#block-start').fill('09:00');
  await page.locator('#block-end').fill('11:00');
  await page.locator('#block-reason').fill('Capacitación interna de prueba');
  assert.equal(await page.locator('#block-date').inputValue(), dateValue, 'Block form retains the selected date');
  assert.equal(await page.locator('#block-date').evaluate(input => input.form.checkValidity()), true,
    'Block form is valid before saving');
  await saveWith(page.getByRole('button', { name: 'Guardar bloqueo' }), '/dashboard/horarios');
  await page.getByText(/Hay 1 turno confirmado/).waitFor();
  const blockValidity = await page.locator('#block-date').evaluate(input => ({
    valid: input.form.checkValidity(),
    invalid: [...input.form.querySelectorAll('input, select')].filter(control => !control.checkValidity())
      .map(control => ({ name: control.name, value: control.value, message: control.validationMessage })),
  }));
  assert.equal(blockValidity.valid, true, `Block form remains valid after warning: ${JSON.stringify(blockValidity)}`);
  await saveWith(page.getByRole('button', { name: 'Guardar igual' }), '/dashboard/horarios');
  await page.getByText('Bloqueo guardado para Profesional de prueba.').waitFor();
  const [createdBlock] = await sql`select id, location_id, professional_id, starts_at, ends_at, reason, is_active
    from app.calendar_occupancies where business_id = ${businessId} and kind = 'block'
      and location_id = ${febreroLocation.id}`;
  assert(createdBlock, 'Professional block persisted as a calendar occupancy');
  assert.equal(createdBlock.professional_id, professionalId);
  assert.equal(createdBlock.reason, 'Capacitación interna de prueba');
  assert.equal(createdBlock.is_active, true);

  await page.goto(`${base}/dashboard?fecha=${dateValue}&sede=${febreroLocation.id}`);
  const blockedAppointment = page.getByRole('button', { name: /Cliente reprogramación/ });
  await blockedAppointment.waitFor();
  assert.equal(await blockedAppointment.getByText('Fuera de horario', { exact: true }).count(), 1,
    'A professional block marks the overlapping appointment as outside schedule');

  // Public availability respects the closed exception and the professional block.
  await sql`update app.business_settings set public_booking_enabled = true, updated_at = now()
    where business_id = ${businessId}`;
  await page.goto(`${base}/${testBusiness.slug}`);
  await page.getByRole('button', { name: 'Reservar turno', exact: true }).click();
  const exceptionBooking = page.locator('#reservar');
  await exceptionBooking.getByRole('button', { name: /Corte de prueba/ }).click();
  await exceptionBooking.getByRole('button', { name: 'Continuar' }).click();
  await exceptionBooking.getByRole('button', { name: /Urquiza/ }).click();
  await exceptionBooking.getByRole('button', { name: /Profesional de prueba/ }).click();
  await exceptionBooking.getByRole('button', { name: 'Continuar' }).click();
  await exceptionBooking.getByLabel('Fecha').fill(dateValue);
  await exceptionBooking.getByRole('heading', { name: 'Este día no tiene horarios disponibles' }).waitFor();

  await page.goto(`${base}/${testBusiness.slug}`);
  await page.getByRole('button', { name: 'Reservar turno', exact: true }).click();
  const blockBooking = page.locator('#reservar');
  await blockBooking.getByRole('button', { name: /Corte de prueba/ }).click();
  await blockBooking.getByRole('button', { name: 'Continuar' }).click();
  await blockBooking.getByRole('button', { name: /3 de Febrero/ }).click();
  await blockBooking.getByRole('button', { name: /Profesional de prueba/ }).click();
  await blockBooking.getByRole('button', { name: 'Continuar' }).click();
  await blockBooking.getByLabel('Fecha').fill(dateValue);
  await blockBooking.getByRole('button', { name: '11:00', exact: true }).waitFor();
  assert.equal(await blockBooking.getByRole('button', { name: '09:00', exact: true }).count(), 0,
    'Blocked morning slots are not offered publicly');
  assert.equal(await blockBooking.getByRole('button', { name: '10:00', exact: true }).count(), 0,
    'The rescheduled appointment blocks its public slot');
  await sql`update app.business_settings set public_booking_enabled = false, updated_at = now()
    where business_id = ${businessId}`;
  await page.goto(`${base}/dashboard`);
  await page.getByRole('heading', { level: 1, name: 'Agenda diaria' }).waitFor();

  // Operator permissions: attempt a cross-location reschedule, then verify read/navigation scope.
  const [operatorFixtureAppointment] = await sql`select id, location_id, starts_at, version
    from app.appointments where business_id = ${businessId} and id = ${savedAppointment.id}`;
  assert(operatorFixtureAppointment, 'Operator permission fixture appointment exists');
  await sql.begin(async tx => {
    await tx`update app.appointments set status = 'confirmed', updated_at = now()
      where business_id = ${businessId} and id = ${operatorFixtureAppointment.id}`;
    await tx`update app.calendar_occupancies set is_active = true, updated_at = now()
      where business_id = ${businessId} and appointment_id = ${operatorFixtureAppointment.id}`;
  });

  await page.goto(`${base}/dashboard?fecha=${dateValue}&sede=${agendaLocation.id}`);
  await page.getByRole('button', { name: /Cliente de prueba agenda/ }).click();
  await page.getByRole('heading', { name: 'Detalle del turno' }).waitFor();
  await page.getByRole('button', { name: 'Reprogramar' }).click();
  const operatorRescheduleForm = page.locator('.agenda-reschedule-form');
  await operatorRescheduleForm.getByLabel('Sede').selectOption(febreroLocation.id);
  const operatorTargetDate = new Date(`${dateValue}T12:00:00Z`);
  operatorTargetDate.setUTCDate(operatorTargetDate.getUTCDate() + 7);
  const operatorTargetDateValue = operatorTargetDate.toISOString().slice(0, 10);
  await operatorRescheduleForm.getByLabel('Fecha', { exact: true }).fill(operatorTargetDateValue);
  await operatorRescheduleForm.getByLabel('Horario disponible')
    .locator(`option[value="${professionalId}|10:00"]`).waitFor({ state: 'attached' });
  await operatorRescheduleForm.getByLabel('Horario disponible').selectOption(`${professionalId}|10:00`);

  const [operatorMembership] = await sql`select m.user_id, m.role, m.location_id
    from app.business_members m inner join auth.users u on u.id = m.user_id
    where m.business_id = ${businessId} and u.email = ${email}`;
  assert(operatorMembership, 'E2E account has a business membership');
  assert.equal(operatorMembership.role, 'owner', 'Permission test starts from the owner fixture');
  operatorMembershipRestore = {
    userId: operatorMembership.user_id,
    role: operatorMembership.role,
    locationId: operatorMembership.location_id,
  };
  await sql`update app.business_members set role = 'location_operator', location_id = ${agendaLocation.id}, updated_at = now()
    where business_id = ${businessId} and user_id = ${operatorMembership.user_id}`;

  await saveWith(operatorRescheduleForm.getByRole('button', { name: 'Guardar cambios' }), '/dashboard');
  await operatorRescheduleForm.getByText('Solo la cuenta del negocio puede mover turnos a otra sede.').waitFor();
  const [unchangedOperatorAppointment] = await sql`select location_id, starts_at, version from app.appointments
    where business_id = ${businessId} and id = ${operatorFixtureAppointment.id}`;
  assert.equal(unchangedOperatorAppointment.location_id, agendaLocation.id,
    'Operator cannot bypass the UI to move a booking to another location');
  assert.equal(unchangedOperatorAppointment.starts_at.getTime(), operatorFixtureAppointment.starts_at.getTime());
  assert.equal(unchangedOperatorAppointment.version, operatorFixtureAppointment.version);

  await page.goto(`${base}/dashboard?fecha=${dateValue}&sede=${febreroLocation.id}`);
  await page.getByRole('heading', { level: 1, name: 'Agenda diaria' }).waitFor();
  assert.equal(await page.getByLabel('Filtrar por sede').count(), 0, 'Operators do not get a location selector');
  await page.locator('.agenda-day-heading').getByText('Urquiza', { exact: false }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Horarios', exact: true }).count(), 0,
    'Operators do not get owner-only navigation');
  await page.goto(`${base}/dashboard/horarios?sede=${febreroLocation.id}&vista=excepciones`);
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { level: 1, name: 'Agenda diaria' }).waitFor();

  await sql`update app.business_members set role = ${operatorMembershipRestore.role},
    location_id = ${operatorMembershipRestore.locationId}, updated_at = now()
    where business_id = ${businessId} and user_id = ${operatorMembershipRestore.userId}`;
  operatorMembershipRestore = null;

  // Mobile pass
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  const viewportWidth = await page.evaluate(() => innerWidth);
  const clippedNav = await page.locator('.panel-nav a').evaluateAll((links, width) => links
    .filter(link => {
      const box = link.getBoundingClientRect();
      return box.left < -1 || box.right > width + 1;
    })
    .map(link => link.textContent?.trim()), viewportWidth);
  assert.deepEqual(clippedNav, [], 'Mobile nav items stay inside the viewport');
  const navColumnCount = await page.locator('.panel-nav').evaluate(nav => getComputedStyle(nav).gridTemplateColumns.split(' ').length);
  assert.equal(navColumnCount, 3, 'Mobile nav lays out the six sections in three columns');
  await screenshot('panel-09-mobile-agenda');
  const routes = [
    ['sedes', 'panel-10-mobile-sedes'],
    ['servicios', 'panel-11-mobile-servicios'],
    ['profesionales', 'panel-12-mobile-profesionales'],
    ['horarios', 'panel-13-mobile-horarios'],
    ['configuracion', 'panel-15-mobile-configuracion'],
  ];
  for (const [route, name] of routes) {
    await page.goto(`${base}/dashboard/${route}`);
    await page.locator('.panel-head h1').waitFor();
    await noOverflow();
    await screenshot(name);
  }

  // Mobile: the scope list comes first on entry, the editor first after choosing a scope.
  await page.goto(`${base}/dashboard/horarios`);
  await page.locator('.panel-head h1').waitFor();
  const clippedTabs = await page.locator('.panel-tabs a').evaluateAll((tabs, width) => tabs
    .filter(tab => {
      const box = tab.getBoundingClientRect();
      return box.left < -1 || box.right > width + 1;
    })
    .map(tab => tab.textContent?.trim()), viewportWidth);
  assert.deepEqual(clippedTabs, [], 'Mobile location tabs stay inside the viewport');
  const shortTargets = await page.locator('.panel-editor input[type="time"], .panel-time-remove, .panel-add-range, .panel-schedule-tools .panel-inline-action').evaluateAll(nodes => nodes
    .filter(node => node.getBoundingClientRect().height < 43.5)
    .map(node => `${node.tagName.toLowerCase()}: ${Math.round(node.getBoundingClientRect().height)}px`));
  assert.deepEqual(shortTargets, [], 'Schedule controls keep 44px touch targets');
  const listY = (await page.locator('.panel-scope').first().boundingBox()).y;
  const baseEditorY = (await page.getByRole('heading', { level: 2, name: 'Horario de la sede' }).boundingBox()).y;
  assert(listY < baseEditorY, 'Mobile shows the scope list before the editor on entry');
  await page.locator('.panel-scope').filter({ hasText: 'Profesional de prueba' }).click();
  await page.getByRole('heading', { level: 2, name: 'Profesional de prueba' }).waitFor();
  await noOverflow();
  const selectedEditorY = (await page.getByRole('heading', { level: 2, name: 'Profesional de prueba' }).boundingBox()).y;
  const selectedListY = (await page.locator('.panel-scope').first().boundingBox()).y;
  assert(selectedEditorY < selectedListY, 'Mobile shows the editor before the list after choosing a scope');

  // 320px sanity check
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of ['', 'horarios']) {
    await page.goto(`${base}/dashboard${route ? `/${route}` : ''}`);
    await page.locator(route ? '.panel-head h1' : '.agenda-header h1').waitFor();
    await noOverflow();
  }

  assert.deepEqual(errors, [], 'No uncaught page errors');
  console.log('PASS: configuración, reservas públicas/privadas, permisos de operador, excepciones, bloqueos, reprogramación multisede y responsive.');
  console.log(JSON.stringify({ locationId, serviceId }));
} finally {
  try {
    if (operatorMembershipRestore) {
      await sql`update app.business_members set role = ${operatorMembershipRestore.role},
        location_id = ${operatorMembershipRestore.locationId}, updated_at = now()
        where business_id = ${businessId} and user_id = ${operatorMembershipRestore.userId}`;
    }
  } finally {
    await browser.close();
    await sql.end({ timeout: 5 });
  }
}
