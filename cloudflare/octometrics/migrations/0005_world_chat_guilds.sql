-- Publicly visible guild metadata from confirmed /who results; no private guild chat.
CREATE TABLE IF NOT EXISTS world_chat_guilds (
  realm TEXT NOT NULL, author_key TEXT NOT NULL, guild TEXT NOT NULL, observed_ms INTEGER NOT NULL,
  PRIMARY KEY(realm,author_key)
);
CREATE INDEX IF NOT EXISTS world_chat_guild_expiry ON world_chat_guilds(observed_ms);
