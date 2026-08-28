/**
 * Service Layer error shapes and how we hand them back to the browser.
 *
 * SAP returns errors as:
 *   { "error": { "code": -1234, "message": { "lang": "en-us", "value": "..." } } }
 *
 * The React client already knows how to read that shape (see sapErrorMessage
 * in SAPB1/auth/login.js), so the proxy passes the body through untouched
 * along with SAP's own status code. Do not "improve" the shape here — every
 * screen in the app depends on it staying exactly as SAP sent it.
 */

export class SapProxyError extends Error {
    constructor(message, { status = 502, body = null, cause = null } = {}) {
        super(message);
        this.name = "SapProxyError";
        this.status = status;
        this.body = body;
        this.cause = cause;
    }
}

/**
 * Pull the human-readable text out of a Service Layer error response.
 * Used for server-side logging only.
 */
export function describeSapError(error) {
    const sap = error?.response?.data?.error;
    const value = sap?.message?.value ?? sap?.message;

    if (typeof value === "string" && value.trim()) {
        return sap?.code ? `[${sap.code}] ${value}` : value;
    }

    if (error?.code) return `${error.code}: ${error.message}`;
    return error?.message || "Unknown SAP error";
}

/**
 * Turn a transport-level failure (DNS, refused, TLS, timeout) into a message
 * that says what to actually check, rather than a bare error code.
 */
export function describeTransportError(error, baseUrl) {
    switch (error?.code) {
        case "ENOTFOUND":
            return `Cannot resolve the SAP host in ${baseUrl}. Check SAP_URL and DNS.`;
        case "ECONNREFUSED":
            return `Connection refused by ${baseUrl}. Is the Service Layer running on that port?`;
        case "ECONNRESET":
        case "EPIPE":
            // Stale pooled sockets are replayed once in sapClient.js, so
            // reaching here means SAP dropped a live request.
            return (
                `${baseUrl} closed the connection before answering. Retrying a stale ` +
                `pooled connection is handled automatically, so check the Service Layer ` +
                `log and the connection/session limits in b1s.conf.`
            );
        case "ETIMEDOUT":
        case "ECONNABORTED":
            return `Timed out talking to ${baseUrl}. Check network path and SAP_TIMEOUT_MS.`;
        case "DEPTH_ZERO_SELF_SIGNED_CERT":
        case "SELF_SIGNED_CERT_IN_CHAIN":
        case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
        case "CERT_HAS_EXPIRED":
            return (
                `TLS certificate rejected for ${baseUrl}. ` +
                `Set SAP_REJECT_UNAUTHORIZED=false, or install a trusted certificate.`
            );
        default:
            return null;
    }
}
