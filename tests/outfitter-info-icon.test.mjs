import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../docs/outfitter/'+p,import.meta.url),'utf8');
const js=read('outfitter.mjs'),css=read('outfitter.css');

test('every item row reserves a fixed slot for the (i), so a late preview answer cannot move the DB link',()=>{
  assert.match(js,/slot\.className='info-slot'/);
  assert.match(js,/links\.append\(slot,link\)/,'the slot is part of the row markup, ahead of the DB link');
  assert.match(css,/\.info-slot\{[^}]*width:16px;height:16px;[^}]*flex:none\}/);
  assert.doesNotMatch(js,/job\.links\.insertBefore\(infoIcon/,'late answers fill the slot instead of inserting beside the link');
});

test('notes that are already known are drawn with the row itself, including after the list is re-rendered',()=>{
  assert.match(js,/knownNotes\.get\(noteKey\(item,selectedSlot\)\)/);
  assert.match(js,/job\.then\(result=>\{if\(result\?\.note\)knownNotes\.set\(key,result\.note\)/);
  assert.match(js,/const noteKey=\(item,slotId\)=>`\$\{item\.id\}:\$\{viewerSlot\(slotId,item\)\}`/,'same key shape as the preview cache');
});
