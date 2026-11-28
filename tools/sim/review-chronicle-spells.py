"""Build the reviewed classification of single-class Chronicle spells.

Every row below was read from https://octowow.st/db/?spell=<id> on 2026-11-22 and compared with
the label and caster class seen in a public Chronicle report. Fields:
  db              (name, rank, level, school, effects) exactly as the database shows them
  classification  active-ability | proc | periodic-effect | talent-effect | excluded-event
  disposition     catalogue-entry (identity validated, no rank/coefficient claims) | excluded | disputed
  confidence      db (effects shown by the page support the class) | inferred (class from name/family)
The database does not state the owning class, so class comes from the log caster. A non-disputed row
must have a database name equal to the Chronicle label, otherwise this tool stops.
"""
import argparse
import json
from pathlib import Path

REVIEWED_ON = "2026-11-22"
DB = "https://octowow.st/db/?spell="
AC, PR, PE, TE, EX = "active-ability", "proc", "periodic-effect", "talent-effect", "excluded-event"
CE, XX, DI = "catalogue-entry", "excluded", "disputed"

# id: (dbName, rank, level, school, effects, classification, disposition, confidence, reason)
R = {
    11337: ("Instant Poison VI", "Rank 6", 60, "Nature", "School Damage 112", PR, CE, "inferred", "Rogue weapon poison; the page shows direct Nature damage and no proc wording, so proc behaviour is inferred from the spell family."),
    11682: ("Hellfire Effect", "Rank 3", 54, "Fire", "School Damage 208, radius 10 yd", PE, CE, "inferred", "Tick damage of the channelled Warlock Hellfire; the page shows a direct area damage effect, so the tick behaviour is inferred."),
    51714: ("Power Overwhelming", None, 40, "Physical", "Mod Scale; Mod Dmg % 20; Periodic Damage Percent; 10 s; 14 s cooldown; self", AC, CE, "db", "Castable demon cooldown (instant, 80 mana). Already a published identity in the simulator."),
    12721: ("Deep Wound", None, 1, "Physical", "Apply Aura Periodic Damage, 3 s interval, 12 s", PE, CE, "db", "Bleed applied by the Warrior talent Deep Wounds (12868)."),
    25228: ("Soul Link", None, 40, "Shadow", "Mod Dmg % 3; Split Damage 30%, 100 yd", TE, CE, "inferred", "Warlock talent that redirects 30% of damage taken to the demon. Logged events are redirected incoming damage, not outgoing DPS, and must not be compared with simulated damage."),
    51977: ("Arcane Instability", None, 0, "Arcane", "School Damage (no value shown)", PR, CE, "inferred", "Custom OctoWoW spell: level 0, no cast, no description. Damage-proc class is inferred and the mechanic is unverified."),
    51810: ("Divine Strike", None, 1, "Holy", "School Damage 3 (extra Holy damage)", PR, CE, "inferred", "Extra damage on hit of 3 Holy; trigger source unverified (one caster in this report)."),
    10333: ("zzOLDHoly Strike", "Rank 8", 99, "Holy", "Weapon Damage + 201", PR, DI, "db", "Kept disputed by instruction: the database lists a deprecated level-99 name while players cast it live. Unresolved until authoritative evidence."),
    22600: ("Force Reactive Disk", None, 0, "Nature", "School Damage 25, radius 5; Trigger Spell", EX, XX, "db", "Item effect; belongs to the item-effect catalogue, not class abilities."),
    3668: ("zzOLDTrueshot", "Rank 5", 99, "n/a", "Weapon Damage + 50", AC, DI, "db", "Kept disputed by instruction: the database names this ID a different spell than the Chronicle label Steady Shot."),
    21992: ("Thunderfury", None, 63, "Nature", "School Damage 300; Mod Resistance; Trigger Spell", EX, XX, "db", "Legendary weapon proc; belongs to the item-effect catalogue."),
    49557: ("Strike Together", None, 0, "Physical", "School Damage, 20% of Attack Power", TE, CE, "inferred", "Custom Hunter damage effect scaling with Attack Power; trigger source unverified."),
    7712: ("Fire Strike", None, 1, "Fire", "School Damage 2 (extra Fire damage)", PR, CE, "inferred", "Extra damage on hit of 2 Fire on a Paladin; trigger source unverified and it may be a gear effect."),
    23402: ("Corrupted Healing", None, 0, "Shadow", "Periodic Damage 175 per second, 30 s", EX, XX, "inferred", "Level-0 periodic affliction damaging the afflicted player; encounter-style effect, not player DPS."),
    44095: ("Ancient Accord", None, 60, "Arcane", "School Damage 300 to target; 100 radius 10 yd", TE, CE, "inferred", "Custom Mage damage effect; trigger source unverified."),
    51514: ("Piercing Shots", None, 4, "Physical", "Apply Aura Periodic Damage, 2 s interval, 8 s bleed", PE, CE, "db", "Hunter bleed effect lasting 8 s."),
    20286: ("Judgement of Righteousness", "Rank 8", 58, "Holy", "School Damage 162; Dummy", PR, CE, "inferred", "Judgement damage of Seal of Righteousness, triggered by casting Judgement."),
    20966: ("Judgement of Command", "Rank 5", 60, "Holy", "School Damage 339", PR, CE, "inferred", "Judgement damage of Seal of Command, triggered by casting Judgement."),
    52511: ("Surprise Attack", None, 1, "Physical", "School Damage, 25% of Attack Power; Add Combo Points", AC, CE, "db", "Custom Rogue ability, usable after the target dodges, awards one combo point."),
    51560: ("Repent", "Rank 3", 40, "Holy", "School Damage 160; 0.5 s cooldown", AC, CE, "db", "Custom Paladin ranked damage ability. Distinct from Repentance (51558)."),
    52865: ("Midnight Comet", None, 0, "Arcane", "School Damage (no value shown)", TE, CE, "inferred", "Custom Druid Arcane damage effect (level 0, no description); trigger source unverified."),
    52899: ("Hallowed Ground", None, 1, "Holy", "School Damage 96 radius 8 yd; Mod Speed Slow -10, 4 s", TE, CE, "inferred", "Custom Paladin area damage and slow; trigger source unverified."),
    51519: ("Extra Shot", None, 1, "Physical", "Weapon Damage +", PR, CE, "inferred", "Custom Hunter extra ranged shot; trigger source unverified."),
    58112: ("Explosive Ammunition", None, 0, "Fire", "Weapon % Dmg 20, radius 5 yd", PR, CE, "inferred", "Damage effect likely triggered by an ammunition mode. Two IDs share this name (58109 and 58112) and are kept as separate identities."),
    7373: ("Hamstring", "Rank 3", 54, "Physical", "School Damage; Mod Speed Slow 50%, 15 s", AC, CE, "db", "Warrior ability."),
    58111: ("Enchanted Ammunition", None, 0, "Arcane", "School Damage; Add Class Target Trigger; Add % Modifier; 60 s", AC, CE, "inferred", "Custom Hunter ammunition mode (60 s aura). The same ID also carries damage, so whether logged hits are the mode or its trigger is unresolved."),
    58110: ("Poisonous Ammunition", None, 0, "Nature", "School Damage; Add Class Target Trigger; Add % Modifier; 60 s", AC, CE, "inferred", "Custom Hunter ammunition mode (60 s aura); same ambiguity as Enchanted Ammunition."),
    58109: ("Explosive Ammunition", None, 0, "Fire", "School Damage; Add Class Target Trigger; Dummy; 60 s", AC, CE, "inferred", "Custom Hunter ammunition mode (60 s aura); same ambiguity as the other ammunition IDs."),
    20615: ("Intercept Stun", "Rank 3", 1, "Physical", "Stun 3 s; School Damage 65", PR, CE, "db", "Secondary stun and damage applied by the Intercept charge; not separately castable."),
    20729: ("Blessing of Sacrifice", "Rank 2", 54, "Holy", "Split Damage Flat 55, 30 s", AC, DI, "db", "Disputed: the log says Hand of Sacrifice, the database says Blessing of Sacrifice. The same spell family is plausible but the renaming is unverified, so no guess."),
    51558: ("Repentance", "Rank 3", 60, "Holy", "Stun 6 s", AC, CE, "db", "Paladin crowd-control ability."),
    10318: ("Holy Wrath", "Rank 2", 60, "Holy", "School Damage 490, radius 20 yd; 2 s cast", AC, CE, "db", "Paladin area ability against Undead and Demons."),
    51566: ("Bulwark of the Righteous", "Rank 3", 60, "Holy", "School Damage 556; Mod Dmg % Taken -30, 12 s", AC, CE, "db", "Custom Paladin ability: Holy damage and a 12 s damage-taken reduction."),
    52948: ("Simple Slingshot", None, 0, "Physical", "School Damage 1-3; 0.5 s cast; 6 s cooldown", EX, XX, "db", "Item-use ranged attack; belongs to the item catalogue."),
    1769: ("Kick", "Rank 4", 58, "Physical", "School Damage 80; Interrupt Cast", AC, CE, "db", "Rogue interrupt."),
    57707: ("Pain Spike", "Rank 4", 60, "Shadow", "School Damage 333; Dummy", AC, CE, "db", "Custom Priest ability (30 s category cooldown)."),
    16922: ("Starfire Stun", None, 0, "Physical", "Stun 3 s", TE, CE, "inferred", "Stun riding on Starfire; talent link is inferred from the name."),
    10308: ("Hammer of Justice", "Rank 4", 54, "Holy", "Stun 6 s; 60 s cooldown", AC, CE, "db", "Paladin stun."),
    6552: ("Pummel", "Rank 1", 38, "Physical", "School Damage 20; Interrupt Cast", AC, CE, "db", "Warrior interrupt."),
    51302: ("Hand of Reckoning", None, 10, "Physical", "Attack Me; Taunt 3 s; 10 s cooldown", AC, CE, "db", "Custom Paladin taunt."),
    8983: ("Bash", "Rank 3", 46, "Physical", "Stun 4 s; 60 s cooldown", AC, CE, "db", "Druid stun."),
    12868: ("Deep Wounds", "Rank 3", 1, "Physical", "Dummy", TE, CE, "db", "Warrior talent that triggers the Deep Wound bleed (12721)."),
    46771: ("Thorns Fire Dmg +4", "Rank 1", 55, "Fire", "Damage Shield 4", EX, XX, "db", "Gear or enchant damage shield; belongs to the item catalogue."),
    6795: ("Growl", None, 10, "Physical", "Attack Me; Taunt 3 s; 10 s cooldown", AC, CE, "db", "Taunt. Owning class is taken from the log caster, the database does not state it."),
    2139: ("Counterspell", None, 24, "Arcane", "Interrupt Cast; 30 s cooldown", AC, CE, "db", "Mage interrupt."),
    27860: ("Engulfing Shadows", None, 55, "Shadow", "School Damage 100; Energize 100; 1.5 s cast", EX, XX, "inferred", "No description; Shadow damage plus an energize looks like an item or encounter effect. Origin unresolved, so left excluded."),
    11374: ("Gift of Arthas", None, 45, "Nature", "Mod Damage Taken +8, 180 s", EX, XX, "db", "External debuff modifier with no damage effect; not a class mechanic."),
    8643: ("Kidney Shot", "Rank 2", 50, "Physical", "Stun; Dummy; Mod Dmg % Taken", AC, CE, "db", "Rogue finisher."),
    19253: ("Touch of Weakness", "Rank 5", 50, "Shadow", "School Damage 48; Mod Damage Done -15, 120 s", PR, CE, "inferred", "Damage when the Priest is hit under the Touch of Weakness buff; trigger inferred from the spell family."),
    10332: ("zzOLDHoly Strike", "Rank 7", 99, "Holy", "Weapon Damage + 157", PR, DI, "db", "Kept disputed by instruction: same deprecated level-99 naming as 10333."),
    23478: ("Burning Adrenaline", None, 0, "Fire", "School Damage 2188, radius 10 yd, range 50000 yd", EX, XX, "inferred", "Level-0 spell with an enormous range and damage; encounter-style debuff, not player DPS."),
    10912: ("Mind Control", "Rank 3", 58, "Shadow", "Mod Possess; Haste - Melee; channelled", AC, CE, "db", "Priest crowd-control ability."),
    28382: ("Shadowguard", "Rank 6", 60, "Shadow", "School Damage 116", PR, CE, "inferred", "Shadow bolt fired when the Priest is hit under Shadowguard; trigger inferred from the spell family."),
    1833: ("Cheap Shot", None, 26, "Physical", "Stun 4 s; Add Combo Points", AC, CE, "db", "Rogue stealth opener."),
    14278: ("Ghostly Strike", None, 0, "Physical", "Weapon % Dmg 125; Mod Dodge 15%, 7 s; Add Combo Points; 20 s cooldown", AC, CE, "db", "Rogue ability."),
    18658: ("Hibernate", "Rank 3", 58, "Nature", "Stun; 1.5 s cast", AC, CE, "db", "Druid crowd-control ability."),
    7321: ("Chilled", "Rank 1", 30, "Frost", "Haste - Melee -25; Mod Speed Slow -30, 5 s", PR, CE, "inferred", "Chill effect applied when a Mage is hit under Frost Armor; inferred from the name."),
    12355: ("Impact", "Rank 1", 10, "Fire", "Stun 2 s", TE, CE, "inferred", "Stun effect of the Impact talent; inferred from the name."),
    12826: ("Polymorph", "Rank 4", 60, "Arcane", "Mod Confuse; Transform; 1.5 s cast", AC, CE, "db", "Mage crowd-control ability."),
    18469: ("Counterspell - Silenced", None, 0, "Arcane", "Silence 4 s", TE, CE, "inferred", "Silence effect of Improved Counterspell; inferred from the name."),
    23418: ("Siphon Blessing", None, 0, "Shadow", "Periodic Trigger 5 s, radius 100 yd", EX, XX, "inferred", "Level-0 periodic trigger tied to a blessing spell; encounter-style effect, not player DPS."),
    11286: ("Gouge", "Rank 5", 60, "Physical", "School Damage 75; Stun; Add Combo Points", AC, CE, "db", "Rogue ability."),
    27869: ("Dark Rune", None, 58, "Shadow", "Energize 900-1501 mana; costs 600-1001 health", EX, XX, "db", "Consumable; not an ability."),
    355: ("Taunt", None, 10, "Physical", "Attack Me; Taunt 3 s; 10 s cooldown", AC, CE, "db", "Warrior taunt."),
    7922: ("Charge Stun", None, 1, "Physical", "Stun 1 s", PR, CE, "db", "Secondary stun applied by the Warrior Charge."),
}


