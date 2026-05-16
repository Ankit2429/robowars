import { Router } from "express";
import { db } from "@workspace/db";
import {
  tournamentsTable, tournamentPlayersTable,
  tournamentRoundsTable, tournamentMatchesTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { globalEvents, EVENTS } from "../lib/events";

const router = Router();

// ── Helper: generate bracket with BYEs ────────────────────────────────────────
function buildBracket(players: { id: number; pilotName: string; robotName: string }[]) {
  const count = players.length;
  if (count < 2) return null;

  const nextPow2 = Math.pow(2, Math.ceil(Math.log2(count)));
  const numByes = nextPow2 - count;
  const totalRounds = Math.ceil(Math.log2(nextPow2));

  // Seed players
  const seeded = [...players];

  const byePlayers = seeded.slice(0, numByes);
  const matchPlayers = seeded.slice(numByes);

  const matches: Array<{
    matchNumber: number;
    player1: typeof players[0] | null;
    player2: typeof players[0] | null;
    isBye: boolean;
    byeWinner?: typeof players[0];
  }> = [];

  // Pair up match players
  for (let i = 0; i < matchPlayers.length; i += 2) {
    matches.push({
      matchNumber: matches.length + 1,
      player1: matchPlayers[i],
      player2: matchPlayers[i + 1] || null,
      isBye: false,
    });
  }

  // Add BYE matches
  byePlayers.forEach(p => {
    matches.push({
      matchNumber: matches.length + 1,
      player1: p,
      player2: null,
      isBye: true,
      byeWinner: p,
    });
  });

  return { matches, totalRounds, numByes };
}

// ── GET /api/tournament ────────────────────────────────────────────────────────
router.get("/tournament", async (req, res) => {
  try {
    const tournaments = await db.select().from(tournamentsTable).orderBy(desc(tournamentsTable.id)).limit(1);
    if (tournaments.length === 0) { res.json({ tournament: null }); return; }

    const tournament = tournaments[0];
    const players = await db.select().from(tournamentPlayersTable).where(eq(tournamentPlayersTable.tournamentId, tournament.id));
    const rounds = await db.select().from(tournamentRoundsTable).where(eq(tournamentRoundsTable.tournamentId, tournament.id));
    const matches = await db.select().from(tournamentMatchesTable).where(eq(tournamentMatchesTable.tournamentId, tournament.id));

    res.json({ tournament, players, rounds, matches });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to get tournament");
    res.status(500).json({ error: "Failed to get tournament" });
  }
});

// ── POST /api/tournament/start ─────────────────────────────────────────────────
router.post("/tournament/start", async (req, res) => {
  try {
    const { players } = req.body as {
      players: Array<{ pilotName: string; robotName: string }>;
    };

    if (!players || players.length < 2) {
      res.status(400).json({ error: "Need at least 2 players to start" }); return;
    }

    // Reset any existing active tournament
    await db.update(tournamentsTable).set({ status: "finished" });

    const count = players.length;
    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(count)));
    const totalRounds = Math.ceil(Math.log2(nextPow2));

    const [tournament] = await db.insert(tournamentsTable).values({
      name: "RoboWars Tournament",
      status: "active",
      currentRound: 1,
      totalRounds,
    }).returning();

    const insertedPlayers = await db.insert(tournamentPlayersTable).values(
      players.map((p, i) => ({
        tournamentId: tournament.id,
        pilotName: p.pilotName,
        robotName: p.robotName,
        seed: i + 1,
        status: "active" as const,
      }))
    ).returning();

    const bracket = buildBracket(insertedPlayers);
    if (!bracket) { res.status(500).json({ error: "Failed to build bracket" }); return; }

    const [round1] = await db.insert(tournamentRoundsTable).values({
      tournamentId: tournament.id,
      roundNumber: 1,
      status: "active",
    }).returning();

    const matchInserts = bracket.matches.map((m: typeof bracket.matches[0]) => ({
      tournamentId: tournament.id,
      roundId: round1.id,
      roundNumber: 1,
      matchNumber: m.matchNumber,
      player1Id: m.player1?.id ?? null,
      player2Id: m.player2?.id ?? null,
      player1Name: m.player1?.pilotName ?? null,
      player2Name: m.player2?.pilotName ?? null,
      player1RobotName: m.player1?.robotName ?? null,
      player2RobotName: m.player2?.robotName ?? null,
      isBye: m.isBye,
      status: m.isBye ? ("finished" as const) : ("pending" as const),
      winnerId: m.isBye ? (m.byeWinner?.id ?? null) : null,
      winnerName: m.isBye ? (m.byeWinner?.pilotName ?? null) : null,
    }));

    await db.insert(tournamentMatchesTable).values(matchInserts);

    // Mark BYE players as "bye" status
    for (const m of bracket.matches) {
      if (m.isBye && m.byeWinner) {
        await db.update(tournamentPlayersTable).set({ status: "active" }).where(eq(tournamentPlayersTable.id, m.byeWinner.id));
      }
    }

    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournament.id);
    res.json({ success: true, tournament, totalRounds, numByes: bracket.numByes });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to start tournament");
    res.status(500).json({ error: "Failed to start tournament", detail: err.message });
  }
});

