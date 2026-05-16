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
  robotConfig?: any; // full robot build config from client
  hp: number;
  roomId: string;
  x: number;
  z: number;
}

interface QueueEntry {
  socketId: string;
  playerName: string;
  robotId?: number;
  queuedAt: number;
}

const rooms = new Map<string, { players: Player[]; status: string }>();
const matchQueue: QueueEntry[] = [];
let matchmakingInterval: NodeJS.Timeout | null = null;

// ── Exported accessors for debug API ────────────────────────────────────────
let _io: SocketIOServer | null = null;

export function getDebugState() {
  const connectedSockets = _io
    ? Array.from(_io.sockets.sockets.values()).map(s => ({
        id: s.id,
        playerName: s.data.playerName || null,
        inQueue: s.data.inQueue || false,
        roomId: s.data.roomId || null,
        transport: (s as any).conn?.transport?.name || "unknown",
        connected: s.connected,
      }))
    : [];

  return {
    timestamp: new Date().toISOString(),
    connectedSocketCount: connectedSockets.length,
    connectedSockets,
    matchQueue: matchQueue.map(q => ({
      socketId: q.socketId,
      playerName: q.playerName,
      robotId: q.robotId,
    })),
    matchQueueLength: matchQueue.length,
    rooms: Array.from(rooms.entries()).map(([id, room]) => ({
      id,
      status: room.status,
      players: room.players.map(p => ({
        socketId: p.socketId,
        playerName: p.playerName,
        hp: p.hp,
      })),
    })),
    roomCount: rooms.size,
  };
}

import { generateBracket } from "./lib/bracket";

