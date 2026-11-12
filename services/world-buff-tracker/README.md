# octowow-world-buff-and-events-status-bot

A **clientless** bot for OctoWoW (WoW 1.12) that logs in with the game's own
network protocol — no game client — polls `/who` for a raid instance, and pushes
a Discord alert when a raid **enters** and when it **leaves** Onyxia's Lair.

The point is world-buff timing: knowing a raid is inside the lair means a kill —
and a **Rallying Cry of the Dragonslayer** — may be minutes away, so you can be in
your capital to catch it.

---

## ⚠️ Read this first

**Private servers' rules usually forbid automation and third-party programs that
connect to their server — check OctoWoW's before running this.** This bot is exactly that. Running it risks a **ban of the account
it logs in with**.

- Use a **dedicated throwaway account** you are willing to lose. Never your main.
- The bot parks a character standing still, always online — which is detectable.
- Keep the poll interval gentle (the default is 20s; don't go below ~15s).
- Before building anything, check whether a **community "buff timer" Discord**
  already exists for OctoWoW — that carries zero risk and may make this moot.

This code is provided for educational purposes. You are responsible for how you
use it.

---

## The one check that decides if this works at all

WoW's `/who` filters by zone, but whether it lists players **inside an instance**
depends on the server core. OctoWoW may or may not expose them. **Verify manually
before relying on the bot:**

1. Have a friend (or an alt) stand inside Onyxia's Lair.
2. In the game client, type: `/who Onyxia's Lair`
3. If they appear in the results → the approach works.
   If not → `/who` can't see instanced players on OctoWoW, and no bot can either.
   In that case, watch for the server's world announcement on a kill instead (see
   *Limitations*).

While you're there, note the **area id** the bot should watch. Onyxia's Lair is
`2159` in stock 1.12; if OctoWoW uses a custom id, set `WATCH_AREA_ID` accordingly.

Also note: OctoWoW is **cross-faction**, so `/who` returns Horde and Alliance
players together and one bot sees both (`WOW_REALM_TYPE=crossfaction`, the
default). On a realm where `/who` only returns your own faction, set
`WOW_REALM_TYPE=faction` and run one bot per side.

---

## Setup

Requires **Node.js 20+** (uses built-in `fetch`, `process.loadEnvFile`, and the
`crypto`/`net` modules — the bot has **zero runtime dependencies**).

```bash
npm install
npm audit        # expect: found 0 vulnerabilities
npm test         # 88 unit + integration tests
```

Then configure:

```bash
cp .env.example .env
# edit .env — see the comments in that file
```

You need:

- A **throwaway OctoWoW account** (`WOW_ACCOUNT` / `WOW_PASSWORD`).
- A **character** on it (`WOW_CHARACTER`) — ideally the **only** character on the
  account (see *Limitations*). It just parks wherever it logs in.
- A **Discord webhook URL** (`DISCORD_WEBHOOK_URL`): in Discord, *Server Settings →
  Integrations → Webhooks → New Webhook*, copy its URL.

## Run

Locally, the quickest way (runs the TypeScript directly, no build):

```bash
npm run start:dev              # runs src/index.ts via tsx
LOG_LEVEL=debug npm run start:dev
```

Or the production path (compile once, then run plain Node):

```bash
npm run build   # tsc -> dist/
npm start       # node dist/index.js
```

To keep it running 24/7 on your own box, use a process manager (e.g.
`pm2 start "npm start" --name onyxia-bot`) or a systemd service. The bot
reconnects on its own if the link drops. For a hosted option, see **Deploy on
Railway** below.

You should get an "👁️ Watching Onyxia's Lair" message in Discord on startup, a
"🐉 Raid entered" when a group appears, and a "✅ cleared" when they leave.

## Deploy on Railway (24/7)

This repo is Railway-ready: `railway.json` and `nixpacks.toml` tell it to compile
to `dist/` and run `node dist/index.js`, with an on-failure restart policy.

