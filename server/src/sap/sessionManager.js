import sapClient from "./sapClient.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { SapProxyError, describeSapError, describeTransportError } from "./sapError.js";

/**
 * ONE pooled Service Layer session, shared by every browser that talks to
 * this server.
 *
 * This is the change that makes the app scale. Previously each browser tab
 * logged into SAP itself, so 1600 stores meant thousands of concurrent
 * Service Layer sessions — well past what b1s.conf normally allows. Here the
 * store count no longer affects SAP at all: SAP sees one client.
 *
 * Two details worth knowing:
 *
 *  - Single-flight. If fifty requests arrive while no session exists, they
 *    all await the SAME login promise rather than firing fifty logins at SAP.
 *
 *  - Proactive refresh. We renew at ~80% of the stated SessionTimeout instead
 *    of waiting for a 401, so normal traffic never eats a failed round trip.
 *    The 401 retry in the proxy is the safety net, not the mechanism.
 */

let session = null;      // { cookieHeader, sessionId, expiresAt, version }
let loginInFlight = null; // shared promise while a login is running

function now() {
    return Date.now();
}

function isUsable(candidate) {
    return Boolean(candidate?.cookieHeader) && candidate.expiresAt > now();
}

/**
 * Service Layer sets B1SESSION and, on load-balanced installs, ROUTEID.
 * ROUTEID is the sticky-session marker — drop it and requests bounce between
 * Service Layer nodes, producing sporadic 401s that are miserable to debug.
 * So we keep every cookie SAP gives us, not just B1SESSION.
 */
function toCookieHeader(setCookieHeaders) {
    if (!Array.isArray(setCookieHeaders) || setCookieHeaders.length === 0) {
        return null;
    }
    return setCookieHeaders
        .map((raw) => String(raw).split(";")[0].trim())
        .filter(Boolean)
        .join("; ");
}

async function performLogin(attempt = 1) {
    const started = now();

    try {
        const response = await sapClient.post(
            "/Login",
            {
                CompanyDB: config.sap.companyDB,
                UserName: config.sap.user,
                Password: config.sap.password,
            },
            // Explicitly send no cookie: a stale B1SESSION on the login call
            // makes some Service Layer builds return 401 instead of a session.
            { headers: { Cookie: "" } }
        );

        const cookieHeader = toCookieHeader(response.headers?.["set-cookie"]);

        if (!cookieHeader) {
            throw new SapProxyError(
                "SAP Login succeeded but returned no session cookie.",
                { status: 502, body: response.data }
            );
        }

        const minutes =
            Number(response.data?.SessionTimeout) || config.sap.defaultSessionMinutes;

        const lifetimeMs = minutes * 60_000;

        session = {
            cookieHeader,
            sessionId: response.data?.SessionId ?? null,
            version: response.data?.Version ?? null,
            expiresAt: now() + lifetimeMs * config.sap.sessionRefreshRatio,
            issuedAt: now(),
        };

        logger.info("SAP session established", {
            companyDB: config.sap.companyDB,
            timeoutMinutes: minutes,
            ms: now() - started,
        });

        return session;
    } catch (error) {
        const transport = describeTransportError(error, config.sap.baseUrl);

        if (transport) {
            logger.error(`SAP login failed: ${transport}`);
            throw new SapProxyError(transport, { status: 502, cause: error });
        }

        const status = error?.response?.status;
        const detail = describeSapError(error);

        // Bad credentials or bad CompanyDB will never fix themselves — do not
        // retry, and say plainly what to check.
        if (status === 401 || status === 400) {
            logger.error(`SAP login rejected: ${detail}`, {
                companyDB: config.sap.companyDB,
                user: config.sap.user,
            });
            throw new SapProxyError(
                `SAP rejected the service account. Check SAP_COMPANY_DB, SAP_USER ` +
                `and SAP_PASSWORD in the server .env. SAP said: ${detail}`,
                { status: 502, body: error?.response?.data, cause: error }
            );
        }

        if (attempt < config.sap.maxLoginRetries) {
            const backoff = 500 * attempt;
            logger.warn(
                `SAP login attempt ${attempt} failed (${detail}); retrying in ${backoff}ms`
            );
            await new Promise((resolve) => setTimeout(resolve, backoff));
            return performLogin(attempt + 1);
        }

        logger.error(`SAP login failed after ${attempt} attempts: ${detail}`);
        throw new SapProxyError(detail, {
            status: status || 502,
            body: error?.response?.data,
            cause: error,
        });
    }
}

/**
 * Return a usable session, logging in only if we have to. Concurrent callers
 * share one login.
 */
export async function ensureSession() {
    if (isUsable(session)) return session;

    if (!loginInFlight) {
        loginInFlight = performLogin()
            .finally(() => {
                loginInFlight = null;
            });
    }

    return loginInFlight;
}

/**
 * Discard the current session and get a new one. Called when SAP answers 401
 * to a proxied request, which means the session died earlier than its stated
 * timeout (service restart, admin kill, node failover).
 */
export async function refreshSession() {
    session = null;
    return ensureSession();
}

/** Snapshot for the health endpoint. Never exposes the cookie itself. */
export function sessionStatus() {
    if (!session) {
        return { active: false };
    }
    return {
        active: isUsable(session),
        sessionId: session.sessionId
            ? `${String(session.sessionId).slice(0, 6)}…`
            : null,
        version: session.version,
        issuedAt: new Date(session.issuedAt).toISOString(),
        refreshDueAt: new Date(session.expiresAt).toISOString(),
    };
}

/**
 * Politely release the session on shutdown. Service Layer holds a licence
 * slot per session and reclaims it lazily, so logging out on a clean stop
 * keeps things tidy across frequent redeploys.
 */
export async function logoutSession() {
    if (!session?.cookieHeader) return;

    try {
        await sapClient.post("/Logout", null, {
            headers: { Cookie: session.cookieHeader },
            timeout: 5000,
        });
        logger.info("SAP session released");
    } catch (error) {
        logger.warn(`SAP logout failed (ignored): ${describeSapError(error)}`);
    } finally {
        session = null;
    }
}

export default { ensureSession, refreshSession, sessionStatus, logoutSession };
