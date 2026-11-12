import { describe, expect, it, vi } from "vitest";
import { silentLogger, type Logger } from "./logger.js";
import type { ChannelMessage, CreateResult, DmResult } from "./notify/discord-dm.js";
import {
  COLOR_DOWN,
  COLOR_LAGGY,
  COLOR_UP,
  ServerStatusWidget,
  buildServerStatusEmbed,
  humanSpan,
  serverDownNotice,
  serverUpNotice,
  statusChannelName,
  type LiveRealmStatus,
  type ServerStatusView,
  type StatusChannel,
  type StatusWidgetState,
  type StatusWidgetStore,
} from "./status-widget.js";

const NOW = 1_700_000_000_000;

function view(overrides: Partial<ServerStatusView> = {}): ServerStatusView {
  return {
    realm: "N'Zoth",
    up: true,
    response: "steady",
    playersOnline: 661,
    stateSince: NOW - 3 * 60 * 60_000, // up 3h
    watchingSince: NOW - 2 * 24 * 60 * 60_000, // watching 2d
    now: NOW,
    lastOutage: null,
    ...overrides,
  };
}

function fieldValue(embed: ReturnType<typeof buildServerStatusEmbed>, name: string): string | undefined {
  return embed.fields?.find((f) => f.name === name)?.value;
}

describe("humanSpan", () => {
  it("covers minutes, hours, and days", () => {
    expect(humanSpan(0)).toBe("under a minute");
    expect(humanSpan(30_000)).toBe("under a minute");
    expect(humanSpan(42 * 60_000)).toBe("42m");
    expect(humanSpan(3 * 60 * 60_000)).toBe("3h");
    expect(humanSpan((3 * 60 + 20) * 60_000)).toBe("3h20m");
    expect(humanSpan(5 * 24 * 60 * 60_000)).toBe("5d");
    expect(humanSpan((2 * 24 + 4) * 60 * 60_000)).toBe("2d4h");
  });
});

describe("statusChannelName", () => {
  it("prefixes 🟢 when up and 🔴 when down, with no separator of its own", () => {
    expect(statusChannelName(true, "server-status")).toBe("🟢server-status");
    expect(statusChannelName(false, "server-status")).toBe("🔴server-status");
    expect(statusChannelName(true, "realm-status")).toBe("🟢realm-status");
  });
});

describe("serverDownNotice / serverUpNotice", () => {
  it("are short one-liners; the up notice includes downtime only when known", () => {
    expect(serverDownNotice("N'Zoth")).toBe("🔴 N'Zoth is down.");
    expect(serverUpNotice("N'Zoth", 12 * 60_000)).toBe("🟢 N'Zoth is up — was down for 12m.");
    expect(serverUpNotice("N'Zoth", 0)).toBe("🟢 N'Zoth is up.");
  });
});

