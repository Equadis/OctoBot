"""Publish independent, credential-free status observations for the public dashboard.

Runs on GitHub Actions. Never converts an unavailable website or a missed probe
into an offline realm, and never sends an authentication proof or real account.
"""
from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import aiohttp

from octotracker.auth import AuthProbe
from octotracker.status import REALMS, StatusClient

ROOT = Path(__file__).resolve().parents[1]
LATEST = ROOT / "docs" / "status" / "latest.json"
HISTORY = ROOT / "docs" / "status" / "history.json"
KEEP_DAYS = 90
MAX_SAMPLES = KEEP_DAYS * 24 * 12 + 144
REALM_KEYS = {
    "N'Zoth (Normal)": "nzoth",
    "Y'Shaarj (PvP)": "yshaarj",
    "C'Thun (Hardcore)": "cthun",
}


def iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def load_history(path: Path) -> list[dict]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, list) else []
    except (OSError, ValueError):
        return []


def merge_history(existing: list[dict], sample: dict, now: datetime) -> list[dict]:
    """Deduplicate, validate and retain bounded observation history."""
    cutoff = now - timedelta(days=KEEP_DAYS)
    valid: dict[str, dict] = {}
    for row in [*existing, sample]:
        if not isinstance(row, dict) or not isinstance(row.get("timestamp"), str):
            continue
        try:
            t = datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00"))
        except ValueError:
            continue
        if t.tzinfo is None or t < cutoff or t > now + timedelta(minutes=2):
            continue
        # The collector publishes only these fields; ignore unexpected older fields.
        valid[row["timestamp"]] = row
    return [valid[k] for k in sorted(valid)][-MAX_SAMPLES:]


async def take_sample() -> dict:
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=12)) as session:
        official, auth = await asyncio.gather(
            StatusClient(session).fetch(),
            AuthProbe(
                os.getenv("OCTOWOW_AUTH_HOST", "play.octowow.st"),
                int(os.getenv("OCTOWOW_AUTH_PORT", "3724")),
                timeout_seconds=8,
            ).probe(),
        )
    # Unknown is mandatory if the website was unreachable or parsing was incomplete.
    realms = {
        REALM_KEYS[name]: (
            official.realms.get(name, "unknown") if official.reachable else "unknown"
        )
        for name in REALMS
    }
    return {
        "timestamp": iso(datetime.now(timezone.utc)),
        "website": "available" if official.reachable and not official.error else "unavailable",
        "realms": realms,
        "tcp": auth.tcp_status,
        "auth": auth.auth_status,
        "latency_ms": auth.latency_ms if auth.auth_status == "responsive" else None,
        "auth_result_code": auth.result_code if auth.auth_status == "responsive" else None,
        "source_error": official.error,
        "auth_reason": auth.reason,
    }


async def main() -> None:
    now = datetime.now(timezone.utc)
    sample = await take_sample()
    latest = {"schema": 1, "endpoint": "play.octowow.st:3724", "sample": sample}
    history = merge_history(load_history(HISTORY), sample, now)
    LATEST.parent.mkdir(parents=True, exist_ok=True)
    LATEST.write_text(json.dumps(latest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    HISTORY.write_text(json.dumps(history, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("Status observation published:", sample["timestamp"], sample["website"], sample["realms"], sample["auth"])


if __name__ == "__main__":
    asyncio.run(main())
