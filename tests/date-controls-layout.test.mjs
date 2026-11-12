import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const population=readFileSync(join(root,'docs/index.html'),'utf8');
const status=readFileSync(join(root,'docs/status.html'),'utf8');
const theme=readFileSync(join(root,'docs/site-theme.css'),'utf8');

test('all date controls group From/To beside a separate compact Apply/Jump column',()=>{
  const dateFields=/<div class="dates"><div class="date-fields">[\s\S]*?<\/div><div class="date-actions">/g;
  assert.equal([...population.matchAll(dateFields)].length,1);
  assert.equal([...status.matchAll(dateFields)].length,2);
  for(const id of ['date-from','date-to']){
    assert.match(population,new RegExp('id="'+id+'"'));
    assert.match(status,new RegExp('id="'+id+'"'));
  }
  for(const id of ['archive-date-from','archive-date-to']){
    assert.match(status,new RegExp('id="'+id+'"'));
  }
  assert.match(population,/id="jump-to-present"[^>]*>Jump to present →<\/button><button id="apply-dates"[^>]*>Apply<\/button>/);
  assert.match(status,/id="archive-jump-to-present"[^>]*>Jump to present →<\/button><button type="button" id="archive-apply-dates">Apply<\/button>/);
});

test('date fields align with Apply; Jump and Apply have independent compact widths',()=>{
  assert.match(theme,/\.dates\{align-items:flex-end\}/);
  assert.match(theme,/\.date-fields\{display:flex;align-items:center;/);
  assert.match(theme,/\.date-actions\{display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:0\}/);
  assert.match(theme,/\.date-actions button\{width:auto;white-space:nowrap\}/);
  assert.doesNotMatch(theme,/\.date-actions button\{width:100%/);
  assert.match(theme,/\.date-actions \.jump-to-present\{font-size:11px;line-height:15px;padding:5px 9px\}/);
  assert.match(theme,/\.dates input\[type="date"\]\{border-radius:4px\}/);
  assert.match(theme,/\.controls button\{border-radius:4px\}/);
});
