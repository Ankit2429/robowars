import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaderboardTable = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull().unique(),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  totalBattles: integer("total_battles").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  points: integer("points").notNull().default(1000),
  credits: integer("credits").notNull().default(0),
  favoriteRobot: text("favorite_robot"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLeaderboardSchema = createInsertSchema(leaderboardTable).omit({ id: true, updatedAt: true });
export type InsertLeaderboard = z.infer<typeof insertLeaderboardSchema>;
export type LeaderboardEntry = typeof leaderboardTable.$inferSelect;
