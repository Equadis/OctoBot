# OctoBot v1.0.43

OctoBot combines the existing **OctoTracker** and **OctoCop** projects into one Discord bot process and one Discord application/token.

## Public dashboards

The [Population dashboard](https://equadis.github.io/OctoBot/#server=all) and [Server Status dashboard](https://equadis.github.io/OctoBot/status.html) share the same dark visual style and top navigation.

The status dashboard uses independent checks of the three official realm statuses, login TCP reachability, and a credential-free authentication challenge. Its independent-probe chart, response-time graph and recent interruption history combine the one-minute Cloudflare Worker (after its D1 migration and redeployment) with GitHub-recorded observations from an independent status workflow (`.github/workflows/status.yml`). GitHub Actions is a fallback, not a guaranteed five-minute schedule.

- One-minute Worker readings only start **after** running the migration and deploying the Worker; simply merging code does not activate them. The `/api/status/health` endpoint reports whether the latest D1 status observation is fresh.
- Confirmed monitoring failures are retried; disagreement is unknown, not automatically downtime. The original Discord-bot confirmed incidents remain in the historical archive and are never deleted.
- Unreadable pages, missed runs, stale probes and large monitoring gaps remain **NO DATA**. Never convert them to an outage or healthy uptime.
- Availability percentages include **only observed intervals**; changes between observations remain unknown. Coverage is displayed next to every uptime percentage. Short outages between samples may not be seen.
- The GitHub monitor starts with an **empty archive**. It cannot retroactively recover the bot's Discord incidents, current service uptime or community-reported issues without an export from the original bot database. The optional historical archive below provides a privacy-safe import.
- This collector and the Discord bot use different monitoring locations/cadences; latency and observed incidents may differ. No credentials are sent.

### More reliable one-minute status monitoring

Use the already configured [Cloudflare Population Worker](cloudflare/population/README.md).
From the `cloudflare/population` directory in Codespaces, after `git pull`, apply
the **new** status-table migration and redeploy the existing Worker:

```sh
npx wrangler d1 migrations apply octobot-population --remote
npx wrangler deploy
```

Check `https://octobot-population.eqvoice.workers.dev/api/status/health` and
`/api/status/latest`. This is a separate one-minute collector for the same
official realm and credential-free authentication checks. Its samples go to D1,
and the dashboard polls it every minute; it falls back to the GitHub status JSON
if D1 is not yet deployed or the Worker cannot respond. The Worker does not
alter the separate population tracking.

**Limitations:** No external scheduled monitor can promise zero missed readings
or guarantee zero server downtime. Cloudflare's TCP egress may be unable to
reach the game login endpoint; in that case its auth result is `unknown`, not
a claimed outage. GitHub status checks remain as a distinct fallback. Old
missed checks cannot be recreated; new genuine failures and unobserved
periods must not be represented as healthy.

### Import historical status records from the existing bot

**The older data is not gone:** The running bot stores confirmed realm and service history, TCP state periods, authentication transitions and official/auth/community incidents in its private SQLite database (usually `data/octobot.db`). The public GitHub Pages repository does **not** contain that database.

On the machine that actually hosts OctoBot, with an up-to-date copy of this repository and access to the **existing** database, run:

```sh
python -m tools.export_status_history --db data/octobot.db --out docs/status/bot-history.json
```

Or substitute the configured `DATABASE_PATH` for `data/octobot.db`. The exporter opens SQLite in **read-only mode**, cannot create or modify the bot database, and exports only public service periods, timestamps and aggregated incident counts. It omits Discord IDs, reports, messages, user details and tokens.

Check the resulting `docs/status/bot-history.json` and publish **only that JSON**, not `data/octobot.db` or its `-wal`/`-shm` files:

```sh
git add docs/status/bot-history.json
git commit -m "Backfill archived OctoBot service status"
git push origin main
```

The Server Status page then automatically displays the imported uptime figures in its **main overview**, and the **OctoBot historical monitoring** section with the previous confirmed-state uptime percentages, realm/TCP/authentication timelines, historical availability calendar and recorded incidents. Independent web-probe history remains a separately labelled section. Until that JSON is populated, the panel clearly says the archive hasn't been imported; the independent website checks continue collecting normally.

**Important:** A historical confirmed-state interval is not proof of an uninterrupted stream of individual probes. The original bot's /uptime methodology counts time between confirmed transitions; the new website probes calculate availability only over independently observed intervals. These are shown separately. An export is a snapshot: if you want the old-bot history updated over time, repeat the export from the host and republish the JSON; it does not automatically upload your private DB or require a GitHub token on the bot host.

### All Realms population reclassification

The official site-wide `Players online now` census is now displayed under
**All Realms**, not N'Zoth. The original `docs/online-history.json` file is
retained unchanged as the All Realms archive; fresh `docs/live.json` and
GitHub collector samples are keyed as `all`. Individual realm populations
require genuinely realm-specific feeds. This does not alter the separate
official realm **online/offline status** monitoring.

To reclassify the existing one-minute Cloudflare D1 census history and switch
future Worker samples to `all`, deploy the new migration and Worker code:

```sh
cd /workspaces/OctoBot
git pull origin main
cd cloudflare/population
npx wrangler d1 migrations apply octobot-population --remote
npx wrangler deploy
```

Until that redeploy, the webpage reads legacy census records under **All Realms**
only; N'Zoth remains NO DATA. Restarting the Discord bot runs a one-time
migration of its local SQLite population records. All original readings and
timestamps are preserved.

## Dashboard chart design and navigation

The [Population dashboard's **Players online** graph](https://equadis.github.io/OctoBot/#server=all)
is the canonical interaction and visual design for all OctoBot time-series charts.

- Cursor-anchored mouse-wheel zoom with a ten-minute minimum and dataset-aware boundaries.
- Click-and-drag panning; Shift + scroll down moves left (earlier), while Shift + scroll up moves right (later), without changing zoom (including browsers that remap the wheel to `deltaX`).
- Hoverable, timestamped **recorded** readings and clear `NO DATA` regions rather than assumed uptime or fabricated latency.
- Matching dark backgrounds, gridlines, time axes, legends, crosshairs, tooltips and active-range controls.
- Time-range presets and UTC custom date selectors; the status and latency charts deliberately share one range and synchronise when either graph is moved.
- The original Discord bot's confirmed-status archive remains a distinct source from the independent five-minute web probes; its timeline has its own presets, date selectors and direct zoom/pan.

The common `docs/chart-interactions.js` module implements these interactions using the same
`docs/chart-data.js` pan/zoom functions as the Population graph. **New graphs must reuse these conventions**, not introduce separate navigation behaviour. Calendar days retain their appropriate discrete date-selection interaction.

## Included systems

### OctoTracker
- `/serverinfo [server]`: admin-only command posting a **public, fixed 1D chart** with recorded population. Discord shows **Online now, 24h peak, All-time peak, Server uptime** and one **Open interactive graph ↗** link. There are no Discord range/date controls.
  - The website has a **Server** dropdown next to Players online: **All Realms, N’Zoth (Normal), Y’Shaarj (PvP), C’Thun (Hardcore)**. The selected option is disabled in the dropdown. Each realm has independent history and browser-local range/date selection.
  - **All Realms** displays the preserved website-wide census readings originally imported on **30 October 2026 14:59:20.708 UTC** (historical peak **3,470**). The original data was formerly mislabelled N’Zoth; it is now assigned to All Realms without changing any timestamps or values. The website’s headline is not a verified N’Zoth-only count.
  - **Cloudflare D1 is the primary source of one-minute player-count readings.** The dashboard now fetches all retained actual Worker readings (90 days) using its own cursor, independently of the newest GitHub snapshot. This prevents recorded minute observations from being skipped and incorrectly shown as estimated gaps. Subsequent page loads request only newer Worker samples, and the UI shows whether its live source is fresh or stale.
  - **Yellow = NO DATA**, including pre-history and collection gaps over 10 minutes. Failed fetches never become zero or a confirmed outage. Averages cover observed intervals only. Zero is a valid reading; it does not independently prove a server outage.
  - All-time peak means **highest recorded observation**, with the recording start shown. Server uptime is `--:--:--:--` because the census/history does not provide it. Stale current counts become NO DATA after 10 minutes.
  - Phase markers: Launch (Onyxia/MC, undated), P1 Zul’Gurub **1 Oct 2026 08:00 UTC**, P2 Blackwing Lair **1 Nov 2026 17:00 UTC**, P3 Emerald Sanctum **28 Jan 2027 17:00 UTC**, labelled **Scheduled** until release. Launch is shown as undated instead of inventing a timestamp.
  - The bot collects every minute into persistent SQLite after restart. A GitHub Actions collector samples every five minutes and publishes the web history independently of the bot host; scheduled runs can be delayed. No new Python package is required.
  - **N’Zoth, Y’Shaarj and C’Thun currently have no verified individual population source.** They show NO DATA until separate sources are configured. Never copy or add the All Realms headline to any individual realm.
- Realm/authentication monitoring
- Status dashboard and alerts
- `/status`, `/uptime`, `/incidents`
- The status channel holds one message of each kind, edited in place rather than reposted: the server status embed, the latest incident/report alert, and the latest authentication diagnostic. If a stored message id is lost, the bot adopts its own earlier message of that kind and deletes any duplicates.
- `STATUS_POLL_SECONDS` sets how often the status message is refreshed.
- Official announcement monitoring and `/announcement`
- Patch note monitoring and `/patchnote` — reads the Patch Notes and Changelog forum and posts each new topic to `DISCORD_PATCH_NOTE_CHANNEL_ID` (defaults to the announcement channel)
- Automatic forum posts ping a role: `DISCORD_ANNOUNCEMENT_PING_ROLE_ID` for announcements and `DISCORD_PATCH_NOTE_PING_ROLE_ID` for patch notes. A post split across several embeds pings only on its opening page, and the `/announcement` and `/patchnote` commands never ping.
- Community `/report`, `/reports`, moderator report tools
- Booty Bay Pirate Radio monitoring and `/radio`
- `/nextshows` lists every upcoming scheduled show in the next `RADIO_SCHEDULE_DAYS` (default 14) with absolute (`<t:…:f>`) and relative (`<t:…:R>`) Discord timestamps plus the DJ's Twitch link; same access rule as `/radio`.
  - Each scheduled show is pinged to `DISCORD_RADIO_PING_ROLE_ID` in `DISCORD_RADIO_CHANNEL_ID` at its scheduled start time, naming the DJ from the station schedule. `DISCORD_RADIO_EXTRA_CHANNEL_IDS` receives the same announcement without the role ping. One ping per show; a start missed while the bot was down is still announced if the show is under 10 minutes in.
  - Ended shows do not post an automatic schedule. Use `/nextshows` to request it.
  - Admin-only `/testalert [alert] [show_name]` sends no-ping previews of Pirate Radio (`radio`, the default) or Exalted (`exalted`) to the dedicated test channel `1547053624268689520`. Role/user mentions are shown but notifications are suppressed. Neither test changes real scheduling, award or alert state.
  - `RADIO_LIVE_ALERTS=true` additionally pings when a DJ goes live outside the schedule.
  - Live radio notifications display the Pirate Radio role as a prominent heading directly above the show title (no blank line), and Discord link-preview embeds are suppressed on all live and test messages.
  - The ping lists Website · Twitch · Discord · In-Game, linking to the radio stage and the live DJ's own Twitch stream (Whiski, Mossa, Tekeela, Sabellwind and Judge Holdenn are built in, matched against the show name the station reports; `RADIO_DJ_STREAMS` overrides the table). A show with no configured stream simply omits the Twitch line.
- Tracker command role configuration under `/config command-role`
- `/authcheck` is open to everyone but only works in the channel set by `DISCORD_AUTHCHECK_CHANNEL_ID` (default `1547064843909988433`)

### OctoCop moderation
- `/timeout` with `s`, `m`, `h`, `d`, `w` durations and combined values such as `1h30m`
  - Timing out a user who is already timed out shows a confirmation naming the existing case, its moderator, reason and remaining time; confirming replaces it and voids the old case.
- `/untimeout`
  - Removing a timeout early voids that timeout from `/check` history, timeout count, and total timeout time while retaining the audit record.
- `/ban user reason`
  - Bans the user (a member or someone who already left) with a required reason. The reason goes to the Discord audit log, the mod log and the user's DM.
  - The ban is recorded as a `B-####` case in `/check`. It **stays** there after an unban so staff can see it if the user is ever let back in; the unban date is added to the case automatically when the ban is lifted (by anyone, including via Discord's ban list).
  - Requires the **Ban users** bot permission. Moderator/Admin profiles have it; Helper does not.
- `/whisper user message`
  - DMs the user as the bot ("Message from <server>"), without naming who sent it. Logged to the mod-log channel with the sender. Requires the **Whisper users** permission (granted to roles that can warn).
- `/warn`
- `/note user note`
  - Like `/warn` but silent: recorded as an `N-####` case in `/check` and the mod log, no DM. Uses the **Warn users** permission. Works for users no longer in the server.
- `/warnings`
- `/history user:@User amount:10`
  - Shows a user's most recent messages across all readable server text channels and active threads. `amount` defaults to 10 and supports 1-50.
  - The selected messages are shown oldest-to-newest, ending with **Most recent**, and every entry identifies its channel.
  - New messages are indexed while OctoBot is online; when history is short, the command performs a server-wide newest-first merged backfill rather than scanning one channel at a time.
  - Indexed messages remain visible if later deleted (including timeout cleanup) and are labelled **deleted**, so moderation context is not lost.
  - Uses the same access permission as `/check`, so the default Helper role cannot use it.
- `/check`
  - Shows the full active moderation history, including every warning/timeout/ban reason, moderator, timestamp, timeout duration, and cleanup details.
  - Accepts users who are no longer in the server, so a banned user's record can be reviewed before an unban.
  - `/check user remove:W-0003` removes one case from history (settings permission). Case IDs are shown on every entry.
- `/clear 10` or `/clear 5m`
  - Deletes recent messages in the channel it is run in: a message count (1-200) or everything from the last period (`30s`, `5m`, `1h`; capped at 1 hour and 500 messages). Logged to the mod-log channel.
- `/clearcheck`
  - Clears the user's full `/check`/`/warnings` profile after a confirmation prompt.
  - History removal is soft-delete only: database rows remain for audit and an active Discord timeout is not lifted.
- `/settings ...` moderation configuration (Discord Administrator or server owner only)
- Raid protection: `/lockdown toggle on|off`, `/lockdown cancel`, `/lockdown timer duration`, `/lockdown status` (settings permission).
  - Starting a lockdown bans everyone who joined in the previous 10 minutes (staff and bots excluded). While on, every new joiner is DMed "We are currently in Lockdown. Please try again soon" and banned for 7 days; the bot lifts each ban automatically when the 7 days are up.
  - Lockdown turns itself off after the timer (default 30 minutes; accepts `90s`, `2h`, `1d`, up to 7 days). `/lockdown cancel` stops it early. Timer and state persist across restarts.
- Auto-replies: `/autoreply add keyword message`, `/autoreply edit keyword message`, `/autoreply remove keyword`, `/autoreply list`, `/autoreply cooldown duration` (settings permission).
  - When a message contains the keyword (whole-word, case-insensitive, phrases allowed) the bot replies to it with the fixed message. One reply per keyword per channel per cooldown (default 60s, `30s`–`60m`). Bots are ignored.
- Invite filter: a message linking to another Discord server is deleted and the author timed out for `INVITE_FILTER_TIMEOUT` (default 2 minutes), recorded as a timeout case and logged.
  - Allowed: invites to this server (resolved through Discord, so vanity URLs work), and anything posted in `DISCORD_INVITE_ALLOWED_CHANNEL_IDS` (default the server-advertising forum `1547029978326245376`, including every post inside it). Staff are exempt and edited messages are re-checked.
  - Catches `discord.gg`, `discord.com/invite`, `discordapp.com`, ptb/canary, `dsc.gg`, `discord.me`, plus spacing and zero-width tricks.
- Banned-word filter (replaces the Arcane keyword filter): `/word list`, `/word add word`, `/word remove word` (settings permission; replies are visible only to you).
  - A message containing a banned word is deleted and the author is timed out for 30 seconds (no message-history cleanup). Recorded as a timeout case in `/check`, DMed if timeout DMs are on, and logged to the mod-log channel with the message text.
  - Matching is whole-word and case-insensitive; phrases are allowed and match with spaces, hyphens or no separator. `/word list` is alphabetical. The Arcane word list is seeded automatically the first time the filter starts with an empty list (`octocop/default_banned_words.py`). Server owner, administrators and anyone with a staff profile are exempt. Edited messages are re-checked.
  - The bot needs **Manage Messages** in filtered channels and **Moderate Members**.
- Base-role cleanup: the bot holds one rule — a member has the base role `1547037223558451291` exactly when they hold none of the levelled roles. It is applied automatically on every role change, in both directions, and `/rolefix` (settings permission) applies it to every member in one pass. Configurable via `ROLE_CLEANUP_*`; needs the **Server Members Intent** enabled in the Developer Portal.
- Helper default timeout limit: 1 hour
- Moderator/Admin default timeout limit: Discord maximum (4 weeks)
- Optional timeout message cleanup window
- Warning, timeout and ban DMs (the DM never names the moderator)
- Moderation action logs

## Commands can be used everywhere

There is no bot-command-channel restriction. Slash commands can be used in any server channel where OctoBot has permission to view/respond. An old `DISCORD_BOT_COMMANDS_CHANNEL_ID` entry may remain in an existing environment, but OctoBot does not use it to restrict commands.

## One shared database

Both systems use:

```text
DATABASE_PATH=data/octobot.db
```

Live data is stored in `data/octobot.db`. Update ZIPs intentionally do **not** include a live database, so replacing bot code will not overwrite tracker/moderation/message history. The database is ignored by Git so Discord user/report/moderation history is not accidentally published to a public repository.

`tools/merge_databases.py` can be used if you need to merge newer copies later:

```powershell
python tools/merge_databases.py data/octotracker.db data/timeoutbot.db data/octobot.db
```

## Setup on Windows

```powershell
py -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
python main.py
```

Or run `SETUP_WINDOWS.bat` once, edit `.env`, then use `RUN_WINDOWS.bat`.

## Hosting

For bot-hosting.net (or another normal Python bot host):

- Startup command: `python main.py`
- Install command: `pip install -r requirements.txt`
- Add the variables from `.env.example` in the host environment panel.
- Upload/preserve `data/octobot.db` if you want the included historical state.

Only **one** `DISCORD_TOKEN` is required. Use the Discord application that you want to become OctoBot. Stop the old standalone OctoTracker/OctoCop processes before starting OctoBot so two bots do not perform the same monitoring/actions at once.

## Required Discord permissions

Tracker features need normal channel read/send/embed permissions in their configured channels. Moderation additionally needs:

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Manage Messages (for timeout cleanup)
- Moderate Members

For `/history`, also enable **Message Content Intent** under **Discord Developer Portal → Bot → Privileged Gateway Intents**. `Read Message History` and `View Channels` determine which channels can be backfilled/read.

Place the OctoBot Discord role above members/roles it needs to timeout.

## Preconfigured OctoWoW IDs

The `.env.example` contains the current supplied guild/channel/role IDs, including:

- Guild: `1547014756463026197`
- Status/alert: `1547281778841100388`
- Announcements: `1547025378479181895`
- Radio channel: `1547109894732120104`
- Radio ping role: `1547108101747118100`
- Moderation logs: `1547053413899051038`
- Helper: `1547031604113707028`
- Moderator: `1547031685944713307`
- Admin: `1547031493262573668`

## Moderation defaults

On startup, the environment role IDs seed missing profiles only. Existing `/settings` changes in SQLite are not overwritten.

- Helper: `/timeout` + `/untimeout`, maximum issued timeout `1h`
- Moderator: full moderation access, maximum `4w`
- Admin: full moderation/settings access, maximum `4w`

The merged database currently has automatic timeout message cleanup set to `0` minutes (disabled). Enable it with, for example:

```text
/settings timeout-cleanup minutes:5
```

## Notes

PyNaCl/davey voice warnings are harmless; OctoBot does not use Discord voice.

## v1.0.5 message-history ordering

`/history` merges readable channel histories by Discord message ID so fallback scanning is server-wide newest-first rather than channel-by-channel. The selected last X messages are displayed oldest-to-newest with a channel on every entry.

## v1.0.6 bans and anonymous DMs

`/ban user reason` bans a member (or a user who already left) and records a `B-####` case that stays in `/check` even after an unban. The bot watches Discord unban events and stamps the unban date onto the case. A new **Ban users** permission gates the command; existing Moderator/Admin profiles receive it automatically on upgrade, Helper does not. `/settings dm-bans` controls the ban DM. Warning, timeout and ban DMs no longer name the moderator who issued them.

## v1.0.7 schedule-driven radio pings, Twitch links, /nextshows

Radio pings are now driven by the station schedule: the next show's DJ and start time are read from `/api/station/.../schedule` and the role is pinged when that time arrives, whether or not the DJ has connected yet. Live-detection pings caused duplicate announcements (early connects and stream dropouts each produced a fresh "now live") and are now opt-in via `RADIO_LIVE_ALERTS`; when enabled they never repeat a slot already announced from the schedule.

The ping links the radio website and the live DJ's Twitch stream (Whiski, Mossa, Tekeela, Sabellwind built in; `RADIO_DJ_STREAMS` overrides). `/nextshows` lists every upcoming show in the next `RADIO_SCHEDULE_DAYS` (default 14) with absolute and relative Discord timestamps. The schedule is read as a date window because AzuraCast only expands recurring shows for one.

## v1.0.8 recurring shows and end-of-show follow-up

The schedule is read as a `start`/`end` date window (`RADIO_SCHEDULE_DAYS`, default 14) because AzuraCast only expands recurring shows for a date range, so `/nextshows` now lists every repeat. When an announced show's scheduled end passes, the `/nextshows` list is posted to the radio channel automatically, once per show.

## v1.0.9 legacy-role cleanup

Members who gain role `1547371277474603028` automatically lose role `1547037223558451291`; `/rolesweep` does a one-off pass using the wider trigger list. The bot now requests the Server Members Intent, which must be enabled in the Discord Developer Portal before this version is started.

## v1.0.10 whisper, notes, word filter, /history paging

`/whisper` DMs a user as the bot (new **Whisper users** permission, granted to roles that can warn). `/note` records a silent staff note in `/check`. The banned-word filter replaces the Arcane keyword filter: `/word list|add|remove`, deletion plus a 30-second timeout, seeded with the migrated list on first start. `/history` is now one message with Previous/Next buttons and never exceeds Discord's embed size limit.

## v1.0.11 /check remove parameter, command guide

`/check user remove:W-0003` replaces the per-case ❌ buttons. `COMMANDS.md` documents every command by tier (Everyone, Helper+, Mod+, Admin only).

## v1.0.12 lockdown, admin-only settings, public /authcheck

`/lockdown toggle|timer|status` raid protection: joiners during a lockdown are DMed and banned for 7 days, then unbanned automatically; lockdown ends itself after the timer. `/settings` now requires Discord Administrator. `/authcheck` is open to everyone but only in its designated channel. `/rolesweep` removed (the automatic legacy-role swap remains).

## v1.0.13 lockdown cancel, durations, retroactive ban

`/lockdown cancel` stops a lockdown early. `/lockdown timer` accepts `s`/`m`/`h`/`d` durations up to 7 days (the previous minutes value migrates). Starting a lockdown now also bans everyone who joined in the previous 10 minutes, excluding staff and bots.

## v1.0.14 auto-replies

`/autoreply add|edit|remove|list`: the bot replies with a fixed message whenever a keyword is said (whole-word, case-insensitive, one reply per keyword per channel per minute).

## v1.0.15 auto-reply cooldown

`/autoreply cooldown duration` sets how long before the same keyword is answered again in a channel (`30s`–`60m`, default 1m).

## v1.0.16 timeout cleanup fix and timeout replacement

Message cleanup crashed on every timeout (`PartialMessage.delete()` does not take `reason`) and scanned channels one message at a time; it now bulk-purges channels concurrently, so cleanup finishes in seconds. Timing out an already-timed-out user shows a confirmation with the existing case, moderator, reason and remaining time instead of refusing.

## v1.0.17 /clear

`/clear 10` deletes the 10 most recent messages in the channel; `/clear 5m` deletes everything from the last 5 minutes. Counts are capped at 200, time at 1 hour and 500 messages.

## v1.0.18 /rolefix and a second radio announcement channel

`/rolefix` walks every member and reconciles the base role against the levelled roles in both directions: a levelled role means the base role is removed, no levelled role at all means it is granted. Radio announcements now also post to `DISCORD_RADIO_EXTRA_CHANNEL_IDS` (default `1554524069511168040`) without the role ping.

## v1.0.19 automatic base-role grant

The base role is now kept in sync in both directions on every role change, not only removed: losing the last levelled role gives it back. `/rolefix` is the catch-up pass for members changed while the bot was offline.

## v1.0.20 /patchnote

`/patchnote` reads the Patch Notes and Changelog forum (`f=4`) the same way `/announcement` reads Announcements (`f=2`), and every new patch note is posted automatically to `DISCORD_PATCH_NOTE_CHANNEL_ID`, which defaults to the announcement channel. The two forums are tracked separately in the database, so neither shows up in the other's command or channel.

## v1.0.21 invite filter

Invites to other Discord servers are deleted and the poster timed out for an hour. Invites to this server are resolved through Discord and allowed, as is anything posted in the server-advertising forum.

## v1.0.22 invite filter timeout default

The invite filter now times out for 2 minutes rather than an hour. `INVITE_FILTER_TIMEOUT` still overrides it.

## v1.0.23 one status message, always

The status channel already kept one message and edited it, but a lost message id made it post a second and leave the first behind. It now finds its own earlier status message, reuses it and deletes any duplicates.

## v1.0.24 one message per kind in the status channel

Incident/report alerts and automatic authentication diagnostics were posted as new messages each time and piled up beside the status embed. All three now keep a single message that is edited in place, and the monitor adopts and de-duplicates whatever is already in the channel.

## v1.0.25 Judge Holdenn's Twitch link

"The Hold with Judge Holdenn" now links to twitch.tv/woah_lp in the radio announcement.

## v1.0.26 complete sample environment

`.env.example` now carries every setting the loader reads, so the only thing to fill in is `DISCORD_TOKEN`. `REQUEST_TIMEOUT_SECONDS` and `CONNECTIVITY_TIMEOUT_SECONDS` were the two that had never been documented.

## v1.0.27 new status channel, quieter channel errors

The sample environment points the status and alert channels at `1559989373921923173`. A deleted channel or a wrong id in `.env` is now reported once with a readable message instead of a traceback on every poll.

## v1.0.28 role pings on automatic forum posts

New announcements ping `1562868331885633579` and new patch notes ping `1562868317193248939`. Only the opening page of a multi-page post pings, and the commands stay silent.

### Daily Top Chatter (Exalted)

Every day at **17:00 UTC**, OctoBot ranks human messages received across the configured
server, including threads, in the preceding **17:00–17:00 UTC** period. Bot, webhook
and system messages are excluded. This counts raw messages, independently of XP
cooldowns or multipliers; edits do not add counts and deletions do not subtract them.
Ties are resolved by the lowest Discord user ID. Only current human members qualify.

The winner receives **Exalted** (`1566128971916120275`) until the next handover. All
other holders lose the role **before** the winner receives it. If nobody posted,
the previous award expires and no announcement is sent. The award role should be
reserved for this feature and excluded from any automatic rank ladder.

Results are posted to `1547025378479181895`, first with plain `@` placeholders,
then edited to show the winner, runners-up and role mentions. Both requests disable
all mention notifications. Only available places are shown if fewer than three qualify.
The heading date is the UTC date on which the period ends (for example `24th Nov`).

Counts and completed awards persist in the bot database. On first installation,
tracking starts immediately and the first award occurs at the next 17:00 boundary
(so that first period may be partial). Messages sent while the bot is offline are
not backfilled. A restart catches up the latest completed period once, rather than
posting a backlog of old awards. Failed role changes and announcement edits retry;
a saved announcement is edited again rather than intentionally reposted.

Override `DAILY_CHATTER_ROLE_ID` and `DAILY_CHATTER_CHANNEL_ID` in `.env`, or set either
blank to disable the feature. The bot needs **Manage Roles**, its highest role above
Exalted, **View Channel / Send Messages** in the announcement channel, and **Server
Members Intent** enabled. Deploy the updated code and restart the bot to activate.

### v1.0.30 radio announcements

Radio pings now go to `1547025378479181895`, mentioning role `1567629523514818651`.
The previous shipped channel and ping-role IDs are migrated automatically; custom
overrides and blank (disabled) values are preserved. The Discord listen link opens
stage channel `1568053765347741828` (`DISCORD_RADIO_LISTEN_CHANNEL_ID`). Announcements
use the show title in the pirate greeting and list Website · Twitch · Discord · In-Game
in that order (Twitch is omitted when no stream is known). The live embed keeps the
show details and ordered listen links but has no footer or bottom timestamp. Automatic
post-show schedule messages are removed; `/nextshows` remains available on demand.

### v1.0.31 daily chatter exclusions

Messages in channels `1547025818914525254` and `1547064843909988433`, including
their threads, no longer count towards Daily Top Chatter after updating and restarting.
Previously recorded messages cannot be filtered retroactively because the earlier
counter did not store channel IDs.

### v1.0.33 lightweight server-info renderer

The preview now draws PNGs with Pillow directly, removing Matplotlib and its NumPy,
ContourPy, fontTools and other plotting dependencies from new installs. This reduces
installation and rendering overhead on small bot hosts. On hosts that automatically
install requirements at startup, let that install finish; do not start a second manual
pip install concurrently. Exit 137 indicates the process was killed (often by the host's
memory limit); this change reduces demand but does not guarantee a particular RAM limit.

### v1.0.34 interactive graph

The public graph is hosted at https://equadis.github.io/OctoBot/.
Its small HTML/CSS/JavaScript/SVG source is in `docs/index.html`, with no chart
framework, CDN, web server on the bot host or extra Python dependency. The button
passes only the demo snapshot timestamp in a URL fragment so it matches the message.
The default view is 1W; each visitor changes only their own view. The arrow opens a
browser page, not an embedded Discord Activity or native hoverable message image.
`SERVERINFO_GRAPH_URL` optionally overrides the hosted page for self-hosting; deploy
`docs/index.html` as a static index page. No configuration is required for the
included hosted test page. Discord controls expire after 10 minutes; the external
link stays usable. The command is still admin-only to post, while anyone can click
its public controls to receive their own private chart.

### v1.0.35 GitHub Pages hosting

The default graph URL is `https://equadis.github.io/OctoBot/`. The static page is
`docs/index.html`; GitHub Pages publishes it from **main → /docs**. There is no
build step, server or new dependency. If Pages has not been enabled yet, a repository
administrator must enable **Settings → Pages → Deploy from a branch → main → /docs**.
Future changes to the page publish automatically when pushed to main.

The bot passes only a demo snapshot timestamp in `#at=...`. Page range changes are
local to that browser tab. Discord range controls open a private chart for the
person clicking; subsequent clicks edit that private chart. The public 1W panel
stays unchanged. 1H/1D/1W cover the previous hour/day/week; 1M and 1Y mean rolling
30 and 365 days; YTD starts at 00:00 UTC on 1 January of the snapshot year.

If `SERVERINFO_GRAPH_URL` was explicitly set to the old host, remove that override
or change it to the GitHub Pages URL, then restart OctoBot and run `/serverinfo` again.

### v1.0.36 fixed Discord chart and expanded web charts

Discord now has a fixed 24-hour image and one external link; range/date selection
and private per-user chart messages have been removed. The website defaults to 1D,
adds UTC date filtering, an average reference, a 50%-opacity dashed all-time peak,
and labelled synthetic Phase 1/2/3 milestones. Headline stats are Online now,
24h peak, All-time peak and Server uptime in `dd:hh:mm:ss` format. The web chart is
inspired by SteamDB's population-chart structure; it uses OctoBot's own synthetic
history and has no dependency on SteamDB data, code or assets.

### v1.0.37 larger Discord chart attachment

The chart is now a standalone PNG attachment beside the stats embed, rather than
an image embedded inside that narrow card. Its canvas is 1200×660 with larger text
and a taller plot. Discord still controls its displayed size for each client; users
can click the attachment to open the original image. The response still contains
one public stats panel and one external graph link, without range/date controls.

A GitHub Pages "There isn't a GitHub Pages site here" 404 means the site is not yet
published; updating Python or the URL fragment cannot enable it. In the repository,
open **Settings → Pages**, choose **Deploy from a branch**, choose **main** and
**/docs**, and **Save**. Wait for the Pages deployment to finish before testing the
link. The browser used during development was signed out, so initial activation
could not be completed through the repository settings.

### v1.0.38 hover-only graph and curve-attached release flags

The web slider and separate content-release cards are removed. Hover the curve for
population/outage details or hover/focus P1/P2/P3 flags for full release names (P3:
Phase 3: Blackwing Lair Release). The flags sit inside the graph, connected to the
curve with short stems; release timestamps are retained during downsampling.
The synthetic peak of 2,476 now exists as an actual timestamped sample, retained
in YTD/1Y and any custom window containing it. The dashed 50%-opacity peak reference
is drawn at 2,476 on a 0–3,000 axis with an explicit value label and headroom above,
not at the plot ceiling. Python and web demo histories share these peak semantics.
All dates and numbers remain synthetic; P2's name is a placeholder pending verified
release metadata. Discord remains a fixed 1D preview with just the external link.

### v1.0.39 real observations and three-realm support

Install/update the repository files and restart the bot. History is seeded from
`docs/online-history.json` for All Realms, and `docs/history/nzoth.json`, `docs/history/yshaarj.json` /
`docs/history/cthun.json` for the other realms. The bot keeps data in the existing
SQLite database (`population_readings_v2`, keyed by realm and timestamp), survives
restarts, and refreshes its local history from the public site every 10 polls.

The public site loads separate history files, refreshes once per minute, and never
uploads visitor data. GitHub Actions (`.github/workflows/population.yml`) samples
on a five-minute cron and publishes `docs/` through the official Pages artifact
workflow. Its GITHUB_TOKEN has contents:write, pages:write and id-token:write;
commits update observations only. Collection and deployment run in separate jobs,
so a slow Pages deployment does not hold up subsequent observations. Bot-host per-minute readings stay in its SQLite;
the public site uses the independent scheduled readings, not a connection to the
bot host. GitHub can delay schedules and disable them after extended repository
inactivity. Missing collection periods remain yellow.

To add verified public JSON feeds for PvP/Hardcore, configure
`POPULATION_YSHAARJ_URL` / `POPULATION_CTHUN_URL` in the bot environment and the
repository's **Actions variables** for the scheduled collector. Expected response:
`{"online":123}`. A missing feed does not poll the census as a fallback and does not
invent observations. Keep feed URLs public and credential-free. Import future
histories using `load_history(path, realm)` and `PopulationStore.add` or replace the
corresponding realm history file before restarting; file writes are deduplicated.

The original uploaded snapshot is preserved as imported observations. New readings
record the UTC retrieval time; the official page says its counter refreshes about
every minute. There is no claim of population coverage before the first supplied
reading or of authoritative uptime. Collection failures retain prior data intact.
