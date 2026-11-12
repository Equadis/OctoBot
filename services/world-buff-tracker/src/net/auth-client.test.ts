import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { silentLogger } from "../logger.js";
import { LogonResult } from "../protocol/opcodes.js";
import { PacketWriter } from "./byte-buffer.js";
import { AuthReceiver, whenParses } from "./auth-client.js";
import { parseLogonChallengeServer } from "./auth-packets.js";

class MockSocket extends EventEmitter {
  write(): boolean {
    return true;
  }
  destroy(): void {}
}

/** A minimal successful challenge, parseable through the salt (102 bytes). */
function challengeBuffer(): Buffer {
  return new PacketWriter()
    .u8(0x00) // opcode
    .u8(0x00) // protocol/unknown
    .u8(LogonResult.Success)
    .bytes(Buffer.alloc(32, 0xaa)) // B
    .u8(1)
    .bytes(Buffer.from([7])) // g
    .u8(32)
    .bytes(Buffer.alloc(32, 0xbb)) // N
    .bytes(Buffer.alloc(32, 0xcc)) // salt
    .toBuffer();
}

const isChallenge = whenParses(parseLogonChallengeServer);

afterEach(() => {
  vi.useRealTimers();
});

describe("AuthReceiver", () => {
  it("settles once the message has arrived and the socket goes idle", async () => {
    vi.useFakeTimers();
    const socket = new MockSocket();
    const receiver = new AuthReceiver(socket, 200, silentLogger);

    const settled = receiver.settle(isChallenge);
    const message = challengeBuffer();
    socket.emit("data", message);

    await vi.advanceTimersByTimeAsync(200);
    await settled;
    expect(receiver.take().equals(message)).toBe(true);
  });

  it("keeps waiting while the message is only partially received", async () => {
    vi.useFakeTimers();
    const socket = new MockSocket();
    const receiver = new AuthReceiver(socket, 200, silentLogger);

    let resolved = false;
    const settled = receiver.settle(isChallenge).then(() => {
      resolved = true;
    });

    const message = challengeBuffer();
    socket.emit("data", message.subarray(0, 50)); // not enough to parse
    await vi.advanceTimersByTimeAsync(200);
    expect(resolved).toBe(false);

    socket.emit("data", message.subarray(50)); // the rest
    await vi.advanceTimersByTimeAsync(200);
    await settled;
    expect(resolved).toBe(true);
  });

  it("includes trailing tail bytes so the caller can discard them", async () => {
    vi.useFakeTimers();
    const socket = new MockSocket();
    const receiver = new AuthReceiver(socket, 200, silentLogger);

    const settled = receiver.settle(isChallenge);
    const message = challengeBuffer();
    const tail = Buffer.from([0x00, 0xba, 0xa3]); // crc/security tail we do not parse
    socket.emit("data", Buffer.concat([message, tail]));

    await vi.advanceTimersByTimeAsync(200);
    await settled;
    const taken = receiver.take();
    expect(taken.length).toBe(message.length + tail.length);
    // The logical parse still works and ignores the tail.
    expect(parseLogonChallengeServer(taken).result).toBe(LogonResult.Success);
  });

  it("rejects a pending settle when the socket errors", async () => {
    const socket = new MockSocket();
    const receiver = new AuthReceiver(socket, 200, silentLogger);
    const settled = receiver.settle(isChallenge);
    socket.emit("error", new Error("boom"));
    await expect(settled).rejects.toThrow("boom");
  });
});
