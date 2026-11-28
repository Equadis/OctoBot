CREATE TABLE IF NOT EXISTS ah_market_baseline (
 scan_id TEXT NOT NULL, item_id INTEGER NOT NULL, variant TEXT NOT NULL DEFAULT '',
 avg_unit REAL, days INTEGER, price_samples INTEGER, price_excluded INTEGER,
 average_source TEXT, latest_listing_seen_at TEXT,
 PRIMARY KEY(scan_id,item_id,variant)
);
CREATE TABLE IF NOT EXISTS ah_market_ready (
 scan_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS pvp_ah_market_baseline (
 scan_id TEXT NOT NULL, item_id INTEGER NOT NULL, variant TEXT NOT NULL DEFAULT '',
 avg_unit REAL, days INTEGER, price_samples INTEGER, price_excluded INTEGER,
 average_source TEXT, latest_listing_seen_at TEXT,
 PRIMARY KEY(scan_id,item_id,variant)
);
CREATE TABLE IF NOT EXISTS pvp_ah_market_ready (
 scan_id TEXT PRIMARY KEY
);
