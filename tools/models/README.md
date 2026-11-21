# OctoWoW model conversion project

Goal: show OctoWoW's Goblin and High Elf (Blood Elf) character models in the Dressing Room. The site's 3D viewer is Zam's, and its Classic model library has Goblin but no Blood Elf. The OctoWoW client has both.

## Rules for this project

* **Extracted game files never go in this repository.** `tools/models/out/` is ignored. Only code and notes are committed.
* **Nothing derived from client files is published** (no converted models, textures or data tables) until the OctoWoW team has agreed. This includes Cloudflare R2 or any public host. Local use on your own machine is fine.
* The tools only read the client; they never modify it.

## What the client contains (verified 2026-11-15, `D:\Octowow\Data`)

| Model | Where | Format |
|---|---|---|
| Goblin male and female | `model.MPQ`, `patch.MPQ`, `patch-3/4/5.mpq` (newest in `patch-5.mpq`) | `MD20`, version 256 |
| Blood Elf male and female (High Elf) | `patch-3/4/5.mpq` (newest in `patch-5.mpq`) | `MD20`, version 256 |

No separate `HighElf` model files exist, so High Elves use the Blood Elf models. Later patches replace earlier ones, so `patch-5.mpq` wins.

## What the viewer needs

Loaded for a Goblin (captured from the Dressing Room, `?conv`): `meta/character/<id>.json`, `meta/charactercustomization/<id>.json`, `m2/<fileId>.m2`, `skin/<fileId>.skin`, `skel/<fileId>.skel` and `textures/<fileId>.webp`.

Zam's M2 is the modern chunked format: an `MD21` chunk holding an `MD20` of version 274, followed by `TXAC`, `LDV1`, `SKID` (skeleton file), `SFID` (skin files) and `TXID` (texture files). Bones, sequences and attachments live in the `.skel`, geometry views live in the `.skin`.

The client's models are the old single-file form: version 256 with embedded views and external `.anim` files. They must be converted.

## Plan

1. **Tools (done).** `octo_mpq.py` finds and extracts named files from the client archives.
2. **M2 reader (`m2v256.py`, geometry and animation done).**
   * Done and checked: the header map, vertices, the embedded skin view, texture definitions, sequences (161 for the Goblin), bones with translation, rotation and scale tracks (rotations are plain float quaternions), and attachments. 38 consistency rules pass for Goblin male and female, Blood Elf male and female, and Human male. Skinning the vertices with the Stand animation gives a recognisable standing body for both Goblin and Blood Elf, so the animation decode is validated.
   * Still to do: colours, transparency, UV animations, events, lights, cameras, emitters and the external `.anim` files (if any are used).
