import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local', quiet: true });
const migrationMode = process.argv.includes('--migration');
const variable = migrationMode ? 'DATABASE_MIGRATION_URL' : 'DATABASE_URL';
let client;

try {
  const value = process.env[variable];
  if (!value) throw Object.assign(new Error(), { code: 'MISSING_ENV' });
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw Object.assign(new Error(), { code: 'INVALID_URL' });
  }
  if (migrationMode && url.port === '6543') {
    throw Object.assign(new Error(), { code: 'SWAPPED_URLS' });
  }
  if (!migrationMode && url.port === '5432' && (url.username === 'postgres' || url.username.startsWith('postgres.'))) {
    throw Object.assign(new Error(), { code: 'SWAPPED_URLS' });
  }
  client = postgres(value, { ssl: 'require', prepare: false, max: 1, connect_timeout: 10 });
  // Consultar catálogos evita exigir USAGE sobre auth, que runtime no debe tener.
  const [identity] = await client`
    select current_user as role, current_database() as database,
      exists(
        select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'auth' and c.relname = 'users' and c.relkind = 'r'
      ) as supabase_auth,
      (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'app' and c.relkind = 'r') as app_tables
  `;
  console.log({ connection: variable, ...identity });
  if (!migrationMode) {
    const [permissions] = await client`
      select r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolbypassrls,
        exists(select 1 from pg_namespace n where n.nspname = 'app' and n.nspowner = r.oid) as owns_app_schema
      from pg_roles r where r.rolname = current_user
    `;
    if (identity.role === 'postgres' || Object.values(permissions).some(Boolean)) {
      throw Object.assign(new Error(), { code: 'PRIVILEGED_RUNTIME' });
    }
    await client`select id from app.businesses limit 0`;
    console.log('Conexión runtime verificada; no se modificaron datos.');
  }
} catch (error) {
  const messages = {
    MISSING_ENV: `Falta ${variable} en .env.local.`,
    INVALID_URL: `${variable} no es una URL PostgreSQL válida.`,
    '28P01': 'Supabase rechazó la contraseña de la base de datos. Usá la contraseña del proyecto Supabase (Settings → Database), no tu contraseña local de PostgreSQL, la de tu cuenta de Supabase ni una API key.',
    '42501': 'El usuario no tiene los permisos necesarios para esta consulta.',
    '42P01': 'La conexión funciona, pero faltan tablas. Revisá las migraciones.',
    PRIVILEGED_RUNTIME: 'DATABASE_URL todavía usa un rol privilegiado. Configurá un login miembro de turnow_runtime.',
    SWAPPED_URLS: 'Las URLs parecen invertidas: DATABASE_URL debe usar el transaction pooler (6543) y DATABASE_MIGRATION_URL el session pooler o conexión directa (5432).',
  };
  // No imprimir el objeto error: puede contener datos de conexión o consultas.
  console.error(messages[error.code] ?? `No se pudo verificar la conexión (${error.code ?? 'invalid configuration'}).`);
  process.exitCode = 1;
} finally {
  if (client) await client.end({ timeout: 2 });
}
