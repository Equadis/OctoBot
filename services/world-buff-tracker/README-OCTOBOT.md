# OctoBot World Buff Tracker (N'Zoth)

This service is an authorised copy of [GeneralA6/octo-wow-world-buff-status](https://github.com/GeneralA6/octo-wow-world-buff-status), pinned to upstream commit [`eb9f559`](https://github.com/GeneralA6/octo-wow-world-buff-status/commit/eb9f55952c4e75e2e9f7e38469895b1253c9e49c). Original authorship remains credited. This integration does not imply a general licence for third-party redistribution.

## Scope

- **Realm:** N'Zoth only. No Y'Shaarj or C'Thun accounts.
- **Characters:** Two dedicated accounts, one parked at the Elwynn Forest Darkmoon Faire site and the other at the Mulgore site. The characters may be used as network connections for pooled `/who` queries; they do not need to enter raids.
- **Raids:** Onyxia's Lair and Blackwing Lair tracked separately; the Onyxia/Nefarian head cooldown is shared.
- **Site output:** OctoBot's future World Buffs dashboard is the main destination. Keep confirmed buff drops distinct from raid-based predictions and stale observations.
- **No automated in-game broadcasting** from the OctoBot integration.

## Important implementation gap before deployment

The upstream program currently accepts one primary watcher (`WOW_ACCOUNT`, `WOW_PASSWORD`, `WOW_CHARACTER`) and optional secondary characters via `WOW_LISTENERS`. Its `DARKMOON_WATCH_LOCATION` **only performs on-site NPC detection on the primary watcher**, not the secondary listener. The N'Zoth integration must also wire nearby NPC detection for the second character before claiming both Faire sites are actively covered.

Likewise, the upstream app primarily delivers Discord/in-game updates; it has **not yet been wired into** the existing Cloudflare OctoMetrics D1 receiver or the OctoBot website. Do not mistake a running Railway process for a completed tracker integration.

## Deployment design

Host as a **separate Railway service** from the existing OctoMetrics proof-of-concept, even though both sources live in the OctoBot GitHub repository. Configure the Railway service's root directory as `services/world-buff-tracker`, use Node.js 20+, build with `npm ci && npm run build`, and start with `npm start`. The source's `railway.json` is a legacy upstream file; configure commands explicitly in Railway rather than depending on it.

Example **non-secret** variable names (enter values privately in Railway):

```dotenv
WOW_REALM=N'Zoth
WOW_ACCOUNT=<primary-username>
WOW_PASSWORD=<primary-password>
WOW_CHARACTER=<primary-character>
DARKMOON_WATCH_LOCATION=elwynn
WOW_BWL_ENABLED=true
WOW_WHO_MIN_GAP_SECONDS=31
WOW_LISTENERS=[{"account":"<secondary-username>","password":"<secondary-password>","character":"<secondary-character>","onLogin":"none","yeller":false}]
```

Once secondary DMF observation is implemented, configure the secondary site as `mulgore`. Do not commit credentials or paste them into chat or deployment logs. Use distinct credentials for each WoW account. Both characters must already be parked at their designated sites through the normal game client before the headless bot logs in.

Avoid duplicate logins: the currently running `OBPVESW` OctoMetrics test uses a separate account and remains untouched until the replacement is verified. Any other service using either new account must be stopped before enabling it here.

## Source import

The GitHub Actions workflow `.github/workflows/import-world-buff-tracker.yml` copies the full pinned upstream source and tests into this directory on the feature branch. Re-run tests after port changes, and merge only after the website integration and second Faire-site observation are validated.
