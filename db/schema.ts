import { pgTable, text, jsonb, serial, timestamp } from 'drizzle-orm/pg-core';
export const stations = pgTable('stations', {
  id: text('id').primaryKey(),
  data: jsonb('data').$type<Record<string, any>>().notNull(),
});
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  stationId: text('station_id').notNull().references(() => stations.id),
  data: jsonb('data').$type<Record<string, any>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
