import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { z } from 'zod';
import * as schema from './schema';

const databaseUrl = z.string().url().refine(
  (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
  'DATABASE_URL debe ser una conexión PostgreSQL.',
);

function createDatabase() {
  const result = databaseUrl.safeParse(process.env.DATABASE_URL);
  if (!result.success) {
    throw new Error('Configurá DATABASE_URL en .env.local con una conexión PostgreSQL válida.');
  }

  const url = new URL(result.data);
  if (url.username === 'postgres' || url.username.startsWith('postgres.')) {
    throw new Error('DATABASE_URL debe usar el usuario runtime de permisos limitados. Reservá postgres para DATABASE_MIGRATION_URL.');
  }

  const client = postgres(result.data, {
    ssl: 'require',
    prepare: false, // Compatible con el transaction pooler de Supabase.
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return { client, db: drizzle(client, { schema }) };
}

type DatabaseConnection = ReturnType<typeof createDatabase>;
const globalDatabase = globalThis as typeof globalThis & {
  turnowDatabase?: DatabaseConnection;
};
let connection: DatabaseConnection | undefined;

// Inicialización diferida: el prototipo y el build no necesitan conectar a la BD.
export function getDb() {
  if (!connection) {
    connection = globalDatabase.turnowDatabase ?? createDatabase();
    if (process.env.NODE_ENV !== 'production') globalDatabase.turnowDatabase = connection;
  }
  return connection.db;
}