// ── Setup ───────────────────────────────────────────────────────────────────
export function setupSocketIO(server: HttpServer) {
  // Allowed origins — Vercel production + local dev
  const ALLOWED_ORIGINS = [
    /\.vercel\.app$/,
    /localhost/,
    /127\.0\.0\.1/,
  ];

  const io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (e.g. server-to-server, mobile, curl)
        if (!origin) {
          callback(null, true);
          return;
        }
        // Allow any Vercel deployment, localhost, or direct IP
        const allowed = ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
        if (allowed) {
          callback(null, true);
        } else {
          // Still allow in production — log for visibility
          logger.warn({ origin }, "Socket.IO: non-allowlisted origin, allowing anyway");
          callback(null, true);
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    // CRITICAL: Start with polling (works through all proxies), then upgrade to websocket
    transports: ["polling", "websocket"],
    allowUpgrades: true,
    pingInterval: 25000,
    pingTimeout: 20000,
    // Allow generous upgrade timeout for Render's proxy
    upgradeTimeout: 30000,
  });
  _io = io;

  // ── Engine-level diagnostics ──────────────────────────────────────────────
  io.engine.on("connection_error", (err: any) => {
    logger.error({ 
      url: err.req?.url, 
      code: err.code, 
      message: err.message, 
      context: err.context 
    }, "Socket.IO ENGINE connection_error");
  });

  // Listen for admin changes and broadcast to all players
  globalEvents.on(EVENTS.MATCHMAKING_STATUS_CHANGED, (active: boolean) => {
    logger.info({ active, socketCount: io.sockets.sockets.size }, "Broadcasting matchmaking status change to all sockets");
    io.emit("matchmakingStatusChanged", { active });
  });

  // Listen for tournament updates and broadcast to all clients
  globalEvents.on(EVENTS.TOURNAMENT_UPDATED, (tournamentId: number) => {
    logger.info({ tournamentId }, "Tournament updated — broadcasting bracket_updated");
    io.emit("bracket_updated", { tournamentId, timestamp: new Date().toISOString() });
  });

  const broadcastDebug = () => {
    const state = getDebugState();
    io.emit("debugState", state);
    io.emit("queueUpdate", { count: state.matchQueueLength });
  };

  io.on("connection", (socket) => {
    logger.info({
      socketId: socket.id,
      transport: (socket as any).conn?.transport?.name || "unknown",
      remoteAddress: socket.handshake.address,
      origin: socket.handshake.headers.origin || "none",
      secure: socket.handshake.secure,
      query: socket.handshake.query,
      totalConnected: io.sockets.sockets.size,
    }, "Socket CONNECTED");

    // Track transport upgrades (polling → websocket)
    socket.conn.on("upgrade", (transport: any) => {
      logger.info({
        socketId: socket.id,
        newTransport: (transport as any).name || "unknown",
      }, "Socket transport UPGRADED");
    });

    // Send immediate debug state to new connection
    socket.emit("debugState", getDebugState());

    // ── Matchmaking Loop ─────────────────────────────────────────────────────
    if (!matchmakingInterval) {
      matchmakingInterval = setInterval(() => {
        if (matchQueue.length === 0) return;

        // Try pairing real players first
        while (matchQueue.length >= 2) {
          const p1 = matchQueue.shift()!;
          const p2 = matchQueue.shift()!;
          startRoomMatch(p1, p2);
        }

        // Handle AI Fallback for the remaining player (if any)
        if (matchQueue.length === 1) {
          const p1 = matchQueue[0];
          const waitingTime = Date.now() - p1.queuedAt;
          if (waitingTime > 15000) {
            logger.info({ playerName: p1.playerName, waitingTime }, "AI Fallback triggered");
            matchQueue.shift(); // Remove from queue
            const bot: QueueEntry = {
              socketId: "bot_" + Math.random().toString(36).slice(2, 7),
              playerName: "AI_" + Math.floor(Math.random() * 9999),
              queuedAt: Date.now()
            };
            startRoomMatch(p1, bot);
          }
        }
      }, 3000);
    }

    // Helper to start match
    const startRoomMatch = (p1: QueueEntry, p2: QueueEntry) => {
      const roomId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      logger.info({ p1: p1.playerName, p2: p2.playerName, roomId }, "MATCH FOUND");

      rooms.set(roomId, { players: [], status: "waiting" });

      if (!p1.socketId.startsWith("bot_")) io.to(p1.socketId).emit("matchFound", { roomId, opponentName: p2.playerName, side: "p1" });
      if (!p2.socketId.startsWith("bot_")) io.to(p2.socketId).emit("matchFound", { roomId, opponentName: p1.playerName, side: "p2" });

      broadcastDebug();

      db.insert(roomsTable).values({
        id: roomId,
        name: `Match: ${p1.playerName} vs ${p2.playerName}`,
        hostName: p1.playerName,
        status: "waiting",
        playerCount: 0,
        maxPlayers: 2,
      }).catch((err: any) => logger.error({ err }, "Failed to insert match room into DB"));
    };

    // ── Matchmaking ──────────────────────────────────────────────────────────
    socket.on("findMatch", ({ playerName, robotId }: { playerName: string; robotId?: number }) => {
      logger.info({ socketId: socket.id, playerName, robotId, currentQueueLength: matchQueue.length }, "findMatch received");

      // Remove any existing entry for this socket
      const existingIdx = matchQueue.findIndex(p => p.socketId === socket.id);
      if (existingIdx !== -1) {
        matchQueue.splice(existingIdx, 1);
      }

      matchQueue.push({ socketId: socket.id, playerName, robotId, queuedAt: Date.now() });
      socket.data.inQueue = true;
      socket.data.playerName = playerName;

      broadcastDebug();

      // Emit searching immediately; loop will handle pairing
      socket.emit("matchSearching");
    });

    // ── Tournament Bracket Logic ──────────────────────────────────────────────
    socket.on("generateBracket", () => {
      logger.info({ queueLength: matchQueue.length }, "Admin initiated bracket generation");
      
      const socketIds = matchQueue.map(q => q.socketId);
      const { matches, byes } = generateBracket(socketIds);

      // Handle BYEs
      byes.forEach(socketId => {
        io.to(socketId).emit("byeReceived");
        // Remove from queue
        const idx = matchQueue.findIndex(q => q.socketId === socketId);
        if (idx !== -1) matchQueue.splice(idx, 1);
      });

      // Handle Matches
      matches.forEach(match => {
        const p1Idx = matchQueue.findIndex(q => q.socketId === match.p1);
        const p1 = matchQueue[p1Idx];
        if (p1Idx !== -1) matchQueue.splice(p1Idx, 1);

        const p2Idx = matchQueue.findIndex(q => q.socketId === match.p2);
        const p2 = matchQueue[p2Idx];
        if (p2Idx !== -1) matchQueue.splice(p2Idx, 1);

        if (p1 && p2) startRoomMatch(p1, p2);
      });

      broadcastDebug();
    });

    socket.on("cancelMatch", () => {
      logger.info({ socketId: socket.id, playerName: socket.data.playerName }, "cancelMatch received");
      const idx = matchQueue.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) {
        matchQueue.splice(idx, 1);
        logger.info({ playerName: socket.data.playerName, newQueueLength: matchQueue.length }, "Player REMOVED from queue");
      }
      socket.data.inQueue = false;
      broadcastDebug();
    });

    // ── Room join ────────────────────────────────────────────────────────────
    socket.on("joinRoom", async ({ roomId, playerName, robotId, robotConfig }: { roomId: string; playerName: string; robotId?: number; robotConfig?: any }) => {
      logger.info({ socketId: socket.id, roomId, playerName, hasRobotConfig: !!robotConfig }, "joinRoom received");
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, { players: [], status: "waiting" });
      }

      const room = rooms.get(roomId)!;
      const existing = room.players.find(p => p.socketId === socket.id);
      if (!existing) {
        room.players.push({
          socketId: socket.id, playerName, robotId, robotConfig,
          hp: 200, roomId,
          x: room.players.length === 0 ? -10 : 10, z: 0,
        });
      }

      try {
        await db.update(roomsTable).set({ playerCount: room.players.length }).where(eq(roomsTable.id, roomId));
      } catch (err) { logger.error({ err }, "Failed to update room player count"); }

      io.to(roomId).emit("roomUpdate", {
        players: room.players.map(p => ({ playerName: p.playerName, hp: p.hp, robotId: p.robotId, x: p.x, z: p.z })),
        status: room.status,
      });

      if (room.players.length >= 2 && room.status === "waiting") {
        room.status = "fighting";
        logger.info({ roomId, players: room.players.map(p => p.playerName) }, "Battle STARTING");
        try {
          await db.update(roomsTable).set({ status: "fighting" }).where(eq(roomsTable.id, roomId));
        } catch (err) { logger.error({ err }, "Failed to update room status"); }
        io.to(roomId).emit("battleStart", {
          players: room.players.map(p => ({
            playerName: p.playerName, hp: p.hp, robotId: p.robotId,
            robotConfig: p.robotConfig, // send opponent's REAL robot config
          })),
        });
      }

      socket.data.roomId = roomId;
      socket.data.playerName = playerName;
      broadcastDebug();
    });

    // ── Movement sync ────────────────────────────────────────────────────────
    socket.on("move", ({ roomId, x, z }: { roomId: string; x: number; z: number }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) { player.x = x; player.z = z; }
      socket.to(roomId).emit("opponentMove", { x, z });
    });

    // ── Attack ───────────────────────────────────────────────────────────────
    socket.on("attack", ({ roomId, attackType, damage }: { roomId: string; attackType: "punch" | "kick" | "special"; damage: number }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "fighting") return;
      const attacker = room.players.find(p => p.socketId === socket.id);
      const defender = room.players.find(p => p.socketId !== socket.id);
      if (!attacker || !defender) return;

      const dx = attacker.x - defender.x;
      const dz = attacker.z - defender.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const inRange = dist < 5;
      const actualDamage = inRange ? Math.max(0, damage) : 0;
      if (inRange) { defender.hp = Math.max(0, defender.hp - actualDamage); }

      io.to(roomId).emit("attackResult", {
        attackerName: attacker.playerName, defenderName: defender.playerName,
        damage: actualDamage, isCritical: attackType === "special",
        defenderHp: defender.hp, attackType, hit: inRange,
      });

      if (defender.hp <= 0) { endBattle(io, roomId, attacker.playerName, defender.playerName); }
    });

    socket.on("battleEnd", ({ roomId, winnerName, loserName }: { roomId: string; winnerName: string; loserName: string }) => {
      endBattle(io, roomId, winnerName, loserName);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      logger.info({
        socketId: socket.id, playerName: socket.data.playerName,
        inQueue: socket.data.inQueue, roomId: socket.data.roomId,
        reason, remainingConnected: io.sockets.sockets.size,
      }, "Socket DISCONNECTED");

      const qIdx = matchQueue.findIndex(p => p.socketId === socket.id);
      if (qIdx !== -1) {
        matchQueue.splice(qIdx, 1);
        logger.info({ playerName: socket.data.playerName, newQueueLength: matchQueue.length }, "Removed from queue on disconnect");
      }

      const roomId = socket.data.roomId as string | undefined;
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          room.players = room.players.filter(p => p.socketId !== socket.id);
          io.to(roomId).emit("playerLeft", { playerName: socket.data.playerName });
        }
      }
      broadcastDebug();
    });
  });

  return io;
}

