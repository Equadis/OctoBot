/**
 * Vanilla (pre-2.0 / 1.12) world-packet header encryption.
 *
 * After the auth handshake the client and server encrypt only the small packet
 * *headers* — the 6-byte CMSG header (u16 size + u32 opcode) going out and the
 * 4-byte SMSG header (u16 size + u16 opcode) coming in. Bodies are plaintext.
 *
 * The algorithm is the MaNGOS/cmangos-family cipher every 1.12 emulator uses, so
 * it matches what Turtle's core expects byte for byte:
 *
 *   encrypt: x = (data ^ key[i]) + prevSend;  prevSend = x
 *   decrypt: x = (data - prevRecv) ^ key[i];  prevRecv = data(before decrypt)
 *
 * `i` walks the 40-byte session key modulo its length. Send and receive keep
 * independent index/carry state, so one instance drives both directions.
 *
 * The cipher is only enabled *after* CMSG_AUTH_SESSION is sent: SMSG_AUTH_CHALLENGE
 * and CMSG_AUTH_SESSION themselves are exchanged in plaintext.
 */
export class VanillaHeaderCrypt {
  readonly #key: Buffer;
  #sendIndex = 0;
  #sendCarry = 0;
  #recvIndex = 0;
  #recvCarry = 0;

  constructor(sessionKey: Buffer) {
    if (sessionKey.length === 0) throw new RangeError("session key must not be empty");
    this.#key = Buffer.from(sessionKey);
  }

  /** Encrypt an outgoing header in place (client -> server). */
  encryptSend(header: Buffer): void {
    for (let t = 0; t < header.length; t += 1) {
      this.#sendIndex %= this.#key.length;
      const x = ((header[t] ^ this.#key[this.#sendIndex]) + this.#sendCarry) & 0xff;
      this.#sendIndex += 1;
      header[t] = x;
      this.#sendCarry = x;
    }
  }

  /** Decrypt an incoming header in place (server -> client). */
  decryptRecv(header: Buffer): void {
    for (let t = 0; t < header.length; t += 1) {
      this.#recvIndex %= this.#key.length;
      const encrypted = header[t];
      const x = (((encrypted - this.#recvCarry) & 0xff) ^ this.#key[this.#recvIndex]) & 0xff;
      this.#recvIndex += 1;
      this.#recvCarry = encrypted;
      header[t] = x;
    }
  }
}
