# World Chat Alpha
Read-only World channel, GM-only feed, dungeon/raid recruitment, WTB and WTS. Public messages only; private messages are never routed. Game-player messages are displayed using textContent, not HTML.

## Deployment (existing infrastructure only)
1. Apply cloudflare/octometrics/migrations/0004_world_chat.sql to the existing octometrics D1 database (do not recreate it).
2. Deploy worker.mjs together with world-chat.mjs and world-chat-classify.mjs, keeping the existing Worker and bindings.
3. The compiled collector reference is under cloudflare/octometrics/collector/dist-metrics/metrics. The separately deployed collector must merge the small index.js hooks and add world-chat.js rather than blindly overwrite a later production version. Verify its WorldClient has joinChannel, resolveName and the onChannelMessage(channel,guid,text,raw) hook. The existing in-repo TypeScript WorldClient demonstrates these APIs; the separate production client may differ. With the actual collector verified, set WORLD_CHAT_ENABLED=true on that service only and redeploy. Do not change raid, DMF or auction service configuration.
4. Verify live packets: World channel name and 1.12 layout, trailing GM flag 0x04, resolved names, and each configured realm. If either packet format or GM flag differs, update the decoder before enabling. One SW observer per configured realm avoids duplicate ingestion; faction coverage must be verified. No message is sent to World chat.
5. Confirm API /api/world-chat?realm=N%27Zoth and page /world-chat/. No collector means Waiting; data remains explicitly stale after 45 seconds. No synthetic messages.

## Alpha limits
Feeds show up to 150 regular and 100 GM entries from the last 30 minutes. Raw database records are pruned after 24 hours by the existing daily scheduled Worker; listings are filtered server-side and client-side at exactly five minutes. A player/realm/dungeon key refreshes only on a newer matching solicitation or standalone alias; WTB/WTS repeat advertisements use the normalised full text. DM is ambiguous unless a wing is supplied. GM flag is server packet metadata, never a typed prefix. Only one trusted collector account per realm is permitted. Unresolved names display as Unknown player. No automatic messaging, buy/sell actions or private channels. 

## Incremental Windows deployment
The production collector is a manually uploaded Railway project, not the OctoBot GitHub source. Keep the existing local collector directory, and use a freshly updated Git checkout as the source for the World Chat patch. These commands assume you are in the Git checkout and the collector is in Downloads. PowerShell:

```powershell
$collector = Join-Path $HOME 'Downloads\OctoBot-Metrics-Tracker-Raid-Work'
node .\cloudflare\octometrics\collector\apply-world-chat.mjs $collector --dry-run
node .\cloudflare\octometrics\collector\apply-world-chat.mjs $collector --apply
npx wrangler d1 execute octometrics --remote --config "$collector\wrangler.metrics.toml" --file ".\cloudflare\octometrics\migrations\0004_world_chat.sql"
npx wrangler d1 execute octometrics --remote --config "$collector\wrangler.metrics.toml" --file ".\cloudflare\octometrics\migrations\0005_world_chat_guilds.sql"
npx wrangler deploy ".\cloudflare\octometrics\worker.mjs" --config "$collector\wrangler.metrics.toml" --dry-run
npx wrangler deploy ".\cloudflare\octometrics\worker.mjs" --config "$collector\wrangler.metrics.toml"
Invoke-RestMethod "https://octometrics.eqvoice.workers.dev/api/world-chat?realm=N%27Zoth"
```
Only proceed after each command succeeds and the API returns the expected waiting/live object. Check existing summary and auction routes before changing Railway. Set WORLD_CHAT_ENABLED=true on octobot-metrics-tracker only, using the Railway dashboard or CLI with skip-deploy if available; then upload the patched collector from its directory (`railway.cmd up . --path-as-root --service octobot-metrics-tracker`). Do not redeploy the other services. Production packet layout and names still require live confirmation. If disabling becomes necessary, remove WORLD_CHAT_ENABLED or set it false and redeploy only the metrics tracker.

The Worker accepts at most 20 messages per batch and classifies at most three dungeon tags per message, keeping the D1 statement count bounded. The chat feed still contains the full message.

Guild enrichment: OBPVESW, OBPVPSW and OBHCSW exclusively. Reuse guilds from existing roster replies, and attempt at most one additional exact-name /who per minute per SW connection, half a minute from its scheduled raid poll. Guilds are linked per realm and character GUID, not inferred from chat text; missing results are omitted. A confirmed empty guild is stored as empty. Verify live /who timing before treating coverage as complete. Display time is grey, player/guild/message white, and GM text #ACE5EE. Both 0004 and 0005 migrations must be applied before deploying the updated Worker.
