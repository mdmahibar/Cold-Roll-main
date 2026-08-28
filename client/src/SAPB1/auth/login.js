import axios from "axios";
import { sapconfig } from "../../config/sapConfig.js";

/**
 * The browser talks to OUR Node service, never to SAP.
 *
 * baseURL is "/api/sap" (VITE_SAP_API_BASE). Vite proxies that to
 * localhost:4100 in dev; IIS proxies it to the same service in production.
 * The Node service holds the SAP credentials, owns one pooled B1SESSION for
 * all users, and re-authenticates on its own when the session dies.
 *
 * The old build pointed this client at "/sap" and logged in from the browser
 * with the password compiled into the bundle. If you see "/sap" here again,
 * it is a bad merge — that route no longer exists and every call 404s.
 */
const sapClient = axios.create({
    baseURL: sapconfig.apiBase,
    timeout: sapconfig.timeoutMs,
    // No SAP cookie lives in the browser any more, so there is nothing to
    // send. Same-origin in both dev and prod, so this stays off.
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Pull the human-readable text out of a Service Layer error. SAP returns
 * { error: { code, message: { lang, value } } }; axios only gives us
 * "Request failed with status code 400" in error.message.
 *
 * The Node service deliberately emits this same shape for its own failures,
 * so proxy errors and SAP errors read identically here.
 *
 * @param {unknown} error     The rejected value from any Sap helper.
 * @param {string} [fallback] Used when the response carries no SAP message.
 * @returns {string} The message to show the user.
 */
export function sapErrorMessage(error, fallback = "SAP request failed") {
    const sap = error?.response?.data?.error;
    const value = sap?.message?.value ?? sap?.message;
    if (typeof value === "string" && value.trim()) {
        return sap?.code ? `[${sap.code}] ${value}` : value;
    }
    return error?.message || fallback;
}

/**
 * Reports the pooled SAP session held by the Node service.
 *
 * Kept only because Dashboard.jsx still calls it. This no longer creates a
 * session and takes no credentials — the server logs in once and shares that
 * session across every store. Nothing else needs to call this: the helpers
 * below work whether or not you have ever called it.
 *
 * @returns {Promise<object>} { SessionId, Version, pooled, active, ... }
 */
export async function loginToSAP() {
    try {
        const response = await sapClient.post('/session');
        console.log("SAP session ready");
        return response.data;
    } catch (error) {
        console.error("Error reaching the SAP proxy:", sapErrorMessage(error));
        throw error;
    }
}

/**
 * Call any SAP B1 Service Layer route. Just pass the route (e.g. "/Orders",
 * "/Items('A0001')", "/BusinessPartners?$top=5").
 *
 * There is no login step here any more. The Node service authenticates before
 * forwarding and replays the call itself if the session expired mid-flight,
 * so a 401 reaching this code means the server could not authenticate at all
 * — retrying from the browser would not change that.
 *
 * @param {string} route   SAP B1 route, with or without a leading slash.
 * @param {object} [options]
 * @param {string} [options.method="GET"]  HTTP method.
 * @param {object} [options.data]          Request body for POST/PATCH/PUT.
 * @param {object} [options.config]        Extra axios config (params, headers…).
 * @returns {Promise<any>} The response body.
 */
export async function getSap(route, { method = "GET", data, config = {} } = {}) {
    const path = route.startsWith("/") ? route : `/${route}`;

    try {
        const response = await sapClient.request({ url: path, method, data, ...config });
        return response.data;
    } catch (error) {
        console.error(`SAP request failed [${method} ${path}]:`, sapErrorMessage(error));
        throw error;
    }
}

/**
 * Fetch every row of a collection, not just the first page.
 *
 * The Service Layer paginates collections (20 rows by default, set by
 * MaxPageSize in b1s.conf) and returns an "@odata.nextLink" for the remainder,
 * so a plain getSap("/Orders") silently truncates. This follows nextLink until
 * the server stops sending one and concatenates every page's "value".
 *
 * @param {string} route   Entity set route, e.g. "/PurchaseDeliveryNotes".
 * @param {object} [options]
 * @param {object} [options.config]   Extra axios config (params, headers…),
 *                                    applied to the first request only —
 *                                    nextLink already carries the query.
 * @param {number} [options.maxPages=200]  Safety stop for runaway loops.
 * @returns {Promise<Array>} Every row across all pages.
 */
export async function getSapAll(route, { config = {}, maxPages = 200 } = {}) {
    const rows = [];
    let next = route;
    let isFirstPage = true;

    for (let page = 0; page < maxPages; page += 1) {
        // Only the first call gets the caller's params; nextLink is already a
        // complete query string and re-adding them would duplicate keys.
        const body = await getSap(next, isFirstPage ? { config } : undefined);
        isFirstPage = false;

        if (Array.isArray(body?.value)) rows.push(...body.value);
        else if (body) rows.push(body);

        const link = body?.["@odata.nextLink"];
        if (!link) return rows;

        // B1 usually returns a relative link ("Orders?$skip=20"), but some
        // setups return an absolute one pointing at the SAP host — strip
        // everything up to the API root so it goes back through our proxy.
        next = link.startsWith("http") ? link.replace(/^.*\/b1s\/v\d+\//, "") : link;
    }

    console.warn(`getSapAll stopped at the ${maxPages}-page cap for ${route}`);
    return rows;
}

/**
 * Fetch a single entity by its key, e.g. getSapById("Orders", 13) ->
 * GET /Orders(13), or getSapById("Items", "A0001") -> GET /Items('A0001').
 * Strings are automatically quoted as SAP expects for string keys.
 *
 * @param {string} entity  Entity set name (e.g. "Orders", "Items").
 * @param {string|number} id  The entity key.
 * @param {object} [options]  Same options as getSap (config, etc.).
 * @returns {Promise<any>} The response body.
 */
export async function getSapById(entity, id, options = {}) {
    const name = entity.startsWith("/") ? entity.slice(1) : entity;
    const key = typeof id === "number" ? id : `'${id}'`;
    return getSap(`/${name}(${key})`, { ...options, method: "GET" });
}

/**
 * Create a new entity. e.g. PostSap("/Orders", { CardCode: "C0001", ... }).
 *
 * @param {string} route  SAP B1 route (entity set).
 * @param {object} data   Request body to create.
 * @param {object} [options]  Same options as getSap (config, etc.).
 * @returns {Promise<any>} The created entity.
 */
export async function PostSap(route, data, options = {}) {
    return getSap(route, { ...options, method: "POST", data });
}

/**
 * Partially update an entity. e.g. PatchSap("/Orders(13)", { Comments: "hi" }).
 * SAP Service Layer returns 204 No Content on success (no body).
 *
 * @param {string} route  SAP B1 route pointing at a single entity.
 * @param {object} data   Fields to update.
 * @param {object} [options]  Same options as getSap (config, etc.).
 * @returns {Promise<any>} The response body (usually empty).
 */
export async function PatchSap(route, data, options = {}) {
    return getSap(route, { ...options, method: "PATCH", data });
}

/**
 * Delete an entity. e.g. DeleteSap("/Orders(13)").
 *
 * @param {string} route  SAP B1 route pointing at a single entity.
 * @param {object} [options]  Same options as getSap (config, etc.).
 * @returns {Promise<any>} The response body (usually empty).
 */
export async function DeleteSap(route, options = {}) {
    return getSap(route, { ...options, method: "DELETE" });
}
