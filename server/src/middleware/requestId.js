import { randomUUID } from "node:crypto";

/**
 * Attach a short correlation id to every request and echo it back.
 * When a store reports "it failed at 3pm", this is what lets you find the
 * exact line in err.log rather than reading the whole file.
 */
export function requestId(req, res, next) {
    req.id = req.headers["x-request-id"] || randomUUID().slice(0, 8);
    res.setHeader("X-Request-Id", req.id);
    next();
}

export default requestId;
