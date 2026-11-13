import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Siempre crea su propia base descartable. No lee .env ni URLs externas.
const containerName = `turnow-schema-test-${randomUUID()}`;
let containerCreated = false;
let db: ReturnType<typeof postgres>;
type Query = Pick<ReturnType<typeof postgres>, 'unsafe'>;
type Fixture = { business: string; location: string; otherLocation: string; professional: string; otherProfessional: string; service: string };

beforeAll(async () => {
  execFileSync('docker', ['run', '--detach', '--rm', '--name', containerName,
    '-e', 'POSTGRES_PASSWORD=test-only', '-e', 'POSTGRES_DB=turnow_test',
    '-p', '127.0.0.1::5432', 'postgres:17-alpine'], { timeout: 180_000, stdio: 'pipe' });
  containerCreated = true;
  const endpoint = execFileSync('docker', ['port', containerName, '5432/tcp'], { encoding: 'utf8' }).trim();
  db = postgres(`postgres://postgres:test-only@${endpoint}/turnow_test`, {
    max: 4, connect_timeout: 2, onnotice: () => {},
  });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try { await db`select 1`; ready = true; break; }
    catch { await delay(500); }
  }
  if (!ready) throw new Error('El PostgreSQL descartable no inició.');
  // Supabase administra esta tabla en el entorno real; las migraciones NO la crean.
  await db.unsafe(`CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;`);
  await migrate(drizzle(db), { migrationsFolder: './drizzle' });
  await migrate(drizzle(db), { migrationsFolder: './drizzle' });
}, 240_000);

afterAll(async () => {
  try { if (db) await db.end({ timeout: 5 }); }
  finally {
    if (containerCreated) execFileSync('docker', ['rm', '--force', containerName], { stdio: 'pipe' });
  }
}, 30_000);

async function fixture(): Promise<Fixture> {
  const business = randomUUID();
  const location = randomUUID();
  const otherLocation = randomUUID();
  const professional = randomUUID();
  const otherProfessional = randomUUID();
  const service = randomUUID();
  await db`insert into app.businesses (id, name, slug) values (${business}, 'Negocio de prueba', ${business})`;
  await db`insert into app.locations (id, business_id, name, slug, timezone, is_primary)
    values (${location}, ${business}, 'Sede principal', 'principal', 'America/Argentina/Buenos_Aires', true),
      (${otherLocation}, ${business}, 'Sede norte', 'sede-norte', 'America/Argentina/Buenos_Aires', false)`;
  await db`insert into app.professionals (id, business_id, display_name)
    values (${professional}, ${business}, 'Profesional A'), (${otherProfessional}, ${business}, 'Profesional B')`;
  await db`insert into app.professional_locations (business_id, location_id, professional_id)
    values (${business}, ${location}, ${professional}), (${business}, ${location}, ${otherProfessional})`;
  await db`insert into app.services (id, business_id, name, duration_minutes, price_minor)
    values (${service}, ${business}, 'Servicio', 30, 1000000)`;
  await db`insert into app.professional_services (business_id, professional_id, service_id)
    values (${business}, ${professional}, ${service}), (${business}, ${otherProfessional}, ${service})`;
  return { business, location, otherLocation, professional, otherProfessional, service };
}

async function reserve(q: Query, f: Fixture, options: {
  starts?: string; professional?: string; location?: string; buffer?: number; occupancy?: boolean;
} = {}) {
  const appointment = randomUUID();
  const professional = options.professional ?? f.professional;
  const location = options.location ?? f.location;
  const starts = options.starts ?? '2030-06-10T12:00:00Z';
  const ends = new Date(new Date(starts).getTime() + 30 * 60_000).toISOString();
  const buffer = options.buffer ?? 0;
  await q.unsafe(`insert into app.appointments (
    id, business_id, location_id, professional_id, service_id, source, selection_mode,
    starts_at, ends_at, duration_minutes_snapshot, buffer_after_minutes_snapshot,
    price_minor_snapshot, currency_snapshot, cancellation_notice_minutes_snapshot,
    timezone_snapshot, location_name_snapshot, location_address_snapshot,
    service_name_snapshot, professional_name_snapshot, customer_name, customer_phone
  ) values ($1,$2,$3,$4,$5,'manual','specific',$6,$7,30,$8,1000000,'ARS',60,
    'America/Argentina/Buenos_Aires','Sede de prueba',null,'Servicio','Profesional','Cliente','+543415550000')`,
  [appointment, f.business, location, professional, f.service, starts, ends, buffer]);
  if (options.occupancy !== false) {
    await q.unsafe(`insert into app.calendar_occupancies (
      business_id, location_id, professional_id, appointment_id, kind, starts_at, ends_at
    ) values ($1,$2,$3,$4,'appointment',$5,$6::timestamptz + $7 * interval '1 minute')`,
    [f.business, location, professional, appointment, starts, ends, buffer]);
  }
  return appointment;
}

