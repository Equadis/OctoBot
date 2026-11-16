import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const docs=new URL('../docs/',import.meta.url);
const read=p=>readFileSync(new URL(p,docs),'utf8');
const css=read('quality-select.css');
const COLOURS={0:'#9d9d9d',1:'#eee',2:'#1eff70',3:'#69a8ff',4:'#c786ff',5:'#ffab55'};

test('every rarity option and the closed dropdown use the same colour as item names in the Dressing Room',()=>{
  const names=read('outfitter/outfitter.css');
  for(const [q,colour] of Object.entries(COLOURS)){
    assert.ok(names.includes(`.quality-${q}{color:${colour}}`),`Dressing Room item colour for quality ${q}`);
    assert.ok(css.includes(`.quality-select option[value="${q}"]{color:${colour}}`),`option ${q}`);
    assert.ok(css.includes(`.quality-select:has(option[value="${q}"]:checked){color:${colour}}`),`selected ${q}`);
  }
  assert.match(css,/Rare|rarity/i);
});

test('every quality dropdown on the site opts in, loads the shared stylesheet, and offers values 0 to 5',()=>{
  // The Auction House opts in from its own branch of work; tests/auction-ui.test.mjs requires it there. Here it must at least be consistent.
  const pages={'outfitter/index.html':'quality','sim/index.html':'item-quality'};
  for(const [page,id] of Object.entries(pages)){
    const html=read(page);
    assert.match(html,new RegExp(`<select id="${id}"[^>]*class="quality-select"`),page);
    assert.match(html,/quality-select\.css/,page);
  }
  const ah=read('auction-house/index.html');
  if(ah.includes('quality-select.css'))assert.match(ah,/<select id="quality"[^>]*class="quality-select"/);
  const outfitter=read('outfitter/index.html');
  const values=[...outfitter.match(/<select id="quality"[\s\S]*?<\/select>/)[0].matchAll(/<option value="(\d*)">/g)].map(m=>m[1]);
  assert.deepEqual(values,['','0','1','2','3','4','5']);
});
