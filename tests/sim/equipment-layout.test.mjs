import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'../../docs/sim');
const css=readFileSync(join(root,'combat-layout.css'),'utf8');
const html=readFileSync(join(root,'index.html'),'utf8');

test('left equipment column positions icons before slot labels',()=>{
 assert.match(css,/\.planner-view #slots-left \.slot button\{grid-template-columns:33px minmax\(0,1fr\)\}/);
 assert.match(css,/\.planner-view #slots-left \.slot \.slot-icon\{grid-column:1;grid-row:1\}/);
 assert.match(css,/\.planner-view #slots-left \.slot \.slot-name\{grid-column:2;grid-row:1\}/);
 assert.match(css,/\.planner-view #slots-left \.slot \.item-name\{grid-column:1\/-1;grid-row:2;text-align:center\}/);
 assert.match(css,/\.planner-view \.slot:not\(\.has-item\) \.item-name\{font-style:normal\}/);
});
test('planner module and stylesheets carry cache versions across later releases',()=>{
 const references=[...html.matchAll(/(?:src|href)="([^"\s]+)"/g)].map(match=>match[1]);
 for(const asset of ['planner.mjs','planner.css','combat-layout.css']){
  const reference=references.find(value=>value.split('?')[0]===asset);
  assert.ok(reference,`${asset} must be loaded by the planner`);
  const url=new URL(reference,'https://octobot.test/sim/');
  assert.match(url.searchParams.get('v')||'',/^\d{8}-[a-z0-9-]+$/,`${asset} needs a release cache version`);
 }
});
