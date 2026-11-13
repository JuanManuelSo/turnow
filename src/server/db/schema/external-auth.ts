import { pgSchema, uuid } from 'drizzle-orm/pg-core';

// Referencia solamente: Supabase administra auth.users. No exportar desde index.ts.
export const authUsers = pgSchema('auth').table('users', {
  id: uuid('id').primaryKey(),
});
