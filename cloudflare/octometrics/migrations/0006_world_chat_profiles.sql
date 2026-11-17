CREATE TABLE IF NOT EXISTS world_chat_profiles (
 realm TEXT NOT NULL, author_key TEXT NOT NULL, guild TEXT NOT NULL, level INTEGER, class_id INTEGER, observed_ms INTEGER NOT NULL,
 PRIMARY KEY(realm,author_key)
);
CREATE INDEX IF NOT EXISTS world_chat_profile_expiry ON world_chat_profiles(observed_ms);
