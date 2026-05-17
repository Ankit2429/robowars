import { Router } from "express";
import { db } from "@workspace/db";
import {
  tournamentsTable, tournamentPlayersTable,
  tournamentRoundsTable, tournamentMatchesTable,
  playersTable,
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

// ── Helper: build round-1 bracket with sides (L/R) and BYEs ──────────────────
function buildRound1Bracket(players: Player[]) {
  const count = players.length;
  if (count < 2) return null;

  const nextPow2 = Math.pow(2, Math.ceil(Math.log2(count)));
  const totalRounds = Math.log2(nextPow2);
  const numByes = nextPow2 - count;

  // Pad with nulls (BYEs) at the start so top seeds get them
  const padded: (Player | null)[] = [];
  for (let i = 0; i < numByes; i++) padded.push(null);
  padded.push(...players);

  // Split: left half and right half
  const half = nextPow2 / 2;
  const leftSlots = padded.slice(0, half);
  const rightSlots = padded.slice(half);

  const matches: Array<{
    matchNumber: number;
    side: string;
    player1: Player | null;
    player2: Player | null;
    isBye: boolean;
    byeWinner: Player | null;
  }> = [];

  let mNum = 1;

  // Left-side matches
  for (let i = 0; i < leftSlots.length; i += 2) {
    const p1 = leftSlots[i];
    const p2 = leftSlots[i + 1];
    const isBye = !p1 || !p2;
    matches.push({
      matchNumber: mNum++,
      side: "L",
      player1: p1,
      player2: p2,
      isBye,
      byeWinner: isBye ? (p1 || p2) : null,
    });
  }

  // Right-side matches
  for (let i = 0; i < rightSlots.length; i += 2) {
    const p1 = rightSlots[i];
    const p2 = rightSlots[i + 1];
    const isBye = !p1 || !p2;
    matches.push({
      matchNumber: mNum++,
      side: "R",
      player1: p1,
      player2: p2,
      isBye,
      byeWinner: isBye ? (p1 || p2) : null,
    });
  }

  return { matches, totalRounds, numByes };
}

// ── Helper: build next-round matches preserving sides ─────────────────────────
function buildNextRoundMatches(
  winners: Array<{ player: Player; side: string }>
) {
  const leftWinners = winners.filter(w => w.side === "L").map(w => w.player);
  const rightWinners = winners.filter(w => w.side === "R").map(w => w.player);

  const matches: Array<{
    matchNumber: number;
    side: string;
    player1: Player | null;
    player2: Player | null;
    isBye: boolean;
    byeWinner: Player | null;
  }> = [];

  let mNum = 1;

  if (leftWinners.length === 1 && rightWinners.length === 1) {
    // Grand Final
    matches.push({
      matchNumber: mNum++,
      side: "F",
      player1: leftWinners[0],
      player2: rightWinners[0],
      isBye: false,
      byeWinner: null,
    });
  } else {
    // Pair up left winners
    for (let i = 0; i < leftWinners.length; i += 2) {
      const p1 = leftWinners[i];
      const p2 = leftWinners[i + 1] || null;
      const isBye = !p2;
      matches.push({ matchNumber: mNum++, side: "L", player1: p1, player2: p2, isBye, byeWinner: isBye ? p1 : null });
    }
    // Pair up right winners
    for (let i = 0; i < rightWinners.length; i += 2) {
      const p1 = rightWinners[i];
      const p2 = rightWinners[i + 1] || null;
      const isBye = !p2;
      matches.push({ matchNumber: mNum++, side: "R", player1: p1, player2: p2, isBye, byeWinner: isBye ? p1 : null });
    }
  }

  return matches;
}

// ── Helper: auto-advance after a match is finished ────────────────────────────
export async function tryAutoAdvance(tournamentId: number) {
  const [tournament] = await db.select().from(tournamentsTable).where(eq(tournamentsTable.id, tournamentId));
  if (!tournament || tournament.status !== "active") return;

  const currentRound = tournament.currentRound;
  const roundMatches = await db.select().from(tournamentMatchesTable)
    .where(and(eq(tournamentMatchesTable.tournamentId, tournamentId), eq(tournamentMatchesTable.roundNumber, currentRound)));

  const allDone = roundMatches.every((m: typeof roundMatches[0]) => m.status === "finished");
  if (!allDone) return;

  // Gather winners with their sides
  const winnersList: Array<{ player: Player; side: string }> = [];
  for (const m of roundMatches) {
    if (m.winnerId && m.winnerName) {
      const [p] = await db.select().from(tournamentPlayersTable).where(eq(tournamentPlayersTable.id, m.winnerId));
      if (p) winnersList.push({ player: { id: p.id, pilotName: p.pilotName, robotName: p.robotName }, side: m.side ?? "L" });
    }
  }

  if (winnersList.length <= 1) {
    // Champion!
    const champ = winnersList[0]?.player;
    await db.update(tournamentsTable).set({ status: "finished", winnerId: champ?.id ?? null }).where(eq(tournamentsTable.id, tournamentId));
    if (champ) await db.update(tournamentPlayersTable).set({ status: "winner" }).where(eq(tournamentPlayersTable.id, champ.id));
    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournamentId);
    return;
  }

  // Generate next round
  const nextRound = currentRound + 1;
  await db.update(tournamentsTable).set({ currentRound: nextRound }).where(eq(tournamentsTable.id, tournamentId));
  await db.update(tournamentRoundsTable).set({ status: "finished" })
    .where(and(eq(tournamentRoundsTable.tournamentId, tournamentId), eq(tournamentRoundsTable.roundNumber, currentRound)));

  const [newRound] = await db.insert(tournamentRoundsTable).values({
    tournamentId, roundNumber: nextRound, status: "active",
  }).returning();

  const nextMatches = buildNextRoundMatches(winnersList);

  await db.insert(tournamentMatchesTable).values(
    nextMatches.map(m => ({
      tournamentId,
      roundId: newRound.id,
      roundNumber: nextRound,
      matchNumber: m.matchNumber,
      side: m.side,
      player1Id: m.player1?.id ?? null,
      player2Id: m.player2?.id ?? null,
      player1Name: m.player1?.pilotName ?? null,
      player2Name: m.player2?.pilotName ?? null,
      player1RobotName: m.player1?.robotName ?? null,
      player2RobotName: m.player2?.robotName ?? null,
      isBye: m.isBye,
      battleRoomId: m.isBye ? null : `tourney_${tournamentId}_r${nextRound}_m${m.matchNumber}_${Math.random().toString(36).slice(2, 7)}`,
      status: m.isBye ? ("finished" as const) : ("pending" as const),
      winnerId: m.byeWinner?.id ?? null,
      winnerName: m.byeWinner?.pilotName ?? null,
    }))
  );

  globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournamentId);

  // If new round also has all BYEs, keep advancing
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
    const totalRounds = Math.log2(nextPow2);

    const [tournament] = await db.insert(tournamentsTable).values({
      name: "RoboWars Tournament",
      status: "active",
      currentRound: 1,
      totalRounds,
    }).returning();

    const insertedPlayers = await db.insert(tournamentPlayersTable).values(
      players.map((p, i) => ({ tournamentId: tournament.id, pilotName: p.pilotName, robotName: p.robotName, seed: i + 1, status: "active" as const }))
    ).returning();

    const bracket = buildRound1Bracket(insertedPlayers);
    if (!bracket) { res.status(500).json({ error: "Failed to build bracket" }); return; }

    const [round1] = await db.insert(tournamentRoundsTable).values({ tournamentId: tournament.id, roundNumber: 1, status: "active" }).returning();

    await db.insert(tournamentMatchesTable).values(
      bracket.matches.map(m => ({
        tournamentId: tournament.id,
        roundId: round1.id,
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
      }))
    );

    globalEvents.emit(EVENTS.TOURNAMENT_UPDATED, tournament.id);

    // Auto-advance if round 1 is all BYEs
    await tryAutoAdvance(tournament.id);

    res.json({ success: true, tournament, totalRounds, numByes: bracket.numByes });
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

    // Mark loser as eliminated in both tournament table AND the main players table (Pilot ID record)
    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
    if (loserId) {
      await db.update(tournamentPlayersTable).set({ status: "eliminated" }).where(eq(tournamentPlayersTable.id, loserId));
      // Find the loser's pilot name and mark their main player record as Eliminated
      const [loserTournPlayer] = await db.select().from(tournamentPlayersTable).where(eq(tournamentPlayersTable.id, loserId));
      if (loserTournPlayer?.pilotName) {
        // pilotName matches the 'usn' (Pilot ID) stored in playersTable
        await db
          .update(playersTable)
          .set({ status: "Eliminated" })
          .where(eq(playersTable.usn, loserTournPlayer.pilotName))
          .catch(() => { /* player may not be in main table — that's ok */ });
        logger.info({ pilotName: loserTournPlayer.pilotName }, "Pilot eliminated — main player record flagged");
      }
    }

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
