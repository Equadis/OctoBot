import { describe, expect, it, vi } from "vitest";
import type { Logger } from "../logger.js";
import type { ChannelMessage, CreateResult, DmResult } from "../notify/discord-dm.js";
import type { ShamedPlayer } from "./shame-list-store.js";
import { renderWall, WALL_INTRO, WallOfShame, wallLine, type WallChannel } from "./wall-of-shame.js";
import { InMemoryWallOfShameStore, type WallOfShameState } from "./wall-of-shame-store.js";

const OK: DmResult = { ok: true };
const GONE: DmResult = { ok: false, kind: "unreachable", status: 404 };
const FORBIDDEN: DmResult = { ok: false, kind: "unreachable", status: 403 };

const GANKER: ShamedPlayer = { name: "Ganker", guid: null, details: { raceId: 2, classId: 9 } };
const WARLOCKZ: ShamedPlayer = { name: "Warlockz", guid: null, details: null };

/** The message the wall posts for these players. */
function wall(...players: ShamedPlayer[]): ChannelMessage {
  return { content: [WALL_INTRO, ...players.map(wallLine)].join("\n") };
}

function setup(initial: WallOfShameState | null = null) {
  let posted = 0;
  const channel = {
    create: vi.fn(async (_message: ChannelMessage): Promise<CreateResult> => {
      posted += 1;
      return { ok: true, messageId: `msg-${posted}` };
    }),
    edit: vi.fn(async (_messageId: string, _message: ChannelMessage): Promise<DmResult> => OK),
    pin: vi.fn(async (_messageId: string): Promise<DmResult> => OK),
  } satisfies WallChannel;
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Logger;
  const store = new InMemoryWallOfShameStore(initial);
  const board = new WallOfShame({ channel, store, logger });
  return { board, channel, store, logger };
}

describe("wallLine", () => {
  it("names the player with their faction, race and class", () => {
    expect(wallLine(GANKER)).toBe("- Ganker — Horde Orc Warlock");
  });

  it("names only the player until a /who has seen them", () => {
    expect(wallLine(WARLOCKZ)).toBe("- Warlockz");
  });
});

describe("renderWall", () => {
  it("says why before the list, then puts each player on a line of their own", () => {
    const { content, shown } = renderWall([GANKER, WARLOCKZ]);
    expect(content).toBe(`${WALL_INTRO}\n- Ganker — Horde Orc Warlock\n- Warlockz`);
    expect(content.startsWith("**🪦 Wall of Shame**\n")).toBe(true);
    expect(content).toMatch(/killed one of our buff listeners/);
    expect(shown).toBe(2);
  });

  it("shows the earliest players that fit, and how many that is", () => {
    const first = `${WALL_INTRO}\n- Ganker — Horde Orc Warlock`;
    expect(renderWall([GANKER, WARLOCKZ], first.length)).toEqual({ content: first, shown: 1 });
  });
});

describe("WallOfShame", () => {
  it("posts and pins the wall with its first player, and remembers the message", async () => {
    const { board, channel, store } = setup();
    await board.load();
    await board.show([GANKER]);

    expect(channel.create).toHaveBeenCalledWith(wall(GANKER));
    expect(channel.pin).toHaveBeenCalledWith("msg-1");
    expect(await store.load()).toEqual({ messageId: "msg-1" });
  });

  it("edits the same message as players are added or described", async () => {
    const { board, channel } = setup({ messageId: "msg-9" });
    await board.load();
    await board.show([GANKER, WARLOCKZ]);

    expect(channel.edit).toHaveBeenCalledWith("msg-9", wall(GANKER, WARLOCKZ));
    expect(channel.create).not.toHaveBeenCalled();
    expect(channel.pin).not.toHaveBeenCalled();
  });

  it("posts one wall when two paints come at once", async () => {
    const { board, channel } = setup();
    await board.load();
    await Promise.all([board.show([GANKER]), board.show([GANKER, WARLOCKZ])]);
    expect(channel.create).toHaveBeenCalledTimes(1);
    expect(channel.edit).toHaveBeenCalledWith("msg-1", wall(GANKER, WARLOCKZ));
  });

  it("posts and pins the wall again when someone deleted it", async () => {
    const { board, channel, store, logger } = setup({ messageId: "msg-9" });
    channel.edit.mockResolvedValueOnce(GONE);
    await board.load();
    await board.show([GANKER, WARLOCKZ]);

    expect(channel.create).toHaveBeenCalledWith(wall(GANKER, WARLOCKZ));
    expect(channel.pin).toHaveBeenCalledWith("msg-1");
    expect(logger.warn).toHaveBeenCalledWith("wall of shame message is gone; posting it again");
    expect(await store.load()).toEqual({ messageId: "msg-1" });
  });

  it("keeps the message when an edit fails for another reason", async () => {
    const { board, channel, store, logger } = setup({ messageId: "msg-9" });
    channel.edit.mockResolvedValueOnce({ ok: false, kind: "error", status: 500 });
    await board.load();
    await board.show([GANKER]);

    expect(channel.create).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("wall of shame edit failed (error 500)");
    expect(await store.load()).toEqual({ messageId: "msg-9" });
  });

  it("says what is missing when it cannot pin, and pins on the next change", async () => {
    const { board, channel, logger } = setup();
    channel.pin.mockResolvedValueOnce(FORBIDDEN);
    await board.load();
    await board.show([GANKER]);
    expect(logger.error).toHaveBeenCalledWith(
      "wall of shame pin failed (unreachable 403) — the bot needs the Pin Messages permission in its channel",
    );

    await board.show([GANKER, WARLOCKZ]);
    expect(channel.pin).toHaveBeenCalledTimes(2);
    expect(channel.pin).toHaveBeenLastCalledWith("msg-1");
  });

  it("posts it on the next paint when Discord could not be reached", async () => {
    const { board, channel, store } = setup();
    channel.create.mockResolvedValueOnce({ ok: false, kind: "error", status: 502 });
    await board.load();
    await board.show([GANKER]);
    expect(await store.load()).toBeNull();

    await board.show([GANKER]);
    expect(channel.create).toHaveBeenCalledTimes(2);
    expect(await store.load()).toEqual({ messageId: "msg-1" });
  });

  it("posts nothing while nobody has earned a place", async () => {
    const { board, channel } = setup();
    await board.load();
    await board.show([]);
    expect(channel.create).not.toHaveBeenCalled();
    expect(channel.edit).not.toHaveBeenCalled();
  });
});
