import { describe, expect, it, vi } from "vitest";
import { resolveBuild, type FetchInit, type FetchLike } from "./client-resolver.js";

const BUILD_OFFSET = 4_422_652;
const BUILD_LEN = 4;

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** Parse a `bytes=start-end` Range header into an inclusive [start, end] pair. */
function parseRange(init: FetchInit | undefined): { start: number; end: number } | null {
  const header = init?.headers?.Range;
  const match = header ? /^bytes=(\d+)-(\d+)$/.exec(header) : null;
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]) };
}

/**
 * A fake CDN whose WoW.exe carries the build string at the launcher's offset and
 * that honours Range requests with a 206, like the real dl.octowow.st does.
 */
function fakeCdn(build: string): { fetchImpl: FetchLike & ReturnType<typeof vi.fn> } {
  const wowExe = Buffer.alloc(BUILD_OFFSET + BUILD_LEN);
  wowExe.write(build, BUILD_OFFSET, "latin1");
  const fetchImpl = vi.fn<FetchLike>((url, init) => {
    if (!url.endsWith("/WoW.exe")) {
      return Promise.resolve({ ok: false, status: 404, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });
    }
    const range = parseRange(init);
    if (range) {
      const slice = wowExe.subarray(range.start, range.end + 1);
      return Promise.resolve({ ok: true, status: 206, arrayBuffer: () => Promise.resolve(toArrayBuffer(slice)) });
    }
    return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(toArrayBuffer(wowExe)) });
  });
  return { fetchImpl };
}

describe("resolveBuild", () => {
  it("reads the build with a 4-byte Range request", async () => {
    const { fetchImpl } = fakeCdn("7272");
    expect(await resolveBuild("http://cdn/latest", fetchImpl)).toBe(7272);

    const init = fetchImpl.mock.calls[0]?.[1];
    expect(parseRange(init)).toEqual({ start: BUILD_OFFSET, end: BUILD_OFFSET + BUILD_LEN - 1 });
  });

  it("picks up a changed build (patch simulation)", async () => {
    const { fetchImpl } = fakeCdn("7300");
    expect(await resolveBuild("http://cdn/latest", fetchImpl)).toBe(7300);
  });

  it("falls back to the offset when the server ignores Range and sends the whole file", async () => {
    const wowExe = Buffer.alloc(BUILD_OFFSET + BUILD_LEN);
    wowExe.write("7500", BUILD_OFFSET, "latin1");
    const fetchImpl: FetchLike = () =>
      Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(toArrayBuffer(wowExe)) });
    expect(await resolveBuild("http://cdn/latest", fetchImpl)).toBe(7500);
  });

  it("throws on a CDN error", async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve({ ok: false, status: 503, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });
    await expect(resolveBuild("http://cdn/latest", fetchImpl)).rejects.toThrow(/HTTP 503/);
  });

  it("throws on a non-numeric build", async () => {
    const { fetchImpl } = fakeCdn("\x00\x00\x00\x00");
    await expect(resolveBuild("http://cdn/latest", fetchImpl)).rejects.toThrow(/unexpected build/);
  });
});
