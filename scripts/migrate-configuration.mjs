import { config } from 'dotenv';
import fs from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import postgres from 'postgres';

config({ path: '.env.local', quiet: true });

const OWNER_USER_ID = '1268742a-c197-4ad4-ae2e-b4f9aad7ab24';
const apply = process.argv.includes('--apply');
const oldUrlFromEnvironment = process.env.OLD_DATABASE_MIGRATION_URL;
const slugArgumentIndex = process.argv.indexOf('--business-slug');
const requestedBusinessSlug = process.env.MIGRATION_BUSINESS_SLUG
  ?? (slugArgumentIndex >= 0 ? process.argv[slugArgumentIndex + 1] : undefined);

const tables = [
  'businesses',
  'business_settings',
  'business_pages',
  'locations',
  'services',
  'professionals',
  'professional_locations',
  'professional_services',
  'schedules',
  'weekly_intervals',
  'schedule_exceptions',
  'exception_intervals',
];

function commentedOldMigrationUrl() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const match = env.match(/^\s*#\s*(?:OLD_)?DATABASE_MIGRATION_URL\s*=\s*(.+?)\s*$/m);
  return match?.[1].replace(/^['"]|['"]$/g, '');
}

function requireUrl(value, name) {
  if (!value) throw new Error(`Falta ${name}.`);
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error(`${name} no es una URL PostgreSQL.`);
  if (url.port === '6543') throw new Error(`${name} debe usar el puerto 5432.`);
  return url;
}

function quotedIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function main() {
  const oldUrl = requireUrl(oldUrlFromEnvironment ?? commentedOldMigrationUrl(), 'la URL vieja comentada o OLD_DATABASE_MIGRATION_URL');
  const newUrl = requireUrl(process.env.DATABASE_MIGRATION_URL, 'DATABASE_MIGRATION_URL');

  if (oldUrl.hostname === newUrl.hostname && oldUrl.username === newUrl.username) {
    throw new Error('La URL vieja y DATABASE_MIGRATION_URL apuntan al mismo proyecto. No se puede continuar.');
  }

  const oldDb = postgres(oldUrl.toString(), { ssl: 'require', prepare: false, max: 1, connect_timeout: 10 });
  const newDb = postgres(newUrl.toString(), { ssl: 'require', prepare: false, max: 1, connect_timeout: 10 });

  try {
    const oldBusinesses = await oldDb`
      select id, name, slug, status
      from app.businesses
      where status <> 'archived'
      order by created_at
    `;
    const business = requestedBusinessSlug
      ? oldBusinesses.find(candidate => candidate.slug === requestedBusinessSlug)
      : oldBusinesses.length === 1 ? oldBusinesses[0] : undefined;
    if (!business) {
      console.table(oldBusinesses);
      const hint = requestedBusinessSlug
        ? `No existe un negocio no archivado con slug "${requestedBusinessSlug}".`
        : `La base vieja tiene ${oldBusinesses.length} negocios no archivados.`;
      throw new Error(`${hint} Elegí uno con: npm run db:migrate-config -- --business-slug <slug>`);
    }

    const [owner] = await newDb`select id from auth.users where id = ${OWNER_USER_ID}::uuid`;
    if (!owner) throw new Error(`No existe el dueño ${OWNER_USER_ID} en Auth del proyecto nuevo.`);

    const targetCounts = await Promise.all(tables.map(async table => {
      const [{ count }] = await newDb.unsafe(`select count(*)::int as count from app.${table}`);
      return { table, count };
    }));
    const populated = targetCounts.filter(({ count }) => count > 0);
    if (populated.length) {
      throw new Error(`El proyecto nuevo ya tiene configuración: ${populated.map(({ table, count }) => `${table}=${count}`).join(', ')}. No se sobrescribirá nada.`);
    }

    const sourceCounts = await Promise.all(tables.map(async table => {
      const filter = table === 'businesses' ? 'id = $1' : 'business_id = $1';
      const [{ count }] = await oldDb.unsafe(`select count(*)::int as count from app.${table} where ${filter}`, [business.id]);
      return { table, count };
    }));
    const [{ appointments }] = await oldDb`select count(*)::int as appointments from app.appointments where business_id = ${business.id}`;
    const [{ blocks }] = await oldDb`
      select count(*)::int as blocks
      from app.calendar_occupancies
      where business_id = ${business.id} and kind = 'block'
    `;

    console.log('\nMigración de configuración (sin reservas)');
    console.table([{ businessId: business.id, name: business.name, slug: business.slug, status: business.status }]);
    console.table(sourceCounts);
    console.log(`No se copiarán: ${appointments} turnos ni ${blocks} bloqueos manuales de agenda.`);
    console.log(`El dueño nuevo será: ${OWNER_USER_ID}`);

    if (!apply) {
      console.log('\nSimulación correcta. Para ejecutar la copia:');
      console.log('npm run db:migrate-config -- --apply');
      return;
    }

    const read = createInterface({ input: stdin, output: stdout });
    const answer = await read.question('\nEscribí MIGRAR para copiar esta configuración al proyecto nuevo: ');
    read.close();
    if (answer !== 'MIGRAR') {
      console.log('Cancelado. No se modificó ninguna base.');
      return;
    }

    await newDb.begin(async transaction => {
      for (const table of tables) {
        const filter = table === 'businesses' ? 'id = $1' : 'business_id = $1';
        const rows = await oldDb.unsafe(`select * from app.${table} where ${filter}`, [business.id]);
        if (!rows.length) continue;

        const columns = Object.keys(rows[0]);
        const columnList = columns.map(quotedIdentifier).join(', ');
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const query = `insert into app.${table} (${columnList}) values (${placeholders})`;
        for (const row of rows) {
          await transaction.unsafe(query, columns.map(column => row[column]));
        }
      }

      await transaction`
        insert into app.business_members (business_id, user_id, location_id, role)
        values (${business.id}::uuid, ${OWNER_USER_ID}::uuid, null, 'owner')
      `;
    });

    const importedCounts = await Promise.all(tables.map(async table => {
      const filter = table === 'businesses' ? 'id = $1' : 'business_id = $1';
      const [{ count }] = await newDb.unsafe(`select count(*)::int as count from app.${table} where ${filter}`, [business.id]);
      return { table, count };
    }));
    const [membership] = await newDb`
      select role from app.business_members
      where business_id = ${business.id}::uuid and user_id = ${OWNER_USER_ID}::uuid
    `;
    console.log('\nConfiguración migrada correctamente.');
    console.table(importedCounts);
    console.log(`Membresía creada: ${membership.role}.`);
    console.log('Revisá el panel, sedes, servicios, profesionales y horarios antes de desactivar el proyecto viejo.');
  } finally {
    await Promise.all([oldDb.end({ timeout: 5 }), newDb.end({ timeout: 5 })]);
  }
}

main().catch(error => {
  // No imprimir URLs: pueden contener contraseñas.
  console.error(`\nNo se realizó la migración: ${error.message}`);
  process.exitCode = 1;
});
