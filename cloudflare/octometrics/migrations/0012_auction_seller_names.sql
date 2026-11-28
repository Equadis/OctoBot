-- Character display names only; separate GUID namespaces for the two realms.
CREATE TABLE IF NOT EXISTS ah_seller_names (
 owner_guid TEXT PRIMARY KEY, character_name TEXT, attempted_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pvp_ah_seller_names (
 owner_guid TEXT PRIMARY KEY, character_name TEXT, attempted_at TEXT NOT NULL
);
