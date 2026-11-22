"""Searchable local index of every file the OctoWoW client archives name, with patch precedence.

    python tools/models/asset_index.py build  <Data folder> <out sqlite> [--include-mods]
    python tools/models/asset_index.py search <sqlite> <substring or SQL LIKE pattern> [--all] [--limit N]
    python tools/models/asset_index.py stats  <sqlite>

Only a client folder is read; nothing is modified or copied. The index holds names, sizes and archive names, not file contents.

Precedence follows how the 1.12 client loads archives (WoW.exe: the base archives in order, then patch.MPQ, then patch-?.MPQ in
alphabetical order, later archives override earlier ones). The OctoWoW release is base + patch.MPQ + patch-1..5. Single-letter
patches (patch-L/O/S/V/Z here) are mods this machine's player installed on top (patch-V is the Project Reforged HD pack), so they
are indexed only with --include-mods and flagged `official=0`; they never decide what an OctoWoW asset is.

A name is only known when an archive's (listfile) names it, or when a name was probed; `unnamed` counts blocks with no known name.
"""
import os
import re
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import octo_mpq  # noqa: E402

archive_rank = octo_mpq.archive_rank


def build(data_folder, out, include_mods=False):
    if os.path.exists(out):
        os.remove(out)
    db = sqlite3.connect(out)
    db.executescript("""
        CREATE TABLE archives(name TEXT PRIMARY KEY, rank INT, official INT, blocks INT, named INT, encrypted INT, size INT);
        CREATE TABLE files(path TEXT, archive TEXT, rank INT, official INT, size INT, packed INT, flags INT, winner INT);
        CREATE INDEX files_path ON files(path);
    """)
    paths = [os.path.join(data_folder, n) for n in os.listdir(data_folder) if re.search(r'\.mpq$', n, re.I)]
    for path in sorted(paths, key=lambda p: -archive_rank(p)[0]):
        rank, official = archive_rank(path)
        if not official and not include_mods:
            print(f'  skipped (not part of the OctoWoW release): {os.path.basename(path)}')
            continue
        try:
            archive = octo_mpq.Archive(path)
        except Exception as error:
            print(f'  cannot open {os.path.basename(path)}: {error}')
            continue
        listing = archive.read('(listfile)')
        names = sorted({n.strip().replace('/', '\\') for n in listing.decode('latin-1').splitlines() if n.strip()}) if listing else []
        named = enc = 0
        rows = []
        for n in names:
            info = archive.find(n)
            if info is None or not info['flags'] & 0x80000000 or info['flags'] & 0x02000000:   # not present or a deletion marker
                continue
            named += 1
            enc += bool(info['flags'] & 0x10000)
            rows.append((n.lower(), os.path.basename(path), rank, int(official), info['size'], info['packed'], info['flags'], 0))
        live = sum(1 for i in range(archive.bcount) if archive.block[i * 4 + 3] & 0x80000000)
        db.execute('INSERT INTO archives VALUES(?,?,?,?,?,?,?)', (os.path.basename(path), rank, int(official), live, named, enc, os.path.getsize(path)))
        db.executemany('INSERT INTO files VALUES(?,?,?,?,?,?,?,?)', rows)
        print(f'  {os.path.basename(path):18s} rank {rank} official {int(official)}  {named:6d} named of {live:6d} live blocks, {enc} encrypted')
    # The winner of each path is the highest-ranked archive; deletion markers were skipped above, so a deleted file is not special-cased.
    db.execute("""UPDATE files SET winner=1 WHERE rowid IN (SELECT rowid FROM files f WHERE rank=(SELECT MAX(rank) FROM files g WHERE g.path=f.path))""")
    db.commit()
    print(stats(db))
    return db


def stats(db):
    total = db.execute('SELECT COUNT(*) FROM files').fetchone()[0]
    paths = db.execute('SELECT COUNT(DISTINCT path) FROM files').fetchone()[0]
    return f'{total} file entries, {paths} distinct paths'


def search(db, pattern, all_versions=False, limit=200):
    like = pattern if '%' in pattern or '_' in pattern else f'%{pattern.lower().replace(chr(47), chr(92))}%'
    sql = 'SELECT path, archive, size, winner FROM files WHERE path LIKE ?' + ('' if all_versions else ' AND winner=1') + ' ORDER BY path LIMIT ?'
    return db.execute(sql, (like.lower(), limit)).fetchall()


def main(argv):
    if len(argv) < 2 or argv[0] not in ('build', 'search', 'stats'):
        print(__doc__)
        return 2
    if argv[0] == 'build':
        build(argv[1], argv[2], '--include-mods' in argv)
        return 0
    db = sqlite3.connect(argv[1])
    if argv[0] == 'stats':
        print(stats(db))
        for row in db.execute('SELECT name, rank, official, named, blocks, encrypted FROM archives ORDER BY rank DESC'):
            print(row)
        return 0
    limit = int(argv[argv.index('--limit') + 1]) if '--limit' in argv else 200
    for path, archive, size, winner in search(db, argv[2], '--all' in argv, limit):
        print(f'{path}\t{archive}\t{size}{"" if winner else "\t(overridden)"}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
