/**
 * Self-heal across OctoWoW client patches by reading the current logon build from
 * OctoWoW's public CDN — the same WoW.exe the OctoLauncher downloads.
 *
 * Only the build actually gates login (the server does not validate the integrity
 * checksum for the accepted builds), and the build is a 4-byte ASCII string at a
 * fixed offset. So this uses a tiny HTTP Range request — a few hundred bytes total,
 * not the 6.7 MB client — to fetch just those bytes. A build bump from a client
 * patch is then picked up automatically with negligible bandwidth.
 */

export const OCTOWOW_CDN = "https://dl.octowow.st/client/latest";

// The offset the OctoLauncher reads the build string from in WoW.exe.
const BUILD_OFFSET = 4_422_652;
const BUILD_LEN = 4;

export interface FetchInit {
  readonly headers?: Record<string, string>;
}

export interface FetchResponse {
  readonly ok: boolean;
  readonly status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type FetchLike = (url: string, init?: FetchInit) => Promise<FetchResponse>;

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

/** Fetch the current logon build from the CDN WoW.exe via a 4-byte Range request. */
export async function resolveBuild(
  cdnBase: string,
  fetchImpl: FetchLike = defaultFetch,
): Promise<number> {
  const response = await fetchImpl(`${cdnBase}/WoW.exe`, {
    headers: { Range: `bytes=${BUILD_OFFSET}-${BUILD_OFFSET + BUILD_LEN - 1}` },
  });
  if (!response.ok) throw new Error(`CDN WoW.exe: HTTP ${response.status}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  // 206 => just the 4 requested bytes; 200 (server ignored Range) => read at offset.
  const slice =
    response.status === 206
      ? bytes.subarray(0, BUILD_LEN)
      : bytes.subarray(BUILD_OFFSET, BUILD_OFFSET + BUILD_LEN);

  const text = slice.toString("latin1").trim();
  const build = Number.parseInt(text, 10);
  if (!Number.isInteger(build) || build <= 0) {
    throw new Error(`unexpected build value "${text}" from WoW.exe`);
  }
  return build;
}
