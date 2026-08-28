import config from "../config/index.js";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const active = LEVELS[config.log.level] ?? LEVELS.info;

function stamp() {
    return new Date().toISOString();
}

function write(level, message, meta) {
    if (LEVELS[level] > active) return;

    const line = `[${stamp()}] ${level.toUpperCase().padEnd(5)} ${message}`;

    if (meta && Object.keys(meta).length > 0) {
        // NSSM captures stdout/stderr to file, so keep meta on one line to
        // stay greppable.
        const target = level === "error" ? console.error : console.log;
        target(`${line} ${JSON.stringify(meta)}`);
        return;
    }

    (level === "error" ? console.error : console.log)(line);
}

export const logger = {
    error: (message, meta) => write("error", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    info: (message, meta) => write("info", message, meta),
    debug: (message, meta) => write("debug", message, meta),
};

export default logger;
