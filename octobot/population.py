"""Real population observations and collection. Standard library only (also used by CI)."""
from __future__ import annotations

import argparse
from contextlib import closing
import html
import json
import os
import re
import sqlite3
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

UTC = timezone.utc
ROOT = Path(__file__).resolve().parents[1]
HISTORY = ROOT / 'docs' / 'online-history.json'
LIVE = ROOT / 'docs' / 'live.json'
RELEASES = ROOT / 'docs' / 'releases.json'
CENSUS_URL = 'https://octowow.st/player-census'
GAP_SECONDS = 600
REALMS = {'all': "All Realms", 'nzoth': "N'Zoth (Normal)", 'yshaarj': "Y'Shaarj (PvP)", 'cthun': "C'Thun (Hardcore)"}
HISTORIES = {'all': HISTORY, 'nzoth': ROOT/'docs/history/nzoth.json', 'yshaarj': ROOT/'docs/history/yshaarj.json', 'cthun': ROOT/'docs/history/cthun.json'}


@dataclass(frozen=True)
class Reading:
    time: datetime
    online: int
    realm: str = 'all'


def parse_time(value: str) -> datetime:
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('History timestamps must include a timezone')
    return result.astimezone(UTC)


def load_history(path: Path, realm: str = 'all') -> list[Reading]:
    return decode_history(json.loads(path.read_text()), realm)


def decode_history(data, realm: str = 'all') -> list[Reading]:
    if not isinstance(data, list):
        raise ValueError('History must be a list of timestamp/online observations')
    rows = {}
    for item in data:
        count = item['online']
        if type(count) is not int or count < 0:
            raise ValueError('Population must be a non-negative integer')
        when = parse_time(item['timestamp'])
        rows[when] = Reading(when, count, realm)
    return [rows[t] for t in sorted(rows)]


def save_history(path: Path, readings: list[Reading]) -> None:
    if len({r.realm for r in readings}) > 1:
        raise ValueError('A history file must contain exactly one realm')
    rows = {r.time: r for r in readings}
    data = [{'timestamp': t.isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
             'online': rows[t].online} for t in sorted(rows)]
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, separators=(',', ':')) + '\n')
    temporary.replace(path)


def save_latest(reading: Reading, path: Path = LIVE) -> None:
    """Publish a tiny per-realm reading snapshot for the dashboard.

    This is an observation, not a guess: no expiry is hidden from the client.
    """
    try:
        current = json.loads(path.read_text()) if path.exists() else {}
    except (OSError, ValueError):
        current = {}
    if not isinstance(current, dict):
        current = {}
    existing = current.get(reading.realm)
    if isinstance(existing, dict) and isinstance(existing.get('timestamp'), str):
        try:
            if parse_time(existing['timestamp']) > reading.time:
                return
        except ValueError:
            pass
    # Relabel the legacy website-wide census sample, but never erase a future
    # separately verified N'Zoth reading.
    if reading.realm == 'all' and current.get('nzoth', {}).get('source') == 'official census':
        current.pop('nzoth', None)
    current[reading.realm] = {
        'timestamp': reading.time.isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
        'online': reading.online, 'source': 'official census' if reading.realm == 'all' else 'verified realm feed'
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(current, separators=(',', ':')) + '\n')
    temp.replace(path)


def parse_online(page: str) -> int:
    match = re.search(r'Players\s+online\s+now:\s*<b[^>]*>\s*([\d,\s]+)\s*</b>', html.unescape(page), re.I)
    if match is None:
        raise ValueError('The census page did not contain an online player count')
    return int(re.sub(r'[,\s]', '', match[1]))


def fetch_reading(realm: str = 'all') -> Reading:
    if realm not in REALMS:
        raise ValueError('Unknown realm')
    # The official census is a site-wide headline, not a verified N'Zoth-only feed.
    url = CENSUS_URL if realm == 'all' else os.getenv('POPULATION_'+realm.upper()+'_URL', '').strip()
    if not url:
        raise ValueError(f'No verified population feed configured for {REALMS[realm]}')
    request = urllib.request.Request(url, headers={'User-Agent': 'OctoBot-Population/1.0'})
    with urllib.request.urlopen(request, timeout=20) as response:
        page = response.read(2_000_001)
        if len(page) > 2_000_000:
            raise ValueError('Unexpectedly large population response')
    if realm == 'all':
        count = parse_online(page.decode('utf-8'))
    else:
        payload = json.loads(page)
        count = payload['online']
        if type(count) is not int or count < 0:
            raise ValueError('Feed online must be a non-negative integer')
    return Reading(datetime.now(UTC), count, realm)


def missing_intervals(rows: list[Reading], start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    """The complement of observed intervals, without interpolating over collection gaps."""
    cursor = start
    missing = []
    for a, b in zip(rows, rows[1:]):
        if (b.time - a.time).total_seconds() > GAP_SECONDS:
            continue
        left, right = max(start, a.time), min(end, b.time)
        if right <= left:
            continue
        if left > cursor:
            missing.append((cursor, left))
        cursor = max(cursor, right)
    if cursor < end:
        missing.append((cursor, end))
    return missing


def observed_average(rows: list[Reading], start: datetime, end: datetime) -> float | None:
    total = duration = 0.0
    for a, b in zip(rows, rows[1:]):
        span = (b.time - a.time).total_seconds()
        left, right = max(start, a.time), min(end, b.time)
        if not 0 < span <= GAP_SECONDS or left >= right:
            continue
        va = a.online + (b.online-a.online) * (left-a.time).total_seconds()/span
        vb = a.online + (b.online-a.online) * (right-a.time).total_seconds()/span
        seconds = (right-left).total_seconds()
        total += (va+vb)/2 * seconds
        duration += seconds
    return total/duration if duration else None


class PopulationStore:
    def __init__(self, path: Path):
        self.path = path

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=15)
        connection.execute('CREATE TABLE IF NOT EXISTS population_readings_v2 (realm TEXT NOT NULL, timestamp TEXT NOT NULL, online INTEGER NOT NULL CHECK(online >= 0), PRIMARY KEY (realm,timestamp))')
        return connection

    def add(self, rows: list[Reading]) -> None:
        with closing(self.connect()) as connection:
            connection.executemany('INSERT OR IGNORE INTO population_readings_v2 VALUES (?, ?, ?)',
                                   [(r.realm, r.time.isoformat(), r.online) for r in rows])
            connection.commit()

    def all(self, realm: str = 'all') -> list[Reading]:
        with closing(self.connect()) as connection:
            data = connection.execute('SELECT timestamp, online FROM population_readings_v2 WHERE realm=? ORDER BY timestamp', (realm,)).fetchall()
        return [Reading(parse_time(t), n, realm) for t, n in data]


def collect_file(path: Path, realm: str = 'all') -> Reading | None:
    rows = load_history(path,realm) if path.exists() else []
    # Failure leaves history unchanged; it is never converted to zero or SERVER DOWN.
    try:
        reading = fetch_reading(realm)
    except Exception as exc:
        print(f'Population collection failed; history retained: {type(exc).__name__}: {exc}')
        return None
    save_history(path, rows + [reading])
    print(f'Recorded {reading.online} online at {reading.time.isoformat()}')
    return reading


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    parser.add_argument('--realm', choices=list(REALMS), default='all')
    parser.add_argument('--all', action='store_true')
    args = parser.parse_args()
    for realm in (REALMS if args.all else [args.realm]):
        observation = collect_file(args.output or HISTORIES[realm], realm)
        if observation is not None:
            save_latest(observation)
