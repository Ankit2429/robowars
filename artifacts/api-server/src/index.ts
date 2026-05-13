import { createServer } from "http";
import app from "./app";
import { setupSocketIO } from "./socket";
import { logger } from "./lib/logger";

const port = Number(process.env["PORT"]) || 8080;

const server = createServer(app);
setupSocketIO(server);

server.listen(port, "0.0.0.0", (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening on 0.0.0.0 with Socket.IO");
});
