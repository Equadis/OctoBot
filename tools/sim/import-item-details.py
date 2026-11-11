#!/usr/bin/env python3
"""Extract data from previously downloaded official item pages, without running JS.

Usage: python tools/sim/import-item-details.py ID:PATH [ID:PATH ...]
Only facts from the item's own tooltip and restriction masks are retained.
"""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re

class Node:
    def __init__(self, tag='', attrs=()): self.tag,self.attrs,self.children=tag,dict(attrs),[]
    def text(self):
        return ''.join(child if isinstance(child,str) else child.text() for child in self.children)+ ('\n' if self.tag in ('br','td','th') else '')
    def find(self, predicate):
        if predicate(self): return self
        for child in self.children:
            if isinstance(child,Node):
                found=child.find(predicate)
                if found:return found
        return None
    def descendants(self):
        yield self
        for child in self.children:
            if isinstance(child,Node):yield from child.descendants()

class Document(HTMLParser):
    def __init__(self): super().__init__();self.root=Node();self.stack=[self.root]
    def handle_starttag(self,tag,attrs):
        n=Node(tag,attrs);self.stack[-1].children.append(n)
        if tag not in ('br','img','meta','link','input','hr','area','base','embed','param','source','track','wbr'):self.stack.append(n)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:self.stack=self.stack[:i];break
    def handle_data(self,data):self.stack[-1].children.append(data)

TYPES={'head':1,'neck':2,'shoulder':3,'back':16,'chest':5,'robe':20,'wrist':9,'hands':10,'waist':6,'legs':7,'feet':8,'finger':11,'trinket':12,'one-hand':13,'two-hand':17,'main hand':21,'off hand':22,'held in off-hand':23,'ranged':26,'thrown':25,'relic':28}
def parse_detail(html,id_):
    doc=Document();doc.feed(html)
    tooltip=doc.root.find(lambda n:n.attrs.get('id')==f'tooltip{id_}-generic')
    facts=doc.root.find(lambda n:'infobox' in n.attrs.get('class','').split())
    if not tooltip or not facts:raise ValueError('Missing item tooltip or facts')
    primary=tooltip.find(lambda n:n.tag=='td' and any(isinstance(c,Node) and c.tag=='b' for c in n.children))
    name=primary.find(lambda n:n.tag=='b').text().strip()
    text=primary.text().strip()
    slot=next((TYPES[n.text().strip().lower()] for n in tooltip.descendants() if n.tag=='td' and n.text().strip().lower() in TYPES),None)
    if slot==22 and any(n.tag=='th' and n.text().strip()=='Shield' for n in tooltip.descendants()):slot=14
    if not slot:raise ValueError('Unknown equipment slot')
    attributes={k:int(v) for v,k in re.findall(r'(?:^|\n)\s*\+(\d+) (Strength|Agility|Stamina|Intellect|Spirit|[A-Za-z]+ Resistance)\b',text)}
    armor=re.search(r'(?:^|\n)\s*(\d+) Armor\b',text)
    if armor:attributes['Armour']=int(armor[1])
    requirements=[line.strip() for line in tooltip.text().splitlines() if re.match(r'^Requires\b',line.strip()) and not re.fullmatch(r'Requires Level \d+',line.strip())]
    def mask(key):
        m=re.search(key+r' Mask:\s*(-?\d+)',facts.text())
        if not m:raise ValueError('Missing restriction mask')
        return int(m[1])
    return dict(id=id_,name=name,classMask=mask('Class'),raceMask=mask('Race'),slot=slot,
        requiredLevel=int(re.search(r'Requires Level (\d+)',text)[1]) if re.search(r'Requires Level (\d+)',text) else 0,
        requirements=requirements,unique=bool(re.search(r'\bUnique(?:-Equipped)?\b',text)),attributes=attributes,summary=text,
        source=f'https://octowow.st/db/?item={id_}')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('sources',nargs='+');args=parser.parse_args()
    out=Path(__file__).resolve().parents[2]/'docs/sim/data/items/details.json'
    records=json.loads(out.read_text()) if out.exists() else {}
    for source in args.sources:
        id_,path=source.split(':',1);records[id_]=parse_detail(Path(path).read_text(),int(id_))
    out.write_text(json.dumps(records,ensure_ascii=False,separators=(',',':'))+'\n')
    print(f'{len(records)} item detail records saved')
if __name__=='__main__':main()
