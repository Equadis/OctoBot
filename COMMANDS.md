# OctoBot command guide

All commands are slash commands and work in any channel OctoBot can see. Replies marked **(private)** are visible only to you.

Tiers come from the bot's role profiles (`/settings view role`). On the OctoWoW server the defaults are:

| Tier | Roles | Bot permissions |
| --- | --- | --- |
| Helper+ | Helper, Moderator, Admin | Timeout users (Helper max `1h`), Remove timeouts |
| Mod+ | Moderator, Admin | Everything above plus Warn, View warnings, Check history, Ban, Whisper, Manage settings (max timeout `4w`) |
| Admin only | Server owner, anyone with Discord **Administrator** | Everything, plus `/settings` and `/config` |

Anyone with Discord Administrator or the server owner always has every bot permission, regardless of profile.

---

## Admin previews: `/testalert [alert] [show_name]`

Requires Discord **Administrator**. All tests post exclusively to
`1547053624268689520` (or `DISCORD_TEST_ALERT_CHANNEL_ID` if overridden),
regardless of where the slash command is invoked. Every test is explicitly
labelled and uses `discord.AllowedMentions.none()`: **no roles, users,
@everyone or @here receive notifications**.

- `/testalert` or `/testalert alert:radio`: Pirate Radio message with the
  configured role mention rendered but not pinged. Optional `show_name` defaults
  to `Tekeela N Trouble`, to check the DJ Twitch link.
- `/testalert alert:exalted`: Top Daily Chatter/Exalted announcement using
  messages recorded in the preceding 24 hours, as of the time of the test.
  Displays the top three (when available) without granting or removing roles,
  modifying the daily handover or changing its announcement.

All radio and test messages use Discord's embed-suppression flag, so Website/Twitch/Discord links remain clickable without generating rich preview cards. Live radio posts show the role mention as a heading immediately above the show heading, with no empty line between them.

The test command replies privately with a link to its posted test message.
Normal automatic alerts continue to use their existing channels and pings.

## Admin test: `/serverinfo [server]`

Requires Discord **Administrator** to post; the reply is public. Choose N’Zoth
(default), Y’Shaarj or C’Thun. The panel contains real recorded observations.

- Fixed **1D** image plus an **Open interactive graph ↗** link.
- Stats: **Online now**, **24h peak**, **All-time recorded peak**, and uptime (`--:--:--:--` until a source supplies it).
- Web dropdown selects a server independently for each visitor; current option is disabled.
- Six web ranges, custom dates and hover details. **Yellow = NO DATA**, including dates before the import and collection gaps. Averages exclude missing time.
- N’Zoth has imported history and a live counter. PvP/Hardcore remain NO DATA until their verified feeds are configured.
- Launch is undated; P1/P2 show the supplied release dates and P3 Emerald Sanctum is scheduled for **28 January 2027 17:00 UTC**.
- Restart after updating to start the bot’s minute-by-minute SQLite collector. The website has an independent GitHub Actions five-minute collector, subject to scheduler delays.

## Everyone

Public tracker commands. Admins can restrict any of them to specific roles with `/config command-role`.

| Command | What it does |
| --- | --- |
| `/status` | Current realm, login and authentication status plus active community reports. |
| `/uptime` | Official uptime statistics. |
| `/incidents` | Recent outages and degraded incidents. |
| `/announcement` | The latest official OctoWoW announcement. |
| `/patchnote` | The latest official OctoWoW patch notes. New patch notes are also posted automatically. |
| `/report realm issue [details]` | Report a connection problem right now. Groups with other reports; enough reports in 10 minutes flag the realm as degraded. |
| `/reports` | Current community reports, grouped by realm and issue. |
| `/radio` | Booty Bay Pirate Radio: live/AutoDJ state, listeners, now playing, next shows. |
| `/nextshows` | Every scheduled show for the next 14 days with date, countdown, end time and the DJ's Twitch link. |
| `/authcheck` | Immediate diagnostic of the OctoWoW authentication endpoint. Only works in the designated channel. |
| `/help` | Lists only the commands you can use. |

Automatic: the radio role is pinged at each scheduled show's start, and a member who gains the newer membership role loses the legacy one. The `/nextshows` list is available on demand, not posted at show end.

---

## Helper+ commands

