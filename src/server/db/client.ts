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

  // El session pooler (5432) permite prepared statements estables. Cada
  // consulta parametrizada contra el transaction pooler (6543) paga un round
  // trip extra de describe porque drizzle no las nombra. Si se despliega en
  // serverless con muchas instancias, usar 6543: el modo preparado se apaga
  // solo y la conexión vuelve a ser segura para transaction pooling.
  const preparedStatements = url.port === '5432';
  const client = postgres(result.data, {
    ssl: 'require',
    prepare: preparedStatements,
    max: 5,
    idle_timeout: 60,
    connect_timeout: 10,
  });

  if (preparedStatements) {
    // Drizzle llama a unsafe(..., { prepare: false }) salvo que la consulta
    // tenga nombre, lo que anula el modo preparado del cliente. Lo forzamos
    // acá: el session pooler lo soporta y evita el describe por consulta.
    const unsafe = client.unsafe.bind(client);
    Object.assign(client, {
      unsafe: ((query: string, parameters?: unknown, options?: unknown) => {
        const params = Array.isArray(parameters) ? parameters : [];
        const queryOptions = Array.isArray(parameters) ? options : parameters;
        return unsafe(query, params as never, { ...(queryOptions as object), prepare: true } as never);
      }) as typeof client.unsafe,
    });
  }

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
