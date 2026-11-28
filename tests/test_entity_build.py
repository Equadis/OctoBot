from __future__ import annotations

import os
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import build_entity_database as builder  # noqa: E402
import crawl_official_lists as lists  # noqa: E402
import crawl_official_quests as quests  # noqa: E402

QUEST_PAGE = (
    "new Listview({template:'quest',id:'quests',data:["
    "{id: '610',name: '\\\"Pretty Boy\\\" Duncan',level: '39',reqlevel:32,side: '1',xp:2250,category:33,category2:0,type:0},"
    "{id: '7935',name: '10 Tickets - Last Month\\'s Mutton',level: '60',reqlevel:25,side: '3',itemrewards:[[19292,1]],"
    "xp:0,category:-364,category2:7,type:0},"
    "{id: '1',name: 'Choice',level: '5',reqlevel:1,side: '2',itemchoices:[[1,1],[2,1]],xp:10,category:1,category2:0,type:0}"
    "]});"
)
DETAIL_PAGE = (
    '<h1>Attunement to the Core</h1> Recover a Core Fragment. <h3>Description</h3> text '
    '<table class="infobox"><tr><td><ul><li><div>Level: 60</div></li>'
    '<li><div>Start : <a href="?npc=14387">Lothos Riftwaker</a></div></li>'
    '<li><div>End : <a href="?npc=14387">Lothos Riftwaker</a></div></li>'
    '</ul></td></tr></table>Quick Facts <h3>Reward</h3> <a href="?item=18412">Core Fragment</a> <h3>Progress</h3>'
)


class CrawlerParserTests(unittest.TestCase):
    def test_quest_listing_rows(self):
        rows = {r["id"]: r for r in quests.parse_listing(QUEST_PAGE)}
        self.assertEqual(rows[610]["name"], '"Pretty Boy" Duncan')
        self.assertEqual(rows[7935]["name"], "10 Tickets - Last Month's Mutton")
        self.assertEqual(rows[7935]["itemrewards"], [[19292, 1]])
        self.assertEqual(rows[1]["itemchoices"], [[1, 1], [2, 1]])
        self.assertEqual((rows[610]["level"], rows[610]["reqlevel"], rows[610]["side"], rows[610]["xp"]), (39, 32, 1, 2250))

    def test_quest_detail(self):
        detail = quests.parse_detail(DETAIL_PAGE, 7848)
        self.assertEqual(detail["start"], {"type": "npc", "id": 14387, "name": "Lothos Riftwaker"})
        self.assertIn("Core Fragment", detail["rewards"])
        self.assertIsNone(quests.parse_detail("<html>Not found</html>", 5))

    def test_spell_set_and_faction_rows(self):
        spells = lists.parse_spells("{name: '@Wrath',level: 1,school: 3,rank: 'Rank 1',skill: [574],id: 5176},"
                                    "{name: '@Teleport: Moonglade',level: 10,school: 6,rank: '',skill: [574],id: 18960}")
        self.assertEqual([(s["id"], s["name"], s["rank"], s["school"]) for s in spells],
                         [(5176, "Wrath", "Rank 1", 3), (18960, "Teleport: Moonglade", "", 6)])
        sets = lists.parse_sets("{name: '2Arcanist\\'s Regalia',pieces:[1,2,3],type: 1,id: 201}")
        self.assertEqual(sets, [{"id": 201, "name": "Arcanist's Regalia", "quality": 4, "pieces": [1, 2, 3], "type": 1}])
        factions = lists.parse_factions("{id: 47,name: 'Ironforge',group: 'Alliance',side: '1'},{id: 59,name: 'Thorium Brotherhood'}")
        self.assertEqual([(f["id"], f["side"]) for f in factions], [(47, 1), (59, None)])


class BuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.path = Path(cls.temp.name) / "entities.sqlite"
        cls.result = builder.build(cls.path)

    @classmethod
    def tearDownClass(cls):
        try:
            cls.temp.cleanup()
        except OSError:
            pass

    def test_item_catalogue_is_fully_imported(self):
        self.assertEqual(self.result["counts"]["item"], 19840)
        self.assertGreater(self.result["coverage"]["item"]["withTooltip"], 14000)

    def test_talents_and_spell_ranks_import(self):
        self.assertGreater(self.result["counts"]["talent"], 400)
        self.assertGreater(self.result["counts"]["spell"], 1000)

    def test_build_is_atomic_and_leaves_no_temp_files(self):
        self.assertEqual([p.name for p in Path(self.temp.name).iterdir()], ["entities.sqlite"])

    def test_rebuild_is_reproducible(self):
        other = Path(self.temp.name) / "again.sqlite"
        builder.build(other)
        query = "SELECT type, ref, name, norm, quality, level, rank, url, data FROM entities ORDER BY type, ref"
        with sqlite3.connect(self.path) as a, sqlite3.connect(other) as b:
            self.assertEqual(a.execute(query).fetchall(), b.execute(query).fetchall())

    @unittest.skipIf(os.name == "nt", "Windows cannot replace a file another handle holds open; POSIX (Railway) can")
    def test_rebuild_over_open_database_keeps_old_readers_working(self):
        from octobot.entity_linking.database import EntityDatabase
        db = EntityDatabase(self.path)
        self.assertTrue(db.available)
        builder.build(self.path)                        # atomic replace while a reader is open
        self.assertTrue(db.by_ref("item", 19019))       # next lookup reopens the new file
        db.close()

    def test_aliases_target_existing_entities(self):
        with sqlite3.connect(self.path) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM aliases a LEFT JOIN entities e ON e.id=a.entity_id "
                                          "WHERE e.id IS NULL").fetchone()[0], 0)

    def test_urls_are_official_item_and_spell_pages(self):
        with sqlite3.connect(self.path) as conn:
            url, = conn.execute("SELECT url FROM entities WHERE type='item' AND ref=19019").fetchone()
            self.assertEqual(url, "https://octowow.st/db/?item=19019")
            talent, = conn.execute("SELECT url FROM entities WHERE type='talent' LIMIT 1").fetchone()
            self.assertRegex(talent, r"^https://octowow\.st/db/\?spell=\d+$")


if __name__ == "__main__":
    unittest.main()
