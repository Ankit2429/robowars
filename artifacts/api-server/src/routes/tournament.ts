import { Router } from "express";
import { db } from "@workspace/db";
import {
  tournamentsTable, tournamentPlayersTable,
  tournamentRoundsTable, tournamentMatchesTable,
  playersTable, leaderboardTable
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { globalEvents, EVENTS } from "../lib/events";
import { logger } from "../lib/logger";

// ── Auto-advance bridge: listen for updates from Sockets or elsewhere
globalEvents.on(EVENTS.TOURNAMENT_UPDATED, (tournamentId: number) => {
  if (tournamentId > 0) {
    logger.info({ tournamentId }, "Auto-advance listener triggered");
    tryAutoAdvance(tournamentId).catch(err => logger.error({ err, tournamentId }, "Auto-advance failed"));
  }
});

const router = Router();

type Player = { id: number; pilotName: string; robotName: string };

// ── Helper: propagate match winner to next round match slot ───────────────────
export async function propagateWinnerToNextRound(match: typeof tournamentMatchesTable.$inferSelect) {
  if (match.status !== "finished" || !match.winnerId) return;

  const tournamentId = match.tournamentId;
  const nextRoundNumber = match.roundNumber + 1;

  const [tournament] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, tournamentId));
  if (!tournament) return;

  if (nextRoundNumber > tournament.totalRounds) {
    // Grand Final finished! Crown the Champion!
    await db.update(tournamentsTable).set({ status: "finished", winnerId: match.winnerId }).where(eq(tournamentsTable.id, tournamentId));
    await db.update(tournamentPlayersTable).set({ status: "winner" }).where(eq(tournamentPlayersTable.id, match.winnerId));
    
    try {
      const [champ] = await db.select().from(tournamentPlayersTable).where(eq(tournamentPlayersTable.id, match.winnerId));
      if (champ) {
        const [lb] = await db.select().from(leaderboardTable).where(eq(leaderboardTable.playerName, champ.pilotName));
        const wins = (lb?.wins ?? 0) + 1;
        const points = (lb?.points ?? 1000) + 1500;
        const credits = (lb?.credits ?? 0) + 500;
        const totalBattles = (lb?.totalBattles ?? 0) + 1;
        
        if (lb) {
          await db.update(leaderboardTable).set({
            wins, points, credits, totalBattles, winRate: wins / totalBattles, updatedAt: new Date()
          }).where(eq(leaderboardTable.playerName, champ.pilotName));
        } else {
          await db.insert(leaderboardTable).values({
            playerName: champ.pilotName, wins: 1, losses: 0, totalBattles: 1, winRate: 1.0, points, credits
          });
        }
        logger.info({ pilotName: champ.pilotName }, "Permanent leaderboard stats updated for tournament champion");
      }
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to update permanent leaderboard for champion");
    }
    return;
  }

  let childSide = match.side;
  let childMatchNumber = Math.ceil(match.matchNumber / 2);
  let isPlayer1 = match.matchNumber % 2 !== 0;

  if (nextRoundNumber === tournament.totalRounds) {
    // Next round is the Grand Final (Side "F", Match 1)
    childSide = "F";
    childMatchNumber = 1;
    isPlayer1 = match.side === "L";
  }

  const [childMatch] = await db.select().from(tournamentMatchesTable)
    .where(and(
      eq(tournamentMatchesTable.tournamentId, tournamentId),
      eq(tournamentMatchesTable.roundNumber, nextRoundNumber),
      eq(tournamentMatchesTable.side, childSide),
      eq(tournamentMatchesTable.matchNumber, childMatchNumber)
    ));

  if (childMatch) {
    const [winnerPlayer] = await db.select().from(tournamentPlayersTable).where(eq(tournamentPlayersTable.id, match.winnerId));
    if (winnerPlayer) {
      const updateData: any = {};
      if (isPlayer1) {
        updateData.player1Id = winnerPlayer.id;
        updateData.player1Name = winnerPlayer.pilotName;
        updateData.player1RobotName = winnerPlayer.robotName;
      } else {
        updateData.player2Id = winnerPlayer.id;
        updateData.player2Name = winnerPlayer.pilotName;
        updateData.player2RobotName = winnerPlayer.robotName;
      }
      
      await db.update(tournamentMatchesTable).set(updateData).where(eq(tournamentMatchesTable.id, childMatch.id));
      logger.info({ childMatchId: childMatch.id, winnerId: winnerPlayer.id }, "Propagated winner to next round match");
    }
  }
}

