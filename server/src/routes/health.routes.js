import { Router } from "express";
import { sessionStatus } from "../sap/sessionManager.js";
import config from "../config/index.js";

const router = Router();

/**
 * Liveness. Answers even when SAP is unreachable — this tells a monitor that
 * the Node service itself is up, which is the thing NSSM restarts.
 */
router.get("/", (req, res) => {
    res.json({
        status: "ok",
        service: "sap-proxy-api",
        env: config.env,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

/**
 * Readiness. Reports the pooled SAP session without touching SAP, so an
 * uptime monitor hitting this every minute costs the Service Layer nothing.
 */
router.get("/sap", (req, res) => {
    const status = sessionStatus();
    res.status(status.active ? 200 : 503).json({
        status: status.active ? "ok" : "no-session",
        sap: {
            baseUrl: config.sap.baseUrl,
            companyDB: config.sap.companyDB,
            tlsVerification: config.sap.rejectUnauthorized ? "enabled" : "disabled",
        },
        session: status,
    });
});

export default router;
