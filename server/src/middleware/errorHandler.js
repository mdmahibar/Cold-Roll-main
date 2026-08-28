import logger from "../utils/logger.js";
import config from "../config/index.js";
import { SapProxyError } from "../sap/sapError.js";

/**
 * Final error handler.
 *
 * Everything leaves in the Service Layer error shape:
 *   { error: { code, message: { lang, value } } }
 *
 * That is deliberate. The React client's sapErrorMessage() already reads that
 * shape, so proxy failures and SAP failures surface identically in the UI and
 * no screen needs a new error branch.
 */
export function errorHandler(error, req, res, _next) {
    const status = error instanceof SapProxyError ? error.status : 500;

    logger.error(`Unhandled ${req.method} ${req.originalUrl}: ${error.message}`, {
        requestId: req.id,
        status,
    });

    if (!config.isProduction && error.stack) {
        console.error(error.stack);
    }

    // If the failure already carries a SAP body, prefer it — it is more
    // specific than anything we would write.
    if (error?.body?.error) {
        return res.status(status).json(error.body);
    }

    return res.status(status).json({
        error: {
            code: error.name || "PROXY_ERROR",
            message: {
                lang: "en-us",
                value: error.message || "Unexpected server error",
            },
            requestId: req.id,
        },
    });
}

export default errorHandler;