// ── Helper: auto-advance active round if all current matches are finished ─────
export async function tryAutoAdvance(tournamentId: number) {
  const [tournament] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, tournamentId));
  if (!tournament || tournament.status !== "active") return;

  const currentRound = tournament.currentRound;
  const roundMatches = await db.select().from(tournamentMatchesTable)
    .where(and(eq(tournamentMatchesTable.tournamentId, tournamentId), eq(tournamentMatchesTable.roundNumber, currentRound)));

  const allDone = roundMatches.every((m: typeof roundMatches[0]) => m.status === "finished");
  if (!allDone) return;

  if (currentRound === tournament.totalRounds) {
    return;
  }

  const nextRound = currentRound + 1;
  await db.update(tournamentsTable).set({ currentRound: nextRound }).where(eq(tournamentsTable.id, tournamentId));
  
  await db.update(tournamentRoundsTable).set({ status: "finished" })
    .where(and(eq(tournamentRoundsTable.tournamentId, tournamentId), eq(tournamentRoundsTable.roundNumber, currentRound)));

  await db.update(tournamentRoundsTable).set({ status: "active" })
    .where(and(eq(tournamentRoundsTable.tournamentId, tournamentId), eq(tournamentRoundsTable.roundNumber, nextRound)));

  logger.info({ tournamentId, nextRound }, "Advanced tournament round");
  globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournamentId);

  // Recursively auto-advance in case next round is already completed
  await tryAutoAdvance(tournamentId);
}