async function endBattle(io: SocketIOServer, roomId: string, winnerName: string, loserName: string) {
  const room = rooms.get(roomId);
  if (!room || room.status === "finished") return;
  room.status = "finished";
  try { await db.update(roomsTable).set({ status: "finished" }).where(eq(roomsTable.id, roomId)); }
  catch (err) { logger.error({ err }, "Failed to update room status to finished"); }
  io.to(roomId).emit("battleEnd", { winnerName, loserName });
  try { await upsertLeaderboard(winnerName, true); await upsertLeaderboard(loserName, false); }
  catch (err) { logger.error({ err }, "Failed to update leaderboard"); }
  rooms.delete(roomId);
}

async function upsertLeaderboard(playerName: string, won: boolean) {
  const existing = await db.select().from(leaderboardTable).where(eq(leaderboardTable.playerName, playerName));
  if (existing.length === 0) {
    const wins = won ? 1 : 0; const losses = won ? 0 : 1;
    await db.insert(leaderboardTable).values({ playerName, wins, losses, totalBattles: 1, winRate: wins });
  } else {
    const e = existing[0];
    const wins = e.wins + (won ? 1 : 0); const losses = e.losses + (won ? 0 : 1);
    const totalBattles = e.totalBattles + 1;
    await db.update(leaderboardTable).set({ wins, losses, totalBattles, winRate: wins / totalBattles }).where(eq(leaderboardTable.playerName, playerName));
  }
}
