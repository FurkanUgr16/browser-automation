import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Starter table — replace with your actual schema
export const demoUsers = pgTable('demo_users', {
  id: serial('id').primaryKey(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
