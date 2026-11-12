import { describe, expect, it, vi } from "vitest";
import { DiscordDmSender, type DiscordFetch, type DiscordResponse } from "./discord-dm.js";

function res(ok: boolean, status: number, body: unknown = {}): DiscordResponse {
  return { ok, status, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) };
}

describe("DiscordDmSender", () => {
  it("reports not-configured without a token", async () => {
    const result = await new DiscordDmSender(null).send("123", "hi");
    expect(result).toEqual({ ok: false, kind: "not-configured" });
  });

  it("creates a DM channel then posts the message", async () => {
    const fetchImpl = vi.fn<DiscordFetch>()
      .mockResolvedValueOnce(res(true, 200, { id: "chan1" }))
      .mockResolvedValueOnce(res(true, 200));
    const result = await new DiscordDmSender("tok", fetchImpl).send("42", "A raid is forming!");

    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [chUrl, chInit] = fetchImpl.mock.calls[0];
    expect(chUrl).toContain("/users/@me/channels");
    expect(chInit.headers.Authorization).toBe("Bot tok");
    expect(JSON.parse(chInit.body)).toEqual({ recipient_id: "42" });
    const [msgUrl, msgInit] = fetchImpl.mock.calls[1];
    expect(msgUrl).toContain("/channels/chan1/messages");
    expect(JSON.parse(msgInit.body)).toEqual({ content: "A raid is forming!" });
  });

  it("classifies a 403 on channel creation as unreachable (no mutual server / DMs closed)", async () => {
    const fetchImpl = vi.fn<DiscordFetch>().mockResolvedValue(res(false, 403));
    const result = await new DiscordDmSender("tok", fetchImpl).send("42", "hi");
    expect(result).toEqual({ ok: false, kind: "unreachable", status: 403 });
    expect(fetchImpl).toHaveBeenCalledTimes(1); // never tried to send
  });

  it("classifies a 404 as unreachable and a 500 as error", async () => {
    const notFound = new DiscordDmSender("tok", () => Promise.resolve(res(false, 404)));
    expect(await notFound.send("42", "hi")).toEqual({ ok: false, kind: "unreachable", status: 404 });

    const server = new DiscordDmSender("tok", () => Promise.resolve(res(false, 500)));
    expect(await server.send("42", "hi")).toEqual({ ok: false, kind: "error", status: 500 });
  });

  it("classifies a failed message send after a good channel create", async () => {
    const fetchImpl = vi.fn<DiscordFetch>()
      .mockResolvedValueOnce(res(true, 200, { id: "chan1" }))
      .mockResolvedValueOnce(res(false, 403));
    expect(await new DiscordDmSender("tok", fetchImpl).send("42", "hi")).toEqual({
      ok: false,
      kind: "unreachable",
      status: 403,
    });
  });

  it("treats a channel response with no id as an error", async () => {
    const fetchImpl = vi.fn<DiscordFetch>().mockResolvedValue(res(true, 200, { nope: true }));
    expect(await new DiscordDmSender("tok", fetchImpl).send("42", "hi")).toEqual({ ok: false, kind: "error" });
  });

  it("treats a thrown fetch as an error", async () => {
    const fetchImpl: DiscordFetch = () => Promise.reject(new Error("network"));
    expect(await new DiscordDmSender("tok", fetchImpl).send("42", "hi")).toEqual({ ok: false, kind: "error" });
  });

  describe("postToChannel", () => {
    it("posts directly to a channel by id, no DM-channel open step", async () => {
      const fetchImpl = vi.fn<DiscordFetch>().mockResolvedValue(res(true, 200));
      const result = await new DiscordDmSender("tok", fetchImpl).postToChannel("chan9", "hello city");
      expect(result).toEqual({ ok: true });
      expect(fetchImpl).toHaveBeenCalledTimes(1); // one POST, straight to the channel
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toContain("/channels/chan9/messages");
      expect(init.headers.Authorization).toBe("Bot tok");
      expect(JSON.parse(init.body)).toEqual({ content: "hello city" });
    });

    it("reports not-configured without a token", async () => {
      expect(await new DiscordDmSender(null).postToChannel("chan9", "hi")).toEqual({ ok: false, kind: "not-configured" });
    });

    it("classifies a failed post", async () => {
      const sender = new DiscordDmSender("tok", () => Promise.resolve(res(false, 403)));
      expect(await sender.postToChannel("chan9", "hi")).toEqual({ ok: false, kind: "unreachable", status: 403 });
    });
  });

  describe("createChannelMessage / editChannelMessage", () => {
    it("posts an embed and returns the new message id", async () => {
      const fetchImpl = vi.fn<DiscordFetch>().mockResolvedValue(res(true, 200, { id: "msg7" }));
      const embed = { title: "🟢 N'Zoth — Online", color: 0x2ecc71 };
      const result = await new DiscordDmSender("tok", fetchImpl).createChannelMessage("chan9", { embeds: [embed] });

      expect(result).toEqual({ ok: true, messageId: "msg7" });
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toContain("/channels/chan9/messages");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ embeds: [embed] });
    });

    it("errors when the create response carries no message id", async () => {
      const fetchImpl = vi.fn<DiscordFetch>().mockResolvedValue(res(true, 200, { nope: true }));
      expect(await new DiscordDmSender("tok", fetchImpl).createChannelMessage("chan9", { content: "x" })).toEqual({
        ok: false,
        kind: "error",
      });
    });

    it("reports not-configured without a token", async () => {
      expect(await new DiscordDmSender(null).createChannelMessage("chan9", { content: "x" })).toEqual({
        ok: false,
        kind: "not-configured",
      });
      expect(await new DiscordDmSender(null).editChannelMessage("chan9", "msg7", { content: "x" })).toEqual({
        ok: false,
        kind: "not-configured",
      });
    });

    it("edits an existing message in place via PATCH", async () => {
      const fetchImpl = vi.fn<DiscordFetch>().mockResolvedValue(res(true, 200));
      const result = await new DiscordDmSender("tok", fetchImpl).editChannelMessage("chan9", "msg7", {
        content: "updated",
      });
      expect(result).toEqual({ ok: true });
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toContain("/channels/chan9/messages/msg7");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ content: "updated" });
    });

    it("surfaces a 404 on edit as unreachable (the message was deleted)", async () => {
      const sender = new DiscordDmSender("tok", () => Promise.resolve(res(false, 404)));
      expect(await sender.editChannelMessage("chan9", "gone", { content: "x" })).toEqual({
        ok: false,
        kind: "unreachable",
        status: 404,
      });
    });

    it("treats a thrown fetch as an error on both", async () => {
      const throwing = new DiscordDmSender("tok", () => Promise.reject(new Error("network")));
      expect(await throwing.createChannelMessage("chan9", { content: "x" })).toEqual({ ok: false, kind: "error" });
      expect(await throwing.editChannelMessage("chan9", "m", { content: "x" })).toEqual({ ok: false, kind: "error" });
    });
  });

  describe("deleteChannelMessage", () => {
    it("DELETEs the message (204 = ok)", async () => {
      const fetchImpl = vi.fn<DiscordFetch>().mockResolvedValue(res(true, 204));
      const result = await new DiscordDmSender("tok", fetchImpl).deleteChannelMessage("chan9", "msg7");
      expect(result).toEqual({ ok: true });
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toContain("/channels/chan9/messages/msg7");
      expect(init.method).toBe("DELETE");
    });

    it("classifies a failed delete and reports not-configured without a token", async () => {
      const notFound = new DiscordDmSender("tok", () => Promise.resolve(res(false, 404)));
      expect(await notFound.deleteChannelMessage("chan9", "gone")).toEqual({ ok: false, kind: "unreachable", status: 404 });
      expect(await new DiscordDmSender(null).deleteChannelMessage("chan9", "m")).toEqual({ ok: false, kind: "not-configured" });
    });
  });

  describe("pinChannelMessage", () => {
    it("PUTs the message into the channel's pins (204 = ok)", async () => {
      const fetchImpl = vi.fn<DiscordFetch>().mockResolvedValue(res(true, 204));
      const result = await new DiscordDmSender("tok", fetchImpl).pinChannelMessage("chan9", "msg7");
      expect(result).toEqual({ ok: true });
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toBe("https://discord.com/api/v10/channels/chan9/messages/pins/msg7");
      expect(init.method).toBe("PUT");
    });

    it("surfaces a missing Pin Messages permission as unreachable, and needs a token", async () => {
      const forbidden = new DiscordDmSender("tok", () => Promise.resolve(res(false, 403)));
      expect(await forbidden.pinChannelMessage("chan9", "msg7")).toEqual({ ok: false, kind: "unreachable", status: 403 });
      expect(await new DiscordDmSender(null).pinChannelMessage("chan9", "msg7")).toEqual({ ok: false, kind: "not-configured" });
    });
  });

  describe("renameChannel", () => {
    it("PATCHes the channel name", async () => {
      const fetchImpl = vi.fn<DiscordFetch>().mockResolvedValue(res(true, 200));
      const result = await new DiscordDmSender("tok", fetchImpl).renameChannel("chan9", "🟢-server-status");
      expect(result).toEqual({ ok: true });
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toContain("/channels/chan9");
      expect(url).not.toContain("/messages");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ name: "🟢-server-status" });
    });

    it("surfaces a 429 rate-limit as an error with its status", async () => {
      const sender = new DiscordDmSender("tok", () => Promise.resolve(res(false, 429)));
      expect(await sender.renameChannel("chan9", "🔴-server-status")).toEqual({ ok: false, kind: "error", status: 429 });
    });

    it("reports not-configured without a token", async () => {
      expect(await new DiscordDmSender(null).renameChannel("chan9", "x")).toEqual({ ok: false, kind: "not-configured" });
    });
  });
});
