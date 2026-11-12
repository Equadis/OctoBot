import type { MonsterChat } from "../protocol/chat.js";
import { ChatType } from "../protocol/opcodes.js";

/**
 * What an NPC said near a listener, as a log line — for a listener parked to find out what the NPCs
 * around it say, e.g. by Thrall and Eitrigg in Grommash Hold, where a quest step might have an NPC
 * speak or emote. Every listener logs the yells it hears already (that is how the buff yell is
 * caught); this adds the rest — says, emotes, whispers, boss emotes — only where it is switched on,
 * since a city NPC's chatter would flood the logs of every listener.
 */

const KIND: ReadonlyMap<number, string> = new Map([
  [ChatType.MonsterSay, "say"],
  [ChatType.MonsterYell, "yell"],
  [ChatType.MonsterEmote, "emote"],
  [ChatType.MonsterWhisper, "whisper"],
  [ChatType.RaidBossEmote, "boss emote"],
]);

/** The line to log for an NPC's chat, or null when this listener does not log it. */
export function npcChatLogLine(chat: MonsterChat, logEveryLine: boolean): string | null {
  if (!logEveryLine || chat.type === ChatType.MonsterYell) return null;
  const kind = KIND.get(chat.type) ?? `chat type 0x${chat.type.toString(16)}`;
  return `heard ${kind} from ${chat.senderName}: ${JSON.stringify(chat.text)}`;
}
