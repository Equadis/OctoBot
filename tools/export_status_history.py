"""Read-only, privacy-safe export of existing OctoBot monitoring history.

Run on the machine containing the *real* data/octobot.db; never publish the DB.
The output contains only service states, timestamps, and aggregate incident counts.
It deliberately excludes Discord IDs, messages, accounts and report text.

Usage:
  python -m tools.export_status_history --db data/octobot.db \\
      --out docs/status/bot-history.json
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

REALM_KEYS = {
    "N'Zoth (Normal)": "nzoth",
    "Y'Shaarj (PvP)": "yshaarj",
    "C'Thun (Hardcore)": "cthun",
}


def normalized(value: str | None) -> str | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def select(connection: sqlite3.Connection, query: str, arguments: tuple = ()) -> list[sqlite3.Row]:
    return connection.execute(query, arguments).fetchall()


def single_checked(connection: sqlite3.Connection, table: str, where: str = "") -> str | None:
    rows = select(connection, f"SELECT last_checked_at FROM {table} {where} LIMIT 1")
    return normalized(rows[0]["last_checked_at"]) if rows else None


def periods(connection: sqlite3.Connection, table: str, checked: str | None, where: str = "",
            arguments: tuple = ()) -> list[dict]:
    rows = select(
        connection,
        f"SELECT status,started_at,ended_at FROM {table} {where} ORDER BY started_at",
        arguments,
    )
    result = []
    for row in rows:
        start = normalized(row["started_at"])
        end = normalized(row["ended_at"]) or checked
        if not start or not end or end <= start:
            continue
        if row["status"] not in {"online", "offline", "partial", "reachable",
                                 "unreachable", "responsive", "unresponsive",
                                 "malformed_response", "unknown"}:
            continue
        result.append({"start": start, "end": end, "status": row["status"]})
    return result


def auth_periods(connection: sqlite3.Connection) -> list[dict]:
    checked = single_checked(connection, "auth_state", "WHERE id=1")
    events = select(connection, "SELECT timestamp,new_status FROM auth_history ORDER BY timestamp")
    intervals = []
    for index, event in enumerate(events):
        start = normalized(event["timestamp"])
        end = normalized(events[index + 1]["timestamp"]) if index + 1 < len(events) else checked
        state = event["new_status"]
        if start and end and end > start and state in {
            "responsive", "unresponsive", "malformed_response", "unknown"
        }:
            intervals.append({"start": start, "end": end, "status": state})
    return intervals


def incident_rows(connection: sqlite3.Connection, table: str, kind: str) -> list[dict]:
    fields = {
        "incidents": ("worst_status", "worst_status"),
        "auth_incidents": ("latest_status", "latest_status"),
        "report_incidents": ("peak_unique_users", "peak_unique_users"),
    }
    column, key = fields[table]
    rows = select(connection, f"SELECT started_at,ended_at,{column} FROM {table} ORDER BY started_at")
    result = []
    for row in rows:
        start = normalized(row["started_at"])
        if not start:
            continue
        item = {
            "kind": kind,
            "start": start,
            "end": normalized(row["ended_at"]),
        }
        if table == "report_incidents":
            item["peak_reporters"] = max(0, int(row[key]))
        else:
            item["status"] = str(row[key]).lower()
        result.append(item)
    return result


def build_export(connection: sqlite3.Connection, now: datetime | None = None) -> dict:
    """Only queries an allowlist of monitoring tables; never exports the full DB."""
    current = now or datetime.now(timezone.utc)
    connection.row_factory = sqlite3.Row
    connection.execute("BEGIN")
    try:
        realm_intervals = {}
        for name, key in REALM_KEYS.items():
            checked = single_checked(connection, "realm_state", "WHERE realm=" +
                "'" + name.replace("'", "''") + "'")
            realm_intervals[key] = periods(
                connection, "realm_history", checked, "WHERE realm=?", (name,)
            )
        result = {
            "schema": 1,
            "source": "octobot_database",
            "exported_at": current.astimezone(timezone.utc).isoformat(
                timespec="seconds"
            ).replace("+00:00", "Z"),
            "service": periods(
                connection, "service_history",
                single_checked(connection, "service_state", "WHERE id=1")
            ),
            "realms": realm_intervals,
            "tcp": periods(
                connection, "connectivity_history",
                single_checked(connection, "connectivity_state", "WHERE id=1")
            ),
            "auth": auth_periods(connection),
            "incidents": (
                incident_rows(connection, "incidents", "official")
                + incident_rows(connection, "auth_incidents", "authentication")
                + incident_rows(connection, "report_incidents", "community")
            ),
        }
        result["incidents"].sort(key=lambda r: r["start"], reverse=True)
        return result
    finally:
        connection.rollback()  # read-only transaction


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=Path("data/octobot.db"))
    parser.add_argument("--out", type=Path, default=Path("docs/status/bot-history.json"))
    args = parser.parse_args()
    database = args.db.expanduser().resolve()
    if not database.is_file():
        parser.error(f"OctoBot database not found: {database}. Run this on the bot host.")
    # SQLite URI read-only mode does not create an empty database.
    uri = database.as_uri() + "?mode=ro"
    with sqlite3.connect(uri, uri=True, timeout=10) as connection:
        payload = build_export(connection)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")
    stats = {key: len(payload[key]) for key in ("service", "tcp", "auth", "incidents")}
    print(f"Exported {stats} monitoring records to {args.out} (no user data)")


if __name__ == "__main__":
    main()
