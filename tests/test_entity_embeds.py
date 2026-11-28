from __future__ import annotations

import unittest

from octobot.entity_linking.embeds import (
    MAX_DESCRIPTION, QUALITY_COLORS, QUEST_COLOR, build_embed, plain,
)
from octobot.entity_linking.models import Entity


def entity(kind="item", **kw):
    base = dict(key=1, type=kind, ref=19019, name="Thunderfury, Blessed Blade of the Windseeker",
                url="https://octowow.st/db/?item=19019", source="test", updated="2026-11-28")
    base.update(kw)
    return Entity(**base)


class EmbedTests(unittest.TestCase):
    def test_item_quality_colours(self):
        expected = {0: 0x9D9D9D, 1: 0xFFFFFF, 2: 0x1EFF00, 3: 0x0070DD, 4: 0xA335EE, 5: 0xFF8000, 6: 0xE6CC80}
        self.assertEqual(QUALITY_COLORS, expected)
        for quality, colour in expected.items():
            self.assertEqual(build_embed(entity(quality=quality)).colour.value, colour)

    def test_title_links_and_icon_thumbnail(self):
        embed = build_embed(entity(quality=5, icon="inv_sword_39"))
        self.assertEqual(embed.title, "Thunderfury, Blessed Blade of the Windseeker")
        self.assertEqual(embed.url, "https://octowow.st/db/?item=19019")
        self.assertTrue(embed.thumbnail.url.endswith("/inv_sword_39.png"))
        self.assertIsNone(embed.footer.text)
        self.assertIsNone(embed.author.name)

    def test_missing_or_unsafe_icon_has_no_thumbnail(self):
        for icon in (None, "", "../evil?x=1", "a b"):
            self.assertIsNone(build_embed(entity(icon=icon)).thumbnail.url, icon)

    def test_tooltip_order_is_kept_and_name_not_repeated(self):
        tooltip = "Foo\nBinds when picked up\nOne-Hand\nSword\n10 - 20  Damage\nRequires Level 60\n\"Flavour\""
        embed = build_embed(entity(name="Foo", quality=4, data={"tooltip": tooltip}))
        lines = embed.description.split("\n")
        self.assertEqual(lines[0], "Binds when picked up")
        self.assertEqual(lines[-1], '*"Flavour"*')
        self.assertLess(lines.index("Sword"), lines.index("Requires Level 60"))

    def test_catalogue_only_item_shows_only_known_facts(self):
        embed = build_embed(entity(name="Plain", quality=2, level=20, data={}))
        self.assertEqual(embed.description, "Uncommon\nItem Level 20")
        self.assertNotIn("Armor", embed.description)

    def test_no_description_when_nothing_known(self):
        self.assertIsNone(build_embed(entity(quality=None, level=None, data={})).description)

    def test_quest_embed(self):
        quest = entity("quest", name="Attunement to the Core", url="https://octowow.st/db/?quest=7848", level=60,
                       data={"minLevel": 55, "side": 2, "xp": 6600, "zone": "Blackrock Mountain",
                             "start": {"name": "Lothos Riftwaker"}, "end": {"name": "Lothos Riftwaker"},
                             "objective": "Recover a Core Fragment.",
                             "itemrewards": [{"id": 1, "name": "Sword", "count": 2}, {"id": 2, "name": None, "count": 1}]})
        embed = build_embed(quest)
        self.assertEqual(embed.colour.value, QUEST_COLOR)
        text = " ".join(f.value for f in embed.fields)
        for part in ("Level 60", "Requires 55", "Horde", "Blackrock Mountain", "6,600 XP", "Start: Lothos Riftwaker",
                     "Sword ×2", "Item 2"):
            self.assertIn(part, text)
        self.assertEqual(embed.description, "Recover a Core Fragment.")

    def test_quest_omits_unverified_fields(self):
        embed = build_embed(entity("quest", name="Q", level=10, data={"side": 3, "xp": 0}))
        self.assertEqual([f.value for f in embed.fields], ["Level 10"])      # no side, no xp, no NPCs

    def test_spell_ranks_never_merged(self):
        rank2 = build_embed(entity("spell", name="Sinister Strike", rank="Rank 2", data={"class": "Rogue"}))
        self.assertEqual(rank2.title, "Sinister Strike (Rank 2)")

    def test_talent_embed(self):
        talent = entity("talent", name="Improved Eviscerate",
                        data={"class": "Rogue", "tree": "Assassination", "row": 1, "maxRanks": 3,
                              "ranks": ["Five.\nHigher chance", "Ten.", "Fifteen."],
                              "requires": {"name": "Other", "ranks": 2}})
        embed = build_embed(talent)
        self.assertIn("**1** Five.", embed.description)
        self.assertNotIn("Higher chance", embed.description)
        self.assertIn("Rogue · Assassination · Tier 1 · 3 ranks", embed.fields[0].value)
        self.assertEqual(embed.fields[1].value, "Other (2)")

    def test_character_limits(self):
        huge = "\n".join("Equip: " + "x" * 200 for _ in range(100))
        embed = build_embed(entity(data={"tooltip": "Name\n" + huge}))
        self.assertLessEqual(len(embed.description), MAX_DESCRIPTION)
        three = [build_embed(entity(data={"tooltip": "N\n" + huge})) for _ in range(3)]
        self.assertLess(sum(len(e) for e in three), 6000)
        long_name = build_embed(entity(name="n" * 600))
        self.assertLessEqual(len(long_name.title), 256)

    def test_markdown_and_mentions_neutralised(self):
        self.assertEqual(plain("*bold* @everyone [x](y)"), "\\*bold\\* @​everyone \\[x\\](y)")
        embed = build_embed(entity("quest", name="Q", level=1, data={"objective": "@everyone **hi**"}))
        self.assertNotIn("@everyone", embed.description)

    def test_generic_types_render(self):
        for kind in ("npc", "boss", "object", "zone", "faction", "set", "recipe", "enchant"):
            embed = build_embed(entity(kind, name="X", url="https://octowow.st/db/?npc=1", level=5))
            self.assertEqual(embed.title, "X")


if __name__ == "__main__":
    unittest.main()
