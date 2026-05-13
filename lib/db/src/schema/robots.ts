import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const robotsTable = pgTable("robots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  playerName: text("player_name").notNull(),
  bodyPartId: text("body_part_id").notNull(),
  attackPartId: text("attack_part_id").notNull(),
  defensePartId: text("defense_part_id").notNull(),
  totalStats: jsonb("total_stats").notNull().$type<{ armor: number; power: number; speed: number; energy: number }>(),
  specialAbility: text("special_ability"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRobotSchema = createInsertSchema(robotsTable).omit({ id: true, createdAt: true });
export type InsertRobot = z.infer<typeof insertRobotSchema>;
export type Robot = typeof robotsTable.$inferSelect;