def load_rows(observed):
    rows = {}
    for key in ("observedCandidates", "disputedObserved", "unmappedObserved"):
        for r in observed.get(key, []):
            rows[(r["classId"], r["spellId"])] = (key, r)
    return rows


def build(observed):
    found = load_rows(observed)
    by_id = {}
    for (cls, sid), (key, r) in found.items():
        by_id.setdefault(sid, []).append(r)
    entries = []
    for sid, (name, rank, level, school, effects, kind, disp, conf, reason) in R.items():
        seen = by_id.get(sid)
        if not seen or len(seen) != 1:
            raise SystemExit(f"{sid}: expected exactly one observed row, found {0 if not seen else len(seen)}")
        row = seen[0]
        if disp != DI and name != row["label"]:
            raise SystemExit(f"{sid}: database name {name!r} differs from log label {row['label']!r}; mark it disputed")
        entries.append({"spellId": sid, "classId": row["classId"], "label": row["label"], "hits": row["hits"],
                        "distinctCasters": row["distinctCasters"],
                        "db": {"name": name, "rank": rank, "level": level, "school": school, "effects": effects},
                        "classification": kind, "disposition": disp, "confidence": conf, "reason": reason,
                        "source": DB + str(sid), "reviewedOn": REVIEWED_ON})
    entries.sort(key=lambda e: (-e["hits"], e["spellId"]))
    return entries, found


