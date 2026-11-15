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
   * **Worker changes (tests first, deploy manual):** allow the overlay paths in `assetPath`, read from the bucket binding, cache like the Zam proxy, return Zam's answer when the bucket has no object. Cover it with the existing `node:test` style tests using a fake bucket.
   * **Site changes:** none needed for the viewer itself (races and customisation are already data driven). Add a small notice while the model set is partial, and ship behind a Worker version check so an old Worker falls back to today's models.
   * **Before release, check:** all four bodies standing, three or four animations each, a full armour set, a helm, a cloak and weapons; the saved-outfit and share-link paths with the new races; mobile layout; and a comparison with how the characters look in the game, ideally confirmed by someone from OctoWoW.
   * **Known gaps to close or disclose first:** facial hair colour textures, hair scalp textures (left out), Blood Elf skin colour list has a duplicate series, eye glow colours and ears are untested, UV animations, events and particles are not converted, sheathing and off-hand or ranged items are untested, and helm hair-hiding uses Zam's rules, not the client's.
   * **Order:** (1) agreement, (2) build script, (3) Worker overlay and tests, (4) upload and manual deploy, (5) a review on a staging copy of the site, (6) release.
Steps 2, 3 and 6 are the hard ones. Expect weeks, not hours, to reach step 7.

## Cheaper alternative for High Elf

Zam's TBC library already has Blood Elf (`tbc/meta/character/19.json` and `20.json` exist). Supporting it needs only a small change to the appearance Worker so it can serve the TBC library, plus a deploy. It is the TBC Blood Elf model, which may not match OctoWoW's updated model exactly.

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
