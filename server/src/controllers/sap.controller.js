import { forwardToSap } from "../services/sapProxy.service.js";
import { ensureSession, sessionStatus } from "../sap/sessionManager.js";

/**
 * Response headers we must NOT relay to the browser.
 *
 * set-cookie above all: SAP's B1SESSION belongs to this server and stays
 * here. That single omission is what removes the session from the browser
 * entirely — no cookie to steal, no cookie-path rewriting to configure in
 * IIS, and no per-tab SAP session multiplying across your stores.
 *
 * The hop-by-hop and length headers are stripped because Express recalculates
 * them for the response it actually sends.
 */
const BLOCKED_RESPONSE_HEADERS = new Set([
    "set-cookie",
    "transfer-encoding",
    "content-encoding",
    "content-length",
    "connection",
    "keep-alive",
]);

function relayHeaders(res, headers = {}) {
    for (const [key, value] of Object.entries(headers)) {
        if (BLOCKED_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
        if (value === undefined || value === null) continue;
        res.setHeader(key, value);
    }
}

/**
 * Catch-all passthrough for everything under /api/sap.
 *
 * Mounted with app.use, so req.url here is already the remainder of the path
 * WITH its query string intact — e.g. "/Items?$select=ItemCode,ItemName".
 * We forward that string as-is rather than re-serializing it, because OData
 * query syntax ($filter, $select, quoted keys) does not survive a round trip
 * through most query-string builders.
 */
export async function passthrough(req, res, next) {
    try {
        const rawPath = req.url.startsWith("/") ? req.url : `/${req.url}`;

        const result = await forwardToSap({
            method: req.method,
            rawPath,
            body: req.body,
            headers: req.headers,
            requestId: req.id,
        });

        relayHeaders(res, result.headers);

        // 204 No Content (the usual answer to PATCH and DELETE) must not
        // carry a body, or the browser reports a malformed response.
        if (result.status === 204 || result.data === undefined || result.data === "") {
            return res.status(result.status).end();
        }

        return res.status(result.status).json(result.data);
    } catch (error) {
        return next(error);
    }
}

/**
 * Session endpoint.
 *
 * The React client keeps a loginToSAP() export for backward compatibility
 * (Dashboard.jsx calls it). It now resolves against this, which reports the
 * pooled session rather than creating a per-browser one. Credentials are
 * never involved on the client side.
 */
export async function session(req, res, next) {
    try {
        await ensureSession();
        const status = sessionStatus();

        return res.json({
            SessionId: status.sessionId,
            Version: status.version,
            pooled: true,
            active: status.active,
            issuedAt: status.issuedAt,
            refreshDueAt: status.refreshDueAt,
        });
    } catch (error) {
        return next(error);
    }
}

export default { passthrough, session };
