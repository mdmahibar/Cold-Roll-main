import axios from "axios";
import https from "node:https";
import config from "../config/index.js";
import logger from "../utils/logger.js";

/**
 * The single HTTPS agent used for every call to the Service Layer.
 *
 * keepAlive matters here: without it Node opens a fresh TLS connection per
 * request, and a TLS handshake against SAP is far more expensive than the
 * request itself. With hundreds of stores calling in, connection reuse is
 * the difference between comfortable and overloaded.
 *
 * rejectUnauthorized:false is what makes the self-signed Service Layer
 * certificate work. This is the server-side equivalent of Vite's
 * `secure: false` — the same trust decision, made in one place you control
 * instead of on every client machine.
 */
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 64,
    maxFreeSockets: 16,
    timeout: config.sap.timeoutMs,
    rejectUnauthorized: config.sap.rejectUnauthorized,
});

if (!config.sap.rejectUnauthorized) {
    logger.warn(
        "SAP TLS verification is disabled (SAP_REJECT_UNAUTHORIZED=false). " +
        "Fine for a self-signed Service Layer certificate on a trusted network; " +
        "enable it once a properly issued certificate is in place."
    );
}

export const sapClient = axios.create({
    baseURL: config.sap.baseUrl,
    httpsAgent,
    timeout: config.sap.timeoutMs,
    // SAP returns JSON; let axios parse it but never throw on non-2xx here —
    // the proxy layer decides what to do with each status.
    headers: { "Content-Type": "application/json" },
    // OData query strings contain $, ' and , which must survive verbatim.
    // We build the full path ourselves and never let axios re-serialize it.
    paramsSerializer: { serialize: (params) => params?.toString?.() ?? "" },
    maxRedirects: 0,
    // Service Layer payloads (long item lists, attachments) can be large.
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
});

/**
 * Replay a request once when a pooled keep-alive socket dies under us.
 *
 * SAP — or the IIS/load balancer in front of it — closes idle keep-alive
 * connections on its own schedule, and it does so without telling us. When the
 * agent above hands out a socket the far end has just closed, Node reports
 * "ECONNRESET: socket hang up" for a request SAP never even read. That is the
 * price of connection reuse, and the cure is to notice it and use a fresh
 * socket rather than to stop reusing connections.
 *
 * `request.reusedSocket` is what makes the replay safe even for POST: it is
 * true only when the socket came out of the pool, which means the far end had
 * already closed before our bytes arrived and nothing was posted twice. A hang
 * up on a BRAND NEW socket is a real network fault and is left to fail.
 */
sapClient.interceptors.response.use(undefined, (error) => {
    const droppedByPeer = error?.code === "ECONNRESET" || error?.code === "EPIPE";
    const req = error?.config;

    if (droppedByPeer && error.request?.reusedSocket && req && !req.staleSocketRetry) {
        req.staleSocketRetry = true;

        logger.warn(
            `SAP closed a pooled connection (${error.code}); replaying ` +
            `${String(req.method || "get").toUpperCase()} ${req.url} on a new socket`
        );

        return sapClient.request(req);
    }

    return Promise.reject(error);
});

export { httpsAgent };
export default sapClient;
