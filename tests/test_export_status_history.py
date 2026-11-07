"""Regression tests for privacy-safe historical status backfill."""
import sqlite3
import unittest
from datetime import datetime, timezone

from tools.export_status_history import build_export


class HistoricalExportTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript("""
        CREATE TABLE service_state (id INTEGER, last_checked_at TEXT);
        CREATE TABLE service_history (status TEXT, started_at TEXT, ended_at TEXT);
        CREATE TABLE realm_state (realm TEXT, last_checked_at TEXT);
        CREATE TABLE realm_history (realm TEXT, status TEXT, started_at TEXT, ended_at TEXT);
        CREATE TABLE connectivity_state (id INTEGER, last_checked_at TEXT);
        CREATE TABLE connectivity_history (status TEXT, started_at TEXT, ended_at TEXT);
        CREATE TABLE auth_state (id INTEGER, last_checked_at TEXT);
        CREATE TABLE auth_history (timestamp TEXT, new_status TEXT);
        CREATE TABLE incidents (started_at TEXT, ended_at TEXT, worst_status TEXT, user_id TEXT);
        CREATE TABLE auth_incidents (started_at TEXT, ended_at TEXT, latest_status TEXT);
        CREATE TABLE report_incidents (started_at TEXT, ended_at TEXT, peak_unique_users INTEGER, guild_id TEXT);
        """)
        self.db.execute("INSERT INTO service_state VALUES (1,'2026-11-07T15:00:00Z')")
        self.db.execute("INSERT INTO service_history VALUES ('online','2026-11-04T08:32:00Z',NULL)")
        self.db.execute("INSERT INTO realm_state VALUES (\"N'Zoth (Normal)\",'2026-11-07T15:00:00Z')")
        self.db.execute("INSERT INTO realm_history VALUES (\"N'Zoth (Normal)\",'online','2026-11-04T08:32:00Z',NULL)")
        self.db.execute("INSERT INTO connectivity_state VALUES (1,'2026-11-07T15:00:00Z')")
        self.db.execute("INSERT INTO connectivity_history VALUES ('reachable','2026-11-04T08:32:00Z',NULL)")
        self.db.execute("INSERT INTO auth_state VALUES (1,'2026-11-07T15:00:00Z')")
        self.db.execute("INSERT INTO auth_history VALUES ('2026-11-04T08:32:00Z','responsive')")
        self.db.execute("INSERT INTO incidents VALUES ('2026-11-04T08:30:24Z','2026-11-04T08:32:00Z','offline','secret')")
        self.db.execute("INSERT INTO report_incidents VALUES ('2026-11-05T11:00:00Z','2026-11-05T11:10:00Z',4,'secret-guild')")
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_exports_real_status_periods_with_check_cutoff(self):
        doc = build_export(self.db,datetime(2026,11,7,15,tzinfo=timezone.utc))
        self.assertEqual(doc['service'][0],{
            'start':'2026-11-04T08:32:00Z',
            'end':'2026-11-07T15:00:00Z',
            'status':'online',
        })
        self.assertEqual(doc['realms']['nzoth'][0]['status'],'online')
        self.assertEqual(doc['auth'][0]['status'],'responsive')
        self.assertEqual(doc['tcp'][0]['status'],'reachable')
        self.assertEqual(len(doc['incidents']),2)

    def test_does_not_export_private_identifiers(self):
        text = str(build_export(self.db))
        self.assertNotIn('secret',text)
        self.assertNotIn('guild_id',text)
        self.assertNotIn('user_id',text)
        self.assertNotIn('details',text)

    def test_no_fabricated_entries_for_missing_realms(self):
        doc=build_export(self.db)
        self.assertEqual(doc['realms']['cthun'],[])
        self.assertEqual(doc['realms']['yshaarj'],[])


if __name__ == '__main__':
    unittest.main()