### `/timeout user duration reason`
Times the user out. Duration uses `s` `m` `h` `d` `w` and can be combined: `30m`, `1h30m`, `2d`. Reason is required and goes to the Discord audit log, the mod log and the user's DM.

- Helpers can issue up to **1 hour**; Moderators/Admins up to **4 weeks**.
- Refuses: yourself, the owner, bots, administrators, anyone with a role equal to or above yours.
- If the user is already timed out, you get a confirmation showing the existing case, who set it, its reason and the time remaining. Confirming replaces it with your new timeout; the old case is voided like `/untimeout`.
- If message cleanup is on (`/settings timeout-cleanup`), the user's messages from the last N minutes are deleted and the count is shown.
- Recorded as case `T-####` in `/check`. The DM does not say who issued it. **(private reply)**

### `/untimeout user [reason]`
Lifts an active timeout early. The case is removed from `/check` counts but kept for audit. **(private reply)**

---

## Mod+ commands

### Acting on users

| Command | What it does |
| --- | --- |
| `/warn user reason` | Records a warning (`W-####`) and DMs the user the reason. The DM does not name you. |
| `/note user note` | Silent staff note (`N-####`) in the user's `/check` history. The user is **not** told. Works on users who have left. |
| `/whisper user message` | DMs the user a message "from the server" (up to 2000 chars). The DM does not name you; the mod log does. |
| `/ban user reason` | Bans the user (also works on someone who already left). DM first, then ban. Recorded as `B-####`. The case **stays** in `/check` after an unban and gains an "Unbanned" date automatically, so staff can see it if the user is ever let back in. Bots and higher roles are refused. |

All replies are private. Everything is posted to the mod-log channel with your name.

### Looking things up

| Command | What it does |
| --- | --- |
| `/check user [remove]` | Full moderation history: counts of warnings, timeouts, bans and notes, current timeout state, and every case with date, moderator and reason. Paged with ◀ ▶. Accepts users no longer in the server (e.g. banned). Add `remove:W-0003` (any case ID shown in the list) to drop that case from history; the row is kept for audit. |
| `/warnings user [channel]` | Just the warnings. Add `channel` to post them publicly there instead of privately. |
| `/history user [amount]` | The user's last 1–50 server messages (default 10), oldest to newest, with channel and jump link. Deleted messages stay listed and are marked. Paged with ◀ ▶. Uses the same access as `/check`. |

### Clearing messages

**`/clear amount`** — deletes recent messages in the channel you run it in.

| Form | What it does |
| --- | --- |
| `/clear 10` | The 10 most recent messages (1-200). |
| `/clear 5m` | Everything posted in the last 5 minutes (`30s`, `5m`, `1h`; max 1 hour). |

Stops at 500 messages for a time clear; run it again for more. Discord cannot bulk-delete messages older than 14 days. The count and channel go to the mod log. **(private reply)**

### Clearing history

**`/clearcheck user`** — wipes the user's entire `/check` profile after a confirmation button. Rows are kept for audit; an active Discord timeout is not lifted.

### Banned-word filter

Any message containing a banned word is deleted and the author timed out for 30 seconds (no message cleanup). Logged with the message text; recorded as a timeout case. Staff are exempt. Edited messages are re-checked.

| Command | What it does |
| --- | --- |
| `/word list` | The banned words, alphabetical. |
| `/word add word` | Adds a word or phrase. Matching is whole-word and case-insensitive; phrases match with spaces, hyphens or joined (`sand nigger` also catches `sand-nigger` and `sandnigger`). |
| `/word remove word` | Removes one. Autocompletes from the list. |

All replies are private. Adds and removes go to the mod log.

### Auto-replies (`/autoreply …`)

When anyone's message contains a keyword, the bot replies to it with a fixed message. Example: `/autoreply add down Server is currently down for scheduled maintenance, read more here: <link>`.

| Command | What it does |
| --- | --- |
| `/autoreply add keyword message` | Start replying to `keyword` with `message`. |
| `/autoreply edit keyword message` | Change the reply for an existing keyword. |
| `/autoreply remove keyword` | Stop replying to it. |
| `/autoreply list` | All keywords and their replies. |
| `/autoreply cooldown duration` | How long before the same keyword is answered again in a channel. `30s`, `2m`, `1m30s`; max `60m`; default `1m`. |

