import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('merge_consumables',Path(__file__).resolve().parents[2]/'tools/sim/merge-consumables.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ConsumableMergeTests(unittest.TestCase):
 def test_only_adds_verified_records_without_overwriting_concurrent_facts(self):
  current=[{'id':1,'verified':True,'sha256':'newer'},{'id':2,'verified':False},{'id':3,'verified':False}]
  imported=[{'id':1,'verified':True,'sha256':'older'},{'id':2,'verified':True,'sha256':'source'},{'id':3,'verified':False}]
  actual=m.merge(current,imported)
  self.assertEqual(actual[0]['sha256'],'newer');self.assertTrue(actual[1]['verified']);self.assertFalse(actual[2]['verified']);self.assertFalse(current[1]['verified'])
