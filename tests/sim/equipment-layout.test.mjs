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
test('cached module and stylesheet URLs are versioned for the left-slot fix',()=>{
 assert.match(html,/combat-layout\.css\?v=20261113-gear-position2/);
 assert.match(html,/planner\.mjs\?v=20261113-swaps1/);
});
