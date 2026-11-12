import { PacketReader, PacketWriter } from "../net/byte-buffer.js";

/**
 * A whisper's SMSG_MESSAGECHAT carries the sender's GUID but not their name, so
 * replying (and storing a subscriber by name) needs a name lookup.
 *
 *   CMSG_NAME_QUERY:          u64 guid
 *   SMSG_NAME_QUERY_RESPONSE: u64 guid, cstring name, cstring realm, u32 race,
 *                             u32 gender, u32 class  — only guid+name are read.
 *
 * The response layout past the name is version-variant, so nothing beyond the
 * name is parsed. Confirm against a live capture before trusting it.
 */

export interface NameQueryResult {
  readonly guid: bigint;
  readonly name: string;
}

export function buildNameQuery(guid: bigint): Buffer {
  return new PacketWriter().u64LE(guid).toBuffer();
}

export function parseNameQueryResponse(body: Buffer): NameQueryResult {
  const reader = new PacketReader(body);
  const guid = reader.u64LE();
  const name = reader.cString();
  return { guid, name };
}
