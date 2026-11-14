-- Apply with: npx wrangler d1 execute octometrics --remote --file cloudflare/schema.sql
-- Never store passwords, account recovery keywords or authentication links in D1.
CREATE TABLE IF NOT EXISTS metric_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  realm TEXT NOT NULL,
  account TEXT NOT NULL,
  role TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_metric_realm_type_id ON metric_events(realm, type, id DESC);
CREATE INDEX IF NOT EXISTS idx_metric_observed ON metric_events(observed_at);
