"""Regression tests for safe publication of independent status observations."""
import unittest
from types import SimpleNamespace
from datetime import datetime, timedelta, timezone

from tools.collect_status import confirm_state, merge_history, needs_confirmation


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




class ConfirmationTests(unittest.TestCase):
    def test_transient_offline_recovers_on_retry(self):
        self.assertEqual(confirm_state("offline", "online", "online"), "online")

    def test_repeated_offline_is_real_observed_failure(self):
        self.assertEqual(confirm_state("offline", "offline", "online"), "offline")
        self.assertEqual(
            confirm_state("unresponsive", "unresponsive", "responsive"),
            "unresponsive",
        )

    def test_conflicting_results_are_not_marked_down(self):
        self.assertEqual(confirm_state("unknown", "offline", "online"), "unknown")
        self.assertEqual(
            confirm_state("unreachable", "unknown", "reachable"), "unknown"
        )

    def test_health_checks_are_not_retried_unnecessarily(self):
        official = SimpleNamespace(
            reachable=True, error=None, realms={"nzoth": "online"}
        )
        auth = SimpleNamespace(tcp_status="reachable", auth_status="responsive")
        self.assertFalse(needs_confirmation(official, auth))
        official.realms["nzoth"] = "offline"
        self.assertTrue(needs_confirmation(official, auth))
        official.realms["nzoth"] = "online"
        auth.auth_status = "unresponsive"
        self.assertTrue(needs_confirmation(official, auth))


if __name__=="__main__":
    unittest.main()