def markdown(entries, remaining):
    out = ["# Chronicle single-class spell review", "",
           "Reviewed on 2026-11-22 from one public Blackwing Lair report (build 7272). Counts are damage **hits**, not casts.",
           "Every row was read from the OctoWoW database page. The database does not state the owning class, so class comes from the log caster.",
           "A catalogue entry records a validated identity only: it makes no claim about rank, learn level, cooldown or damage coefficients.", ""]
    total_hits = sum(e["hits"] for e in entries)
    out += [f"**{len(entries)} spells reviewed, {total_hits:,} hits.**", "", "| Disposition | Spells | Hits |", "|---|---|---|"]
    for d in (CE, XX, DI):
        sub = [e for e in entries if e["disposition"] == d]
        out.append(f"| {d} | {len(sub)} | {sum(e['hits'] for e in sub):,} |")
    out += ["", "| Classification | Spells | Hits |", "|---|---|---|"]
    for k in (AC, PR, PE, TE, EX):
        sub = [e for e in entries if e["classification"] == k]
        out.append(f"| {k} | {len(sub)} | {sum(e['hits'] for e in sub):,} |")
    for d, title in ((DI, "Disputed (identity preserved, not accepted)"), (XX, "Excluded"), (CE, "Catalogue entries")):
        out += ["", f"## {title}", "", "| ID | Class | Log label | Database | Effect class | Confidence | Hits | Reason |", "|---|---|---|---|---|---|---|---|"]
        for e in (x for x in entries if x["disposition"] == d):
            dbn = e["db"]["name"] + (f" ({e['db']['rank']})" if e["db"]["rank"] else "") + f", L{e['db']['level']}"
            out.append(f"| [{e['spellId']}]({e['source']}) | {e['classId']} | {e['label']} | {dbn} | {e['classification']} | {e['confidence']} | {e['hits']:,} | {e['reason']} |")
    out += ["", "## Not reviewed in this pass", "",
            f"{remaining['rows']} observed spell rows ({remaining['hits']:,} hits) were outside the single-class scope: "
            f"{remaining['auto']} auto-attack rows and {remaining['cross']} labels that appear on several classes "
            "(item procs, reflect, totems, weapon enchants). They stay unmapped.", ""]
    return "\n".join(out)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("observed", type=Path, help="chronicle-observed-spells.json")
    parser.add_argument("--json-out", type=Path, required=True)
    parser.add_argument("--md-out", type=Path, required=True)
    args = parser.parse_args()
    observed = json.loads(args.observed.read_text(encoding="utf8"))
    entries, found = build(observed)
    reviewed = {e["spellId"] for e in entries}
    rest = [r for (c, s), (key, r) in found.items() if s not in reviewed and key == "unmappedObserved"]
    auto = [r for r in rest if r["label"] in ("Auto Attack", "Auto Shot")]
    remaining = {"rows": len(rest), "hits": sum(r["hits"] for r in rest), "auto": len(auto), "cross": len(rest) - len(auto)}
    summary = {d: sum(1 for e in entries if e["disposition"] == d) for d in (CE, XX, DI)}
    doc = {"schema": "octosim-chronicle-spell-review-v1", "provenance": observed["provenance"], "reviewedOn": REVIEWED_ON,
           "unit": "hits (not casts)", "summary": {"reviewed": len(entries), **summary}, "notReviewed": remaining, "entries": entries}
    args.json_out.write_text(json.dumps(doc, indent=1) + "\n", encoding="utf8")
    args.md_out.write_text(markdown(entries, remaining) + "\n", encoding="utf8")
    print(json.dumps(doc["summary"]), remaining)


if __name__ == "__main__":
    main()
