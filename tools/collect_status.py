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


def needs_confirmation(official, auth) -> bool:
    """A single bad poll may be a transient website, routing or TLS error."""
    return (
        not official.reachable
        or bool(official.error)
        or any(state != "online" for state in official.realms.values())
        or auth.tcp_status != "reachable"
        or auth.auth_status != "responsive"
    )


def confirm_state(initial: str, repeated: str, healthy: str) -> str:
    """Never turn a single transient failure into a confirmed outage.

    A fresh healthy retry is usable, while the same negative state twice is
    confirmed. Disagreement or incomplete parsing remains unknown.
    """
    if repeated == healthy:
        return healthy
    if initial == repeated and repeated not in {"unknown", "unavailable"}:
        return repeated
    return "unknown"


async def take_sample() -> dict:
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=12)) as session:
        status_client = StatusClient(session)
        auth_probe = AuthProbe(
            os.getenv("OCTOWOW_AUTH_HOST", "play.octowow.st"),
            int(os.getenv("OCTOWOW_AUTH_PORT", "3724")),
            timeout_seconds=8,
        )

        async def once():
            return await asyncio.gather(status_client.fetch(), auth_probe.probe())

        first_official, first_auth = await once()
        official, auth = first_official, first_auth
        realms = {
            REALM_KEYS[name]: (
                official.realms.get(name, "unknown") if official.reachable else "unknown"
            )
            for name in REALMS
        }
        tcp, authentication = auth.tcp_status, auth.auth_status
        latency = auth.latency_ms
        result_code = auth.result_code
        auth_reason = auth.reason
        source_error = official.error

        if needs_confirmation(first_official, first_auth):
            # A second real probe (not a fabricated status) filters short-lived
            # network failures. Never mark an unconfirmed issue as downtime.
            await asyncio.sleep(2)
            official, auth = await once()
            realms = {
                REALM_KEYS[name]: confirm_state(
                    first_official.realms.get(name, "unknown")
                    if first_official.reachable else "unknown",
                    official.realms.get(name, "unknown")
                    if official.reachable else "unknown",
                    "online",
                )
                for name in REALMS
            }
            tcp = confirm_state(first_auth.tcp_status, auth.tcp_status, "reachable")
            authentication = confirm_state(
                first_auth.auth_status, auth.auth_status, "responsive"
            )
            # Only a real responsive challenge produces usable latency data.
            if authentication == "responsive":
                observed = auth if auth.auth_status == "responsive" else first_auth
                latency, result_code, auth_reason = (
                    observed.latency_ms, observed.result_code, observed.reason
                )
            else:
                latency, result_code = None, None
                auth_reason = (
                    auth.reason if first_auth.auth_status == auth.auth_status
                    else "Conflicting authentication checks; not a confirmed outage"
                )
            source_error = official.error
            if source_error and first_official.error != source_error:
                source_error = "Website check inconclusive after retry: " + source_error

        return {
            "timestamp": iso(datetime.now(timezone.utc)),
            "website": "available" if official.reachable and not official.error else "unavailable",
            "realms": realms,
            "tcp": tcp,
            "auth": authentication,
            "latency_ms": latency if authentication == "responsive" else None,
            "auth_result_code": result_code if authentication == "responsive" else None,
            "source_error": source_error,
            "auth_reason": auth_reason,
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
