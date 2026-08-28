/**
 * Client-side SAP settings.
 *
 * There are no credentials here, and there must never be again. Every VITE_*
 * value is compiled into the JS bundle and is readable by anyone who opens
 * DevTools on any of the stores. The SAP username and password now live in
 * server/.env only, and only the Node service ever sends them.
 *
 * What is left is the address of our own proxy and two harmless knobs.
 */
export const sapconfig = {
  // Where the Node SAP proxy is mounted. Relative on purpose: Vite proxies
  // it in dev, IIS proxies it in production, so one build works in both.
  apiBase: import.meta.env.VITE_SAP_API_BASE || "/api/sap",

  // Client-side timeout for SAP calls. SAP document posts can be slow.
  timeoutMs: Number(import.meta.env.VITE_SAP_TIMEOUT_MS) || 120000,

  // B1 user code stamped as Requester on Purchase Requests. A username, not
  // a credential — the password is not here and does not belong here.
  requester: import.meta.env.VITE_SAP_REQUESTER || "",
};
