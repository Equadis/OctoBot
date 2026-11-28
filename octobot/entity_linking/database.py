"""Read-only access to ``data/entities.sqlite`` (separate from the moderation/tracker databases).

The file is replaced atomically by ``tools/build_entity_database.py``. Each lookup checks the
file's identity and reopens the connection when it changed, so a rebuild never needs a restart.
All methods are synchronous; the cog calls them through ``asyncio.to_thread``.
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Iterable

from .models import DATABASE_ROOT, URL_KEYS, Entity

log = logging.getLogger(__name__)
SCHEMA_VERSION = 1
DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "entities.sqlite"

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE entities (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    ref INTEGER NOT NULL,
    name TEXT NOT NULL,
    norm TEXT NOT NULL,
    head TEXT NOT NULL,
    icon TEXT,
    quality INTEGER,
    level INTEGER,
    rank TEXT,
    url TEXT,
    source TEXT NOT NULL,
    updated TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    UNIQUE (type, ref)
);
CREATE INDEX idx_entities_norm ON entities(type, norm);
CREATE INDEX idx_entities_name ON entities(type, name COLLATE NOCASE);
CREATE INDEX idx_entities_head ON entities(type, head);
CREATE TABLE aliases (norm TEXT NOT NULL, entity_id INTEGER NOT NULL, alias TEXT NOT NULL);
CREATE INDEX idx_aliases_norm ON aliases(norm);
CREATE VIRTUAL TABLE search USING fts5(norm, tokenize='trigram', content='');
"""

_ORDER = "ORDER BY COALESCE(e.quality, 0) DESC, COALESCE(e.level, 0) DESC, e.name, e.ref"


def official_url(kind: str, ref: int) -> str:
    return f"{DATABASE_ROOT}?{URL_KEYS[kind]}={ref}"


