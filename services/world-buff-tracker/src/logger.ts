/** Tiny leveled logger. No dependency; writes timestamped lines to the console. */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export function createLogger(minLevel: LogLevel = "info"): Logger {
  const threshold = LEVEL_ORDER[minLevel];
  const log = (level: LogLevel, message: string): void => {
    if (LEVEL_ORDER[level] < threshold) return;
    const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${message}`;
    if (level === "error" || level === "warn") console.error(line);
    else console.log(line);
  };
  return {
    debug: (m) => log("debug", m),
    info: (m) => log("info", m),
    warn: (m) => log("warn", m),
    error: (m) => log("error", m),
  };
}

/** Wrap a logger so every line is tagged with a prefix (e.g. a session name). */
export function prefixed(logger: Logger, prefix: string): Logger {
  const tag = `[${prefix}] `;
  return {
    debug: (m) => logger.debug(tag + m),
    info: (m) => logger.info(tag + m),
    warn: (m) => logger.warn(tag + m),
    error: (m) => logger.error(tag + m),
  };
}

/** A logger that discards everything — the default for tests. */
export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