describe("buildServerStatusEmbed", () => {
  it("renders a steady realm green and never shows a millisecond number", () => {
    const embed = buildServerStatusEmbed(view({ response: "steady" }));
    expect(embed.color).toBe(COLOR_UP);
    expect(embed.title).toBe("🟢 N'Zoth — Online");
    expect(embed.description).toContain("responding normally");
    // No Status field at all — the title, the coloured dot and the description already say it, and
    // a fourth copy sitting next to "Last outage" was what made the pair confusing to read.
    expect(fieldValue(embed, "Status")).toBeUndefined();
    expect(fieldValue(embed, "Realm response")).toBe("Stable");
    expect(fieldValue(embed, "Last outage")).toBe("None recorded");
    expect(embed.footer?.text).toBe("Watching for 2d");
    expect(embed.timestamp).toBe(new Date(NOW).toISOString());
    expect(JSON.stringify(embed)).not.toMatch(/\d+\s*ms/i); // no "186 ms" anywhere
  });

  it("renders an elevated realm amber", () => {
    const embed = buildServerStatusEmbed(view({ response: "elevated" }));
    expect(embed.color).toBe(COLOR_LAGGY);
    expect(embed.title).toBe("🟡 N'Zoth — Online (elevated ping)");
    expect(embed.description).toContain("higher than usual");
    expect(fieldValue(embed, "Realm response")).toBe("Elevated — higher than usual");
  });

  it("renders an unstable realm amber", () => {
    const embed = buildServerStatusEmbed(view({ response: "unstable" }));
    expect(embed.color).toBe(COLOR_LAGGY);
    expect(embed.title).toBe("🟡 N'Zoth — Online (unstable ping)");
    expect(embed.description).toContain("fluctuating");
    expect(fieldValue(embed, "Realm response")).toBe("Unstable — fluctuating");
  });

  it("stays green and says 'Checking…' before the baseline warms up", () => {
    const embed = buildServerStatusEmbed(view({ response: "unknown" }));
    expect(embed.color).toBe(COLOR_UP);
    expect(embed.title).toBe("🟢 N'Zoth — Online");
    expect(fieldValue(embed, "Realm response")).toBe("Checking…");
  });

  it("renders a down realm red, with no realm-response field", () => {
    const embed = buildServerStatusEmbed(view({ up: false, response: "unknown", stateSince: NOW - 12 * 60_000 }));
    expect(embed.color).toBe(COLOR_DOWN);
    expect(embed.title).toBe("🔴 N'Zoth — Down");
    // The outage clock lives in the state sentence now — the title already says "Down", so a
    // Status field repeating it was a fourth copy of the same word.
    expect(embed.description).toBe("The realm has been down for 12m.");
    expect(fieldValue(embed, "Status")).toBeUndefined();
    expect(fieldValue(embed, "Realm response")).toBeUndefined();
  });

  it("shows the last outage when one is recorded", () => {
    const embed = buildServerStatusEmbed(view({ lastOutage: { endedAt: NOW - 2 * 60 * 60_000, durationMs: 12 * 60_000 } }));
    expect(fieldValue(embed, "Last outage")).toBe("2h ago · lasted 12m");
  });

  it("shows the realm's online player count, grouped for four figures", () => {
    expect(fieldValue(buildServerStatusEmbed(view()), "Players online")).toBe("661");
    expect(fieldValue(buildServerStatusEmbed(view({ playersOnline: 1204 })), "Players online")).toBe("1,204");
    expect(fieldValue(buildServerStatusEmbed(view({ playersOnline: 0 })), "Players online")).toBe("0");
  });

  it("says it is still checking when no /who count has landed yet", () => {
    expect(fieldValue(buildServerStatusEmbed(view({ playersOnline: null })), "Players online")).toBe("Checking…");
  });

  it("drops the player count while the realm is down — there is no live /who to count from", () => {
    const embed = buildServerStatusEmbed(view({ up: false, playersOnline: 661 }));
    expect(fieldValue(embed, "Players online")).toBeUndefined();
    expect(fieldValue(embed, "Realm response")).toBeUndefined();
    // The previous outage goes too: while one is happening, it is the only one anyone is reading for.
    expect(fieldValue(embed, "Last outage")).toBeUndefined();
    expect(embed.description).toBe("The realm has been down for 3h.");
  });

  it("omits the outage duration when the state's start is unknown", () => {
    expect(buildServerStatusEmbed(view({ up: false, stateSince: null })).description).toBe(
      "The realm is down.",
    );
  });
});

// --- orchestrator ---

function liveSnapshot(overrides: Partial<LiveRealmStatus> = {}): LiveRealmStatus {
  return {
    realm: "N'Zoth",
    up: true,
    pingMedianMs: 74,
    pingSpreadMs: 12,
    playersOnline: 661,
    stateSince: NOW - 3 * 60 * 60_000,
    watchingSince: NOW - 2 * 24 * 60 * 60_000,
    now: NOW,
    ...overrides,
  };
}

function state(overrides: Partial<StatusWidgetState> = {}): StatusWidgetState {
  return {
    messageId: null,
    lastOutageEndedAt: null,
    lastOutageDurationMs: null,
    channelName: null,
    baselineEmaMs: null,
    baselineSamples: 0,
    baselineUpdatedAt: null,
    ...overrides,
  };
}

function memoryStore(initial: StatusWidgetState | null = null): StatusWidgetStore & { saved: StatusWidgetState[] } {
  let current = initial;
  const saved: StatusWidgetState[] = [];
  return {
    saved,
    async load() {
      return current;
    },
    async save(next) {
      current = next;
      saved.push(next);
    },
  };
}

function spyLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

/** A field's value in the embed of a message the widget sent to the channel. */
function embedField(message: ChannelMessage | undefined, name: string): string | undefined {
  return message?.embeds?.[0]?.fields?.find((field) => field.name === name)?.value;
}