// ── GET /api/tournament ────────────────────────────────────────────────────────
router.get("/tournament", async (req, res) => {
  try {
    const tournaments = await db.select().from(tournamentsTable).orderBy(desc(tournamentsTable.id)).limit(1);
    if (tournaments.length === 0) { res.json({ tournament: null, players: [], rounds: [], matches: [] }); return; }

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
    const { players } = req.body as { players: Array<{ pilotName: string; robotName: string }> };
    if (!players || players.length < 2) { res.status(400).json({ error: "Need at least 2 players" }); return; }

    // Finish any active tournament
    await db.update(tournamentsTable).set({ status: "finished" });

    const count = players.length;
    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(count)));
    const totalRounds = Math.max(2, Math.log2(nextPow2));

    const [tournament] = await db.insert(tournamentsTable).values({
      name: "RoboWars Tournament",
      status: "active",
      currentRound: 1,
      totalRounds,
    }).returning();

    const insertedPlayers = await db.insert(tournamentPlayersTable).values(
      players.map((p, i) => ({ tournamentId: tournament.id, pilotName: p.pilotName, robotName: p.robotName, seed: i + 1, status: "active" as const }))
    ).returning();

    const M = nextPow2 / 2; // Total matches in Round 1
    const halfM = M / 2;

    const r1Matches: Array<{
      matchNumber: number;
      side: string;
      player1: Player | null;
      player2: Player | null;
      isBye: boolean;
      byeWinner: Player | null;
    }> = [];

    let mNum = 1;
    // Generate Left matches (1 to halfM)
    for (let i = 0; i < halfM; i++) {
      const p1 = insertedPlayers[i] || null;
      const p2 = insertedPlayers[M + i] || null;
      const isBye = !p1 || !p2;
      r1Matches.push({
        matchNumber: mNum++,
        side: "L",
        player1: p1 ? { id: p1.id, pilotName: p1.pilotName, robotName: p1.robotName } : null,
        player2: p2 ? { id: p2.id, pilotName: p2.pilotName, robotName: p2.robotName } : null,
        isBye,
        byeWinner: isBye ? (p1 ? { id: p1.id, pilotName: p1.pilotName, robotName: p1.robotName } : (p2 ? { id: p2.id, pilotName: p2.pilotName, robotName: p2.robotName } : null)) : null,
      });
    }

    // Generate Right matches (halfM+1 to M)
    for (let i = 0; i < halfM; i++) {
      const p1 = insertedPlayers[halfM + i] || null;
      const p2 = insertedPlayers[M + halfM + i] || null;
      const isBye = !p1 || !p2;
      r1Matches.push({
        matchNumber: mNum++,
        side: "R",
        player1: p1 ? { id: p1.id, pilotName: p1.pilotName, robotName: p1.robotName } : null,
        player2: p2 ? { id: p2.id, pilotName: p2.pilotName, robotName: p2.robotName } : null,
        isBye,
        byeWinner: isBye ? (p1 ? { id: p1.id, pilotName: p1.pilotName, robotName: p1.robotName } : (p2 ? { id: p2.id, pilotName: p2.pilotName, robotName: p2.robotName } : null)) : null,
      });
    }

    // Create tournament rounds in database
    const roundsToInsert = [];
    for (let r = 1; r <= totalRounds; r++) {
      roundsToInsert.push({
        tournamentId: tournament.id,
        roundNumber: r,
        status: r === 1 ? "active" : "pending",
      });
    }
    const insertedRounds = await db.insert(tournamentRoundsTable).values(roundsToInsert).returning();
    const roundIdMap = new Map<number, number>();
    insertedRounds.forEach((r: any) => roundIdMap.set(r.roundNumber, r.id));

    const matchesToInsert: any[] = [];

    // Round 1 matches insertion details
    const insertedR1Matches = r1Matches.map(m => ({
      tournamentId: tournament.id,
      roundId: roundIdMap.get(1)!,
      roundNumber: 1,
      matchNumber: m.matchNumber,
      side: m.side,
      player1Id: m.player1?.id ?? null,
      player2Id: m.player2?.id ?? null,
      player1Name: m.player1?.pilotName ?? null,
      player2Name: m.player2?.pilotName ?? null,
      player1RobotName: m.player1?.robotName ?? null,
      player2RobotName: m.player2?.robotName ?? null,
      isBye: m.isBye,
      battleRoomId: m.isBye ? null : `tourney_${tournament.id}_r1_m${m.matchNumber}_${Math.random().toString(36).slice(2, 7)}`,
      status: m.isBye ? ("finished" as const) : ("pending" as const),
      winnerId: m.byeWinner?.id ?? null,
      winnerName: m.byeWinner?.pilotName ?? null,
    }));

    matchesToInsert.push(...insertedR1Matches);

    // Generating empty matches for Rounds 2 to totalRounds - 1
    for (let r = 2; r < totalRounds; r++) {
      const roundId = roundIdMap.get(r)!;
      const matchCount = halfM / Math.pow(2, r - 1);
      
      // Left matches
      for (let m = 1; m <= matchCount; m++) {
        matchesToInsert.push({
          tournamentId: tournament.id,
          roundId,
          roundNumber: r,
          matchNumber: m,
          side: "L",
          player1Id: null,
          player2Id: null,
          player1Name: null,
          player2Name: null,
          player1RobotName: null,
          player2RobotName: null,
          isBye: false,
          battleRoomId: `tourney_${tournament.id}_r${r}_mL${m}_${Math.random().toString(36).slice(2, 7)}`,
          status: "pending",
          winnerId: null,
          winnerName: null,
        });
      }
      
      // Right matches
      for (let m = 1; m <= matchCount; m++) {
        matchesToInsert.push({
          tournamentId: tournament.id,
          roundId,
          roundNumber: r,
          matchNumber: m,
          side: "R",
          player1Id: null,
          player2Id: null,
          player1Name: null,
          player2Name: null,
          player1RobotName: null,
          player2RobotName: null,
          isBye: false,
          battleRoomId: `tourney_${tournament.id}_r${r}_mR${m}_${Math.random().toString(36).slice(2, 7)}`,
          status: "pending",
          winnerId: null,
          winnerName: null,
        });
      }
    }

    // Grand Final Match (Round totalRounds)
    const finalRoundId = roundIdMap.get(totalRounds)!;
    matchesToInsert.push({
      tournamentId: tournament.id,
      roundId: finalRoundId,
      roundNumber: totalRounds,
      matchNumber: 1,
      side: "F",
      player1Id: null,
      player2Id: null,
      player1Name: null,
      player2Name: null,
      player1RobotName: null,
      player2RobotName: null,
      isBye: false,
      battleRoomId: `tourney_${tournament.id}_r${totalRounds}_mF1_${Math.random().toString(36).slice(2, 7)}`,
      status: "pending",
      winnerId: null,
      winnerName: null,
    });

    const insertedMatches = await db.insert(tournamentMatchesTable).values(matchesToInsert).returning();

    // Propagate Round 1 BYE winners to Round 2 immediately
    for (const match of insertedMatches) {
      if (match.status === "finished" && match.isBye) {
        await propagateWinnerToNextRound(match);
      }
    }

    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournament.id);

    // Auto-advance if active round finished (runs async)
    await tryAutoAdvance(tournament.id);

    res.json({ success: true, tournament, totalRounds, numByes: nextPow2 - count });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to start tournament");
    res.status(500).json({ error: "Failed to start tournament", detail: err.message });
  }
});

