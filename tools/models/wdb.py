"""Reader for the client's item cache (WDB/itemcache.wdb, build 5875 layout), with names, flags and on-use spells.

    python tools/models/wdb.py <itemcache.wdb> <substring> [...]     list cached items whose name contains a substring

The cache only holds items this client has seen, so a missing id means "never seen", not "does not exist".
Layout after the four name strings (all 32-bit fields): display id, quality, flags, buy price, sell price, inventory type, allowed classes,
allowed races, item level, required level, required skill, skill rank, spell, honor rank, city rank, faction, reputation rank, max count,
stackable, container slots, 10 stat pairs, 5 damage triples, armor, 6 resistances, delay, ammo type, range modifier, 5 spell blocks of
(spell id, trigger, charges, cooldown, category, category cooldown), bonding, then the description string.
"""
import struct
import sys

SPELLS_AT = 65          # index of the first spell block among the fields that follow the names


def load_items(path):
    data = open(path, 'rb').read()
    pos, out = 20, {}
    while pos + 8 <= len(data):
        item_id, size = struct.unpack_from('<II', data, pos)
        if size == 0 or pos + 8 + size > len(data):
            break
        body = data[pos + 8:pos + 8 + size]
        cls, sub = struct.unpack_from('<II', body, 0)
        q, names = 8, []
        for _ in range(4):
            end = body.index(b'\0', q)
            names.append(body[q:end].decode('utf-8', 'replace'))
            q = end + 1
        fields = struct.unpack_from('<%dI' % ((len(body) - q) // 4), body, q)
        spells = []
        if len(fields) > SPELLS_AT + 30:
            for k in range(5):
                spell, trigger = fields[SPELLS_AT + k * 6], fields[SPELLS_AT + k * 6 + 1]
                if spell:
                    spells.append((spell, trigger))
        description = ''
        tail = q + 4 * (SPELLS_AT + 30 + 1)
        if tail < len(body):
            end = body.find(b'\0', tail)
            description = body[tail:end if end >= 0 else len(body)].decode('utf-8', 'replace')
        out[item_id] = {'id': item_id, 'class': cls, 'subclass': sub, 'name': names[0], 'display': fields[0], 'quality': fields[1],
                        'inventory_type': fields[5], 'allowed_races': fields[7], 'spells': spells, 'description': description}
        pos += 8 + size
    return out


if __name__ == '__main__':
    items = load_items(sys.argv[1])
    needles = [n.lower() for n in sys.argv[2:]]
    for item in items.values():
        if any(n in item['name'].lower() for n in needles):
            print(item['id'], item['name'], 'display', item['display'], 'spells', item['spells'], item['description'][:80])
