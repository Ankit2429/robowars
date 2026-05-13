import { Router } from "express";
import { db } from "@workspace/db";
import { roomsTable } from "@workspace/db";
import { CreateRoomBody } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router = Router();

router.get("/rooms", async (req, res) => {
  try {
    const rooms = await db.select().from(roomsTable)
      .orderBy(roomsTable.createdAt);
    res.json(rooms.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list rooms");
    res.status(500).json({ error: "Failed to list rooms" });
  }
});

router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid room data", details: parsed.error.issues });
    return;
  }

  const { name, hostName } = parsed.data;
  const id = randomUUID().slice(0, 8).toUpperCase();

  try {
    const [room] = await db.insert(roomsTable).values({
      id,
      name,
      hostName,
      status: "waiting",
      playerCount: 1,
      maxPlayers: 2,
    }).returning();

    res.status(201).json({ ...room, createdAt: room.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create room");
    res.status(500).json({ error: "Failed to create room" });
  }
});

export default router;
