-- Seed the cumulative counter from the retained, unique first-seen ledger.
-- Safe to re-run; reads one row per known ID only during this migration.
CREATE TABLE IF NOT EXISTS ah_historical_total (
 id INTEGER PRIMARY KEY CHECK(id=1),
 auction_count INTEGER NOT NULL CHECK(auction_count>=0)
);
CREATE TRIGGER IF NOT EXISTS ah_first_seen_count_insert
 AFTER INSERT ON ah_first_seen
 BEGIN
  UPDATE ah_historical_total SET auction_count=auction_count+1 WHERE id=1;
 END;
INSERT INTO ah_historical_total(id,auction_count)
 SELECT 1,COUNT(*) FROM ah_first_seen WHERE 1=1
 ON CONFLICT(id) DO UPDATE SET auction_count=excluded.auction_count;
