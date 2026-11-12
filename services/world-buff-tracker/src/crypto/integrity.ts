import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * WoW 1.12 client-integrity proof (StrictVersionCheck).
 *
 * Servers like OctoWoW require the logon proof to carry
 *   crc_hash = SHA1( A || HMAC-SHA1(crc_salt, <client files concatenated>) )
 * and reject a zero/wrong value as a "modified client". The inner HMAC only
 * depends on the (constant) crc_salt and the client files, so it is itself a
 * constant per client build — which is why the bot can ship it precomputed and
 * needs no client files at runtime.
 */

/** The 1.12 Windows integrity file list, in the exact order the client hashes. */
export const INTEGRITY_FILES = [
  "WoW.exe",
  "fmod.dll",
  "ijl15.dll",
  "dbghelp.dll",
  "unicows.dll",
] as const;

/**
 * Precomputed HMAC-SHA1(standard crc_salt, the five 1.12.1 files). Verified byte
 * for byte against a genuine OctoWoW client login. Recompute with
 * computeIntegrityChecksum only if the client build changes.
 */
export const DEFAULT_INTEGRITY_CHECKSUM = "871edfeb5747215d892719f8e74236648ecce80b";

/** Recompute the checksum from client files on disk (for a new build/server). */
export function computeIntegrityChecksum(gameDir: string, crcSalt: Buffer): Buffer {
  const hmac = createHmac("sha1", crcSalt);
  for (const file of INTEGRITY_FILES) hmac.update(readFileSync(path.join(gameDir, file)));
  return hmac.digest();
}

/** crc_hash = SHA1(A || checksum) — the value placed in CMD_AUTH_LOGON_PROOF. */
export function integrityCrcHash(clientPublicKey: Buffer, checksum: Buffer): Buffer {
  return createHash("sha1").update(clientPublicKey).update(checksum).digest();
}
