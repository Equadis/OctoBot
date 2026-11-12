import { describe, expect, it, vi } from "vitest";
import { HttpChronicleClient, type FetchLike } from "./client.js";

const body = { instances: [{ id: "a", realm_name: "N'Zoth", uploader_name: "U", guild_name: "G", first_encounter_time: "2026-09-01T02:05:00Z", player_count: 28, encounters: [{ name: "Onyxia", boss: true, kill_type: "clean" }] }] };

describe("HttpChronicleClient", () => {
  it("fetches, parses, and returns typed logs on a 200", async () => {
    const fetchFn: FetchLike = vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));
    const logs = await new HttpChronicleClient(fetchFn).fetchRecentOnyxia();
    expect(logs).toHaveLength(1);
    expect(logs[0]!.id).toBe("a");
  });

  it("sends the load-bearing Sec-Fetch headers (dropping them 403s in production)", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => ({ ok: true, status: 200, json: async () => body }));
    await new HttpChronicleClient(fetchFn).fetchRecentOnyxia();
    const headers = fetchFn.mock.calls[0]![1].headers;
    expect(headers["Sec-Fetch-Site"]).toBe("same-origin");
    expect(headers["Sec-Fetch-Mode"]).toBe("cors");
    expect(headers.Origin).toContain("chronicleclassic");
  });

  it("throws on a non-OK response (so the poller can log and retry), naming the status", async () => {
    const fetchFn: FetchLike = async () => ({ ok: false, status: 403, json: async () => ({}) });
    await expect(new HttpChronicleClient(fetchFn).fetchRecentOnyxia()).rejects.toThrow(/403/);
  });

  it("returns [] (not a throw) when a 200 carries malformed JSON", async () => {
    const fetchFn: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ instances: "nope" }) });
    expect(await new HttpChronicleClient(fetchFn).fetchRecentOnyxia()).toEqual([]);
  });
});
