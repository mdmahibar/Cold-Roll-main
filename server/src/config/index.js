import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env lives at the server root, two levels up from src/config
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Read a required variable. Fails fast at boot rather than at the first
 * request, so a bad deployment is obvious in the service log immediately.
 */
function required(key) {
    const value = process.env[key];
    if (value === undefined || value === null || String(value).trim() === "") {
        throw new Error(
            `Missing required environment variable: ${key}. ` +
            `Copy .env.example to .env and fill it in.`
        );
    }
    return String(value).trim();
}

function optional(key, fallback) {
    const value = process.env[key];
    if (value === undefined || value === null || String(value).trim() === "") {
        return fallback;
    }
    return String(value).trim();
}

function bool(key, fallback) {
    const value = optional(key, null);
    if (value === null) return fallback;
    return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
}

function num(key, fallback) {
    const value = optional(key, null);
    if (value === null) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

// Strip any trailing slash so path joins never produce a double slash.
const sapBaseUrl = required("SAP_URL").replace(/\/+$/, "");

export const config = {
    env: optional("NODE_ENV", "development"),
    isProduction: optional("NODE_ENV", "development") === "production",

    server: {
        port: num("PORT", 4100),
        host: optional("HOST", "0.0.0.0"),
        // Comma-separated list. Empty means same-origin only, which is the
        // correct production value when IIS serves the SPA and proxies /api.
        corsOrigins: optional("CORS_ORIGIN", "")
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
        bodyLimit: optional("BODY_LIMIT", "10mb"),
        requestTimeoutMs: num("REQUEST_TIMEOUT_MS", 120000),
    },

    sap: {
        baseUrl: sapBaseUrl,
        companyDB: required("SAP_COMPANY_DB"),
        user: required("SAP_USER"),
        password: required("SAP_PASSWORD"),
        // SAP B1 Service Layer normally ships a self-signed certificate.
        // false = accept it (this is what Vite's `secure: false` did in dev).
        // Set true once a properly trusted certificate is installed.
        rejectUnauthorized: bool("SAP_REJECT_UNAUTHORIZED", false),
        timeoutMs: num("SAP_TIMEOUT_MS", 120000),
        // Refresh the pooled session at this fraction of its stated lifetime,
        // so we renew before SAP expires it rather than after a failed call.
        sessionRefreshRatio: num("SAP_SESSION_REFRESH_RATIO", 0.8),
        // Used only when the Login response omits SessionTimeout.
        defaultSessionMinutes: num("SAP_SESSION_MINUTES", 30),
        maxLoginRetries: num("SAP_MAX_LOGIN_RETRIES", 2),
    },

    proxy: {
        // When true, only the entity sets in SAP_ALLOWED_ENTITIES may be
        // reached through the proxy. Leave false to mirror the old direct
        // behaviour exactly; turn on once you know your endpoint list.
        enforceAllowlist: bool("SAP_ENFORCE_ALLOWLIST", false),
        allowedEntities: optional("SAP_ALLOWED_ENTITIES", "")
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
    },

    log: {
        level: optional("LOG_LEVEL", "info"),
        // Log every proxied SAP call. Useful while migrating, noisy after.
        logSapCalls: bool("LOG_SAP_CALLS", true),
    },
};

export default config;
