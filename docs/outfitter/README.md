# OctoBot Outfitter

Static browser outfitter at `docs/outfitter/`, linked from all dashboard pages.
Uses the existing OctoWoW equipment catalogue, independent of simulator builds.

## Included

- Fourteen visible equipment slots, slot/name/ID/type/quality search and pagination.
- Eight original races and male/female bodies, draggable/zoomable Classic 3D preview,
  head/cloak visibility, camera reset and full screen.
- Browser-local current outfit and up to 100 named outfits; sharing preserves race,
  body, visibility and equipment. T.O.L. equipment import/export is compatible with
  the slot format used in Otari98/Tmog.
- Two-handed/off-hand exclusion, wrong-slot validation and explicit unavailable
  appearance messages. Selected unsupported items stay in the saved outfit.

## Deploy

The existing Cloudflare population Worker now also serves the Outfitter's
read-only appearance routes. No new bindings, database migrations or secrets are
required. Deploy it **before** publishing the new page:

```sh
cd cloudflare/population
npx wrangler deploy
```

The frontend reads the Worker origin from `docs/telemetry.json`, as the other
monitoring pages do. Publish the repository's `docs/` directory through the
existing GitHub Pages setup. Open `/OctoBot/outfitter/`.

Without the Worker update the equipment browser, save/load and share still work,
but the 3D pane clearly reports that its appearance service is unavailable.

## Rendering and dependencies

Tmog is a Lua addon which uses the game's `DressUpModel:TryOn` API, rather than
shipping a browser renderer. This implementation re-creates its outfit workflow
and T.O.L. wire format in JavaScript. It does not redistribute its addon code,
textures or databases. Reference: https://github.com/Otari98/Tmog at
`0add080f75631ca2dda5d1e679292ee8b846420d`.

The page loads jQuery 3.7.1 (SRI checked) and Wowhead/Zam's hosted Classic
`ZamModelViewer`. The adapter's character/item contract was checked against the
renderer and https://github.com/Miorey/wow-model-viewer. No third-party renderer
or game assets are vendored. Their availability and upstream changes affect 3D
previews. WebGL must be supported/enabled.

`GET /api/outfitter/item/:id` reads the item's published OctoWoW display ID.
`GET /api/outfitter/assets/...` streams only allowlisted Classic model JSON,
geometry, skeletons and textures from the fixed Zam origin. Both return CORS
headers and cacheable responses. No caller-selected upstream hosts, arbitrary
scripts, cookies, credentials, writes or player data are accepted. Existing
population/status/presence routes and scheduled jobs are unchanged.

Custom OctoWoW models may be absent from the external Classic model library.
There is no retail-ID substitution: unavailable appearances are named and omitted
from the preview while remaining in the outfit. Race selection covers the eight
original races; custom races and facial/hair customisation are not implemented.
This is an appearance planner, not a transmog collection or eligibility checker.

## Verification

```sh
node --test tests/outfitter.test.mjs cloudflare/population/tests/*.test.mjs
node --check docs/outfitter/outfitter.mjs
```

Manual browser checks: search/equip, save/load, T.O.L. export/import, restore on
reload, body selection and invalid-code feedback. The managed test browser has
WebGL disabled, so full character/texture rendering and rotation require a final
smoke test in a WebGL-capable browser after Worker deployment. The no-WebGL
fallback is handled explicitly.
