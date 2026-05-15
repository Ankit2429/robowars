import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  usn: text("usn").notNull().unique(),
  name: text("name").notNull(),
  branch: text("branch").notNull(),
  accessCode: text("access_code").notNull(),
  status: text("status").notNull().default("Registered"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;

export const settingsTable = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accessCodesTable = pgTable("access_codes", {
  code: text("code").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
