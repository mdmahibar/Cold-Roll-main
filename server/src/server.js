import app from "./app.js";
import config from "./config/index.js";
import logger from "./utils/logger.js";
import { ensureSession, logoutSession } from "./sap/sessionManager.js";

const server = app.listen(config.server.port, config.server.host, async () => {
    logger.info("SAP Proxy API started");
    logger.info(`  Listening   http://localhost:${config.server.port}`);
    logger.info(`  Health      http://localhost:${config.server.port}/api/health`);
    logger.info(`  SAP health  http://localhost:${config.server.port}/api/health/sap`);
    logger.info(`  SAP target  ${config.sap.baseUrl} (${config.sap.companyDB})`);
    logger.info(`  Environment ${config.env}`);

    // Warm the pooled session at boot so the first user of the day does not
    // pay for the login round trip. A failure here is logged, not fatal —
    // the service should stay up and keep retrying rather than crash-loop
    // when SAP happens to be down for maintenance.
    try {
        await ensureSession();
        logger.info("  SAP session warm and ready");
    } catch (error) {
        logger.warn(`  SAP not reachable at boot: ${error.message}`);
        logger.warn("  Service is up; it will retry on the first request.");
    }
});

server.setTimeout(config.server.requestTimeoutMs);

/**
 * Graceful shutdown.
 *
 * NSSM sends CTRL+C / SIGTERM on `nssm stop` and on reboot. Draining in
 * flight requests and releasing the SAP session here is what makes a deploy
 * invisible to whoever is mid-transaction, instead of handing them a failed
 * document post.
 */
let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info(`${signal} received — shutting down`);

    // Hard stop if draining stalls, so Windows never sees a hung service.
    const force = setTimeout(() => {
        logger.error("Shutdown timed out; forcing exit");
        process.exit(1);
    }, 10000);
    force.unref();

    server.close(async () => {
        await logoutSession();
        clearTimeout(force);
        logger.info("Shutdown complete");
        process.exit(0);
    });
}

["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"].forEach((signal) => {
    process.on(signal, () => shutdown(signal));
});

process.on("unhandledRejection", (reason) => {
    logger.error(`Unhandled promise rejection: ${reason?.message || reason}`);
});

process.on("uncaughtException", (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    if (error.stack) console.error(error.stack);
    shutdown("uncaughtException");
});

export default server;
