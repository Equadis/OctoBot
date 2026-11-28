"""Polite, cached, resumable fetcher for the official OctoWoW database.

The site answers bursts with HTTP 429/502, so requests are spaced out and retried with
backoff.  Every response is cached on disk (``.entity-cache/``, git-ignored) so an
interrupted build never refetches a page.
"""
from __future__ import annotations

import hashlib
import os
import subprocess
import time
from pathlib import Path

ROOT = "https://octowow.st/db/"
CACHE = Path(__file__).resolve().parents[1] / ".entity-cache"
USER_AGENT = "OctoBot-entity-build/1.0 (+https://github.com/Equadis/OctoBot)"
MIN_GAP_SECONDS = 62.0   # the site sustains ~1 request/minute; faster traffic only earns 429s
_last_request = 0.0


def fetch(url: str, *, retries: int = 8, refresh: bool = False, binary_ok: bool = False) -> str:
    """Return the body for ``url`` (absolute, or relative to the database root)."""
    global _last_request
    if not url.startswith("http"):
        url = ROOT + url.lstrip("/")
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / (hashlib.sha256(url.encode()).hexdigest() + ".txt")
    if path.exists() and not refresh:
        return path.read_text(encoding="utf8")
    if os.environ.get("ENTITY_FETCH_CACHE_ONLY"):
        raise RuntimeError(f"Not cached (cache-only mode): {url}")
    delay = MIN_GAP_SECONDS
    for attempt in range(retries):
        wait = _last_request + delay - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _last_request = time.monotonic()
        result = subprocess.run(
            ["curl", "-sSL", "--max-time", "40", "-A", USER_AGENT, "-w", "\n%{http_code}", url],
            capture_output=True, text=True, encoding="utf8", errors="replace",
        )
        body, _, code = result.stdout.rpartition("\n")
        if code == "200" and body.strip():
            path.write_text(body, encoding="utf8")
            return body
        if code in ("404", "410"):
            raise FileNotFoundError(url)
        delay = min(300.0, delay + 45.0)
    raise RuntimeError(f"Could not fetch {url} after {retries} attempts (last status {code})")
