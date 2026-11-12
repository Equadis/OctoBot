/**
 * Typed little/big-endian packet reader and writer over Node Buffers.
 *
 * WoW packets mix endianness: world-packet headers carry a big-endian size and a
 * little-endian opcode, while nearly every body field is little-endian. These two
 * classes make that explicit at every call site so a mistake is visible in review
 * rather than hidden in a `readUInt*` flag.
 */

/** Grows a backing Buffer as fields are appended, then hands back the exact slice. */
export class PacketWriter {
  #buf: Buffer;
  #length = 0;

  constructor(initialCapacity = 64) {
    this.#buf = Buffer.alloc(Math.max(initialCapacity, 1));
  }

  get length(): number {
    return this.#length;
  }

  #ensure(extra: number): void {
    const needed = this.#length + extra;
    if (needed <= this.#buf.length) return;
    let capacity = this.#buf.length;
    while (capacity < needed) capacity *= 2;
    const grown = Buffer.alloc(capacity);
    this.#buf.copy(grown, 0, 0, this.#length);
    this.#buf = grown;
  }

  u8(value: number): this {
    this.#ensure(1);
    this.#buf.writeUInt8(value & 0xff, this.#length);
    this.#length += 1;
    return this;
  }

  u16LE(value: number): this {
    this.#ensure(2);
    this.#buf.writeUInt16LE(value & 0xffff, this.#length);
    this.#length += 2;
    return this;
  }

  u16BE(value: number): this {
    this.#ensure(2);
    this.#buf.writeUInt16BE(value & 0xffff, this.#length);
    this.#length += 2;
    return this;
  }

  u32LE(value: number): this {
    this.#ensure(4);
    this.#buf.writeUInt32LE(value >>> 0, this.#length);
    this.#length += 4;
    return this;
  }

  u32BE(value: number): this {
    this.#ensure(4);
    this.#buf.writeUInt32BE(value >>> 0, this.#length);
    this.#length += 4;
    return this;
  }

  i32LE(value: number): this {
    this.#ensure(4);
    this.#buf.writeInt32LE(value | 0, this.#length);
    this.#length += 4;
    return this;
  }

  f32LE(value: number): this {
    this.#ensure(4);
    this.#buf.writeFloatLE(value, this.#length);
    this.#length += 4;
    return this;
  }

  u64LE(value: bigint): this {
    this.#ensure(8);
    this.#buf.writeBigUInt64LE(BigInt.asUintN(64, value), this.#length);
    this.#length += 8;
    return this;
  }

  /** Raw bytes, copied verbatim. */
  /** A packed GUID: a mask byte naming which of the 8 little-endian bytes follow, then those
   *  non-zero bytes. How the world protocol sends most unit references. */
  packedGuid(value: bigint): this {
    let mask = 0;
    const present: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const byte = Number((value >> BigInt(i * 8)) & 0xffn);
      if (byte !== 0) {
        mask |= 1 << i;
        present.push(byte);
      }
    }
    this.u8(mask);
    for (const byte of present) this.u8(byte);
    return this;
  }

  bytes(value: Buffer | Uint8Array): this {
    this.#ensure(value.length);
    Buffer.from(value).copy(this.#buf, this.#length);
    this.#length += value.length;
    return this;
  }

  /** Null-terminated UTF-8 string (a WoW `CString`). */
  cString(value: string): this {
    const raw = Buffer.from(value, "utf8");
    this.#ensure(raw.length + 1);
    raw.copy(this.#buf, this.#length);
    this.#length += raw.length;
    this.#buf.writeUInt8(0, this.#length);
    this.#length += 1;
    return this;
  }

  /** UTF-8 string prefixed with a single-byte length (the auth server's `String`). */
  stringU8(value: string): this {
    const raw = Buffer.from(value, "utf8");
    if (raw.length > 0xff) throw new RangeError("stringU8 value exceeds 255 bytes");
    this.u8(raw.length);
    return this.bytes(raw);
  }

  toBuffer(): Buffer {
    return Buffer.from(this.#buf.subarray(0, this.#length));
  }
}

/** Cursor-based reader; every accessor advances the offset by the width it read. */
export class PacketReader {
  readonly #buf: Buffer;
  #offset: number;

  constructor(buf: Buffer, offset = 0) {
    this.#buf = buf;
    this.#offset = offset;
  }

  get offset(): number {
    return this.#offset;
  }

  get remaining(): number {
    return this.#buf.length - this.#offset;
  }

  #need(width: number): void {
    if (this.#offset + width > this.#buf.length) {
      throw new RangeError(
        `read past end of buffer: need ${width} at offset ${this.#offset}, have ${this.remaining}`,
      );
    }
  }

  u8(): number {
    this.#need(1);
    const value = this.#buf.readUInt8(this.#offset);
    this.#offset += 1;
    return value;
  }

  u16LE(): number {
    this.#need(2);
    const value = this.#buf.readUInt16LE(this.#offset);
    this.#offset += 2;
    return value;
  }

  u16BE(): number {
    this.#need(2);
    const value = this.#buf.readUInt16BE(this.#offset);
    this.#offset += 2;
    return value;
  }

  u32LE(): number {
    this.#need(4);
    const value = this.#buf.readUInt32LE(this.#offset);
    this.#offset += 4;
    return value;
  }

  i32LE(): number {
    this.#need(4);
    const value = this.#buf.readInt32LE(this.#offset);
    this.#offset += 4;
    return value;
  }

  f32LE(): number {
    this.#need(4);
    const value = this.#buf.readFloatLE(this.#offset);
    this.#offset += 4;
    return value;
  }

  u64LE(): bigint {
    this.#need(8);
    const value = this.#buf.readBigUInt64LE(this.#offset);
    this.#offset += 8;
    return value;
  }

  /** A packed GUID — see `PacketWriter.packedGuid`. */
  packedGuid(): bigint {
    const mask = this.u8();
    let guid = 0n;
    for (let i = 0; i < 8; i += 1) {
      if (mask & (1 << i)) guid |= BigInt(this.u8()) << BigInt(i * 8);
    }
    return guid;
  }

  bytes(count: number): Buffer {
    this.#need(count);
    const slice = Buffer.from(this.#buf.subarray(this.#offset, this.#offset + count));
    this.#offset += count;
    return slice;
  }

  /** Reads up to and consuming a null terminator; returns the UTF-8 text without it. */
  cString(): string {
    const end = this.#buf.indexOf(0, this.#offset);
    if (end === -1) throw new RangeError("unterminated CString");
    const value = this.#buf.toString("utf8", this.#offset, end);
    this.#offset = end + 1;
    return value;
  }
}
