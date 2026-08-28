import sapClient from "../sap/sapClient.js";
import { ensureSession, refreshSession } from "../sap/sessionManager.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import {
    SapProxyError,
    describeSapError,
    describeTransportError,
} from "../sap/sapError.js";

/**
 * Headers the browser is allowed to influence.
 *
 * Service Layer honours several B1S-* switches that individual screens rely
 * on (case-insensitive lookups, collection replacement semantics on PATCH),
 * plus the OData Prefer header for paging. Everything else — Cookie, Host,
 * Authorization, Origin — is ours to set, never the client's.
 */
const FORWARDABLE_HEADERS = new Set([
    "content-type",
    "prefer",
    "accept",
    "accept-language",
    "if-match",
    "b1s-caseinsensitive",
    "b1s-replacecollectionsonpatch",
    "b1s-wcfcompatible",
    "b1s-pagesize",
]);

function pickForwardableHeaders(incoming = {}) {
    const out = {};
    for (const [key, value] of Object.entries(incoming)) {
        if (FORWARDABLE_HEADERS.has(key.toLowerCase()) && value !== undefined) {
            out[key] = value;
        }
    }
    // Always JSON unless the caller deliberately said otherwise.
    if (!out["content-type"] && !out["Content-Type"]) {
        out["Content-Type"] = "application/json";
    }
    return out;
}

/**
 * Entity-level allowlist.
 *
 * Off by default so the migration is behaviour-identical on day one. Turn it
 * on once you have listed the entity sets this app genuinely uses — that is
 * what stops a curious user from calling Service Layer endpoints the UI never
 * exposes, which is a control you simply cannot have when the browser talks
 * to SAP directly.
 */
function assertAllowed(rawPath) {
    if (!config.proxy.enforceAllowlist) return;

    // "/Items?$select=x" -> "Items"   |   "/Orders(13)" -> "Orders"
    const entity = rawPath
        .replace(/^\/+/, "")
        .split(/[?(/]/)[0]
        .trim();

    if (!entity) return;

    const allowed = config.proxy.allowedEntities.some(
        (e) => e.toLowerCase() === entity.toLowerCase()
    );

    if (!allowed) {
        throw new SapProxyError(
            `Entity "${entity}" is not permitted through this proxy.`,
            {
                status: 403,
                body: {
                    error: {
                        code: "PROXY_ENTITY_BLOCKED",
                        message: {
                            lang: "en-us",
                            value: `Entity "${entity}" is not in SAP_ALLOWED_ENTITIES.`,
                        },
                    },
                },
            }
        );
    }
}

/**
 * Forward one request to the Service Layer and return SAP's answer verbatim.
 *
 * "Verbatim" is the whole contract. Status code, body shape and error shape
 * all pass through untouched, which is why not a single React service or hook
 * needs editing — they still receive exactly what they received when the
 * browser called SAP directly.
 *
 * @param {object}  input
 * @param {string}  input.method   HTTP method from the browser.
 * @param {string}  input.rawPath  Path + query exactly as received, e.g.
 *                                 "/Items?$select=ItemCode,ItemName".
 * @param {*}       input.body     Parsed JSON body, if any.
 * @param {object}  input.headers  Incoming request headers.
 * @param {string}  [input.requestId] Correlation id for logging.
 */
export async function forwardToSap({ method, rawPath, body, headers, requestId }) {
    assertAllowed(rawPath);

    const started = Date.now();
    const verb = String(method || "GET").toUpperCase();
    const hasBody = !["GET", "HEAD", "DELETE"].includes(verb);

    const call = (session) =>
        sapClient.request({
            url: rawPath,
            method: verb,
            data: hasBody ? body : undefined,
            headers: {
                ...pickForwardableHeaders(headers),
                Cookie: session.cookieHeader,
            },
        });

    let session = await ensureSession();

    try {
        const response = await call(session);

        if (config.log.logSapCalls) {
            logger.info(`SAP ${verb} ${rawPath} -> ${response.status}`, {
                ms: Date.now() - started,
                requestId,
            });
        }

        return {
            status: response.status,
            headers: response.headers,
            data: response.data,
        };
    } catch (error) {
        const status = error?.response?.status;

        // 401 means the pooled session died before its stated timeout —
        // SAP restarted, an admin killed it, or a load-balancer node changed.
        // Log in again and replay the request once. The browser never sees it.
        if (status === 401) {
            logger.warn("SAP session expired; re-authenticating", { requestId });

            session = await refreshSession();

            try {
                const retry = await call(session);

                logger.info(`SAP ${verb} ${rawPath} -> ${retry.status} (after relogin)`, {
                    ms: Date.now() - started,
                    requestId,
                });

                return {
                    status: retry.status,
                    headers: retry.headers,
                    data: retry.data,
                };
            } catch (retryError) {
                return handleFailure(retryError, { verb, rawPath, started, requestId });
            }
        }

        return handleFailure(error, { verb, rawPath, started, requestId });
    }
}

/**
 * A SAP business error (400 "Item code already exists", 404, 409 …) is not a
 * proxy failure — it is a legitimate answer the UI already knows how to
 * render. Pass it straight through with SAP's own status and body.
 *
 * Only genuine transport failures become a 502 generated by us.
 */
function handleFailure(error, { verb, rawPath, started, requestId }) {
    const transport = describeTransportError(error, config.sap.baseUrl);

    if (transport) {
        logger.error(`SAP ${verb} ${rawPath} transport failure: ${transport}`, {
            ms: Date.now() - started,
            requestId,
        });
        throw new SapProxyError(transport, { status: 502, cause: error });
    }

    if (error?.response) {
        logger.warn(
            `SAP ${verb} ${rawPath} -> ${error.response.status} ${describeSapError(error)}`,
            { ms: Date.now() - started, requestId }
        );

        return {
            status: error.response.status,
            headers: error.response.headers,
            data: error.response.data,
            isSapError: true,
        };
    }

    logger.error(`SAP ${verb} ${rawPath} failed: ${describeSapError(error)}`, {
        requestId,
    });

    throw new SapProxyError(describeSapError(error), { status: 502, cause: error });
}

export default { forwardToSap };
