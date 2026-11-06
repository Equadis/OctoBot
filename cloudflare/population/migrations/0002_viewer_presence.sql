-- No account information, IP addresses or permanent tracking identifiers.
CREATE TABLE IF NOT EXISTS viewer_presence (
 session_id TEXT NOT NULL,
 page TEXT NOT NULL,
 last_seen_ms INTEGER NOT NULL,
 PRIMARY KEY(session_id,page)
);
CREATE INDEX IF NOT EXISTS ix_viewer_presence_recent ON viewer_presence(page,last_seen_ms DESC);