3. **Writer (`m2v274.py`, geometry and animation done, not yet tried in the viewer).** Emits `m2/<id>.m2` (MD21 v274 plus SKID, SFID, TXID), `skin/<id>.skin` and `skel/<id>.skel` (SKL1, SKS1, SKB1, SKA1) with invented file ids from 9,000,000 up. Rotations are re-compressed to int16 and key times made relative to each sequence. Verified by reading the output back and comparing with the v256 reader (19 rules, all four Goblin and Blood Elf bodies). Written empty or with a stand-in: colours, transparency (one opaque weight), UV animations, events, lights, cameras, particles, collision. Batch shader ids are a guess (0) until the viewer test.
4. **Textures (`blp.py`, done).** Decodes BLP (palette and DXT) to lossless WebP via Pillow; `octo_mpq.Client` searches every archive newest first. Checked by eye on the Goblin and Blood Elf skins, faces, pelvis and eye glow. The client's file names come from `CharSections.dbc` (race 9 Goblin, race 10 Blood Elf; fields: id, race, sex, section, variation, colour, three texture names); section 0 skin, 1 face, 3 hair, 4 underwear. Base hair textures such as `Hair00_00.blp` are fully transparent placeholders; real hair uses other colour rows.
5. **Proof of concept (`viewer_test.py`, geometry rendering works).** The converted Goblin male loads in Zam's viewer from a local server and stands in the Stand pose with the correct body. Not yet working: the head and face (geoset choice and face compositing need the customisation data from step 6), the viewer's texture compositing step (it needs the `Materials`, `TextureLayers` and `TextureSections` blocks of the customisation JSON, which Zam's Goblin file shows the standard 512 by 512 layout for), and animation playback and gear are unchecked. Fixing the reader's header map (a missed array) was needed first.
6. **Customisation (`customisation.py`, skin, face, hair style and hair colour built).** Reads `CharSections.dbc` and `CharHairGeosets.dbc` and writes the viewer's `charactercustomization` JSON (race 9 Goblin, 10 Blood Elf). Hair style is a geoset switch; the other options point texture targets at texture files (file ids invented from 9,100,000). The Goblin male applies it in the viewer with no errors and shows a hair style with its real hair texture. The Goblin's head is not in the base geoset: it is one of the 1xx geosets (ids 102 to 106, a full head with ears), picked by the facial hair style table `CharacterFacialHairStyles.dbc` (geoset = 100 x group + value), so a Facial Hair option is always built and one must always be selected; with it the Goblin male shows a head, ears and hair. Checked in the viewer (standing, default look): Goblin male and female and Blood Elf male and female all show correct body, face, hair and underwear. The flat-colour bug was the batch's texture-transform index pointing at an entry that did not exist (Zam's files hold one entry, 65535 meaning none, and every batch points at entry 0). Animations checked in the viewer: the Goblin male lists 162 named animations (the viewer maps our sequence ids correctly), poses at set frames look right for Walk, Run, Attack1H, SpellCastDirected, EmoteDance and Death (flailing at 20 percent, lying down at the end), the clock plays and loops, and the Blood Elf female skeleton poses correctly too (`pose('Walk', 0.3)` in the viewer_test page console). Open problems: (a) gear and UV animation are untested; (b) facial hair colour textures, hair scalp textures (they cover the Blood Elf female face with an ornate pattern, so they are left out) and other options are not built; (c) Blood Elf skin colours repeat (a second `_10x` series) and are not tidied. `blp.py` now decodes palette BLPs itself, because Pillow reads their 8-bit alpha as zero (it made hair invisible).
7. **Equipment (armour and weapons work; helms missing).** Tested with Zam's own item data on the converted models (`viewer_test.py` with `?items=[[slot,displayId],...]`): a full Might plate set (shoulders, chest, belt, legs, boots, bracers, gloves), the Black Baron cloak and Thunderfury or Sulfuras all draw correctly on the Goblin male and Blood Elf female, so the body texture layout, attachment points and geoset hiding match what the viewer expects. Helms: Zam's helm model files exist only for races 1 to 8, so a Goblin or Blood Elf asked for model file 0. `helms.py` fixes that: it looks the display id up in `ItemDisplayInfo.dbc` (the client's ids match Classic ids, for example 31260 is Helm_Plate_RaidWarrior_A_01), converts the client's own race models (`Item/ObjectComponents/Head/<model>_GoM/GoF/BeM/BeF.m2`, one bone and about 150 vertices each, which m2v256 and m2v274 handle unchanged), and `viewer_test.py` patches Zam's helm item data with those model files plus hair-hiding rows for race 10. Checked: the helm now draws on the Goblin male (covering the low-set head, hair tuft showing) and the Blood Elf female (face guard, hair showing). The helm texture still comes from Zam. For the site this needs the Worker to serve the same patched helm data (a display id to model file table built offline from the client) and the converted files to be hosted, which is step 9. Not tested: shoulder or weapon sheathing, off-hand and ranged items, UV animations on items.
8. **Both bodies and High Elf.** Repeat for female and Blood Elf.
9. **Site hookup and hosting (plan; nothing built, nothing published).**
   * **Gate first:** OctoWoW's agreement is required before any converted file leaves this machine (rules above). Until then everything stays local and the site keeps today's behaviour.
   * **Where the files live:** a private Cloudflare R2 bucket read only through the appearance Worker, never a public bucket and never this repository (GitHub Pages would publish it). The Worker already proxies a fixed allowlist of Zam paths; it gains an overlay: for the invented ids (9,000,000 and up) and for the four character metadata files (`meta/character/17..20.json`, `meta/charactercustomization/17..20.json`) and patched helm data (`meta/armor/1/<id>.json`) it serves the R2 copy, and everything else still goes to Zam. Goblin is ids 17 and 18 (replacing Zam's), Blood Elf is 19 and 20 (new).
   * **Offline build script (`build_overlay.py`, written and run):** one command that converts the four bodies, builds the customisation JSON, converts the textures they reference, converts every helm display id the site's item list can ask for (head slot), writes the patched helm JSON, and produces an upload folder plus a manifest. Uploading is a manual `wrangler r2 object put` step, like the other Worker deploys. Run on the current client files it takes about 20 seconds and writes 3,004 files (36 MB: skeletons 18.5, models 10.8, skins 2.9, textures 3.6, metadata 0.7): the four bodies (all 19 read-back checks pass for each), their four customisation records and character records, 622 textures (5 missing, because the client names five Blood Elf male torso skin files that do not exist), 787 helm models for 3,788 display ids (one Blood Elf female helm has no geometry and is skipped), `helms.json` and a `manifest.json` with every file's size and sha256. Ids are assigned in sorted order so a rerun gives byte-identical output. It refuses to write inside the repository (except the git-ignored `tools/models/out`). Flags: `--no-helms`, `--only 9:0,10:1`, `--limit-helms N`. Helm data is a table of display id to model file ids rather than patched copies of Zam's JSON, so the Worker merges it into Zam's own item data at request time (offline build, no network).
   * **Size:** bodies are small apart from the `.skel` files (4 to 5.5 MB each because every animation is inline; they compress well over the wire), textures are lossless WebP (a few dozen MB for all skin, face and hair colours), helms are about 145 Goblin and 219 Blood Elf models of roughly 15 KB each. All comfortably inside R2.
   * **Worker changes (written and tested, not deployed; see `cloudflare/population/README.md`):** allow the overlay paths in `assetPath`, read from the bucket binding, cache like the Zam proxy, return Zam's answer when the bucket has no object. Covered by `cloudflare/population/tests/overlay.test.mjs` with a fake bucket (9 tests). Helm data is merged at request time from `helms.json`, as the build script produces it. Enabling it still needs the bucket, an upload and a `wrangler.toml` binding, all manual.
   * **Site changes (made, safe with today's Worker):** the Dressing Room no longer refuses High Elf up front; it asks the appearance service for `meta/character/19.json` (or 20) and shows the old explanation only if that fails, so with today's Worker nothing changes and with the overlay High Elf gets a preview. Races, customisation and helms are otherwise data driven. Add a small notice while the model set is partial, and ship behind a Worker version check so an old Worker falls back to today's models.
   * **End-to-end test (done locally, 2026-11-17):** `node tools/models/e2e_server.mjs <overlay folder>` serves the real site (`docs/`) and the real Worker code on one origin with a file-backed stand-in for the bucket, and answers `/telemetry.json` itself so no repository file changes. In the real Dressing Room: High Elf male and Goblin female load full-body from the overlay, the Appearance panel lists skin colour, face, hair style, hair colour and facial hair from the converted data, the Alabaster Plate Helmet draws on both (helm data merged from `helms.json`), and the race and body buttons and the animation list work. `--no-overlay` runs the same server with no bucket (what is deployed today) for comparison. Not run on the live site, and not checked on a phone.
   * **Before release, check:** all four bodies standing, three or four animations each, a full armour set, a helm, a cloak and weapons; the saved-outfit and share-link paths with the new races; mobile layout; and a comparison with how the characters look in the game, ideally confirmed by someone from OctoWoW.
   * **Known gaps to close or disclose first:** facial hair colour textures, hair scalp textures (left out), Blood Elf skin colour list has a duplicate series, eye glow colours and ears are untested, UV animations, events and particles are not converted, sheathing and off-hand or ranged items are untested, and helm hair-hiding uses Zam's rules, not the client's.
   * **Order:** (1) agreement, (2) build script, (3) Worker overlay and tests, (4) upload and manual deploy, (5) a review on a staging copy of the site, (6) release.
Steps 2, 3 and 6 are the hard ones. Expect weeks, not hours, to reach step 7.

## Fixes after first user review (2026-11-17)

* **Goblin eyes had an extra texture in front.** The model carries colour-tint and transparency (fade) tracks per part; two of the four eye parts fade to nothing by default. The converter had ignored them, so both eye layers drew at once. `m2v256` now decodes colours (56 bytes: RGB track plus alpha track) and transparency tracks (28 bytes), `m2v274` writes them, and batches point at them. Constant single-key tracks are written for every animation.
* **High Elf skin blotches.** The table's NPC-only skins (flag 1: Dark Ranger and similar) were offered as colours but have no matching underwear. They are now left out (11 colours remain).
* **Missing textures.** The table names five Blood Elf male torso files that the client does not have, which showed as a red placeholder top. The builder skips textures the client lacks and the manifest lists them.
* **Option names.** The facial-hair table means head features on the Goblin ("Features"), earrings on the Blood Elf female ("Earrings") and facial hair on the Blood Elf male. Its columns are the geosets for groups 100, 300 and 200 in that order.
* **High Elf eye glow.** The glow is geoset 1702; the viewer leaves group 17 off unless a choice names it, so every Blood Elf skin choice now enables it. The glow texture follows the skin row (blue, red, green or purple); with the geoset on, the eyes glow whitish blue.

## Live Goblin still showed Zam's model after the deploy (2026-11-16)

Root cause (checked against the live Worker and a browser): the Worker returned the converted record for `meta/character/17.json` (`Model: 9000000`) but a browser that had visited before got Zam's (`Model: 119376`) from its HTTP cache, with the old `Cache-Control: public, max-age=604800`. The URL for ids 17 and 18 is the same one Zam's Goblin was served from, with a seven-day lifetime, so every returning visitor kept it for up to a week. Fixed by versioned asset URLs, no fallback to Zam for ids 17 to 20, and short lifetimes for unversioned converted paths; see `cloudflare/population/README.md`. `build_overlay.py` writes `version.json`; `upload_overlay.mjs` uploads it last.

## Helms made the Goblin's head disappear, and removing them did not bring it back (2026-11-18)

Two separate causes, both reproduced in the real Dressing Room by reading the viewer's visible-geoset flags (`?debug` exposes `window.__outfitter`):

1. **Wrong hide rules.** A helm's item data lists, per race, the geoset groups it hides; the viewer hides the geosets `100 x group` to `100 x group + 99` (group 0 is hair, 1 to 99). The worker copied Zam's rules for the new races, and Zam's hood rule ("hide facial hair 1, 2, 3") hides group 1. On the converted Goblin group 1 (102 to 106) is the head itself, so a hood deleted the head and left the eye pieces floating. Fixed by building each helm's hide rules for the four converted bodies from the client's own `HelmetGeosetVisData.dbc` (one row per helm look, one bit mask per hair, facial 1, 2, 3 and ears, the race bit being `1 << race id`; `ItemDisplayInfo` fields 12 and 13 name the male and female row). That reading reproduces Zam's rows for 89 percent of 968 race-and-helm combinations on the eight Classic races (the rest are OctoWoW's own changes). The result: a Goblin hood hides only the moustache piece, hair-only helms hide hair, and full helms hide the head, as the client intends. `build_overlay.py` writes them into `helms.json` (`{"models": ..., "hide": ...}`) and the Worker replaces Zam's rows for races 9 and 10 with them.
2. **The viewer does not recompute on removal.** `actor.wv(slot)` only drops the item; which geosets are visible is recomputed from the customisation and the worn items only when `setItems()` runs. The Dressing Room called `setItems` only when something was added, so taking a helm off left everything it hid still hidden until another item was equipped. `docs/outfitter/gear-diff.mjs` now sets the items (an empty list if need be) after any removal, in place with no model reload. This also covers every other slot and the Hide Head toggle, which is a removal.

Note for testing: the viewer only applies the pending recompute when it draws a frame, and a hidden browser pane draws none, so a script that reads the visible geosets must force a frame first.

## Cheaper alternative for High Elf

Zam's TBC library already has Blood Elf (`tbc/meta/character/19.json` and `20.json` exist). Supporting it needs only a small change to the appearance Worker so it can serve the TBC library, plus a deploy. It is the TBC Blood Elf model, which may not match OctoWoW's updated model exactly.

## Custom helm looks for every race (2026-11-16)

Zam's Classic library has no record for many OctoWoW helm display ids, so the Dressing Room showed "No preview" (for example Crown of Ten Storms, display 67102, the Outland look of `Helm_Mail_RaidShaman_B_01`). The client has them: one model per race and sex (`Item\ObjectComponents\Head\<model>_<race><sex>.m2`) and the item's texture named in `ItemDisplayInfo.dbc`.

* `custom_helms.py` converts them (all ten races, both sexes) and writes a complete Zam-shaped item record to `meta/armor/1/<display id>.json`, plus models from file id 9,700,000 and textures from 9,900,000. Textures the models share (spell glows) are converted once.
* `build_overlay.py ... --custom-helms ids.json [--custom-only]` adds them to the overlay build (so `version.json` covers them). `--custom-only` skips the bodies and the Goblin and Blood Elf helms; use it for a quick local build.
* The Worker (`cloudflare/population/src/outfitter.js`) serves the bucket's record when Zam answers 404 for a helm record. Zam helms that exist are merged exactly as before.
* Which ids: head-slot catalogue items whose display id has no `meta/armor/1/<id>.json` in the Classic library (checked 2026-11-16: 412 of 901 resolvable head items, 277 display ids, all 277 converted; 405 of the 412 had a client model). Other slots (shoulders, chests, weapons) are not done.
* Fixed along the way: a model whose transparency track has a key before its sequence starts (`Helm_Robe_D_04`) made the writer fail on a negative time; times are now clamped at 0.
* Local check: `node tools/models/e2e_server.mjs tools/models/out/custom 8090` and open `/outfitter/`; Crown of Ten Storms shows on Human and Orc. Goblin and Blood Elf need the full overlay (bodies) to be checked.
* **Unchanged rules:** nothing here is committed or uploaded. Publishing the output (R2) and deploying the Worker change both need OctoWoW's agreement and explicit approval.


## Custom looks beyond helms (2026-11-16)

The same approach covers every gear slot. Sampled in 2026-11-16 (60 catalogue items per inventory type), the share with no record in Zam's library was about 30 to 87 percent depending on the slot (shirts and tabards worst, cloaks and weapons best), so "No preview" is common.

* `find_missing_displays.py` lists which catalogue items lack a Zam record. The client has no item table (`Item.dbc` is server-side), so each item costs one lookup of its OctoWoW database page through the Worker; it is deliberately gentle (3 workers by default) and resumable. In practice about 0.3 items a second, so the whole catalogue takes hours. Run it per slot (`--slots 5,7`).
* `custom_gear.py`: chest, shirt, tabard, wrists, gloves, belt, legs and boots. These slots are texture regions only (`ComponentTextures` and `TextureFiles`). Checked against Zam's own records for one Classic item per slot: regions, texture files and sexes matched exactly. **Known gap:** Zam gives gloves and boots a geoset value (1 to 3) that the client's table does not hold for any display, so those silhouettes may differ from the game. Nothing is guessed to fill it.
* `custom_props.py`: shoulders (left and right model plus one texture) and weapons, shields and ranged (one model plus one texture). Checked against Zam's records for Pauldrons of Might, Thunderfury and a bow.
* `build_overlay.py --custom-gear missing.json` builds both from find_missing_displays.py output. The Worker fallback now covers `meta/armor/<slot>/<id>.json` and `meta/item/<id>.json`.
* Not done: cloaks (cape texture on the body), weapon enchant glows beyond the model's own textures, and any look whose client files are missing (reported in the build summary).
* Local check (2026-11-16): 277 helm records, 299 body-armour records and 60 shoulder and weapon records built in about three minutes (80 MB, 18,427 files). A Human wearing custom shoulders, shirt, tunic, trousers, boots, gloves, belt, bracers, axe and shield rendered in the real Dressing Room through `e2e_server.mjs`.
* Same rules as before: nothing here is committed or uploaded; publishing and the Worker deploy need OctoWoW's agreement and explicit approval.

## Commands

```sh
# Which archives hold a file?
python tools/models/octo_mpq.py probe "D:/Octowow/Data" "Character\Goblin\Male\GoblinMale.m2"
# Summarise and check an extracted model
python tools/models/m2v256.py tools/models/out/Character__Goblin__Male__GoblinMale.m2
# Convert to the modern format (output stays local)
python tools/models/m2v274.py tools/models/out/Character__Goblin__Male__GoblinMale.m2 tools/models/out/goblin_male
# Try a converted model in the Zam viewer (opens a local server)
python tools/models/viewer_test.py tools/models/out/Character__Goblin__Male__GoblinMale.m2 "Character\Goblin\Male\GoblinMaleSkin00_100.blp"
# Convert helm models for display ids (writes m2/skin/skel files and helms.json)
python tools/models/helms.py "D:/Octowow/Data" tools/models/out/helms 31260
# Build the whole overlay (bodies, customisation, textures, helms, manifest) into a folder outside the repo
python tools/models/build_overlay.py "D:/Octowow/Data" "D:/octo-overlay"
# Convert textures (BLP to WebP)
python tools/models/blp.py "D:/Octowow/Data" tools/models/out/tex "Character\Goblin\Male\GoblinMaleSkin00_100.blp"
# Extract to the ignored output folder
python tools/models/octo_mpq.py extract "D:/Octowow/Data/patch-5.mpq" tools/models/out "Character\Goblin\Male\GoblinMale.m2"
```

## Recovering every item appearance from the client (2026-11-21)

Goal: no yellow (i) in the Dressing Room because a model was missing or estimated. Everything below is local; outputs go to the git-ignored `out/` folder and nothing is uploaded.

Pipeline, in order:

1. `resolve_displays.py` builds item id to display id. Sources: the client's `WDB/itemcache.wdb` (the client has no `Item.dbc`), then OctoWoW's Tmog addon groups (`DisplayGroups.lua`: items that share one look; used only when every known member has identical assets in `ItemDisplayInfo.dbc`, and measured at 149 of 150 correct against the database), then, with `--fetch`, the OctoWoW database page of any item neither source places (the page the Worker already reads; cached, 4 at a time, no models downloaded).
2. `zam_compare.py` asks Zam's asset host which (viewer slot, display id) metadata files exist, the same files `usableDisplay()` asks for. Metadata only.
3. `item_overlay.py build` writes Zam-format records (`meta/armor/<slot>/<display>.json`, `meta/item/<display>.json`) for every display id Zam lacks: body textures (BLP to WebP, ids from 9,700,000), cloaks, shoulders, weapons, shields, ranged and helms for all ten races (models through `m2v274`, ids from 9,800,000). `item_overlay.py oracle` first proves the generator: it rebuilds the records of display ids Zam does hold and compares structure (texture regions and sexes, geoset groups, model slots). Fields of `ItemDisplayInfo.dbc` it relies on: 1 and 2 model, 3 and 4 model texture, 6 to 8 geoset groups, 12 and 13 helm geoset visibility, 14 to 21 body textures.
4. `recover_audit.py` sorts every item and slot pair into Verified, Recovered, Partially Recovered or Unresolved with exact reasons and writes `out/model-recovery-progress.md`. `local_audit.py` is the client-only check it uses.

The Worker (`cloudflare/population/src/outfitter.js`) now asks its bucket first for `meta/armor/*` and `meta/item/*` records; the bucket holds only display ids Zam lacks, so Zam is never overridden, and a missing or failing bucket changes nothing. Not deployed.

Found on the way: `m2v274` crashed on some bows and thrown weapons because a sequence pointed at keys stamped before it began (now clamped to 0, bodies unchanged).

## Archive precedence and the HD pack (2026-11-21)

`D:\Octowow\Data` holds the OctoWoW release (the base archives, `patch.MPQ`, `patch-1` to `patch-5`) **and** mods the player installed on top. WoW.exe
loads `patch.MPQ`, then `patch-?.MPQ` alphabetically, so a single-letter patch overrides the digits. Here `patch-V` is the Project Reforged HD pack
(33,299 textures that replace official ones: armour textures, baked NPC textures, character skins) and `patch-L/O/S/Z` are small local mods.

* `octo_mpq.Client(folder)` now follows the exe's load order and **leaves out letter patches** (`include_mods=True` opts in). `octo_mpq.archive_rank` is
  the single definition of the order. `Client.which(path)` names the archive that supplies a file, and encrypted archive members now decrypt.
* `asset_index.py build <Data> <out.sqlite>` indexes every named file (118,138 paths from the official archives) with its winning archive;
  `search` and `stats` query it. Names come from each archive's `(listfile)`; `patch.MPQ` has 5,710 blocks with no known name.
* **Finding:** until this change the reader ranked letter patches above the base archives, so the deployed build `8c2bbd319a49e0a6` contains
  4,949 textures decoded from the HD pack (of 9,325; models, skins, skeletons and metadata are unaffected) plus 28 orphan Goblin and High Elf character
  textures that only exist with the pack. Rebuilding from official archives only (`build_overlay.py` and `item_overlay.py`, merged with
  `merge_overlays.py`) gives `out/publish-official`, version `87965b06bb43d4b2`, 23,342 files. It is built locally and **not uploaded**: replacing live
  files is a public change that needs the owner's decision (see Publishing status).

## Character skins (donation-shop appearances)

Found by reading the client, not by assumption (`skins.py`, `skin_links.json`, `wdb.py`):

* The shop sells **"Mark of ..." tokens**: 40 items in the client's item cache that all cast spell 56053 ("This token will alter your character's
  skin, while leaving the haircut, hair color, and facial features unchanged"). Their names, allowed races and shop thumbnails
  (`Interface\ShopFrame\entries\<token>[_1|_2].blp`; `_1` male, `_2` female, none = single sex, see `Turtle_ShopUI.lua`) are in the client; the server decides which
  skin a token applies, so the client does **not** link tokens to textures.
* The skins are **texture-only changes of the normal race models** (no transformation, no new geometry, so equipment, helms and animations work as for
  any skin colour). 138 textures hold them: 99 `CharSections.dbc` skin rows flagged 1 (not selectable at creation) and 39 baked NPC textures
  (`Textures\BakedNpcTextures\*shop*.blp`, each with a `CreatureDisplayInfoExtra` row 15735 to 15774 and a `CreatureDisplayInfo` row 20962 to 20999). Each is a whole
  body texture that already contains the face, so the viewer needs no face or underwear layers for it.
* `skins.py discover` writes `discovery.json` and `audit.md`; `skins.py build` also converts the textures and shop pictures to WebP (ids from 9,900,000),
  writes `skins/catalogue.json` and one `skins/choices/<body>.json` per body, a manifest and `version.json`. Statuses follow the equipment audit
  (Verified, Recovered, Partially Recovered, Unresolved). **No skin is Verified**: a link between a token and a texture is evidence, not proof.
* `skin_links.json` records each link and its basis: `name` (file name and token name agree), `ordinal` (numbered series), `visual` (compared by eye with the
  shop's own picture). 24 of the 40 tokens have a link; the other 16 (every Orc, Troll, Gnome and most Undead and High Elf tokens) have only candidate
  textures, because their textures cannot be told apart from the pictures. Textures no token is linked to are offered as "Unlabelled client skins".
* The Worker adds each body's skin choices to its Skin Color option (`mergeSkinChoices`), serves the catalogue at `/api/outfitter/skins`, and the page keeps the
  choice out of the ordinary appearance list. See `cloudflare/population/README.md` and `docs/outfitter/README.md`.
* **Visually checked** (in the real viewer, compared with the shop picture, not in game): Mark of Fel Power (Human male), Mark of the Wildhammer Clan I
  (Dwarf male, plausible). Everything else passed automated checks only.

### Unresolved equipment, by cause

`unresolved_causes.py` sorts the 140 partly recovered or unresolved item-slot pairs of the audit: 56 have a texture for one sex only, 43 name no model for the
slot, 17 are weapons in model version 257 (read with the 256 layout, plausibility-checked only), 15 have no display id anywhere in the client, 5 miss their helm model
files, 2 name a texture the archives do not hold, 2 name a display id the client does not have. Apart from the version 257 weapons (needs a reader and a visual
check) none of these can be fixed from the client alone.

## Publishing status and rollback

* **Nothing from the skins work is uploaded or deployed.** The skins overlay is built under `tools/models/out/skins/overlay` and served only by
  `e2e_server.mjs` on this machine. The Worker and page changes are committed on the branch `feature/character-skins` only; the page hides the skin row until the
  service lists skins, so merging it before any upload changes nothing for visitors. Uploading converted client files still needs OctoWoW's agreement (rules above).
* `upload_overlay.mjs` now refuses to run without `--backup <folder>` (it saves the object each key already has before overwriting it) or an explicit `--no-backup`.
  A rollback of a published build is: restore the Worker (`npx wrangler rollback <version id>`), re-upload the backup folder
  (`node tools/models/upload_overlay.mjs <backup folder> octobot-models --no-backup`, which sends `version.json` last), and check with `/api/outfitter/models-version`.
  Resetting the version pointer alone is **not** a rollback when keys keep their names (`helms.json`, textures).
* The live build `8c2bbd319a49e0a6` was uploaded before this existed: its old `helms.json` was overwritten and is not recoverable except by rebuilding the previous
  commit. The Worker before that deployment is `1408876d-0345-4295-970d-53693bc16d1a`.
