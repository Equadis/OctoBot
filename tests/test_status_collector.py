"""Regression tests for safe publication of independent status observations."""
import unittest
from datetime import datetime, timedelta, timezone

from tools.collect_status import merge_history


class StatusHistoryTests(unittest.TestCase):
    def setUp(self):
        self.now=datetime(2026,11,7,15,0,tzinfo=timezone.utc)

    def row(self, dt, status="online"):
        return {"timestamp":dt.isoformat().replace("+00:00","Z"),"realms":{"nzoth":status}}

    def test_latest_sample_replaces_duplicate_timestamp(self):
        old=self.row(self.now)
        fresh=self.row(self.now,"offline")
        rows=merge_history([old],fresh,self.now)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]["realms"]["nzoth"],"offline")

    def test_observations_outside_retention_are_removed(self):
        old=self.row(self.now-timedelta(days=91))
        current=self.row(self.now)
        rows=merge_history([old],current,self.now)
        self.assertEqual(rows,[current])

    def test_future_and_invalid_samples_are_rejected(self):
        invalid={"timestamp":"not a date"}
        future=self.row(self.now+timedelta(hours=1))
        current=self.row(self.now)
        rows=merge_history([invalid,future],current,self.now)
        self.assertEqual(rows,[current])

    def test_unknown_is_preserved_as_unknown(self):
        missing=self.row(self.now,"unknown")
        self.assertEqual(merge_history([],missing,self.now)[0]["realms"]["nzoth"],"unknown")


if __name__=="__main__":
    unittest.main()