1. On [Railway](https://railway.com), create a project → **Deploy from GitHub
   repo** → pick this repo. It builds automatically (no start command to type).
2. Open the service → **Variables** and add the same keys from `.env` (there is no
   `.env` file in the deploy — the bot reads them straight from the environment):

   | Variable | Value |
   |---|---|
   | `WOW_ACCOUNT` | your throwaway account |
   | `WOW_PASSWORD` | its password |
   | `WOW_CHARACTER` | the character to log in |
   | `DISCORD_WEBHOOK_URL` | your Discord webhook |
   | `DISCORD_MENTION_ROLE_ID` | opt-in role id to ping (optional; see below) |
   | `WOW_AUTH_HOST` | your server's realmlist host, e.g. `play.octowow.st` (default) |
   | `WOW_REALM` | the realm your character is on, e.g. `N'Zoth` (default) |
   | `WATCH_AREA_ID` | `2159` (optional) |
   | `POLL_INTERVAL_SECONDS` | `20` (optional) |
   | `LOG_LEVEL` | `info`, or `debug` while you verify it |

3. This is a **worker** — it does not serve HTTP, so it won't get a public domain,
   and that's expected. Don't set a health check port.
4. Watch the deploy logs. You want to see "in world; watching Onyxia's Lair", and
   a "👁️ Watching Onyxia's Lair" message should land in your Discord channel.

If the deploy logs stop at a handshake step, set `LOG_LEVEL=debug`, redeploy, and
read where it stops — the *Limitations* section maps each stopping point to a
cause.

---

## Personal / opt-in notifications

By default the bot posts to the channel and everyone there sees it. To let members
**opt in** to actually being *pinged* — instead of blasting the whole channel —
use a self-assignable role. No extra code or bot needed:

1. **Create a role**, e.g. `@OnyxiaWatch`, in *Server Settings → Roles*.
2. **Let members give themselves the role.** The easy native way: *Server Settings
   → Onboarding* (or *Channels & Roles*) → add it as a self-assignable/opt-in role.
   Members pick it up in the server's onboarding/roles screen. (A reaction-role bot
   works too, but isn't needed.)
3. **Get the role id:** turn on *Discord → Settings → Advanced → Developer Mode*,
   then right-click the role → **Copy Role ID**.
4. Set `DISCORD_MENTION_ROLE_ID` to that id (in `.env` locally, or Railway
   Variables). Now every **raid entered** and **cleared** post pings only that role
   — so only members who took it get notified. Everyone else can mute the channel.

Tip: put the webhook in a channel that only `@OnyxiaWatch` can see, and
non-subscribers won't even see the posts.

> Want the bot to **DM each subscriber privately** instead of posting in a channel
> at all? That's a bigger change — Discord webhooks can't DM, so it needs a real
> bot application (bot token, a subscriber list, and a `/subscribe` command). Ask
> and I'll add it; the role approach above is the simple, no-extra-infrastructure
> option.

## How it works

```
AuthClient ──SRP6 logon──► session key K
                                │
WorldClient ──auth session(K)──► header cipher on ──► char login ──► in world
                                │
   every ~POLL_INTERVAL (jittered ±15%): CMSG_WHO(zone=2159) ──► SMSG_WHO ──► players
                                │
RaidTracker groups players into cohorts (by guild, or the whole lair) and follows
each roster ──► raid-forming (crossed WOW_MIN_RAID_SIZE) / raid-left (roster empty)
                                │
    formatRaidEvent ──► DiscordWebhookNotifier ──► your channel
```

`/who` returns one flat list of everyone in the zone (all instances merged, capped
at 49 names) with **no instance or raid-group id**, so the only field that can tell
two concurrent raids apart is the guild tag — and even that fails for a pickup raid
whose members are scattered across guilds. `RaidTracker` copes with both via
`WOW_RAID_GROUPING` (default `auto`):

- **`auto`** — a guild that reaches `WOW_MIN_RAID_SIZE` is its own named raid
  (`<Nightfall>`); everyone else, scattered guilds and the unguilded, pools into one
  **pickup** cohort that forms its own raid. So a guild raid and a concurrent pickup
  raid are seen as two.
- **`guild`** — every guild is its own raid; misses a pickup raid spread across guilds.
- **`lair`** — the whole zone is one raid; simplest, never splits concurrents.

Each cohort keeps its roster by name and fires **exactly one alert when it first
reaches the threshold** (~about to start) and **one when that same roster has fully
left** — never on a steady raid poll after poll. Membership churn while a raid is
inside is silent, and a named guild raid stays named even if it dips below the
threshold. The first poll baselines: a raid already in progress reports once with
"already in progress" wording. The startup "bot online" message is off unless
`WOW_ANNOUNCE_STARTUP` is set.

> Two concurrent *pickup* raids still read as one — no `/who` field can separate
> them. And the 49-name cap means two full ~25-player raids (≈50) sit right at the
> limit; three or more undercount. A single raid forming is well under it.

### Blackwing Lair and Nefarian's head

Nefarian's head, turned in, drops the same Rallying Cry of the Dragonslayer as
Onyxia's, so Blackwing Lair is watched as a second lair (`WOW_BWL_ENABLED`, on
by default). It runs the same alerts as Onyxia: the start yelled in the capitals,
the "might end soon" heads-up, the clear and the disband. Each lair has its own:

