import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
items=module('items','tools/sim/import-items.py');details=module('details','tools/sim/import-item-details.py')

class ItemImportTests(unittest.TestCase):
    def test_additional_equippable_inventory_types(self):
        for label,slot in [('Shirt',4),('Tabard',19),('Projectile',24),('6 Slot Bag',18)]:
            source=f'<table class="infobox"><tr><td>Class Mask: -1<br>Race Mask: -1</td></tr></table><div id="tooltip42-generic"><table><tr><td><b>Example</b><table><tr><td>{label}</td></tr></table></td></tr></table></div>'
            self.assertEqual(details.parse_detail(source,42)['slot'],slot)
    def test_data_parser_does_not_execute_source(self):
        self.assertEqual(items.Literal("[{id:42,name:'2Example',flags:null,ok:true},,]").value(),[{'id':42,'name':'2Example','flags':None,'ok':True},None])
        with self.assertRaises(ValueError):items.Literal("{id: fetch('https://example.com')}").value()
    def test_listing_and_icon_extraction(self):
        rows,icons=items.item_rows("_[42]={icon:'INV_Helmet_01'};new Listview({template:'item',id:'items',data:[{id:42,name:'2Example',classs:4,slot:1}]});")
        self.assertEqual(rows[0]['id'],42);self.assertEqual(icons,{42:'INV_Helmet_01'})
    def test_restrictions_and_primary_stats_exclude_set_effects(self):
        source='''<table class="infobox"><tr><td>Class Mask: 1<br>Race Mask: 2</td></tr></table><div id="tooltip42-generic"><table><tr><td><b>Example</b><br><table><tr><td>Head</td><th>Plate</th></tr></table>500 Armor<br>+20 Strength<br>Requires Level 40<br></td></tr></table><span>Requires Engineering (300)</span><br><span>Set: +100 Strength</span></div>'''
        d=details.parse_detail(source,42)
        self.assertEqual(d['classMask'],1);self.assertEqual(d['raceMask'],2);self.assertEqual(d['slot'],1)
        self.assertEqual(d['attributes'],{'Strength':20,'Armour':500});self.assertEqual(d['requirements'],['Requires Engineering (300)'])
        with self.assertRaises(ValueError):details.parse_detail(source.replace('Class Mask: 1','Classes: Warrior'),42)

if __name__=='__main__':unittest.main()
