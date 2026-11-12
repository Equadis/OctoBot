import { PacketReader, PacketWriter } from "../net/byte-buffer.js";

/**
 * A player casting Resurrection on us, and our answer.
 *
 *   SMSG_RESURRECT_REQUEST:  u64 resurrector, then a length-prefixed name (empty for a player) and
 *                            a byte — only the GUID is read.
 *   CMSG_RESURRECT_RESPONSE: u64 resurrector, u8 status (1 = accept, 0 = decline).
 *
 * Stock 1.12 opcodes and layout, not yet seen in a capture here: a request that never arrives in
 * this shape simply goes unanswered, as it would for a player who did not click.
 */

export const RESURRECT_ACCEPT = 1;
export const RESURRECT_DECLINE = 0;

/** Who is offering to resurrect us. */
export function parseResurrectRequest(body: Buffer): bigint {
  return new PacketReader(body).u64LE();
}

/** Our answer to `resurrector`'s offer. */
export function buildResurrectResponse(resurrector: bigint, accept: boolean): Buffer {
  return new PacketWriter()
    .u64LE(resurrector)
    .u8(accept ? RESURRECT_ACCEPT : RESURRECT_DECLINE)
    .toBuffer();
}
