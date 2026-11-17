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
