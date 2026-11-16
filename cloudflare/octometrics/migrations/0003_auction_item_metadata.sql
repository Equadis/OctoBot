-- Apply ONLY after backup and approval, and after 0002_auction.sql:
--   npx wrangler d1 execute octometrics --remote --file cloudflare/octometrics/migrations/0003_auction_item_metadata.sql
-- Additive: nullable catalogue metadata per listing, used by the level, category and slot filters.
-- NULL means "the catalogue does not describe this item"; filters never match NULL, nothing is guessed.
-- SQLite has no ADD COLUMN IF NOT EXISTS, so run this file once only.
ALTER TABLE ah_listings ADD COLUMN item_level INTEGER;
ALTER TABLE ah_listings ADD COLUMN req_level INTEGER;
ALTER TABLE ah_listings ADD COLUMN class_id INTEGER;
ALTER TABLE ah_listings ADD COLUMN subclass_id INTEGER;
ALTER TABLE ah_listings ADD COLUMN slot_id INTEGER;
