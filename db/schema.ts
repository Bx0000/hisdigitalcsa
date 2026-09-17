import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const hisCodes = pgTable("his_codes", {
  id: serial().primaryKey(),
  code: text().notNull().unique(),
  description: text().notNull(),
  category: text().notNull(),
  status: text().notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
