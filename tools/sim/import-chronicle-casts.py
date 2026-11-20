"""Summarise real SpellGo events from Chronicle's documented public API."""
import argparse
from collections import defaultdict
import gzip
import json
from pathlib import Path


REPORTS = "https://octo.chronicleclassic.com/instances/"
MAX_STREAM_BYTES = 64 * 1024 * 1024
TARGETS = {
    "holy strike": ("paladin:holy-strike", "paladin"),
    "trueshot aura": ("hunter:trueshot-aura", "hunter"),
}


class Reader:
    def __init__(self, data):
        self.data = memoryview(data)
        self.offset = 0

    def __bool__(self):
        return self.offset < len(self.data)

    def varint(self):
        result = 0
        for shift in range(0, 70, 7):
            if not self:
                raise ValueError("Truncated varint")
            value = self.data[self.offset]
            self.offset += 1
            if shift == 63 and value > 1:
                raise ValueError("Varint exceeds 64 bits")
            result |= (value & 127) << shift
            if value < 128:
                return result
        raise ValueError("Invalid varint")

    def take(self, length):
        end = self.offset + length
        if end > len(self.data):
            raise ValueError("Truncated field or encounter")
        data = self.data[self.offset:end]
        self.offset = end
        return data

    def delimited(self):
        return self.take(self.varint())


def fields(data):
    reader = Reader(data)
    result = {}
    while reader:
        number, kind = divmod(reader.varint(), 8)
        if number == 0:
            raise ValueError("Invalid protobuf field zero")
        if kind == 0:
            result[number] = reader.varint()
        elif kind == 2:
            result[number] = reader.delimited()
        elif kind in (1, 5):
            reader.take(8 if kind == 1 else 4)
        else:
            raise ValueError(f"Unsupported protobuf wire type {kind}")
    return result


def messages(data):
    # Chronicle concatenates encounter frames. Each frame contains its ID,
    # first timestamp, message count and a length-delimited protobuf block.
    reader = Reader(data)
    while reader:
        encounter_id = bytes(reader.delimited()).decode()
        reader.varint()
        count = reader.varint()
        block = Reader(reader.delimited())
        for _ in range(count):
            yield encounter_id, fields(block.delimited())
        if block:
            raise ValueError("Encounter frame did not match its message count")


def summarise(instance, data):
    if instance["tenant_slug"] != "octo" or instance["unlisted"] is not False:
        raise ValueError("Expected a public OctoWoW report")
    sources = defaultdict(lambda: {"casts": 0, "casters": set(), "levels": set()})
    encounters = {encounter["id"]: encounter["start_time"] for encounter in instance["encounters"]}
    if not encounters:
        raise ValueError("Expected a raid report with encounter metadata")
    for encounter_id, event in messages(data):
        if encounter_id not in encounters:
            raise ValueError("Spell stream contains an encounter outside the report")
        if fields(event.get(1, b"")).get(4):
            continue
        spell = fields(event.get(3, b""))
        label = bytes(spell.get(2, b"")).decode()
        target = TARGETS.get(label.casefold())
        spell_id = spell.get(1, 0)
        if not target or not 0 < spell_id <= 2**31 - 1:
            continue
        ability_id, class_id = target
        caster = bytes(event.get(4, b"")).decode()
        player = instance["players"].get(caster)
        if not player or player["class"].casefold() != class_id:
            continue
        summary = sources[(ability_id, class_id, spell_id)]
        summary["casts"] += 1
        summary["casters"].add(caster)
        level = player.get("level")
        if type(level) is int and 1 <= level <= 60:
            summary["levels"].add(level)
    versions = instance["versions"]
    return [{
        "abilityId": ability_id,
        "source": REPORTS + instance["slug"],
        "instanceId": instance["id"],
        "realm": instance["realm_name"],
        "instance": instance["name"],
        "startedAt": min(encounters.values()),
        "clientBuild": versions.get("wow_build"),
        "clientVersion": versions.get("wow_client"),
        "spellId": spell_id,
        "classId": class_id,
        "castStream": "spell_go",
        "casts": summary["casts"],
        "distinctCasters": len(summary["casters"]),
        "reportedCasterLevels": sorted(summary["levels"]),
    } for (ability_id, class_id, spell_id), summary in sorted(sources.items())]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("instance", type=Path, help="Public instance metadata JSON")
    parser.add_argument("spell_go", type=Path, help="Gzip-compressed successful spell stream for the same instance")
    args = parser.parse_args()
    instance = json.loads(args.instance.read_text())
    with gzip.open(args.spell_go, "rb") as stream:
        data = stream.read(MAX_STREAM_BYTES + 1)
    if len(data) > MAX_STREAM_BYTES:
        parser.error("Uncompressed stream exceeds 64 MiB")
    print(json.dumps(summarise(instance, data), indent=2))


if __name__ == "__main__":
    main()
