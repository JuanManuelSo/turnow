import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local', quiet: true });

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
if (!migrationUrl) {
  console.error('Falta DATABASE_MIGRATION_URL en .env.local.');
  process.exit(1);
}

const read = createInterface({ input: stdin, output: stdout });
const ask = async (label, fallback = '') => {
  const suffix = fallback ? ` [${fallback}]` : '';
  const value = (await read.question(`${label}${suffix}: `)).trim();
  return value || fallback;
};
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

let db;
try {
  db = postgres(migrationUrl, { ssl: 'require', prepare: false, max: 1, connect_timeout: 10 });
  const [privileges] = await db`select
    has_table_privilege(current_user, 'app.businesses', 'INSERT') as businesses,
    has_table_privilege(current_user, 'app.locations', 'INSERT') as locations,
    has_table_privilege(current_user, 'app.business_members', 'INSERT') as memberships,
    has_table_privilege(current_user, 'app.business_settings', 'INSERT') as settings,
    has_table_privilege(current_user, 'app.business_pages', 'INSERT') as pages`;
  if (Object.values(privileges).some((granted) => !granted)) {
    throw new Error('La conexión de migración no tiene permisos para el alta inicial. No uses DATABASE_URL runtime.');
  }
  const [target] = await db`select current_database() as database, current_user as role`;
  const migrationUri = new URL(migrationUrl);
  const directRef = migrationUri.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1];
  const poolerRef = migrationUri.username.split('.').at(-1);
  const projectRef = directRef ?? (poolerRef && poolerRef !== 'postgres' ? poolerRef : 'no identificable en la URL');
  stdout.write(`Destino de DATABASE_MIGRATION_URL: ${target.database} · proyecto ${projectRef} · rol ${target.role}\n`);

  const ownerId = (await ask('UUID del usuario dueño en Supabase Auth')).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ownerId)) {
    throw new Error('El UUID del dueño no tiene un formato válido.');
  }
  const [owner] = await db`select id, email, email_confirmed_at from auth.users where id = ${ownerId}`;
  if (!owner) throw new Error('No encontramos ese usuario en auth.users. Crealo primero en Supabase Authentication.');
  if (!owner.email_confirmed_at) throw new Error('El email aún no está confirmado. Confirmalo en Supabase antes de provisionar el negocio.');
  const [existingMembership] = await db`select business_id from app.business_members where user_id = ${ownerId} limit 1`;
  if (existingMembership) throw new Error('Ese usuario ya tiene una membresía de negocio; se cancela para evitar duplicados.');

  const name = await ask('Nombre del negocio');
  if (name.length < 2 || name.length > 120) throw new Error('El nombre debe tener entre 2 y 120 caracteres.');
  const slug = await ask('Slug público del negocio', slugify(name));
  if (!slugPattern.test(slug) || slug.length > 80) throw new Error('El slug debe usar minúsculas, números y guiones.');
  const timezone = await ask('Zona horaria IANA', 'America/Argentina/Buenos_Aires');
  try { new Intl.DateTimeFormat('es', { timeZone: timezone }); }
  catch { throw new Error('La zona horaria no es una zona IANA válida.'); }
  const currency = (await ask('Moneda ISO de 3 letras', 'ARS')).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('La moneda debe ser un código ISO de tres letras.');

  const countText = await ask('Cantidad de sedes', '3');
  const locationCount = Number(countText);
  if (!Number.isInteger(locationCount) || locationCount < 1 || locationCount > 10) {
    throw new Error('Ingresá entre 1 y 10 sedes.');
  }

  const branchList = [];
  const prototypeBranches = [
    { name: 'Urquiza', slug: 'urquiza', addressText: 'Urquiza 1526' },
    { name: '3 de Febrero', slug: 'febrero', addressText: '3 de Febrero 2464' },
    { name: 'Presidente Roca', slug: 'roca', addressText: 'Presidente Roca 274' },
  ];
  for (let i = 0; i < locationCount; i++) {
    const number = i + 1;
    const suggested = prototypeBranches[i];
    const defaultName = suggested?.name ?? (number === 1 ? 'Sede principal' : `Sede ${number}`);
    const locationName = await ask(`Sede ${number} · nombre`, defaultName);
    const defaultSlug = suggested?.slug ?? (number === 1 ? 'principal' : `sede-${number}`);
    const locationSlug = await ask(`Sede ${number} · slug`, suggested?.slug ?? (slugify(locationName) || defaultSlug));
    const addressText = await ask(`Sede ${number} · dirección`, suggested?.addressText ?? '');
    if (locationName.length < 2 || locationName.length > 120) throw new Error(`El nombre de la sede ${number} no es válido.`);
    if (!slugPattern.test(locationSlug) || locationSlug.length > 80) throw new Error(`El slug de la sede ${number} no es válido.`);
    if (addressText.length > 300) throw new Error(`La dirección de la sede ${number} supera 300 caracteres.`);
    branchList.push({ name: locationName, slug: locationSlug, addressText: addressText || null });
  }

  if (new Set(branchList.map((branch) => branch.slug)).size !== branchList.length) {
    throw new Error('Cada sede necesita un slug distinto.');
  }

  stdout.write('\nSe creará en el proyecto configurado por DATABASE_MIGRATION_URL:\n');
  stdout.write(`  Negocio: ${name} (${slug})\n  Dueño: ${owner.email}\n`);
  branchList.forEach((branch, index) => stdout.write(`  ${index === 0 ? 'Principal' : `Sede ${index + 1}`}: ${branch.name} — ${branch.addressText ?? 'sin dirección'}\n`));
  stdout.write('  Estado inicial: borrador; reservas públicas deshabilitadas.\n');
  stdout.write('  Reglas provisionales: intervalo 30 min, aviso 60 min, horizonte 60 días, cancelación 60 min.\n');
  if ((await ask('¿Confirmás el alta? (s/N)', 'N')).toLowerCase() !== 's') {
    stdout.write('Alta cancelada; no se modificó la base.\n');
    process.exitCode = 0;
  } else {
    const businessId = randomUUID();
    const theme = {
      schema_version: 1,
      palette: {
        background: '#f4f5f7', surface: '#ffffff', text: '#1d2939',
        text_secondary: '#526174', brand: '#244f82', on_brand: '#ffffff',
      },
      heading_font: 'manrope',
      body_font: 'manrope',
    };

    await db.begin(async (tx) => {
      await tx`insert into app.businesses (id, name, slug, status, timezone, currency)
        values (${businessId}, ${name}, ${slug}, 'draft', ${timezone}, ${currency})`;
      await tx`insert into app.business_members (business_id, user_id, role)
        values (${businessId}, ${ownerId}, 'owner')`;
      await tx`insert into app.business_settings (
        business_id, slot_interval_minutes, buffer_after_minutes, min_booking_notice_minutes,
        booking_horizon_days, cancellation_notice_minutes, allow_any_professional, public_booking_enabled
      ) values (${businessId}, 30, 0, 60, 60, 60, true, false)`;
      await tx`insert into app.business_pages (business_id, theme)
        values (${businessId}, ${tx.json(theme)})`;

      for (const [index, branch] of branchList.entries()) {
        await tx`insert into app.locations (
          business_id, name, slug, address_text, timezone, is_primary, is_active
        ) values (
          ${businessId}, ${branch.name}, ${branch.slug}, ${branch.addressText},
          ${timezone}, ${index === 0}, true
        )`;
      }
    });

    stdout.write(`\nAlta completada. Business ID: ${businessId}\n`);
    stdout.write('El dueño ya puede ingresar en /login. No se creó ninguna contraseña ni clave de API.\n');
  }
} catch (error) {
  console.error(`No se completó el alta: ${error instanceof Error ? error.message : 'error inesperado'}`);
  process.exitCode = 1;
} finally {
  read.close();
  if (db) await db.end({ timeout: 5 });
}
