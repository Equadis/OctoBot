import { describe, expect, it } from "vitest";
import type { MonsterChat } from "../protocol/chat.js";
import { ChatType } from "../protocol/opcodes.js";
import { npcChatLogLine } from "./npc-chat-log.js";

const chat = (type: number, senderName: string, text: string): MonsterChat => ({ type, senderGuid: 1n, senderName, text });

describe("npcChatLogLine", () => {
  it("logs nothing on a listener that is not set to log every NPC line", () => {
    expect(npcChatLogLine(chat(ChatType.MonsterSay, "Eitrigg", "Greetings."), false)).toBeNull();
  });

  it("names each kind of NPC line, with the speaker and the text", () => {
    expect(npcChatLogLine(chat(ChatType.MonsterSay, "Eitrigg", "Greetings."), true)).toBe(
      'heard say from Eitrigg: "Greetings."',
    );
    expect(npcChatLogLine(chat(ChatType.MonsterEmote, "Thrall", "Thrall grunts."), true)).toBe(
      'heard emote from Thrall: "Thrall grunts."',
    );
    expect(npcChatLogLine(chat(ChatType.MonsterWhisper, "Thrall", "Lok'tar."), true)).toBe(
      'heard whisper from Thrall: "Lok\'tar."',
    );
    expect(npcChatLogLine(chat(ChatType.RaidBossEmote, "Gyth", "Gyth roars!"), true)).toBe(
      'heard boss emote from Gyth: "Gyth roars!"',
    );
  });

  it("leaves yells to the log every listener already writes", () => {
    expect(npcChatLogLine(chat(ChatType.MonsterYell, "Thrall", "Honor your heroes!"), true)).toBeNull();
  });

  it("still logs a chat type it has no name for, by its number", () => {
    expect(npcChatLogLine(chat(0x59, "Rend Blackhand", "..."), true)).toBe('heard chat type 0x59 from Rend Blackhand: "..."');
  });
});
