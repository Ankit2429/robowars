import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── tournaments ───────────────────────────────────────────────────────────────
export const tournamentsTable = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("RoboWars Tournament"),
  status: text("status").notNull().default("pending"), // pending | active | finished
  currentRound: integer("current_round").notNull().default(0),
  totalRounds: integer("total_rounds").notNull().default(0),
  winnerId: integer("winner_id"),
  activeMatchId: integer("active_match_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


export const insertTournamentSchema = createInsertSchema(tournamentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournamentsTable.$inferSelect;

// ── tournament_players ────────────────────────────────────────────────────────
export const tournamentPlayersTable = pgTable("tournament_players", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  pilotName: text("pilot_name").notNull(),
  robotName: text("robot_name").notNull().default("Unknown Robot"),
  seed: integer("seed").notNull().default(0),
  status: text("status").notNull().default("active"), // active | eliminated | bye | winner
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTournamentPlayerSchema = createInsertSchema(tournamentPlayersTable).omit({ id: true, createdAt: true });
export type InsertTournamentPlayer = z.infer<typeof insertTournamentPlayerSchema>;
export type TournamentPlayer = typeof tournamentPlayersTable.$inferSelect;

// ── tournament_rounds ─────────────────────────────────────────────────────────
export const tournamentRoundsTable = pgTable("tournament_rounds", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  status: text("status").notNull().default("pending"), // pending | active | finished
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTournamentRoundSchema = createInsertSchema(tournamentRoundsTable).omit({ id: true, createdAt: true });
export type InsertTournamentRound = z.infer<typeof insertTournamentRoundSchema>;
export type TournamentRound = typeof tournamentRoundsTable.$inferSelect;

// ── tournament_matches ────────────────────────────────────────────────────────
export const tournamentMatchesTable = pgTable("tournament_matches", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  roundId: integer("round_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  matchNumber: integer("match_number").notNull(),
  player1Id: integer("player1_id"),
  player2Id: integer("player2_id"),
  player1Name: text("player1_name"),
  player2Name: text("player2_name"),
  player1RobotName: text("player1_robot_name"),
  player2RobotName: text("player2_robot_name"),
  side: text("side").notNull().default("L"), // L | R | F
  winnerId: integer("winner_id"),
  winnerName: text("winner_name"),
  isBye: boolean("is_bye").notNull().default(false),
  status: text("status").notNull().default("pending"), // pending | active | finished | bye
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTournamentMatchSchema = createInsertSchema(tournamentMatchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTournamentMatch = z.infer<typeof insertTournamentMatchSchema>;
export type TournamentMatch = typeof tournamentMatchesTable.$inferSelect;
