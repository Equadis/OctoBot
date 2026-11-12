import { describe, expect, it } from "vitest";
import { MONGO_CLIENT_OPTIONS, releaseSharedClient } from "./mongo-connection.js";

describe("MONGO_CLIENT_OPTIONS", () => {
  it("keeps the pool small and lets idle sockets go", () => {
    expect(MONGO_CLIENT_OPTIONS.maxPoolSize).toBeLessThanOrEqual(5);
    expect(MONGO_CLIENT_OPTIONS.minPoolSize).toBe(0);
    expect(MONGO_CLIENT_OPTIONS.maxIdleTimeMS).toBeGreaterThan(0);
  });

  it("monitors with one polling socket rather than a stream plus a pinger", () => {
    expect(MONGO_CLIENT_OPTIONS.serverMonitoringMode).toBe("poll");
  });
});

describe("releaseSharedClient", () => {
  it("resolves without doing anything, so one store closing cannot close the client for all", async () => {
    await expect(releaseSharedClient()).resolves.toBeUndefined();
  });
});
