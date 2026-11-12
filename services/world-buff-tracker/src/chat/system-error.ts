/**
 * Classifies a server SYSTEM chat message as a command FAILURE worth alerting on. The bot's one
 * command that fails visibly is the guild invite, so the seed patterns are its vanilla failure
 * wordings; the wiring LOGS every system message regardless, so real Turtle text can be captured
 * and added here rather than guessed. Kept as substrings (case-insensitive) because the server
 * interpolates names ("<name> is already in a guild"), so an exact match would be brittle.
 */
const ERROR_PATTERNS: readonly string[] = [
  "already in a guild",
  "not in a guild",
  "do not have permission",
  "guild is full",
  "not found",
  "is not online",
  "no player named",
  "is ignoring you",
  "already invited",
  "cannot invite",
];

/** True if a system message reads like a failed command (a guild invite that didn't take, etc.). */
export function isCommandError(text: string): boolean {
  const lower = text.toLowerCase();
  return ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}

/** The server's whisper spam-throttle notice — handled by backing the whisper queue off, not by
 *  alerting (it's self-healing and would otherwise spam the errors channel). */
const THROTTLE_PATTERNS: readonly string[] = ["too many different players", "wait a while before whispering"];

export function isWhisperThrottle(text: string): boolean {
  const lower = text.toLowerCase();
  return THROTTLE_PATTERNS.some((pattern) => lower.includes(pattern));
}