// ── POST /api/tournament/declare-winner ────────────────────────────────────────
router.post("/tournament/declare-winner", async (req, res) => {
  try {
    const { matchId, winnerId, winnerName } = req.body as { matchId: number; winnerId: number; winnerName: string };

    const [match] = await db.select().from(tournamentMatchesTable).where(eq(tournamentMatchesTable.id, matchId));
    if (!match) { res.status(404).json({ error: "Match not found" }); return; }

    await db.update(tournamentMatchesTable).set({ winnerId, winnerName, status: "finished" }).where(eq(tournamentMatchesTable.id, matchId));

    // Mark loser as eliminated in both tournament table AND the main players table
    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
    if (loserId) {
      await db.update(tournamentPlayersTable).set({ status: "eliminated" }).where(eq(tournamentPlayersTable.id, loserId));
      const [loserTournPlayer] = await db.select().from(tournamentPlayersTable).where(eq(tournamentPlayersTable.id, loserId));
      if (loserTournPlayer?.pilotName) {
        await db
          .update(playersTable)
          .set({ status: "Eliminated" })
          .where(eq(playersTable.usn, loserTournPlayer.pilotName))
          .catch(() => { /* player may not be in main table — that's ok */ });
        logger.info({ pilotName: loserTournPlayer.pilotName }, "Pilot eliminated — main player record flagged");
      }
    }

    // Propagate winner to next round match!
    const [updatedMatch] = await db.select().from(tournamentMatchesTable).where(eq(tournamentMatchesTable.id, matchId));
    await propagateWinnerToNextRound(updatedMatch);

    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, match.tournamentId);
    res.json({ success: true });

    // Auto-advance (runs async after response)
    tryAutoAdvance(match.tournamentId).catch(console.error);
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to declare winner");
    res.status(500).json({ error: "Failed to declare winner", detail: err.message });
  }
});

// ── POST /api/tournament/set-active-match ─────────────────────────────────────
router.post("/tournament/set-active-match", async (req, res) => {
  try {
    const { tournamentId, matchId } = req.body as { tournamentId: number; matchId: number | null };
    await db.update(tournamentsTable).set({ activeMatchId: matchId }).where(eq(tournamentsTable.id, tournamentId));
    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournamentId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to set active match", detail: err.message });
  }
});

// ── POST /api/tournament/reset ─────────────────────────────────────────────────
router.post("/tournament/reset", async (req, res) => {
  try {
    await db.delete(tournamentMatchesTable);
    await db.delete(tournamentRoundsTable);
    await db.delete(tournamentPlayersTable);
    await db.delete(tournamentsTable);
    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, -1);
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err: err.message }, "Failed to reset tournament");
    res.status(500).json({ error: "Failed to reset tournament", detail: err.message });
  }
});

export default router;