describe("ServerStatusWidget", () => {
  it("creates the message the first time and persists its id", async () => {
    const channel: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "m1" } satisfies CreateResult),
      edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true } satisfies DmResult),
    };
    const store = memoryStore();
    const widget = new ServerStatusWidget({ channel, store, snapshot: () => liveSnapshot(), logger: silentLogger });

    await widget.load();
    await widget.refresh();

    expect(channel.create).toHaveBeenCalledOnce();
    expect(channel.edit).not.toHaveBeenCalled();
    expect(store.saved.at(-1)?.messageId).toBe("m1");
  });

  it("carries the snapshot's live player count into the rendered embed", async () => {
    const create = vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "m1" });
    const edit = vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true });
    let playersOnline: number | null = 661;
    const widget = new ServerStatusWidget({
      channel: { create, edit },
      store: memoryStore(),
      snapshot: () => liveSnapshot({ playersOnline }),
      logger: silentLogger,
    });

    await widget.load();
    await widget.refresh();
    expect(embedField(create.mock.calls.at(-1)?.[0], "Players online")).toBe("661");

    playersOnline = 1204; // the realm filled up between refreshes
    await widget.refresh();
    expect(embedField(edit.mock.calls.at(-1)?.[1], "Players online")).toBe("1,204");
  });

  it("edits the same message on the next refresh, never reposting", async () => {
    const channel: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "m1" }),
      edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true }),
    };
    const widget = new ServerStatusWidget({ channel, store: memoryStore(), snapshot: () => liveSnapshot(), logger: silentLogger });

    await widget.load();
    await widget.refresh();
    await widget.refresh();
    await widget.refresh();

    expect(channel.create).toHaveBeenCalledOnce();
    expect(channel.edit).toHaveBeenCalledTimes(2);
    expect(channel.edit).toHaveBeenLastCalledWith("m1", expect.anything());
  });

  it("reposts when the message was deleted (edit 404), but not on other failures", async () => {
    const on404: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "m2" }),
      edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: false, kind: "unreachable", status: 404 }),
    };
    const w1 = new ServerStatusWidget({
      channel: on404,
      store: memoryStore(state({ messageId: "old" })),
      snapshot: () => liveSnapshot(),
      logger: silentLogger,
    });
    await w1.load();
    await w1.refresh();
    expect(on404.edit).toHaveBeenCalledOnce(); // tried the old id
    expect(on404.create).toHaveBeenCalledOnce(); // then reposted

    const on403: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "m3" }),
      edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: false, kind: "unreachable", status: 403 }),
    };
    const w2 = new ServerStatusWidget({
      channel: on403,
      store: memoryStore(state({ messageId: "old" })),
      snapshot: () => liveSnapshot(),
      logger: spyLogger(),
    });
    await w2.load();
    await w2.refresh();
    expect(on403.edit).toHaveBeenCalledOnce();
    expect(on403.create).not.toHaveBeenCalled(); // a perms error is NOT a "recreate" signal
  });

  it("records a finished outage: persists it and shows it on the widget", async () => {
    const edited: ChannelMessage[] = [];
    const channel: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "m1" }),
      edit: vi.fn<StatusChannel["edit"]>().mockImplementation(async (_id, message) => {
        edited.push(message);
        return { ok: true };
      }),
    };
    const store = memoryStore(state({ messageId: "m1" }));
    const widget = new ServerStatusWidget({ channel, store, snapshot: () => liveSnapshot(), logger: silentLogger });

    await widget.load();
    await widget.recordOutageEnd(NOW, 12 * 60_000);

    expect(store.saved.at(-1)).toMatchObject({ messageId: "m1", lastOutageEndedAt: NOW, lastOutageDurationMs: 12 * 60_000 });
    const outageField = edited.at(-1)?.embeds?.[0]?.fields?.find((f) => f.name === "Last outage");
    expect(outageField?.value).toContain("lasted 12m");
  });

  it("restores a persisted outage on load and shows it without a repost", async () => {
    const channel: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "new" }),
      edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true }),
    };
    const widget = new ServerStatusWidget({
      channel,
      store: memoryStore(state({ messageId: "kept", lastOutageEndedAt: NOW - 60 * 60_000, lastOutageDurationMs: 5 * 60_000 })),
      snapshot: () => liveSnapshot(),
      logger: silentLogger,
    });

    await widget.load();
    await widget.refresh();

    expect(channel.create).not.toHaveBeenCalled();
    expect(channel.edit).toHaveBeenCalledWith("kept", expect.anything());
  });

  it("serialises concurrent refreshes into a single post", async () => {
    let resolveCreate: (r: CreateResult) => void = () => {};
    const createPromise = new Promise<CreateResult>((resolve) => {
      resolveCreate = resolve;
    });
    const channel: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockReturnValue(createPromise),
      edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true }),
    };
    const widget = new ServerStatusWidget({ channel, store: memoryStore(), snapshot: () => liveSnapshot(), logger: silentLogger });
    await widget.load();

    const first = widget.refresh(); // starts a create and blocks on it
    const second = widget.refresh(); // must wait for the first, not start a second create
    resolveCreate({ ok: true, messageId: "m1" });
    await Promise.all([first, second]);

    expect(channel.create).toHaveBeenCalledOnce();
    expect(channel.edit).toHaveBeenCalledWith("m1", expect.anything());
  });

  // --- ping baseline / verdict ---

  it("classifies as unknown while the baseline is cold, then a verdict once warmed", async () => {
    const seen: string[] = [];
    const channel: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "m1" }),
      edit: vi.fn<StatusChannel["edit"]>().mockImplementation(async (_id, message) => {
        const field = message.embeds?.[0]?.fields?.find((f) => f.name === "Realm response");
        if (field) seen.push(field.value);
        return { ok: true };
      }),
    };
    // Each refresh is 1h apart so the baseline (~1 day tau) accumulates folds without racing.
    let clock = NOW;
    const widget = new ServerStatusWidget({
      channel,
      store: memoryStore(),
      snapshot: () => liveSnapshot({ pingMedianMs: 80, pingSpreadMs: 15, now: clock }),
      logger: silentLogger,
    });

    await widget.load();
    await widget.refresh(); // create — verdict "unknown" (no folds yet)
    for (let i = 0; i < 6; i += 1) {
      clock += 60 * 60_000;
      await widget.refresh();
    }

    // The default warm-up is 5 samples, so early renders say "Checking…" and later ones say "Stable".
    expect(seen[0]).toBe("Checking…");
    expect(seen.at(-1)).toBe("Stable");
  });

  it("persists the ping baseline so it survives a restart", async () => {
    const channel: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "m1" }),
      edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true }),
    };
    const store = memoryStore();
    const widget = new ServerStatusWidget({ channel, store, snapshot: () => liveSnapshot({ pingMedianMs: 90 }), logger: silentLogger });

    await widget.load();
    await widget.refresh();

    const saved = store.saved.at(-1);
    expect(saved?.baselineEmaMs).toBe(90); // first fold seeds the baseline
    expect(saved?.baselineSamples).toBe(1);
    expect(saved?.baselineUpdatedAt).toBe(NOW);
  });

  // --- transient up/down notice ---

  it("announce posts a transient notice and deletes its OWN message after the linger", async () => {
    const create = vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "notice1" });
    const channel: StatusChannel = { create, edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true }) };
    const del = vi.fn<(id: string) => Promise<DmResult>>().mockResolvedValue({ ok: true });
    const sleeps: number[] = [];
    const widget = new ServerStatusWidget({
      channel,
      store: memoryStore(),
      snapshot: () => liveSnapshot(),
      deleteMessage: del,
      noticeLingerMs: 5_000,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      logger: silentLogger,
    });

    await widget.announce("🔴 N'Zoth looks down.");

    expect(create).toHaveBeenCalledWith({ content: "🔴 N'Zoth looks down." });
    expect(sleeps).toEqual([5_000]);
    expect(del).toHaveBeenCalledWith("notice1"); // the notice it posted, never the pinned message
  });

  it("announce does not delete when the notice post fails", async () => {
    const channel: StatusChannel = {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: false, kind: "unreachable", status: 403 }),
      edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true }),
    };
    const del = vi.fn<(id: string) => Promise<DmResult>>().mockResolvedValue({ ok: true });
    const widget = new ServerStatusWidget({
      channel,
      store: memoryStore(),
      snapshot: () => liveSnapshot(),
      deleteMessage: del,
      logger: spyLogger(),
    });

    await widget.announce("x");
    expect(del).not.toHaveBeenCalled();
  });

  it("announce skips the linger when noticeLingerMs is 0 but still deletes", async () => {
    const create = vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "n" });
    const channel: StatusChannel = { create, edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true }) };
    const del = vi.fn<(id: string) => Promise<DmResult>>().mockResolvedValue({ ok: true });
    let slept = false;
    const widget = new ServerStatusWidget({
      channel,
      store: memoryStore(),
      snapshot: () => liveSnapshot(),
      deleteMessage: del,
      noticeLingerMs: 0,
      sleep: async () => {
        slept = true;
      },
      logger: silentLogger,
    });

    await widget.announce("x");
    expect(slept).toBe(false);
    expect(del).toHaveBeenCalledWith("n");
  });

  // --- channel-name rename indicator ---

  function okChannel(): StatusChannel {
    return {
      create: vi.fn<StatusChannel["create"]>().mockResolvedValue({ ok: true, messageId: "m1" }),
      edit: vi.fn<StatusChannel["edit"]>().mockResolvedValue({ ok: true }),
    };
  }

  it("renames the channel to the current state, once, and persists it", async () => {
    const rename = vi.fn<(name: string) => Promise<DmResult>>().mockResolvedValue({ ok: true });
    const store = memoryStore();
    const widget = new ServerStatusWidget({
      channel: okChannel(),
      store,
      snapshot: () => liveSnapshot({ up: true }),
      renameChannel: rename,
      channelBaseName: "server-status",
      logger: silentLogger,
    });

    await widget.load();
    await widget.refresh();
    await widget.refresh(); // same state — must NOT rename again

    expect(rename).toHaveBeenCalledOnce();
    expect(rename).toHaveBeenCalledWith("🟢server-status");
    expect(store.saved.at(-1)?.channelName).toBe("🟢server-status");
  });

  it("renames again when up/down flips", async () => {
    const rename = vi.fn<(name: string) => Promise<DmResult>>().mockResolvedValue({ ok: true });
    let up = true;
    const widget = new ServerStatusWidget({
      channel: okChannel(),
      store: memoryStore(),
      snapshot: () => liveSnapshot({ up }),
      renameChannel: rename,
      channelBaseName: "server-status",
      logger: silentLogger,
    });

    await widget.load();
    await widget.refresh(); // 🟢
    up = false;
    await widget.refresh(); // 🔴

    expect(rename).toHaveBeenCalledTimes(2);
    expect(rename).toHaveBeenLastCalledWith("🔴server-status");
  });

  it("does not persist the name on a failed rename, so it retries next time", async () => {
    const rename = vi
      .fn<(name: string) => Promise<DmResult>>()
      .mockResolvedValueOnce({ ok: false, kind: "error", status: 429 }) // rate-limited
      .mockResolvedValueOnce({ ok: true });
    const store = memoryStore();
    const widget = new ServerStatusWidget({
      channel: okChannel(),
      store,
      snapshot: () => liveSnapshot({ up: true }),
      renameChannel: rename,
      channelBaseName: "server-status",
      logger: spyLogger(),
    });

    await widget.load();
    await widget.refresh(); // rename 429s — name not applied
    expect(store.saved.at(-1)?.channelName ?? null).toBeNull();
    await widget.refresh(); // retries, succeeds
    expect(rename).toHaveBeenCalledTimes(2);
    expect(store.saved.at(-1)?.channelName).toBe("🟢server-status");
  });

  it("skips the rename when the persisted name already matches (no rename on redeploy)", async () => {
    const rename = vi.fn<(name: string) => Promise<DmResult>>().mockResolvedValue({ ok: true });
    const widget = new ServerStatusWidget({
      channel: okChannel(),
      store: memoryStore(state({ messageId: "m1", channelName: "🟢server-status" })),
      snapshot: () => liveSnapshot({ up: true }),
      renameChannel: rename,
      channelBaseName: "server-status",
      logger: silentLogger,
    });

    await widget.load();
    await widget.refresh();

    expect(rename).not.toHaveBeenCalled();
  });

  it("never renames when no renamer is configured (embed-only)", async () => {
    const store = memoryStore();
    const widget = new ServerStatusWidget({
      channel: okChannel(),
      store,
      snapshot: () => liveSnapshot({ up: false }),
      logger: silentLogger,
    });

    await widget.load();
    await widget.refresh();

    expect(store.saved.at(-1)?.channelName ?? null).toBeNull(); // nothing renamed
  });
});
