from __future__ import annotations

import unittest

from octobot.entity_linking.parser import MAX_QUERY_CHARS, MAX_REFERENCES, normalize, parse_references


def pairs(text):
    return [(r.type, r.query) for r in parse_references(text)]


class ParserTests(unittest.TestCase):
    def test_finds_references_anywhere(self):
        self.assertEqual(pairs("Anyone selling [item:Dark Leather Gloves]?"), [("item", "Dark Leather Gloves")])
        self.assertEqual(pairs("[quest:Test of Endurance] later"), [("quest", "Test of Endurance")])

    def test_multiple_references(self):
        self.assertEqual(
            pairs("Is [spell:Sinister Strike] better than [spell:Backstab]?"),
            [("spell", "Sinister Strike"), ("spell", "Backstab")],
        )

    def test_numeric_ids(self):
        refs = parse_references("[item:19019] [quest:7848] [spell:133]")
        self.assertEqual([(r.type, r.query, r.is_id) for r in refs],
                         [("item", "19019", True), ("quest", "7848", True), ("spell", "133", True)])

    def test_case_insensitive_types(self):
        self.assertEqual(pairs("[ITEM:Foo] [Quest:Bar]"), [("item", "Foo"), ("quest", "Bar")])

    def test_all_supported_types(self):
        for kind in ("item", "quest", "spell", "npc", "recipe", "object", "zone", "talent", "enchant", "set",
                     "faction", "boss"):
            self.assertEqual(pairs(f"[{kind}:Name]"), [(kind, "Name")], kind)

    def test_ignores_malformed_empty_and_unknown(self):
        for text in ("[item:]", "[item: ]", "[item Name]", "[items:Name]", "item:Name", "[widget:Name]",
                     "[item:Name", "[:Name]", "[item:[nested]]", "[item:!!!]", "", None):
            self.assertEqual(pairs(text), [], repr(text))

    def test_ignores_code(self):
        self.assertEqual(pairs("`[item:Foo]`"), [])
        self.assertEqual(pairs("```\n[item:Foo]\n```"), [])
        self.assertEqual(pairs("```[item:Foo]"), [])   # unterminated fence swallows the rest
        self.assertEqual(pairs("``[item:Foo]`` and [item:Bar]"), [("item", "Bar")])

    def test_deduplicates(self):
        self.assertEqual(pairs("[item:Foo] [item:foo] [item:  FOO ] [quest:Foo]"), [("item", "Foo"), ("quest", "Foo")])

    def test_bounds(self):
        long_name = "x" * (MAX_QUERY_CHARS + 1)
        self.assertEqual(pairs(f"[item:{long_name}]"), [])
        many = " ".join(f"[item:Name{i}]" for i in range(50))
        self.assertEqual(len(parse_references(many)), MAX_REFERENCES)
        self.assertEqual(pairs("[item:99999999999]"), [])
        # only the start of a huge message is scanned
        self.assertEqual(pairs("a" * 5000 + "[item:Foo]"), [])

    def test_newlines_do_not_span(self):
        self.assertEqual(pairs("[item:Foo\nBar]"), [])

    def test_normalize(self):
        self.assertEqual(normalize("Eldre’Thalas"), normalize("eldre'thalas"))
        self.assertEqual(normalize("Eldre'Thalas"), "eldrethalas")
        self.assertEqual(normalize("  Thunderfury,   Blessed-Blade "), "thunderfury blessed blade")
        self.assertEqual(normalize("Café Crème"), "cafe creme")
        self.assertEqual(normalize("Ёж"), normalize("ёж"))
        self.assertEqual(normalize("!!!"), "")


if __name__ == "__main__":
    unittest.main()
