import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import config from "./config/index.js";
import logger from "./utils/logger.js";
import routes from "./routes/index.js";
import requestId from "./middleware/requestId.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

// IIS sits in front of this. Trusting its X-Forwarded-* headers is what makes
// req.ip the actual store's address instead of 127.0.0.1 in every log line.
app.set("trust proxy", true);
app.disable("x-powered-by");

app.use(helmet({
    // This service returns JSON only; the CSP that helmet would apply to HTML
    // is irrelevant here and only complicates the IIS-served SPA.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(compression());
app.use(requestId);

/**
 * CORS.
 *
 * In production this list should normally be EMPTY. IIS serves the React
 * build and proxies /api to this service, so browser requests are same-origin
 * and no CORS headers are needed at all. The list exists for local
 * development, where Vite runs on :5173 and this runs on :4100.
 */
if (config.server.corsOrigins.length > 0) {
    app.use(cors({
        origin: config.server.corsOrigins,
        credentials: true,
    }));
    logger.info(`CORS enabled for: ${config.server.corsOrigins.join(", ")}`);
}

app.use(express.json({ limit: config.server.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
