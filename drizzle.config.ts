import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local', quiet: true });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema/index.ts',
  out: './drizzle',
  schemaFilter: ['app'],
  // Generar SQL es local y no requiere credenciales. Nunca usar DATABASE_URL
  // como fallback de migraciones: runtime y migrador tienen permisos distintos.
  ...(process.env.DATABASE_MIGRATION_URL
    ? { dbCredentials: { url: process.env.DATABASE_MIGRATION_URL, ssl: 'require' as const } }
    : {}),
});
