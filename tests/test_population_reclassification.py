"""Population sources must never misattribute the official website-wide census."""
from __future__ import annotations

import io
import json
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from octobot.population import (
    HISTORY, HISTORIES, REALMS, PopulationStore, Reading, fetch_reading,
    load_history, save_latest,
)

UTC = timezone.utc
STAMP = datetime(2026, 11, 8, 2, 0, tzinfo=UTC)


class CensusReclassificationTests(unittest.TestCase):
    def test_archive_is_assigned_to_all_and_nzoth_is_empty(self):
        self.assertEqual(HISTORIES["all"], HISTORY)
        self.assertNotEqual(HISTORIES["nzoth"], HISTORY)
        self.assertEqual(REALMS["all"], "All Realms")
        data = load_history(HISTORY)
        self.assertGreaterEqual(len(data), 9485)
        self.assertEqual({x.realm for x in data}, {"all"})
        self.assertEqual(load_history(HISTORIES["nzoth"], "nzoth"), [])

    def test_new_census_reading_is_all_not_nzoth(self):
        with patch("urllib.request.urlopen", return_value=io.BytesIO(b"Players online now: <b>1,234</b>")):
            with patch.dict("os.environ", {"POPULATION_NZOTH_URL": ""}):
                reading = fetch_reading()
                self.assertEqual((reading.realm, reading.online), ("all", 1234))
                with self.assertRaisesRegex(ValueError, "No verified population feed"):
                    fetch_reading("nzoth")

    def test_live_json_legacy_census_moves_to_all(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "live.json"
            old = {"timestamp": (STAMP - timedelta(minutes=1)).isoformat(), "online": 99, "source": "official census"}
            path.write_text(json.dumps({"nzoth": old}))
            save_latest(Reading(STAMP, 100, "all"), path)
            data = json.loads(path.read_text())
            self.assertEqual(list(data), ["all"])
            self.assertEqual(data["all"]["online"], 100)
            self.assertEqual(data["all"]["source"], "official census")

    def test_bot_sqlite_legacy_migration_is_one_time(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "population.db"
            with sqlite3.connect(path) as db:
                db.execute("""
                    CREATE TABLE population_readings_v2
                    (realm TEXT NOT NULL, timestamp TEXT NOT NULL, online INTEGER NOT NULL,
                    PRIMARY KEY(realm,timestamp))
                """)
                db.execute("INSERT INTO population_readings_v2 VALUES ('nzoth',?,321)", (STAMP.isoformat(),))
            store = PopulationStore(path)
            self.assertEqual(store.all(), [Reading(STAMP, 321, "all")])
            self.assertEqual(store.all("nzoth"), [])
            store.add([Reading(STAMP + timedelta(minutes=1), 12, "nzoth")])
            self.assertEqual(store.all("nzoth"), [Reading(STAMP + timedelta(minutes=1), 12, "nzoth")])
            self.assertEqual(store.all(), [Reading(STAMP, 321, "all")])

    def test_cloudflare_migration_reclasses_census_but_preserves_verified_nzoth(self):
        migration = Path(__file__).resolve().parents[1] / "cloudflare/population/migrations/0004_census_all_realms.sql"
        with sqlite3.connect(":memory:") as db:
            db.execute("""
                CREATE TABLE readings(
                  realm TEXT NOT NULL,timestamp_ms INTEGER NOT NULL,online INTEGER NOT NULL,
                  source TEXT NOT NULL,PRIMARY KEY(realm,timestamp_ms)
                )
            """)
            db.executemany("INSERT INTO readings VALUES (?,?,?,?)", [
                ("nzoth", 1000, 321, "official census"),
                ("nzoth", 2000, 12, "verified realm feed"),
                ("cthun", 1000, 4, "verified realm feed"),
            ])
            db.executescript(migration.read_text())
            rows = db.execute(
                "SELECT realm,timestamp_ms,online,source FROM readings ORDER BY realm,timestamp_ms"
            ).fetchall()
            self.assertEqual(rows, [
                ("all", 1000, 321, "official census"),
                ("cthun", 1000, 4, "verified realm feed"),
                ("nzoth", 2000, 12, "verified realm feed"),
            ])


if __name__ == "__main__":
    unittest.main()
