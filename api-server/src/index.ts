import app from "./app";
import { logger } from "./lib/logger";
import { startNacchoLhdGeocoder } from "./jobs/geocodeNacchoLhd";
import { closeDatabasePools } from "@workspace/db";

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  startNacchoLhdGeocoder();
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Graceful shutdown started");
  const forceTimer = setTimeout(() => {
    logger.error({ signal }, "Graceful shutdown deadline exceeded");
    process.exit(1);
  }, 15_000);
  forceTimer.unref();

  try {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDatabasePools();
    clearTimeout(forceTimer);
    logger.info({ signal }, "Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error({ signal, error: error instanceof Error ? error.message : String(error) }, "Graceful shutdown failed");
    process.exit(1);
  }
}

process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("SIGINT", () => { void shutdown("SIGINT"); });
