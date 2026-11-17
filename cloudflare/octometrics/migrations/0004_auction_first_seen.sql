-- Apply after backup and approval, before deploying the updated Worker.
-- First observation is the completed scan time, not the actual posting time.
CREATE TABLE IF NOT EXISTS ah_first_seen (
 auction_id INTEGER PRIMARY KEY,
 first_seen_at TEXT NOT NULL
);
INSERT OR IGNORE INTO ah_first_seen(auction_id,first_seen_at)
 SELECT l.auction_id,MIN(s.completed_at)
 FROM ah_listings l JOIN ah_scans s ON s.scan_id=l.scan_id
 WHERE s.status='complete' GROUP BY l.auction_id;
