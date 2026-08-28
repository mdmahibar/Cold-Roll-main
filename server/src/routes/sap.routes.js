import { Router } from "express";
import { passthrough, session } from "../controllers/sap.controller.js";

const router = Router();

/**
 * Named route first: /api/sap/session reports the pooled session.
 * Everything else falls through to the passthrough below.
 */
router.get("/session", session);
router.post("/session", session);

/**
 * Catch-all. Using router.use (rather than a wildcard path pattern) keeps
 * req.url as the raw remainder INCLUDING the query string, which is exactly
 * what the OData passthrough needs — and it behaves the same on Express 4
 * and 5, so an upgrade will not quietly break routing.
 */
router.use(passthrough);

export default router;
