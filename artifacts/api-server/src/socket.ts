import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { db } from "@workspace/db";
import { roomsTable, leaderboardTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

import { globalEvents, EVENTS } from "./lib/events";

interface Player {
  socketId: string;
  playerName: string;
  robotId?: number;
  hp: number;
  roomId: string;
  x: number;
  z: number;
}

interface QueueEntry {
  socketId: string;
  playerName: string;
  robotId?: number;
}

const rooms = new Map<string, { players: Player[]; status: string; timer?: ReturnType<typeof setInterval> }>();
const matchQueue: QueueEntry[] = [];

export function setupSocketIO(server: HttpServer) {
  const io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  // Listen for admin changes and broadcast to all players
  globalEvents.on(EVENTS.MATCHMAKING_STATUS_CHANGED, (active: boolean) => {
    logger.info({ active }, "Broadcasting matchmaking status change");
    io.emit("matchmakingStatusChanged", { active });
  });

  const broadcastQueueUpdate = () => {
    const count = matchQueue.length;
    logger.debug({ count }, "Broadcasting queue update");
    io.emit("queueUpdate", { count });
  };

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id, transport: socket.conn.transport.name }, "Socket connected");

    // ── Matchmaking ────────────────────────────────────────────────────────────
    socket.on("findMatch", ({ playerName, robotId }: { playerName: string; robotId?: number }) => {
      logger.info({ socketId: socket.id, playerName, robotId }, "Player requesting match");
      
      // Remove any existing entry for this socket
      const existingIdx = matchQueue.findIndex(p => p.socketId === socket.id);
      if (existingIdx !== -1) matchQueue.splice(existingIdx, 1);

      matchQueue.push({ socketId: socket.id, playerName, robotId });
      socket.data.inQueue = true;
      socket.data.playerName = playerName;

      logger.info({ playerName, queueLength: matchQueue.length }, "Player added to matchQueue");
      broadcastQueueUpdate();

      if (matchQueue.length >= 2) {
        const p1 = matchQueue.shift()!;
        const p2 = matchQueue.shift()!;
        const roomId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        logger.info({ p1: p1.playerName, p2: p2.playerName, roomId }, "Match found — creating room");
        rooms.set(roomId, { players: [], status: "waiting" });

        io.to(p1.socketId).emit("matchFound", { roomId, opponentName: p2.playerName, side: "p1" });
        io.to(p2.socketId).emit("matchFound", { roomId, opponentName: p1.playerName, side: "p2" });

        broadcastQueueUpdate();

        db.insert(roomsTable).values({
          id: roomId,
          name: `Match: ${p1.playerName} vs ${p2.playerName}`,
          hostName: p1.playerName,
          status: "waiting",
          playerCount: 0,
          maxPlayers: 2,
        }).catch(err => logger.error({ err }, "Failed to create match room record in DB"));
      } else {
        socket.emit("matchSearching");
      }
    });

    socket.on("cancelMatch", () => {
      logger.info({ socketId: socket.id, playerName: socket.data.playerName }, "Player canceled matchmaking");
      const idx = matchQueue.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) {
        matchQueue.splice(idx, 1);
        broadcastQueueUpdate();
      }
      socket.data.inQueue = false;
    });

    // ── Room join ──────────────────────────────────────────────────────────────
    socket.on("joinRoom", async ({ roomId, playerName, robotId }: { roomId: string; playerName: string; robotId?: number }) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, { players: [], status: "waiting" });
      }

      const room = rooms.get(roomId)!;
      const existing = room.players.find(p => p.socketId === socket.id);
      if (!existing) {
        room.players.push({ socketId: socket.id, playerName, robotId, hp: 100, roomId, x: room.players.length === 0 ? -5 : 5, z: 0 });
      }

      try {
        await db.update(roomsTable)
          .set({ playerCount: room.players.length })
          .where(eq(roomsTable.id, roomId));
      } catch (err) {
        logger.error({ err }, "Failed to update room player count");
      }

      io.to(roomId).emit("roomUpdate", {
        players: room.players.map(p => ({ playerName: p.playerName, hp: p.hp, robotId: p.robotId, x: p.x, z: p.z })),
        status: room.status,
      });

      if (room.players.length >= 2 && room.status === "waiting") {
        room.status = "fighting";
        try {
          await db.update(roomsTable).set({ status: "fighting" }).where(eq(roomsTable.id, roomId));
        } catch (err) {
          logger.error({ err }, "Failed to update room status");
        }
        io.to(roomId).emit("battleStart", {
          players: room.players.map(p => ({ playerName: p.playerName, hp: p.hp, robotId: p.robotId })),
        });
      }

      socket.data.roomId = roomId;
      socket.data.playerName = playerName;
    });

    // ── Movement sync ──────────────────────────────────────────────────────────
    socket.on("move", ({ roomId, x, z }: { roomId: string; x: number; z: number }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.x = x;
        player.z = z;
      }
      socket.to(roomId).emit("opponentMove", { x, z });
    });

    // ── Attack ─────────────────────────────────────────────────────────────────
    socket.on("attack", ({ roomId, attackType, damage }: { roomId: string; attackType: "punch" | "kick" | "special"; damage: number }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "fighting") return;

      const attacker = room.players.find(p => p.socketId === socket.id);
      const defender = room.players.find(p => p.socketId !== socket.id);
      if (!attacker || !defender) return;

      // Validate position — attack only lands if close enough
      const dx = attacker.x - defender.x;
      const dz = attacker.z - defender.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const inRange = dist < 5;

      const actualDamage = inRange ? Math.max(0, damage) : 0;
      if (inRange) {
        defender.hp = Math.max(0, defender.hp - actualDamage);
      }

      io.to(roomId).emit("attackResult", {
        attackerName: attacker.playerName,
        defenderName: defender.playerName,
        damage: actualDamage,
        isCritical: attackType === "special",
        defenderHp: defender.hp,
        attackType,
        hit: inRange,
      });

      if (defender.hp <= 0) {
        endBattle(io, roomId, attacker.playerName, defender.playerName);
      }
    });

    socket.on("battleEnd", ({ roomId, winnerName, loserName }: { roomId: string; winnerName: string; loserName: string }) => {
      endBattle(io, roomId, winnerName, loserName);
    });

    // ── Disconnect ─────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      logger.info({ 
        socketId: socket.id, 
        playerName: socket.data.playerName, 
        inQueue: socket.data.inQueue,
        roomId: socket.data.roomId 
      }, "Socket disconnected");

      // Remove from matchmaking queue
      const qIdx = matchQueue.findIndex(p => p.socketId === socket.id);
      if (qIdx !== -1) {
        matchQueue.splice(qIdx, 1);
        logger.info({ playerName: socket.data.playerName }, "Player removed from queue due to disconnect");
        broadcastQueueUpdate();
      }

      const roomId = socket.data.roomId as string | undefined;
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          room.players = room.players.filter(p => p.socketId !== socket.id);
          logger.info({ playerName: socket.data.playerName, roomId }, "Player removed from room due to disconnect");
          io.to(roomId).emit("playerLeft", { playerName: socket.data.playerName });
        }
      }
    });
  });

  return io;
}

