import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

path=Path(__file__).resolve().parents[2]/'tools/sim/merge-equipment-import.py'
spec=importlib.util.spec_from_file_location('merge_equipment',path)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class EquipmentMergeTests(unittest.TestCase):
    def test_import_merges_against_latest_catalogue_and_preserves_existing_records(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);original=module.DATA;module.DATA=root
            try:
                def record(id_,mask=-1):return {'id':id_,'name':f'Item {id_}','classMask':mask,'raceMask':-1,'source':f'https://octowow.st/db/?item={id_}'}
                for name,value in [('equipment.json',[{'id':1},{'id':2},{'id':3}]),('details.json',{'1':record(1,1)}),('manifest.json',{'equipmentListingsComplete':True})]:
                    (root/name).write_text(json.dumps(value))
                report=module.merge({'1':record(1),'2':record(2),'99':record(99)},{'failures':{'2':'old error','3':'unavailable'}})
                details=json.loads((root/'details.json').read_text())
                self.assertEqual(details['1']['classMask'],1)
                self.assertIn('2',details);self.assertNotIn('99',details)
                self.assertEqual(report['verifiedCount'],2);self.assertEqual(report['missingIds'],[3])
                self.assertEqual(report['failures'],{'3':'unavailable'});self.assertFalse(report['complete'])
                report=module.merge({'3':record(3)},{})
                self.assertTrue(report['complete']);self.assertEqual(report['verifiedCount'],3)
            finally:module.DATA=original

if __name__=='__main__':unittest.main()
