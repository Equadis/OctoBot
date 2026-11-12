/**
 * Marks an error the supervisor should NOT retry — wrong credentials, a banned
 * account, a missing character. Transient errors (network drops) are plain
 * Errors and get retried with backoff.
 */
export class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalError";
  }
}

/**
 * The server rejected our client version/integrity (a wrong build or integrity
 * checksum — typically after an OctoWoW client patch). Signals the supervisor to
 * re-resolve the current values from the CDN and retry, rather than give up.
 */
export class VersionMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VersionMismatchError";
  }
}

type CodedError = Error & { code?: unknown };

/**
 * A readable one-line description of any thrown value. Node's `connect()` throws
 * an AggregateError whose own `.message` is empty and whose real causes (with
 * `.code` like ECONNREFUSED/ETIMEDOUT) live in `.errors` — so a naive `.message`
 * logs nothing. This unwraps that and surfaces the error code.
 */
export function describeError(error: unknown): string {
  if (error instanceof AggregateError) {
    const inner = error.errors
      .map((cause) => describeError(cause))
      .filter((text) => text.length > 0)
      .join("; ");
    if (error.message) return inner ? `${error.message} (${inner})` : error.message;
    return inner || "AggregateError";
  }
  if (error instanceof Error) {
    const coded: CodedError = error;
    const code = typeof coded.code === "string" ? coded.code : undefined;
    if (code && error.message) return `${code}: ${error.message}`;
    return code ?? (error.message.length > 0 ? error.message : error.name);
  }
  return String(error);
}
