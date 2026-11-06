CREATE TABLE IF NOT EXISTS readings (
  realm TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  online INTEGER NOT NULL CHECK(online >= 0),
  source TEXT NOT NULL,
  PRIMARY KEY (realm, timestamp_ms)
);
CREATE INDEX IF NOT EXISTS ix_readings_latest ON readings(realm, timestamp_ms DESC);
