-- Apply ONLY after backup and approval: npx wrangler d1 execute octometrics --remote --file cloudflare/octometrics/migrations/0002_auction.sql
-- Dedicated Auction House tables; metric_events and all existing APIs are untouched.
CREATE TABLE IF NOT EXISTS ah_scans (
 scan_id TEXT PRIMARY KEY, realm TEXT NOT NULL CHECK(realm='N''Zoth'),
 status TEXT NOT NULL CHECK(status IN ('uploading','complete','failed')),
 started_at TEXT NOT NULL, completed_at TEXT, expected_pages INTEGER,
 reported_total INTEGER, page_count INTEGER NOT NULL DEFAULT 0,
 auction_count INTEGER NOT NULL DEFAULT 0, duration_ms INTEGER,
 error TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_ah_complete ON ah_scans(status,completed_at DESC);
-- Concurrent start requests cannot both create an uploading scan.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ah_single_upload ON ah_scans(status) WHERE status='uploading';
CREATE TABLE IF NOT EXISTS ah_pages (
 scan_id TEXT NOT NULL, page INTEGER NOT NULL, count INTEGER NOT NULL,
 response_ms INTEGER NOT NULL DEFAULT 0, received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(scan_id,page)
);
CREATE TABLE IF NOT EXISTS ah_listings (
 scan_id TEXT NOT NULL, auction_id INTEGER NOT NULL, page INTEGER NOT NULL,
 item_id INTEGER NOT NULL, variant TEXT NOT NULL DEFAULT '',
 item_name TEXT, quality INTEGER, icon_url TEXT,
 quantity INTEGER NOT NULL, start_bid INTEGER NOT NULL, current_bid INTEGER NOT NULL,
 min_next_bid INTEGER NOT NULL, buyout INTEGER, owner_guid TEXT,
 time_left_ms INTEGER, captured_at TEXT NOT NULL,
 PRIMARY KEY(scan_id,auction_id)
);
CREATE INDEX IF NOT EXISTS idx_ah_listings_item ON ah_listings(scan_id,item_id,variant,buyout);
CREATE INDEX IF NOT EXISTS idx_ah_listings_page ON ah_listings(scan_id,page);
CREATE TABLE IF NOT EXISTS ah_item_points (
 scan_id TEXT NOT NULL, item_id INTEGER NOT NULL, variant TEXT NOT NULL DEFAULT '',
 cheapest_auction_id INTEGER, unit_buyout REAL, quantity INTEGER NOT NULL,
 listings INTEGER NOT NULL, captured_at TEXT NOT NULL,
 PRIMARY KEY(scan_id,item_id,variant)
);
CREATE INDEX IF NOT EXISTS idx_ah_points_item ON ah_item_points(item_id,variant,scan_id);
CREATE TABLE IF NOT EXISTS ah_daily (
 item_id INTEGER NOT NULL, variant TEXT NOT NULL DEFAULT '',
 day TEXT NOT NULL, representative_unit REAL NOT NULL, quantity INTEGER NOT NULL,
 listings INTEGER NOT NULL, scan_id TEXT NOT NULL,
 PRIMARY KEY(item_id,variant,day)
);
CREATE INDEX IF NOT EXISTS idx_ah_daily_day ON ah_daily(day);
