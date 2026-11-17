import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local', quiet: true });

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
if (!migrationUrl) throw new Error('Falta DATABASE_MIGRATION_URL en .env.local.');

const args = process.argv.slice(2);
const readFlag = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
};
const values = (name) => args.flatMap((value, index) => value === name ? [args[index + 1]] : []).filter(Boolean);
const businessSlug = readFlag('--business');
const confirmed = args.includes('--confirm');
const activateBusiness = args.includes('--activate-business');
const operatorArgs = values('--operator');

if (!businessSlug || !operatorArgs.length) {
  throw new Error('Uso: node scripts/provision-location-operators.mjs --business <slug> --operator <sede>=<uuid> [...] [--activate-business] [--confirm]');
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requested = operatorArgs.map((value) => {
  const [locationSlug, userId, ...rest] = value.split('=');
  if (!locationSlug || !userId || rest.length || !uuidPattern.test(userId)) {
    throw new Error(`Operador inválido: ${value}. Usá <slug-de-sede>=<uuid>.`);
  }
  return { locationSlug, userId: userId.toLowerCase() };
});
if (new Set(requested.map(({ locationSlug }) => locationSlug)).size !== requested.length) {
  throw new Error('Cada sede puede indicarse una sola vez.');
}
if (new Set(requested.map(({ userId }) => userId)).size !== requested.length) {
  throw new Error('Cada usuario Auth solo puede vincularse una vez.');
}

const db = postgres(migrationUrl, { ssl: 'require', prepare: false, max: 1, connect_timeout: 10 });
try {
  const [business] = await db`select id, name, slug, status from app.businesses where slug = ${businessSlug} limit 1`;
  if (!business) throw new Error(`No existe un negocio con slug ${businessSlug}.`);
  if (business.status !== 'active' && !(business.status === 'draft' && activateBusiness && confirmed)) {
    throw new Error(`El negocio ${business.name} está en estado ${business.status}. Activá el negocio antes de crear operadores: las cuentas operativas solo acceden a negocios activos.`);
  }

  const locationSlugs = requested.map(({ locationSlug }) => locationSlug);
  const locationRows = await db`select id, slug, name, is_active from app.locations
    where business_id = ${business.id} and slug = any(${locationSlugs})`;
  if (locationRows.length !== requested.length) {
    const found = new Set(locationRows.map(({ slug }) => slug));
    throw new Error(`No encontramos las sedes: ${locationSlugs.filter((slug) => !found.has(slug)).join(', ')}.`);
  }
  if (locationRows.some(({ is_active }) => !is_active)) throw new Error('No se puede crear un operador para una sede inactiva.');

  const users = await db`select id, email, email_confirmed_at from auth.users where id = any(${requested.map(({ userId }) => userId)})`;
  if (users.length !== requested.length) throw new Error('Uno o más UUID no existen en Supabase Auth.');
  if (users.some(({ email_confirmed_at }) => !email_confirmed_at)) throw new Error('Uno o más emails todavía no están confirmados en Supabase Auth.');

  const userIds = users.map(({ id }) => id);
  const existing = await db`select user_id from app.business_members where user_id = any(${userIds})`;
  if (existing.length) throw new Error('Uno o más usuarios ya tienen una membresía; no se modificó nada.');

  const locationsBySlug = new Map(locationRows.map((location) => [location.slug, location]));
  const usersById = new Map(users.map((user) => [user.id, user]));
  console.log(`Negocio: ${business.name} (${business.slug})`);
  for (const { locationSlug, userId } of requested) {
    const location = locationsBySlug.get(locationSlug);
    const user = usersById.get(userId);
    console.log(`- ${location.name}: ${user.email} (${user.id})`);
  }

  if (!confirmed) {
    console.log('Validación correcta. No se modificó la base: volvé a ejecutar con --confirm para crear las membresías.');
  } else {
    await db.begin(async (tx) => {
      if (business.status === 'draft') {
        await tx`update app.businesses set status = 'active', updated_at = now() where id = ${business.id}`;
      }
      for (const { locationSlug, userId } of requested) {
        await tx`insert into app.business_members (business_id, user_id, location_id, role)
          values (${business.id}, ${userId}, ${locationsBySlug.get(locationSlug).id}, 'location_operator')`;
      }
    });
    console.log(`Negocio ${business.status === 'draft' ? 'activado y ' : ''}membresías operativas creadas.`);
  }
} finally {
  await db.end({ timeout: 5 });
}
