-- Public World channel only. Do not store whispers, guild or party chat.
CREATE TABLE IF NOT EXISTS world_chat_messages (
  realm TEXT NOT NULL, id TEXT NOT NULL, observed_ms INTEGER NOT NULL, author_key TEXT NOT NULL,
  author TEXT NOT NULL, message TEXT NOT NULL, gm INTEGER NOT NULL CHECK(gm IN (0,1)),
  PRIMARY KEY(realm,id)
);
CREATE INDEX IF NOT EXISTS world_chat_recent ON world_chat_messages(realm,gm,observed_ms DESC);
CREATE INDEX IF NOT EXISTS world_chat_retention ON world_chat_messages(observed_ms);
CREATE TABLE IF NOT EXISTS world_chat_listings (
  realm TEXT NOT NULL, kind TEXT NOT NULL, author_key TEXT NOT NULL, tag TEXT NOT NULL,
  author TEXT NOT NULL, message TEXT NOT NULL, observed_ms INTEGER NOT NULL,
  PRIMARY KEY(realm,kind,author_key,tag)
);
CREATE INDEX IF NOT EXISTS world_chat_active ON world_chat_listings(realm,kind,observed_ms DESC);
CREATE INDEX IF NOT EXISTS world_chat_expiry ON world_chat_listings(observed_ms);
CREATE TABLE IF NOT EXISTS world_chat_heartbeat (realm TEXT PRIMARY KEY, observed_ms INTEGER NOT NULL);
