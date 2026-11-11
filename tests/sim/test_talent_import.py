"""Offline parser regression tests; no requests to the official site."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('talent_import', ROOT / 'tools/sim/import-talents.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ImportTests(unittest.TestCase):
    def test_json_chunks_are_combined_without_execution(self):
        payload = 'a:' + json.dumps({'value': '$b'}) + '\nb:[1,2,3]\n'
        html = ''.join('<script>self.__next_f.push(' + json.dumps([1, part]) + ')</script>'
                       for part in [payload[:8], payload[8:]])
        records = MODULE.records_from_html(html)
        self.assertEqual(MODULE.resolve(records['a'], records), {'value': [1, 2, 3]})

    def test_lazy_json_references_are_distinct_from_component_imports(self):
        self.assertEqual(MODULE.resolve('$La', {'a': [1, 2]}), [1, 2])
        self.assertEqual(MODULE.resolve('$La', {}), '$La')

    def test_cycles_and_missing_required_records_are_rejected(self):
        for records in [{'a': '$a'}, {}]:
            with self.assertRaises(ValueError):
                MODULE.resolve('$a', records)

    def test_effect_text_resolves_rank_values_and_discards_source_markup(self):
        effect=['Costs ', ['$', '$L1e', None, {'values':['1','2','3']}], ' rage.']
        self.assertEqual(MODULE.effect_text(effect,1),'Costs 1 rage.')
        self.assertEqual(MODULE.effect_text(effect,3),'Costs 3 rage.')
        self.assertEqual(MODULE.effect_text(['$', 'strong', None, {'children':'text'}],1),'text')

    def test_non_calculator_and_incomplete_pages_are_rejected(self):
        with self.assertRaises(ValueError):
            MODULE.records_from_html('<html>Unavailable</html>')
        html = '<script>self.__next_f.push(' + json.dumps([1, '1:{}\n']) + ')</script>'
        with self.assertRaises(ValueError):
            MODULE.extract(html, 'warrior', 'https://octowow.st/talents/warrior/', '2026-11-11')


if __name__ == '__main__':
    unittest.main()