- `/who` poll (`WOW_BWL_POLL_INTERVAL_SECONDS`, default 60s, on the same queue as Onyxia's)
- raid numbers, alert dedup, learned clear time and `/who` snapshots, in separate collections
- Discord channel (`DISCORD_BWL_CHANNEL_ID`, else the Onyxia one)
- sizes and timings (`WOW_BWL_*`, scaled for a 40-man raid that takes hours)

A heard Rallying Cry is read against its head's lair, so a Nefarian head is called
fresh or saved by Blackwing Lair's roster, not Onyxia's. It is posted to that
lair's channel and named "(Nefarian head)" in the post and the whisper. The buff
cooldown is one for both heads. The capital status yell and the whisper `status`
list every lair's raid in progress.

Everything below the network edge is pure and unit-tested. The full handshake →
in-world → `/who` path is covered by an integration test that runs the client
against a scripted mock server speaking the real framed, encrypted wire format
(`src/net/world-client.test.ts`).

### In-game whisper interface

Besides posting to Discord, the bot's character answers whispers and can whisper
alerts to players in-game. Whisper the character:

| command | effect |
|---|---|
| `subscribe` (`sub`, `start`) | opt in to in-game raid alerts |
| `unsubscribe` (`unsub`, `stop`) | opt out |
| `discord` | link Discord by DMing the bot a code (flow A) |
| `discord <id>` | link by pasting your id; the bot DMs you a code (flow B) |
| `confirm <code>` / `<code>` | confirm a flow-B code in-game |
| `discord off` | unlink |
| `mode both` \| `mode offline` | DM always, or only when your character is offline |
| `darkmoon` (`dmf`, `faire`) | where the Darkmoon Faire was last seen |
| `status` / `me` / `help` | current raid state / your settings / commands |

`darkmoon` never predicts. It reports where the faire was last **seen**, and how long ago —
because a private server need not run the vanilla calendar (Turtle WoW, for one, alternates
weekly and is up almost every day), and any schedule hardcoded here would be one server patch away from being confidently
wrong for a month before anyone noticed. An observation cannot rot like that; it just gets old,
and says so. [PizzaWorldBuffs](https://github.com/Pizzahawaiii/PizzaWorldBuffs) reached the same
conclusion — it has no schedule logic at all.

Two sources, both things the bot already receives:

| source | covers | can it be faked? |
|---|---|---|
| **on-site** — our own character parked at a faire site, recognising the staff beside it | only the zone it is parked in | no — it is our own client |
| **sighting** — a `PWB_DMF:` broadcast on the hidden `LFT` channel the bot already reads for head warnings | both zones | yes — it is text a player typed |

The **newer** look wins, because the faire really does move; a tie goes to our own eyes. A look
within a few hours is stated plainly ("is in Elwynn Forest — seen 4m ago"); an older one is
dated and hedged ("was last seen … it moves weekly, so it may have moved on"); past a week it
says it does not know rather than name a zone.

**The sighting feed is hardened, because it is public text.** Anyone can paste a
`PWB_DMF:` line naming the wrong zone. So a sighting is a *vote*, counted per distinct
**sender** — the one field on a channel message the server stamps — and never per
`witness`, which is inside the part a troll would be writing. This matches how PWB really
behaves: each client stores one sighting and rebroadcasts it, so honest traffic is *many
senders repeating one witness*, a shape a single troll cannot produce. A location needs a
quorum of senders (`DARKMOON_QUORUM`, default 3) and the majority within the window wins;
on top of that a settled zone cannot move for `DARKMOON_CHANGE_COOLDOWN_HOURS` (default
12), so it cannot flap. The faire really moves about a week apart, so the cooldown never blocks it. What our own character sees skips all of it — nobody can forge our own object stream.

**On-site detection** (`DARKMOON_WATCH_LOCATION=elwynn|mulgore`, off by default) is the stronger
half. Park the watcher within sight of the faire field and the bot asks the server what the units
around it are called (`CMSG_CREATURE_QUERY`, one query per NPC entry per session) and matches the
faire roster by **name** — not entry id, because a wrong id fails silently and looks exactly like
an absent faire, while a wrong name shows up in the log. `Darkmoon Faire Carnie` is deliberately
excluded: carnies stand in the capitals permanently, which is the very bug that made PWB 1.4.0
report faires that were not there. The zone is configuration, not detection — an object update
says what is nearby, never which zone you are in — so setting it while the character is elsewhere
makes the bot confidently wrong.

A whisper's packet carries only the sender's **GUID**, so the bot name-queries to
resolve who whispered (and to reply). Outgoing whispers are **throttled** so a raid
alert to many subscribers can't trip the server's spam mute. Subscribers persist in
**MongoDB** (`MONGODB_URI`); without it they live in memory and are lost on restart.
Set `WOW_WHISPERS=false` to disable the whole interface.

**Discord delivery is a real bot DM** (needs `DISCORD_BOT_TOKEN`; the bot must share
a server with the recipient). Linking is verified two ways so a player can pick
whichever is easier — both mint a one-time code and end at a verified Discord id:

- **Flow A** — whisper `discord` → get a code + the server invite → join and **DM
  the bot** the code. The bot reads it over its gateway (`ws`, `DISCORD_GATEWAY`,
  MESSAGE CONTENT intent) and links the DM author's id. No ID hunting.
- **Flow B** — whisper `discord <id>` → the bot **DMs that id** a code (or, on a
  403, tells you to join / open DMs) → whisper the code back in-game.

Then `mode both` DMs on every raid; `mode offline` DMs **only when the character is
offline** — detected by the in-game whisper bouncing (`SMSG_CHAT_PLAYER_NOT_FOUND`),
with a 60s fallback window. Without a bot token, the `discord` commands say so and
only in-game whispers + the webhook channel post run.

> This makes the character actively talk in-game — much more visible and reportable
> than the silent `/who` poller, and a bigger ban risk. It's off with one env var.

Layout:

| path | what |
|---|---|
| `src/crypto/` | SRP6 client, vanilla header cipher, BigInt/LE helpers |
| `src/net/` | packet codecs (auth + world) and the two socket clients |
| `src/protocol/` | opcodes, the `/who` codec, and the chat / name-query codecs |
| `src/watcher/` | the cohort raid tracker (forming / left events) |
| `src/chat/` | whisper command router, whisper queue, and the Discord linker |
| `src/subscribers/` | `SubscriberStore` (in-memory + MongoDB) and pending link codes |
| `src/notify/` | webhook, message formatting, Discord DM sender, and the gateway |
| `src/config.ts`, `src/index.ts` | config validation and the supervisor loop |

---

## Limitations & things that may need live tuning

The protocol is implemented from the documented 1.12 (MaNGOS-family) behaviour,
adapted to OctoWoW's logon (its custom client build and integrity hash), and
verified end-to-end against a mock. A few spots are where reality most often
differs — turn on `LOG_LEVEL=debug` and watch where the handshake stops:

- **Instanced `/who` visibility** — the make-or-break check above. If instanced
  players don't show, or show a different area id, adjust `WATCH_AREA_ID` or fall
  back to reading the server's on-kill world announcement (a different feature).
- **Warden / anticheat** — if the server pushes `SMSG_WARDEN_DATA`, the bot logs a
  warning and does not respond. A strict warden setup may disconnect it. Vanilla
  chat bots generally survive because private servers often run warden leniently
  or off; if you get repeatedly dropped shortly after login, this is the suspect.
- **Addon block in the auth session** — sent empty by default (MaNGOS cores treat
  it as optional). If login is rejected right after `CMSG_AUTH_SESSION`, a real
  client's addon blob may be required.
- **Realm-list address** — parsed from the auth server's realm list. If that
  address is unreachable (some servers advertise an internal one), set
  `WOW_WORLD_HOST` / `WOW_WORLD_PORT` to bypass it.
- **Multiple characters** — the char-enum parser is bulletproof for the **first**
  character on the account; a second character with an unexpected record layout
  could desync parsing. Use a single-character bot account.
- **Same-faction only**, as noted above.

## Development

```bash
npm test          # run the suite once
npm run test:watch
npm run typecheck  # tsc --noEmit over the whole tree
```

No `any`, no unsafe casts; strict TypeScript throughout.
