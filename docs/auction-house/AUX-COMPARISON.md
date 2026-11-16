# Auction House: Aux comparison

Source inspected: `octowow.st/git/Dusk/aux-addon-ClassicAPI` (`util/filter.lua`, `tabs/search/*.lua`). Aux runs inside the game client and
reads live auction rows with full tooltips; OctoBot reads the latest completed full scan through the website. The columns below say what
Aux actually implements and what OctoBot does about it.

| Aux feature (source) | OctoBot | Notes |
|---|---|---|
| Item name search, `exact` | **Yes** | Name or item ID; "Exact item name" switch. `%` and `_` are matched literally. |
| Rarity (`rarity`) | **Yes** | Poor to Legendary. |
| Category, subcategory, slot (Blizzard query) | **Yes** | From catalogue `classs`/`subclass`/`slot`. Weapon, armour, recipe and ammunition subtypes are named; others show "Type N" because the names are not verified. |
| Min/max level (`min-level`, `max-level`) | **Yes** | Required level. Items the catalogue does not describe never match. |
| `isgear` | **Yes** | "Equipment only" (slot present). |
| `stack` (exact stack size) | **Yes** | Recalculates quantity, listings and price from matching auctions. |
| `price` (max unit buyout), `bid-price` (max unit bid) | **Yes** | Money input accepts `2g 50s`. Unit bid uses the current bid, else the starting bid. |
| `left` (duration) | **Yes, estimated** | Short, medium, long, very long from the scan's time-left value. Aux's own labels (30m, 2h, 8h, 72h) are not the 1.12 buckets, so OctoBot uses the 1.12 ones; both are approximate. |
| `percent` (price as % of history) | **Yes** | Min/max market %, from OctoBot's 14-day daily history. Needs four days. |
| `seller` | **Partly** | Filter by owner GUID. Names are not in the auction packet. |
| Sort by columns, ascending/descending | **Yes** | Eight sorts plus a direction toggle, all server-side. |
| Saved and recent searches, favourites (`saved.lua`) | **Yes** | Named saved searches in `localStorage`; item favourites with variants. |
| Auction details, bid and buyout | **Read-only** | Every listing, bids, minimum next bid, buyout, unit price. No bidding or buying, by design. |
| Historical value and `profit` filters | **Partly** | History and market % are shown. Profit filters are not offered. |
| `utilizable` | **No** | Needs the player's class, level and known recipes. |
| `tooltip` text filter | **No** | Needs full tooltip text per item. The catalogue snapshot has no tooltip text, so the filter would be wrong, not just incomplete. |
| `vendor-profit`, `disenchant-*` filters | **No** | No vendor-price or disenchant data is collected. |
| `and` / `or` / `not` operators, typed filter strings | **No** | OctoBot uses form controls; all filters combine with AND. Saved searches replace the common reuse case. |

OctoBot extras Aux lacks: a price-history chart, daily history table, scan status and collector health, red/green movement arrows between
completed scans, a favourites overview with unavailable-item handling, and a layout usable on phones.

## How filtering works

All filters run on the Worker (`cloudflare/octometrics/auction-query.mjs`), so totals and pages cover every match. Item filters use the
per-scan item rows. Listing filters (stack, price, bid, time left, buyout, seller) rebuild each item's quantity, listings and cheapest price
from matching auctions only, and hide price movement because it would compare different sets of auctions.

Level, category and slot need catalogue fields on each listing. They are added by the collector (`auction-metadata.ts`) and stored by
`migrations/0003_auction_item_metadata.sql`. Until that migration is applied and a new scan completes, those filters match nothing.
