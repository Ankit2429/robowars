import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import path from "path";
import fs from "fs";

// Debug endpoint — bypasses the router entirely
app.get("/api/debug/ping", (_req, res) => {
  res.json({ ok: true, cwd: process.cwd(), dirname: __dirname, node: process.version, pid: process.pid });
});

// Multiplayer debug endpoint — shows live socket/queue/room state
app.get("/api/debug/multiplayer", (_req, res) => {
  try {
    const { getDebugState } = require("./socket");
    res.json(getDebugState());
  } catch (err: any) {
    res.json({ error: err.message });
  }
});

app.get("/health", async (_req, res) => {
  const { checkDatabaseConnection } = await import("@workspace/db");
  const isDbUp = await checkDatabaseConnection();
  if (isDbUp) {
    res.json({ status: "healthy", db: "connected", timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: "unhealthy", db: "disconnected", timestamp: new Date().toISOString() });
  }
});

app.use("/api", router);

// ── Global error handler for API routes ──
// Express 5 requires 4-argument error handler signature
app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error({ err: err?.message, stack: err?.stack }, "Unhandled API error");
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error", message: err?.message ?? "Unknown" });
  }
});

// ── Serve the frontend production build ──────────────────────────────────────
// The Vite build outputs to artifacts/robo-arena/dist/public.
// We try multiple candidate paths because __dirname varies depending on
// whether the server is run from the bundled dist/ or from source, and
// process.cwd() can differ between local dev and Render.
const candidates = [
  // 1. __dirname-relative (bundled server at artifacts/api-server/dist/)
  path.resolve(__dirname, "../../robo-arena/dist/public"),
  // 2. cwd-relative (Render sets cwd to the repo root)
  path.resolve(process.cwd(), "artifacts/robo-arena/dist/public"),
  // 3. cwd-relative (if Render root is the api-server artifact)
  path.resolve(process.cwd(), "../robo-arena/dist/public"),
  // 4. cwd-relative (if cwd is already the dist folder)
  path.resolve(process.cwd(), "dist/public"),
];

let frontendDist: string | null = null;
for (const candidate of candidates) {
  const indexPath = path.join(candidate, "index.html");
  if (fs.existsSync(indexPath)) {
    frontendDist = candidate;
    break;
  }
}

if (frontendDist) {
  logger.info({ path: frontendDist }, "Serving frontend static files");
  app.use(express.static(frontendDist));
  // SPA fallback: serve index.html for any non-API route
  app.get("/*path", (req, res) => {
    res.sendFile(path.join(frontendDist!, "index.html"));
  });
} else {
  logger.warn(
    { candidates },
    "Frontend dist not found — API-only mode. Checked paths listed above.",
  );
}

export default app;
