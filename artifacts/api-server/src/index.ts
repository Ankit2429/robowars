import { createServer } from "http";
import app from "./app";
import { setupSocketIO } from "./socket";
import { logger } from "./lib/logger";
// ── Global Error Handlers ───────────────────────────────────────────────────
// Catch unhandled errors that would otherwise crash the process silently
process.on("uncaughtException", (err) => {
  logger.error({ err: err.message, stack: err.stack }, "UNCAUGHT EXCEPTION — Process exiting");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "UNHANDLED REJECTION");
});

async function boot() {
  try {
    logger.info("Starting backend boot sequence...");

    const port = Number(process.env["PORT"]) || 8080;
    logger.info({ port }, "Configuration loaded");

    const server = createServer(app);
    setupSocketIO(server);
    logger.info("Socket.IO initialized");

    server.listen(port, "0.0.0.0", () => {
      logger.info({ port }, "Server successfully listening on 0.0.0.0");
    });

    server.on("error", (err: Error) => {
      logger.error({ err }, "Server runtime error");
    });

  } catch (err: any) {
    logger.error({ err: err.message, stack: err.stack }, "FATAL BOOT FAILURE");
    process.exit(1);
  }
}

boot();
