-- Isolated PvP auction storage; does not alter any existing N'Zoth table.
CREATE TABLE IF NOT EXISTS pvp_ah_scans (
 scan_id TEXT PRIMARY KEY, realm TEXT NOT NULL CHECK(realm='Y''Shaarj'),
 status TEXT NOT NULL CHECK(status IN ('uploading','complete','failed')),
 started_at TEXT NOT NULL, completed_at TEXT, expected_pages INTEGER,
 reported_total INTEGER, page_count INTEGER NOT NULL DEFAULT 0,
 auction_count INTEGER NOT NULL DEFAULT 0, duration_ms INTEGER,
 error TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_pvp_ah_complete ON pvp_ah_scans(status,completed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pvp_ah_single_upload ON pvp_ah_scans(status) WHERE status='uploading';
CREATE TABLE IF NOT EXISTS pvp_ah_pages (
 scan_id TEXT NOT NULL, page INTEGER NOT NULL, count INTEGER NOT NULL,
 response_ms INTEGER NOT NULL DEFAULT 0, received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(scan_id,page)
);
CREATE TABLE IF NOT EXISTS pvp_ah_listings (
 scan_id TEXT NOT NULL, auction_id INTEGER NOT NULL, page INTEGER NOT NULL,
 item_id INTEGER NOT NULL, variant TEXT NOT NULL DEFAULT '',
 item_name TEXT, quality INTEGER, icon_url TEXT,
 quantity INTEGER NOT NULL, start_bid INTEGER NOT NULL, current_bid INTEGER NOT NULL,
 min_next_bid INTEGER NOT NULL, buyout INTEGER, owner_guid TEXT,
 time_left_ms INTEGER, captured_at TEXT NOT NULL,
 item_level INTEGER, req_level INTEGER, class_id INTEGER, subclass_id INTEGER, slot_id INTEGER,
 PRIMARY KEY(scan_id,auction_id)
);
CREATE INDEX IF NOT EXISTS idx_pvp_ah_listings_item ON pvp_ah_listings(scan_id,item_id,variant,buyout);
CREATE INDEX IF NOT EXISTS idx_pvp_ah_listings_page ON pvp_ah_listings(scan_id,page);
CREATE TABLE IF NOT EXISTS pvp_ah_item_points (
 scan_id TEXT NOT NULL, item_id INTEGER NOT NULL, variant TEXT NOT NULL DEFAULT '',
 cheapest_auction_id INTEGER, unit_buyout REAL, quantity INTEGER NOT NULL,
 listings INTEGER NOT NULL, captured_at TEXT NOT NULL,
 PRIMARY KEY(scan_id,item_id,variant)
);
CREATE INDEX IF NOT EXISTS idx_pvp_ah_points_item ON pvp_ah_item_points(item_id,variant,scan_id);
CREATE TABLE IF NOT EXISTS pvp_ah_daily (
 item_id INTEGER NOT NULL, variant TEXT NOT NULL DEFAULT '',
 day TEXT NOT NULL, representative_unit REAL NOT NULL, quantity INTEGER NOT NULL,
 listings INTEGER NOT NULL, scan_id TEXT NOT NULL,
 PRIMARY KEY(item_id,variant,day)
);
CREATE INDEX IF NOT EXISTS idx_pvp_ah_daily_day ON pvp_ah_daily(day);

CREATE TABLE IF NOT EXISTS pvp_ah_first_seen (
 auction_id INTEGER PRIMARY KEY,
 first_seen_at TEXT NOT NULL
);
INSERT OR IGNORE INTO pvp_ah_first_seen(auction_id,first_seen_at)
 SELECT l.auction_id,MIN(s.completed_at)
 FROM pvp_ah_listings l JOIN pvp_ah_scans s ON s.scan_id=l.scan_id
 WHERE s.status='complete' GROUP BY l.auction_id;

CREATE TABLE IF NOT EXISTS pvp_ah_item_metadata (
 item_id INTEGER PRIMARY KEY,
 item_name TEXT NOT NULL,
 quality INTEGER,
 icon_url TEXT,
 item_level INTEGER,
 req_level INTEGER,
 class_id INTEGER,
 subclass_id INTEGER,
 slot_id INTEGER,
 resolved_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pvp_ah_listings_metadata_item ON pvp_ah_listings(item_id);

CREATE TABLE IF NOT EXISTS pvp_ah_historical_total (
 id INTEGER PRIMARY KEY CHECK(id=1),
 auction_count INTEGER NOT NULL CHECK(auction_count>=0)
);
CREATE TRIGGER IF NOT EXISTS pvp_ah_first_seen_count_insert
 AFTER INSERT ON pvp_ah_first_seen
 BEGIN
  UPDATE pvp_ah_historical_total SET auction_count=auction_count+1 WHERE id=1;
 END;
INSERT INTO pvp_ah_historical_total(id,auction_count)
 SELECT 1,COUNT(*) FROM pvp_ah_first_seen WHERE 1=1
 ON CONFLICT(id) DO UPDATE SET auction_count=excluded.auction_count;