def _like_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class EntityDatabase:
    def __init__(self, path: str | os.PathLike[str] | None = None):
        self.path = Path(path or os.environ.get("ENTITY_DATABASE_PATH") or DEFAULT_PATH)
        self._lock = threading.Lock()
        self._conn: sqlite3.Connection | None = None
        self._identity: tuple[int, int, int] | None = None
        self.error: str | None = None

    # ------------------------------------------------------------------ connection
    def _stat(self) -> tuple[int, int, int]:
        st = self.path.stat()
        return (st.st_mtime_ns, st.st_size, getattr(st, "st_ino", 0))

    def _connection(self) -> sqlite3.Connection:
        identity = self._stat()
        if self._conn is not None and identity == self._identity:
            return self._conn
        if self._conn is not None:
            self._conn.close()
            self._conn = None
        uri = f"file:{self.path.resolve().as_posix()}?mode=ro&immutable=1"
        conn = sqlite3.connect(uri, uri=True, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            version = conn.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
            if version is None or int(version[0]) != SCHEMA_VERSION:
                raise sqlite3.DatabaseError("unsupported entity database schema")
        except Exception:
            conn.close()
            raise
        self._conn, self._identity = conn, identity
        return conn

    def _query(self, sql: str, params: Iterable[Any] = ()) -> list[sqlite3.Row]:
        with self._lock:
            try:
                rows = self._connection().execute(sql, tuple(params)).fetchall()
                self.error = None
                return rows
            except (OSError, sqlite3.Error) as exc:
                self.error = f"{type(exc).__name__}: {exc}"
                if self._conn is not None:
                    self._conn.close()
                    self._conn = None
                raise

    @property
    def available(self) -> bool:
        try:
            self._query("SELECT 1 FROM meta LIMIT 1")
            return True
        except (OSError, sqlite3.Error):
            return False

    def close(self) -> None:
        with self._lock:
            if self._conn is not None:
                self._conn.close()
                self._conn = None

    # ------------------------------------------------------------------ rows -> entities
    @staticmethod
    def _entity(row: sqlite3.Row) -> Entity:
        try:
            data = json.loads(row["data"] or "{}")
        except ValueError:
            data = {}
        return Entity(
            key=row["id"], type=row["type"], ref=row["ref"], name=row["name"], icon=row["icon"],
            quality=row["quality"], level=row["level"], rank=row["rank"],
            url=row["url"] or official_url(row["type"], row["ref"]),
            source=row["source"], updated=row["updated"], data=data,
        )

    def _entities(self, sql: str, params: Iterable[Any]) -> list[Entity]:
        return [self._entity(r) for r in self._query(sql, params)]

    # ------------------------------------------------------------------ lookups
    def by_ref(self, kind: str, ref: int) -> list[Entity]:
        return self._entities("SELECT e.* FROM entities e WHERE e.type=? AND e.ref=?", (kind, ref))

    def by_name(self, kind: str, name: str, limit: int = 60) -> list[Entity]:
        return self._entities(
            f"SELECT e.* FROM entities e WHERE e.type=? AND e.name=? COLLATE NOCASE {_ORDER} LIMIT ?",
            (kind, name, limit),
        )

    def by_norm(self, kind: str, norm: str, limit: int = 60) -> list[Entity]:
        return self._entities(
            f"SELECT e.* FROM entities e WHERE e.type=? AND e.norm=? {_ORDER} LIMIT ?", (kind, norm, limit)
        )

    def by_alias(self, kind: str, norm: str, limit: int = 60) -> list[Entity]:
        return self._entities(
            f"""SELECT e.* FROM aliases a JOIN entities e ON e.id = a.entity_id
                WHERE a.norm=? AND e.type=? {_ORDER} LIMIT ?""",
            (norm, kind, limit),
        )

    def by_head(self, kind: str, norm: str, limit: int = 60) -> list[Entity]:
        """Names whose part before the first comma equals ``norm`` ("Thunderfury, Blessed Blade...")."""
        return self._entities(
            f"SELECT e.* FROM entities e WHERE e.type=? AND e.head=? {_ORDER} LIMIT ?", (kind, norm, limit)
        )

    def by_prefix(self, kind: str, norm: str, limit: int = 60) -> list[Entity]:
        return self._entities(
            f"SELECT e.* FROM entities e WHERE e.type=? AND e.norm LIKE ? ESCAPE '\\' {_ORDER} LIMIT ?",
            (kind, _like_escape(norm) + "%", limit),
        )

    def by_substring(self, kind: str, norm: str, limit: int = 200) -> list[Entity]:
        """Entities whose normalised name contains ``norm`` (FTS5 trigram index; needs 3+ chars)."""
        if len(norm) < 3:
            return []
        phrase = '"' + norm.replace('"', '""') + '"'
        return self._entities(
            "SELECT e.* FROM search s JOIN entities e ON e.id = s.rowid WHERE search MATCH ? AND e.type=? LIMIT ?",
            (phrase, kind, limit),
        )

    def fuzzy_candidates(self, kind: str, norm: str, limit: int = 80) -> list[Entity]:
        """Bounded candidate set for spelling-error matching: names sharing trigrams with ``norm``."""
        grams = {norm[i:i + 3] for i in range(max(0, len(norm) - 2)) if " " not in norm[i:i + 3]}
        if not grams:
            return []
        match = " OR ".join('"' + g.replace('"', '""') + '"' for g in sorted(grams)[:24])
        return self._entities(
            """SELECT e.* FROM search s JOIN entities e ON e.id = s.rowid
               WHERE search MATCH ? AND e.type=? ORDER BY bm25(search) LIMIT ?""",
            (match, kind, limit),
        )

    # ------------------------------------------------------------------ metadata
    def meta(self) -> dict[str, str]:
        return {r["key"]: r["value"] for r in self._query("SELECT key, value FROM meta")}

    def counts(self) -> dict[str, int]:
        return {r["type"]: r["n"] for r in self._query("SELECT type, COUNT(*) n FROM entities GROUP BY type")}
