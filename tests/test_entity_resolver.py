from __future__ import annotations

import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path

from octobot.entity_linking.database import EntityDatabase
from octobot.entity_linking.models import Reference
from octobot.entity_linking.resolver import Resolver
from entity_fixture import make_database


class ResolverTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)          # cleanups run last-in first-out: close DBs first
        self.path = make_database(Path(self.temp.name) / "entities.sqlite")
        self.db = EntityDatabase(self.path)
        self.addCleanup(self.db.close)
        self.resolver = Resolver(self.db)

    def resolve(self, kind, query):
        return self.resolver.resolve(Reference(kind, query))

    def assertResolves(self, kind, query, ref):
        result = self.resolve(kind, query)
        self.assertEqual(result.status, "resolved", f"{query}: {result}")
        self.assertEqual(result.entity.ref, ref, query)
        return result

    def test_all_forms_resolve_to_thunderfury(self):
        for query in ("Thunderfury, Blessed Blade of the Windseeker", "thunderfury, blessed blade of the windseeker",
                      "thunderfury", "thunderfurry", "TF", "19019", "Thunderfury Blessed Blade"):
            self.assertResolves("item", query, 19019)

    def test_tiers(self):
        expected = {
            "19019": "id", "Dark Leather Gloves": "exact", "dark-leather  gloves": "normalised",
            "TF": "alias", "Sulfuras": "head", "Sulfuras, Hand": "prefix", "Windseeker": "partial",
            "Thunderfurry": "fuzzy",
        }
        for query, tier in expected.items():
            self.assertEqual(Resolver(self.db).resolve(Reference("item", query)).tier, tier, query)

    def test_apostrophes_and_unicode(self):
        self.assertEqual(self.resolve("item", "royal seal of eldrethalas").status, "ambiguous")
        self.assertEqual(self.resolve("item", "Royal Seal of Eldre’Thalas").status, "ambiguous")
        self.assertResolves("item", "cafe creme coat", 7)
        self.assertResolves("item", "Café Crème Coat", 7)

    def test_ambiguous_duplicates_are_listed_not_chosen(self):
        for kind, query in (("quest", "Test of Endurance"), ("item", "Royal Seal of Eldre'Thalas"), ("item", "dark leather")):
            result = self.resolve(kind, query)
            self.assertEqual(result.status, "ambiguous", query)
            self.assertIsNone(result.entity)
            self.assertGreaterEqual(len(result.candidates), 2)
        self.assertEqual({e.ref for e in self.resolve("quest", "Test of Endurance").candidates}, {100, 101})

    def test_spell_ranks_are_separate_records(self):
        result = self.resolve("spell", "Sinister Strike")
        self.assertEqual(result.status, "ambiguous")
        self.assertEqual({e.rank for e in result.candidates}, {"Rank 1", "Rank 2"})
        self.assertResolves("spell", "Sinister Strike Rank 2", 1757)
        self.assertResolves("spell", "sinister strike (rank 1)", 1752)
        self.assertResolves("spell", "Backstab", 53)

    def test_choice_limit(self):
        from octobot.entity_linking.resolver import MAX_CHOICES
        entities = [("item", n, f"Widget {n}", {"quality": 1}) for n in range(1, 60)]
        path = make_database(Path(self.temp.name) / "many.sqlite", entities, [])
        many = EntityDatabase(path)
        self.addCleanup(many.close)
        result = Resolver(many).resolve(Reference("item", "widget"))
        self.assertEqual(result.status, "ambiguous")
        self.assertLessEqual(len(result.candidates), MAX_CHOICES)

    def test_wrong_type_and_missing(self):
        self.assertEqual(self.resolve("quest", "Thunderfury").status, "none")
        self.assertEqual(self.resolve("item", "Attunement to the Core").status, "none")
        self.assertEqual(self.resolve("item", "999999999").status, "none")
        self.assertEqual(self.resolve("spell", "133").status, "none")
        self.assertEqual(self.resolve("npc", "Thrall").status, "none")       # no npc data: stay silent
        self.assertEqual(self.resolve("item", "zzzzqqqq").status, "none")
        self.assertEqual(self.resolve("item", "xy").status, "none")

    def test_fuzzy_is_conservative(self):
        self.assertResolves("quest", "Atunement to the Core", 7848)
        self.assertEqual(self.resolve("item", "Thunder").status, "resolved")   # unique prefix of Thunderfury
        self.assertEqual(self.resolve("item", "banana split").status, "none")

    def test_wildcards_in_query_are_literal(self):
        self.assertEqual(self.resolve("item", "%").status, "none")
        self.assertEqual(self.resolve("item", 'Dark" OR "x').status, "none")

    def test_results_are_cached_and_cache_follows_rebuilds(self):
        first = self.resolve("item", "TF")
        self.assertIs(self.resolve("item", "TF"), first)
        # atomic replacement with different content is picked up without a restart
        other = make_database(Path(self.temp.name) / "next.sqlite",
                              [("item", 19019, "Thunderfury, Blessed Blade of the Windseeker", {"quality": 5}),
                               ("item", 5, "Brand New Item", {})], [])
        self.db.close()
        shutil.copyfile(other, self.path)
        self.assertResolves("item", "brand new item", 5)


class DatabaseFailureTests(unittest.TestCase):
    def test_missing_file(self):
        db = EntityDatabase(Path(tempfile.gettempdir()) / "definitely-not-here.sqlite")
        self.assertFalse(db.available)
        with self.assertRaises((OSError, sqlite3.Error)):
            Resolver(db).resolve(Reference("item", "foo"))

    def test_corrupt_file(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "entities.sqlite"
            path.write_bytes(b"this is not a database" * 100)
            db = EntityDatabase(path)
            self.assertFalse(db.available)
            self.assertIn("Error", db.error or "")

    def test_wrong_schema_version(self):
        with tempfile.TemporaryDirectory() as temp:
            path = make_database(Path(temp) / "entities.sqlite")
            conn = sqlite3.connect(path)
            conn.execute("UPDATE meta SET value='999' WHERE key='schema_version'")
            conn.commit()
            conn.close()
            self.assertFalse(EntityDatabase(path).available)


if __name__ == "__main__":
    unittest.main()
