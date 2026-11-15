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
6. **Customisation (`customisation.py`, skin, face, hair style and hair colour built).** Reads `CharSections.dbc` and `CharHairGeosets.dbc` and writes the viewer's `charactercustomization` JSON (race 9 Goblin, 10 Blood Elf). Hair style is a geoset switch; the other options point texture targets at texture files (file ids invented from 9,100,000). The Goblin male applies it in the viewer with no errors and shows a hair style with its real hair texture. Open problems: (a) the head and face surface does not draw (only hair and eye glows do), so the head geoset logic of this model is not understood yet; (b) body skin detail is unconfirmed; (c) facial hair, ears and other options are not built; (d) Blood Elf skin colours repeat (a second `_10x` series) and are not tidied. `blp.py` now decodes palette BLPs itself, because Pillow reads their 8-bit alpha as zero (it made hair invisible).
7. **Equipment.** Armour needs the model's attachment points and texture regions to match what the viewer expects.
8. **Both bodies and High Elf.** Repeat for female and Blood Elf.
9. **Hosting.** Only with OctoWoW's agreement (see the rules above).

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
# Convert textures (BLP to WebP)
python tools/models/blp.py "D:/Octowow/Data" tools/models/out/tex "Character\Goblin\Male\GoblinMaleSkin00_100.blp"
# Extract to the ignored output folder
python tools/models/octo_mpq.py extract "D:/Octowow/Data/patch-5.mpq" tools/models/out "Character\Goblin\Male\GoblinMale.m2"
```