async function endBattle(io: SocketIOServer, roomId: string, winnerName: string, loserName: string) {
  const room = rooms.get(roomId);
  if (!room || room.status === "finished") return;
  room.status = "finished";

  try {
    await db.update(roomsTable).set({ status: "finished" }).where(eq(roomsTable.id, roomId));
  } catch (err) {
    logger.error({ err }, "Failed to update room status to finished");
  }

  io.to(roomId).emit("battleEnd", { winnerName, loserName });

  try {
    await upsertLeaderboard(winnerName, true);
    await upsertLeaderboard(loserName, false);
  } catch (err) {
    logger.error({ err }, "Failed to update leaderboard");
  }

  rooms.delete(roomId);
}

async function upsertLeaderboard(playerName: string, won: boolean) {
  const existing = await db.select().from(leaderboardTable)
    .where(eq(leaderboardTable.playerName, playerName));

  if (existing.length === 0) {
    const wins = won ? 1 : 0;
    const losses = won ? 0 : 1;
    await db.insert(leaderboardTable).values({ playerName, wins, losses, totalBattles: 1, winRate: wins });
  } else {
    const e = existing[0];
    const wins = e.wins + (won ? 1 : 0);
    const losses = e.losses + (won ? 0 : 1);
    const totalBattles = e.totalBattles + 1;
    await db.update(leaderboardTable)
      .set({ wins, losses, totalBattles, winRate: wins / totalBattles })
      .where(eq(leaderboardTable.playerName, playerName));
  }
}