// ── POST /api/tournament/declare-winner ────────────────────────────────────────
router.post("/tournament/declare-winner", async (req, res) => {
  try {
    const { matchId, winnerId, winnerName } = req.body as {
      matchId: number;
      winnerId: number;
      winnerName: string;
    };

    const matches = await db.select().from(tournamentMatchesTable).where(eq(tournamentMatchesTable.id, matchId));
    if (matches.length === 0) { res.status(404).json({ error: "Match not found" }); return; }
    const match = matches[0];

    // Mark match finished
    await db.update(tournamentMatchesTable).set({
      winnerId,
      winnerName,
      status: "finished",
    }).where(eq(tournamentMatchesTable.id, matchId));

    // Mark loser eliminated
    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
    if (loserId) {
      await db.update(tournamentPlayersTable).set({ status: "eliminated" }).where(eq(tournamentPlayersTable.id, loserId));
    }

    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, match.tournamentId);
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to declare winner");
    res.status(500).json({ error: "Failed to declare winner", detail: err.message });
  }
});

// ── POST /api/tournament/advance-round ────────────────────────────────────────
router.post("/tournament/advance-round", async (req, res) => {
  try {
    const { tournamentId } = req.body as { tournamentId: number };

    const tourneys = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, tournamentId));
    if (tourneys.length === 0) { res.status(404).json({ error: "Tournament not found" }); return; }
    const tournament = tourneys[0];

    const currentRound = tournament.currentRound;
    const currentMatches = await db.select().from(tournamentMatchesTable)
      .where(and(eq(tournamentMatchesTable.tournamentId, tournamentId), eq(tournamentMatchesTable.roundNumber, currentRound)));
    // Check all matches in current round are finished
    const unfinished = currentMatches.filter((m: typeof currentMatches[0]) => m.status !== "finished" && !m.isBye);
    if (unfinished.length > 0) {
      res.status(400).json({ error: `${unfinished.length} match(es) not finished yet` }); return;
    }

    // Gather winners
    const winners: Array<{ id: number; pilotName: string; robotName: string }> = [];
    for (const m of currentMatches) {
      if (m.winnerId && m.winnerName) {
        const players = await db.select().from(tournamentPlayersTable).where(eq(tournamentPlayersTable.id, m.winnerId));
        if (players.length > 0) {
          winners.push({ id: players[0].id, pilotName: players[0].pilotName, robotName: players[0].robotName });
        }
      }
    }

    if (winners.length === 1) {
      // Tournament over — we have a champion
      await db.update(tournamentsTable).set({ status: "finished", winnerId: winners[0].id }).where(eq(tournamentsTable.id, tournamentId));
      await db.update(tournamentPlayersTable).set({ status: "winner" }).where(eq(tournamentPlayersTable.id, winners[0].id));
      globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournamentId);
      res.json({ success: true, finished: true, champion: winners[0].pilotName }); return;
    }

    // Advance round
    const nextRound = currentRound + 1;
    await db.update(tournamentsTable).set({ currentRound: nextRound }).where(eq(tournamentsTable.id, tournamentId));
    await db.update(tournamentRoundsTable).set({ status: "finished" }).where(
      and(eq(tournamentRoundsTable.tournamentId, tournamentId), eq(tournamentRoundsTable.roundNumber, currentRound))
    );

    const [newRound] = await db.insert(tournamentRoundsTable).values({
      tournamentId,
      roundNumber: nextRound,
      status: "active",
    }).returning();

    const bracket = buildBracket(winners);
    if (!bracket) { res.status(500).json({ error: "Could not build next round bracket" }); return; }

    const matchInserts = bracket.matches.map((m: typeof bracket.matches[0]) => ({
      tournamentId,
      roundId: newRound.id,
      roundNumber: nextRound,
      matchNumber: m.matchNumber,
      player1Id: m.player1?.id ?? null,
      player2Id: m.player2?.id ?? null,
      player1Name: m.player1?.pilotName ?? null,
      player2Name: m.player2?.pilotName ?? null,
      player1RobotName: m.player1?.robotName ?? null,
      player2RobotName: m.player2?.robotName ?? null,
      isBye: m.isBye,
      status: m.isBye ? ("finished" as const) : ("pending" as const),
      winnerId: m.isBye ? (m.byeWinner?.id ?? null) : null,
      winnerName: m.isBye ? (m.byeWinner?.pilotName ?? null) : null,
    }));

    await db.insert(tournamentMatchesTable).values(matchInserts);

    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournamentId);
    res.json({ success: true, finished: false, nextRound });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to advance round");
    res.status(500).json({ error: "Failed to advance round", detail: err.message });
  }
});

// ── POST /api/tournament/reset ─────────────────────────────────────────────────
router.post("/tournament/reset", async (req, res) => {
  try {
    const { tournamentId } = req.body as { tournamentId?: number };

    if (tournamentId) {
      await db.update(tournamentMatchesTable).set({ status: "pending", winnerId: null, winnerName: null }).where(eq(tournamentMatchesTable.tournamentId, tournamentId));
      await db.update(tournamentPlayersTable).set({ status: "active" }).where(eq(tournamentPlayersTable.tournamentId, tournamentId));
      await db.update(tournamentsTable).set({ status: "finished" }).where(eq(tournamentsTable.id, tournamentId));
    } else {
      // Full wipe
      await db.delete(tournamentMatchesTable);
      await db.delete(tournamentRoundsTable);
      await db.delete(tournamentPlayersTable);
      await db.delete(tournamentsTable);
    }

    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournamentId ?? -1);
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to reset tournament");
    res.status(500).json({ error: "Failed to reset tournament", detail: err.message });
  }
});

export default router;
