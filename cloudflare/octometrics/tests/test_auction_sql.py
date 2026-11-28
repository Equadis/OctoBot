"""Offline SQLite checks for the actual D1 auction migration and SQL aggregation.
No network, credentials or production DB required.
"""
import pathlib
import re
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIGRATION = (ROOT / "migrations/0002_auction.sql").read_text()
WORKER = (ROOT / "auction.mjs").read_text()

def extracted_sql(prefix):
    match = re.search(r'db\.prepare\("(' + re.escape(prefix) + r'[^"]*)"\)\s*\.bind', WORKER)
    if not match:
        raise AssertionError("Worker SQL not found: " + prefix)
    return match.group(1)

class AuctionSqlTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("CREATE TABLE metric_events (event_id TEXT)")
        self.db.executescript(MIGRATION)
        self.db.execute("INSERT INTO ah_scans(scan_id,realm,status,started_at,reported_total) VALUES (?,?,?,?,?)",
                        ("scan_alpha", "N'Zoth", "uploading", "2026-11-16T12:00:00Z", 3))

    def tearDown(self):
        self.db.close()

    def test_migration_does_not_touch_existing_metrics_and_locks_active_scan(self):
        self.assertIsNotNone(self.db.execute("SELECT name FROM sqlite_schema WHERE name='metric_events'").fetchone())
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO ah_scans(scan_id,realm,status,started_at,reported_total) VALUES (?,?,?,?,?)",
                            ("scan_beta", "N'Zoth", "uploading", "2026-11-16T12:01:00Z", 0))
        self.db.execute("UPDATE ah_scans SET status='failed' WHERE scan_id='scan_alpha'")
        self.db.execute("INSERT INTO ah_scans(scan_id,realm,status,started_at,reported_total) VALUES (?,?,?,?,?)",
                        ("scan_beta", "N'Zoth", "uploading", "2026-11-16T12:02:00Z", 0))

    def insert_listing(self, auction_id, page, buyout, quantity, item_id=19019):
        self.db.execute("""INSERT INTO ah_listings(
         scan_id,auction_id,page,item_id,variant,item_name,quality,icon_url,quantity,
         start_bid,current_bid,min_next_bid,buyout,owner_guid,time_left_ms,captured_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
         ("scan_alpha", auction_id, page, item_id, "",
          "Verified Item", 4, "https://wow.zamimg.com/images/wow/icons/large/inv_sword_01.jpg",
          quantity, 50, 0, 50, buyout, "123", 3600000, "2026-11-16T12:01:00Z"))

    def test_positive_buyout_wins_over_zero_and_unit_price_is_correct(self):
        self.insert_listing(10, 0, 0, 1)
        self.insert_listing(11, 0, 1000, 1)
        self.insert_listing(12, 0, 1400, 2)
        self.db.execute(extracted_sql("INSERT INTO ah_item_points"), ("scan_alpha",)*4)
        actual = self.db.execute("""SELECT cheapest_auction_id,unit_buyout,quantity,listings
                   FROM ah_item_points WHERE scan_id=? AND item_id=?""", ("scan_alpha",19019)).fetchone()
        self.assertEqual(actual, (12,700.0,4,3))
        self.db.execute(extracted_sql("INSERT INTO ah_daily"),
                        ("2026-11-16T12:05:00Z", "scan_alpha", "scan_alpha", "scan_alpha"))
        day = self.db.execute("SELECT representative_unit FROM ah_daily WHERE item_id=19019").fetchone()
        self.assertEqual(day, (700.0,))

    def test_no_buyout_never_becomes_a_bargain_price(self):
        self.insert_listing(25, 0, 0, 1)
        self.insert_listing(26, 0, None, 2)
        self.db.execute(extracted_sql("INSERT INTO ah_item_points"), ("scan_alpha",)*4)
        auction_id, price = self.db.execute("SELECT cheapest_auction_id,unit_buyout FROM ah_item_points").fetchone()
        self.assertIn(auction_id, (25,26))
        self.assertIsNone(price)

    def test_auction_ids_cannot_be_reused_across_pages_in_a_scan(self):
        self.insert_listing(80, 0, 1000, 1)
        with self.assertRaises(sqlite3.IntegrityError):
            self.insert_listing(80, 1, 1100, 1)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM ah_listings").fetchone()[0], 1)

if __name__ == "__main__":
    unittest.main()
