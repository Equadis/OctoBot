-- Persistent exact-ID recovery; does not alter prices or auction history.
CREATE TABLE IF NOT EXISTS ah_item_metadata (
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
CREATE INDEX IF NOT EXISTS idx_ah_listings_metadata_item ON ah_listings(item_id);
