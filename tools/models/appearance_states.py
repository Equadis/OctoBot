"""Why an item pair has no complete preview, and what the Dressing Room should say about it.

    imported by recover_audit.py; `python tools/models/appearance_states.py <states.json>` prints a summary of a written states file.

The audit (recover_audit.py) puts every item and slot pair in a class. Pairs that are not Verified or Recovered are looked at again here, against the
client's own ItemDisplayInfo row and item cache, and given a cause and a state:

  invisible   the client defines nothing to draw: the item cache lists display id 0, or the display row names no model or texture at all (hidden-slot
              items, test placeholders, deprecated items). The preview shows nothing, exactly as the game does; nothing is missing.
  missing     the client names files it does not contain, or has no display row for the id: no usable model exists.
  unresolved  the display row names assets only for a different slot, or a model of another kind: the item's data is inconsistent, the intended
              appearance is unknown.
  incomplete  a model loads but an asset the row names is absent (a texture for one sex, a helm model for some races, ...).

`states_file()` turns those rows into meta/octobot/appearance-states.json, a small table the page reads once. Nothing here substitutes another
item's model: no matching by name or icon.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import local_audit  # noqa: E402

VISUAL_CHECKS = os.path.join(HERE, 'visual_checks.json')
NO_TEXTURE = re.compile(r'\d_null', re.I)                  # the client's placeholder for "no texture"

MODEL_FIELDS = (1, 2)
TEXTURE_FIELDS = (3, 4)
BODY_FIELDS = tuple(range(14, 22))
HIDDEN_NAME = re.compile(r"\bhidden\b|unseen fashion|emperor's new", re.I)
PLACEHOLDER_NAME = re.compile(r'^test\b', re.I)
DEPRECATED_NAME = re.compile(r'^old', re.I)


def named_fields(assets, display_id):
    """{field number: name} of the non-empty model, texture and body texture fields of a display row (None when the row does not exist)."""
    row = assets.rows.get(display_id)
    if row is None:
        return None
    return {i: assets.string(row[i]) for i in MODEL_FIELDS + TEXTURE_FIELDS + BODY_FIELDS
            if assets.string(row[i]) and not NO_TEXTURE.fullmatch(os.path.splitext(assets.string(row[i]))[0])}


def visually_checked(display_id, group):
    """True when a display id is listed in visual_checks.json under `group`: a model that loads and was looked at in the real viewer."""
    try:
        checks = json.load(open(VISUAL_CHECKS, encoding='utf-8'))
    except (OSError, ValueError):
        return False
    return display_id in checks.get(group, {}).get('displays', [])


def model_elsewhere(assets, name):
    """The folder a named model is found in when it is not where this slot looks: 'Weapon', 'Shoulder', ... (None when it exists nowhere)."""
    base = os.path.splitext(name)[0]
    for folder in ('Weapon', 'Shield', 'Shoulder', 'Ammo', 'Quiver', 'Pouch'):
        if assets.has(f'Item/ObjectComponents/{folder}/{base}.m2'):
            return folder
    return 'Head' if assets.has(f'Item/ObjectComponents/Head/{base}_HuM.m2') else None


def relevant_fields(viewer_slot, inventory_type=0):
    """The display-row fields the game reads for an item in this slot (local_audit.BODY and the model fields)."""
    if viewer_slot in local_audit.BODY:
        return tuple(local_audit.BODY[viewer_slot]) + (tuple(local_audit.ROBE_EXTRA) if inventory_type == 20 else ())
    if viewer_slot == 1:
        return (1, 3)
    if viewer_slot == 3:
        return (1, 2, 3, 4)
    if viewer_slot == 16:
        return (3,)
    return (1, 3)                                    # weapons, shields, held items, ranged


def classify_unresolved(row, assets, cache_display=None):
    """(category, cause, explanation) for a pair the overlay could not build. `row` is a recover_audit row; `cache_display` is the display id the client's
    own item cache gives the item (0 means the server defines no appearance), or None when the cache does not hold it."""
    name, slot, display = row['name'], row['viewerSlot'], row['displayId']
    if display is None:
        if cache_display == 0:
            return ('Invisible', 'display-id-0', "The game client's item cache gives this item display id 0: the server defines no appearance for it (a placeholder with a question-mark icon).")
        return ('Unresolved', 'no-display-id', 'No source gives this item a display id.')
    fields = named_fields(assets, display)
    if fields is None:
        if PLACEHOLDER_NAME.search(name):
            return ('Invisible', 'placeholder', f'Test placeholder: the client has no display row {display} for it, so the game draws nothing.')
        return ('Missing', 'no-display-row', f"The client's ItemDisplayInfo table has no row {display} for this item, so there is nothing to build.")
    if not fields:
        if HIDDEN_NAME.search(name):
            return ('Invisible', 'hidden-by-design', 'A hidden-slot item: its display row names no model or texture, so equipping it draws nothing in that slot, as intended.')
        if PLACEHOLDER_NAME.search(name):
            return ('Invisible', 'placeholder', 'Test placeholder: its display row names no model or texture, so the game draws nothing.')
        if DEPRECATED_NAME.search(name):
            return ('Invisible', 'deprecated', 'A deprecated item: its display row names no model or texture, so the game draws nothing.')
        return ('Invisible', 'row-empty', f"The client's display row {display} names no model or texture, so the game draws nothing for this item.")
    wanted = [f for f in relevant_fields(slot) if f in fields]
    for f in wanted:
        if f in MODEL_FIELDS:
            folder = model_elsewhere(assets, fields[f])
            expected = 'Head' if slot == 1 else 'Shoulder' if slot == 3 else 'Weapon'
            if folder and folder != expected and not (slot in (21, 22, 26) and folder in local_audit.WEAPON_DIRS):
                return ('Unresolved', 'other-slot', f"The client's display row {display} names the model {fields[f]}, which is a {folder.lower()} model, for an item worn in "
                        f'this slot: the item\'s data is inconsistent and its intended appearance is unknown.')
    if not wanted:
        return ('Unresolved', 'other-slot', f"The client's display row {display} names assets only for a different kind of slot ({', '.join(sorted(set(fields.values()))[:2])}); "
                'nothing in it applies to this item, so its intended appearance is unknown.')
    return ('Missing', 'files-missing', f"The client's display row {display} names {', '.join(sorted(set(fields[f] for f in wanted))[:2])}, but those files are not in the client.")


def gaps_of(row):
    """What is absent from a partially recovered pair: {'sexes': ['female'], 'what': [...]} from the audit's clientMissing and the overlay's notes."""
    sexes, what = set(), []
    for text in row.get('clientMissing', []) + row.get('overlayNotes', []):
        for match in re.finditer(r'\bno (female|male) texture', text.lower()):
            sexes.add(match.group(1))
        what.append(text)
    return {'sexes': sorted(sexes), 'what': what[:6]}


def partial_state(row):
    """(category, cause, explanation) for a Partially Recovered pair, or None when the client simply defines less than a full set and that is the whole
    appearance (one shoulder model: the game draws one pauldron)."""
    notes = row.get('overlayNotes', [])
    if row['viewerSlot'] == 3 and notes and all(re.fullmatch(r'no (left|right) model named', n) for n in notes) and len(notes) == 1:
        side = 'left' if 'left' in notes[0] else 'right'
        return ('Recovered', 'single-shoulder', f'The client names only a {"right" if side == "left" else "left"} shoulder model: the game draws a single pauldron.')
    if notes and all(n.endswith('(plausibility-checked only)') and 'M2 version 257' in n for n in notes) and not row.get('clientMissing'):
        if visually_checked(row.get('displayId'), 'm2-v257-models'):
            return ('Recovered', 'm2-v257-verified', 'The model is M2 version 257, read with the version 256 layout; it was rendered in the real viewer and looks correct.')
        return ('Incomplete', 'm2-v257-unchecked', 'The model is M2 version 257, read with the version 256 layout, and has not been looked at in the viewer.')
    gaps = gaps_of(row)
    if row['viewerSlot'] == 1 and any('helm model' in n for n in notes):
        have = sorted({int(m) for m in re.findall(r'race (\d+)', ' '.join(notes))})
        return ('Incomplete', 'helm-races', 'The client has this helm model only for some races; other races show it without the helm.')
    if gaps['sexes']:
        who = ' and '.join(gaps['sexes'])
        return ('Incomplete', 'sex-texture', f'The client has no {who} texture for part of this item: {who} characters show that part bare.')
    if any('texture' in n and 'not found' in n for n in notes):
        return ('Incomplete', 'texture-missing', 'A texture this model names is not in the client; the model is drawn without it.')
    return ('Incomplete', 'other', '; '.join(notes[:2]) or 'Something the display row names is absent from the client.')


STATE_OF = {'Invisible': 'invisible', 'Missing': 'missing', 'Unresolved': 'unresolved', 'Incomplete': 'incomplete'}


def states_file(rows):
    """The table the page reads: '<item id>:<viewer slot>' -> {state, cause, why, sexes?}. Only pairs that need a state are listed."""
    table = {}
    for row in rows:
        state = row.get('state')
        if state:
            entry = {'state': state, 'cause': row['cause'], 'why': row['stateWhy']}
            if row.get('gapSexes'):
                entry['sexes'] = row['gapSexes']
            table[f'{row["itemId"]}:{row["viewerSlot"]}'] = entry
    return {'version': 1, 'items': table}


def main(argv):
    if len(argv) != 1:
        print(__doc__)
        return 2
    table = json.load(open(argv[0], encoding='utf-8'))['items']
    from collections import Counter
    print(dict(Counter((v['state'], v['cause']) for v in table.values())))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