describe('esquema PostgreSQL y migraciones', () => {
  it('aplica las migraciones y puede ejecutar el migrador nuevamente', async () => {
    const [{ count }] = await db`select count(*)::int as count from information_schema.tables where table_schema = 'app'`;
    expect(count).toBe(19);
  });

  it('rechaza relaciones entre negocios distintos', async () => {
    const a = await fixture();
    const b = await fixture();
    await expect(db`insert into app.professional_services (business_id, professional_id, service_id)
      values (${a.business}, ${a.professional}, ${b.service})`).rejects.toMatchObject({ code: '23503' });
  });

  it('dos confirmaciones simultáneas no ocupan el mismo profesional', async () => {
    const f = await fixture();
    const results = await Promise.allSettled([
      db.begin(tx => reserve(tx, f)), db.begin(tx => reserve(tx, f)),
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({ code: '23P01' });
    const [{ count }] = await db`select count(*)::int as count from app.appointments where business_id = ${f.business}`;
    expect(count).toBe(1);
  });

  it('acepta turnos adyacentes y otros profesionales, pero respeta el margen', async () => {
    const f = await fixture();
    await db.begin(tx => reserve(tx, f, { buffer: 10 }));
    await db.begin(tx => reserve(tx, f, { professional: f.otherProfessional }));
    await expect(db.begin(tx => reserve(tx, f, { starts: '2030-06-10T12:30:00Z' })))
      .rejects.toMatchObject({ code: '23P01' });
    await db.begin(tx => reserve(tx, f, { starts: '2030-06-10T12:40:00Z' }));
  });

  it('un bloqueo y una reserva comparten la restricción de solapamiento', async () => {
    const f = await fixture();
    await db`insert into app.calendar_occupancies (business_id, location_id, professional_id, kind, starts_at, ends_at)
      values (${f.business}, ${f.location}, ${f.professional}, 'block', '2030-06-10T12:00:00Z', '2030-06-10T13:00:00Z')`;
    await expect(db.begin(tx => reserve(tx, f))).rejects.toMatchObject({ code: '23P01' });
  });

  it('exige una ocupación coherente al finalizar la transacción', async () => {
    const f = await fixture();
    await expect(db.begin(tx => reserve(tx, f, { occupancy: false })))
      .rejects.toMatchObject({ code: '23514', constraint_name: 'appointments_occupancy_consistent' });
    const appointment = await db.begin(tx => reserve(tx, f));
    await expect(db`update app.calendar_occupancies set ends_at = ends_at + interval '1 minute'
      where appointment_id = ${appointment}`).rejects.toMatchObject({ code: '23514' });
    await expect(db`delete from app.calendar_occupancies where appointment_id = ${appointment}`)
      .rejects.toMatchObject({ code: '23514' });
  });

  it('cancelar libera el horario y conserva la reserva', async () => {
    const f = await fixture();
    const appointment = await db.begin(tx => reserve(tx, f));
    await expect(db`update app.appointments set status = 'cancelled', cancelled_at = now()
      where id = ${appointment}`).rejects.toMatchObject({ code: '23514' });
    await db.begin(async tx => {
      await tx`update app.appointments set status = 'cancelled', cancelled_at = now(), version = version + 1 where id = ${appointment}`;
      await tx`update app.calendar_occupancies set is_active = false where appointment_id = ${appointment}`;
    });
    await db.begin(tx => reserve(tx, f));
    const [old] = await db`select status from app.appointments where id = ${appointment}`;
    expect(old.status).toBe('cancelled');
  });

  it('una reprogramación fallida conserva horario y ocupación originales', async () => {
    const f = await fixture();
    const original = await db.begin(tx => reserve(tx, f));
    await db.begin(tx => reserve(tx, f, { starts: '2030-06-10T13:00:00Z' }));
    await expect(db.begin(async tx => {
      await tx`update app.appointments set starts_at = starts_at + interval '1 hour', ends_at = ends_at + interval '1 hour' where id = ${original}`;
      await tx`update app.calendar_occupancies set starts_at = starts_at + interval '1 hour', ends_at = ends_at + interval '1 hour' where appointment_id = ${original}`;
    })).rejects.toMatchObject({ code: '23P01' });
    const [a] = await db`select starts_at from app.appointments where id = ${original}`;
    expect(new Date(a.starts_at).toISOString()).toBe('2030-06-10T12:00:00.000Z');
  });

  it('conserva snapshots al editar catálogo e impide sobrescribirlos directamente', async () => {
    const f = await fixture();
    const appointment = await db.begin(tx => reserve(tx, f));
    await db`update app.services set price_minor = 1200000, duration_minutes = 45 where id = ${f.service}`;
    const [a] = await db`select price_minor_snapshot, duration_minutes_snapshot from app.appointments where id = ${appointment}`;
    expect(a).toMatchObject({ price_minor_snapshot: 1000000, duration_minutes_snapshot: 30 });
    await expect(db`update app.appointments set price_minor_snapshot = 1200000 where id = ${appointment}`)
      .rejects.toMatchObject({ code: '23514', constraint_name: 'appointments_snapshot_immutable' });
    await expect(db`update app.appointments set location_address_snapshot = 'Dirección cambiada' where id = ${appointment}`)
      .rejects.toMatchObject({ code: '23514', constraint_name: 'appointments_snapshot_immutable' });
  });

  it('reprograma y reasigna profesional de forma coherente en una transacción', async () => {
    const f = await fixture();
    const appointment = await db.begin(tx => reserve(tx, f));
    await db.begin(async tx => {
      await tx`update app.appointments set professional_id = ${f.otherProfessional},
        professional_name_snapshot = 'Profesional B',
        starts_at = starts_at + interval '1 hour', ends_at = ends_at + interval '1 hour',
        version = version + 1 where id = ${appointment}`;
      await tx`update app.calendar_occupancies
        set starts_at = starts_at + interval '1 hour', ends_at = ends_at + interval '1 hour'
        where appointment_id = ${appointment}`;
    });
    const [occupancy] = await db`select professional_id, starts_at from app.calendar_occupancies where appointment_id = ${appointment}`;
    expect(occupancy.professional_id).toBe(f.otherProfessional);
    expect(new Date(occupancy.starts_at).toISOString()).toBe('2030-06-10T13:00:00.000Z');
  });

  it('impide intervalos semanales y excepciones solapados', async () => {
    const f = await fixture();
    const [schedule] = await db`insert into app.schedules (business_id, location_id) values (${f.business}, ${f.location}) returning id`;
    await db`insert into app.weekly_intervals (business_id, schedule_id, weekday, start_minute, end_minute)
      values (${f.business}, ${schedule.id}, 1, 540, 780)`;
    await expect(db`insert into app.weekly_intervals (business_id, schedule_id, weekday, start_minute, end_minute)
      values (${f.business}, ${schedule.id}, 1, 600, 800)`).rejects.toMatchObject({ code: '23P01' });
    const [exception] = await db`insert into app.schedule_exceptions (business_id, schedule_id, local_date, mode)
      values (${f.business}, ${schedule.id}, '2030-06-10', 'custom') returning id`;
    await db`insert into app.exception_intervals (business_id, exception_id, start_minute, end_minute)
      values (${f.business}, ${exception.id}, 540, 600)`;
    await expect(db`insert into app.exception_intervals (business_id, exception_id, start_minute, end_minute)
      values (${f.business}, ${exception.id}, 590, 700)`).rejects.toMatchObject({ code: '23P01' });
  });

  it('claves idempotentes y códigos privados son únicos dentro del negocio', async () => {
    const f = await fixture();
    const first = await db.begin(tx => reserve(tx, f));
    const second = await db.begin(tx => reserve(tx, f, { professional: f.otherProfessional }));
    const key = randomUUID();
    const hash = 'a'.repeat(64);
    await db`insert into app.booking_requests (business_id, idempotency_key, request_hash, appointment_id)
      values (${f.business}, ${key}, ${hash}, ${first})`;
    await expect(db`insert into app.booking_requests (business_id, idempotency_key, request_hash, appointment_id)
      values (${f.business}, ${key}, ${hash}, ${second})`).rejects.toMatchObject({ code: '23505' });
    await db`insert into app.appointment_access_codes (business_id, appointment_id, code_hash, code_ciphertext, encryption_key_version)
      values (${f.business}, ${first}, ${hash}, 'test-envelope', 1)`;
    await expect(db`insert into app.appointment_access_codes (business_id, appointment_id, code_hash, code_ciphertext, encryption_key_version)
      values (${f.business}, ${second}, ${hash}, 'test-envelope', 1)`).rejects.toMatchObject({ code: '23505' });
  });

  it('runtime puede reservar pero no modificar eventos ni membresías; anon no accede', async () => {
    const f = await fixture();
    await db.begin(async tx => {
      await tx`set local role turnow_runtime`;
      await tx`select pg_advisory_xact_lock(hashtextextended(${'turnow:schedule:' + f.business}, 0))`;
      const appointment = await reserve(tx, f);
      await tx`insert into app.appointment_events (business_id, appointment_id, event_type, actor_type, appointment_version)
        values (${f.business}, ${appointment}, 'created', 'system', 1)`;
    });
    await expect(db.begin(async tx => {
      await tx`set local role turnow_runtime`;
      await tx`delete from app.appointment_events where business_id = ${f.business}`;
    })).rejects.toMatchObject({ code: '42501' });
    await expect(db.begin(async tx => {
      await tx`set local role turnow_runtime`;
      await tx`delete from app.business_members where business_id = ${f.business}`;
    })).rejects.toMatchObject({ code: '42501' });
    for (const role of ['anon', 'authenticated']) {
      await expect(db.begin(async tx => {
        await tx.unsafe(`set local role ${role}`);
        await tx`select * from app.appointments`;
      })).rejects.toMatchObject({ code: '42501' });
    }
  });

  it('comparte catálogo entre sedes, pero limita profesionales y horarios a sus sedes', async () => {
    const f = await fixture();
    await db`insert into app.professional_locations (business_id, location_id, professional_id)
      values (${f.business}, ${f.otherLocation}, ${f.professional})`;
    const appointment = await db.begin(tx => reserve(tx, f, { location: f.otherLocation }));
    const [saved] = await db`select location_id, service_id, location_name_snapshot from app.appointments where id = ${appointment}`;
    expect(saved).toMatchObject({ location_id: f.otherLocation, service_id: f.service, location_name_snapshot: 'Sede de prueba' });

    await expect(db.begin(tx => reserve(tx, f, {
      location: f.otherLocation,
      professional: f.otherProfessional,
      starts: '2030-06-10T14:00:00Z',
    }))).rejects.toMatchObject({ code: '23503', constraint_name: 'appointments_professional_location_fk' });
  });

  it('no permite superponer a un profesional entre dos sedes', async () => {
    const f = await fixture();
    await db`insert into app.professional_locations (business_id, location_id, professional_id)
      values (${f.business}, ${f.otherLocation}, ${f.professional})`;
    await db.begin(tx => reserve(tx, f));
    await expect(db.begin(tx => reserve(tx, f, { location: f.otherLocation })))
      .rejects.toMatchObject({ code: '23P01', constraint_name: 'calendar_occupancies_no_overlap' });
  });
});
