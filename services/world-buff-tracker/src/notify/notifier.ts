/**
 * The shape of a notification the bot produces (buff alerts, raid recaps, ops info).
 *
 * These are posted to the Onyxia Discord channel (with @alliance/@horde role pings)
 * and, for the actionable ones, whispered to in-game subscribers. Formatting lives in
 * `format.ts`; delivery lives in `index.ts` and `discord-dm.ts`.
 */

export type NotifyKind = "entered" | "left" | "changed" | "info" | "error";

export interface NotifyMessage {
  readonly kind: NotifyKind;
  readonly title: string;
  readonly body: string;
}