Whole-word and case-insensitive, phrases allowed. One reply per keyword per channel per cooldown so a busy conversation gets a single answer. Replies never ping anyone. Changes go to the mod log.

### Roles

The bot keeps one rule: a member has the base role exactly when they hold none of the levelled roles. Gaining a levelled role removes the base role, and losing the last one gives it back — both automatic, on every role change.

**`/rolefix`** — applies the same rule to every member in one pass, for anyone changed while the bot was offline. Reports how many were checked, removed and granted. **(private reply)**

### Invite filter

A message linking to **another** Discord server is deleted and the author timed out for **2 minutes**, recorded as a timeout case in `/check` and logged with the message text.

Allowed through: invites to this server, and anything posted in the server-advertising forum (including every post inside it). Staff are exempt. Edited messages are re-checked. There is no command — it is configured in `.env` (`DISCORD_INVITE_ALLOWED_CHANNEL_IDS`, `INVITE_FILTER_TIMEOUT`).

### Raid protection (`/lockdown …`)

Starting a lockdown bans everyone who joined in the **previous 10 minutes** (staff and bots excluded). While it is on, every new joiner is DMed "We are currently in Lockdown. Please try again soon" and banned for **7 days**. The bot unbans them automatically when the 7 days are up.

| Command | What it does |
| --- | --- |
| `/lockdown toggle on\|off` | `on` starts a lockdown for the configured timer and bans the last 10 minutes of joiners (running it again while on just extends it); `off` ends it now. |
| `/lockdown cancel` | Stops the running lockdown before its timer runs out. |
| `/lockdown timer duration` | How long a lockdown lasts before switching itself off. Accepts `s`, `m`, `h`, `d` and combinations (`90s`, `30m`, `2h`, `1d`, `1h30m`), up to 7 days. Default 30m. |
| `/lockdown status` | On/off, when it ends, how many joiners were banned this lockdown, how many are still banned, and the all-time total. |

All replies are private. Start, end and every ban go to the mod log.

### Community reports (Discord Manage Messages or Moderate Members)

| Command | What it does |
| --- | --- |
| `/reports-details` | Each active report with who filed it and their details. |
| `/reports-clear` | Clears all active reports. |

---

## Admin only commands

These require Discord **Administrator** (or server owner); bot role profiles do not grant them.

### Bot settings (`/settings …`)

| Command | What it does |
| --- | --- |
| `/settings bootstrap helper moderator log_channel [admin]` | One-shot setup of the Helper / Moderator / Admin profiles and the mod-log channel. |
| `/settings permission role permission allow\|deny` | Grant or deny one capability for a role: Timeout, Warn, View warnings, Check, Remove timeouts, Ban, Whisper, Manage settings. |
| `/settings timeout-limit role duration` | Max timeout a role may issue, e.g. `1h`, `2d`, `1w`. |
| `/settings log-channel channel` | Where moderation actions are logged. |
| `/settings timeout-cleanup minutes` | Delete the timed-out user's messages from the previous N minutes (0–1440; `0` = off). Set to `5` for the usual behaviour. |
| `/settings dm-warnings true\|false` | DM users when warned. |
| `/settings dm-timeouts true\|false` | DM users when timed out. |
| `/settings dm-bans true\|false` | DM users when banned. |
| `/settings view role` | Show a role's bot permissions and timeout limit. |

### Tracker access

| Command | What it does |
| --- | --- |
| `/config command-role add command role` | Restrict a public tracker command (`status`, `uptime`, `incidents`, `announcement`, `report`, `reports`, `radio`) to a role. A command with no roles configured is open to everyone. `/nextshows` follows the `radio` rule. |
| `/config command-role remove command role_id` | Remove one of those role restrictions. |
| `/config command-role list` | Show all restrictions. |

---

## Making a moderation command Admin-only

Moderator and Admin profiles are identical by default. To reserve something for Admins, deny it on the Moderator role:

```text
/settings permission role:@Moderator permission:Ban users access:deny
```

Discord Administrators always keep every capability.

## Quick reference: case IDs

| Prefix | Meaning |
| --- | --- |
| `W-####` | Warning |
| `T-####` | Timeout (manual or word-filter) |
| `B-####` | Ban |
| `N-####` | Staff note |

Removing a case from `/check` (`remove:`, `/clearcheck`, `/untimeout`) never deletes the database row — it only hides it from counts and listings.
