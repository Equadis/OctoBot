-- Additive, repeatable migration. Search visible chat text, not item-link protocol markup.
CREATE INDEX IF NOT EXISTS world_chat_history_cursor ON world_chat_messages(realm,gm,observed_ms DESC,id DESC);
CREATE TABLE IF NOT EXISTS world_chat_search_text (
 realm TEXT NOT NULL, id TEXT NOT NULL, message TEXT NOT NULL, observed_ms INTEGER NOT NULL,
 PRIMARY KEY(realm,id)
);
CREATE INDEX IF NOT EXISTS world_chat_search_expiry ON world_chat_search_text(observed_ms);
