-- Minute-by-minute credential-free service health; no account, IP or user data.
-- Recorded state values may be unknown when an upstream cannot be verified.
CREATE TABLE IF NOT EXISTS status_readings (
  timestamp_ms INTEGER PRIMARY KEY,
  website TEXT NOT NULL CHECK(website IN ('available','unavailable')),
  nzoth TEXT NOT NULL CHECK(nzoth IN ('online','offline','unknown')),
  yshaarj TEXT NOT NULL CHECK(yshaarj IN ('online','offline','unknown')),
  cthun TEXT NOT NULL CHECK(cthun IN ('online','offline','unknown')),
  tcp TEXT NOT NULL CHECK(tcp IN ('reachable','unknown')),
  auth TEXT NOT NULL CHECK(auth IN ('responsive','unknown')),
  latency_ms INTEGER,
  source_error TEXT
);
CREATE INDEX IF NOT EXISTS ix_status_timestamp ON status_readings(timestamp_ms DESC);
