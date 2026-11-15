import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../docs/world-info.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../docs/world-info/index.html',import.meta.url),'utf8');
const iso=ms=>new Date(ms).toISOString(),MIN=60_000;

function element(){
  const store={};
  return new Proxy(function(){},{
    get(_t,key){
      if(key in store)return store[key];
      if(key==='classList')return {toggle(){},add(){},remove(){}};
      if(key==='style'||key==='dataset')return store[key]={};
      if(key==='children')return [];
      return ()=>element();
    },
    set(_t,key,value){store[key]=value;return true;},
    apply(){return element();},
  });
}

async function run(payload){
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const document={getElementById:get,createElement:()=>element(),createTextNode:text=>({textContent:text}),addEventListener(){}};
  const context={
    document,console,URL,Intl,Date,Math,Number,Object,Array,String,Boolean,JSON,Promise,Error,
    setInterval(){return 0;},clearInterval(){},setTimeout,
    fetch:async url=>String(url).includes('octometrics')?{ok:true,json:async()=>payload}:Promise.reject(new Error('offline')),
  };
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setTimeout(resolve,50));
  return id=>elements.get(id)?.textContent;
}

const feed=(now,heads,buffs={})=>({generated_at:iso(now),realms:[{realm:"N'Zoth",population:null,raids:{},buffs,sessions:{},heads}]});

test('the page lays out an estimated clear and a confirmed-drop line for each head, and no predicted-drop or buff-duration timer',()=>{
  for(const id of ['ony-clear','ony-clear-note','ony-clear-tag','ony-drop-alliance','ony-drop-horde','bwl-clear','bwl-clear-note','bwl-clear-tag','bwl-drop-alliance','bwl-drop-horde'])assert.ok(html.includes(`id="${id}"`),id);
  assert.ok(!/Buff time remaining|Buff drop estimated in|id="alliance-remaining"|id="horde-remaining"/.test(html));
  assert.ok(!/not a confirmed drop/i.test(html.replace(/data-tip="[^"]*"|aria-label="[^"]*"/g,'')),'no visible disclaimer');
  assert.equal((html.match(/class="info-i"/g)||[]).length,4);
  assert.match(html,/never a guaranteed drop/);
  assert.ok(!/cooldown/i.test(html.replace(/(data-tip|aria-label)="[^"]*"/g,'')));
});

test('a live estimate counts down from the Worker timestamps and is labelled an estimate',async()=>{
  const now=Date.now();
  const text=await run(feed(now,{
    onyxia:{clear:{status:'estimated',confirmed:false,samples:7,minSamples:5,confidence:'low',estimatedAt:iso(now+12*MIN+4000),earliestAt:iso(now+8*MIN),latestAt:iso(now+20*MIN)},drops:{alliance:{at:iso(now-65*MIN),confirmed:true},horde:null}},
    nefarian:{clear:{status:'learning',confirmed:false,samples:2,minSamples:5,confidence:'none'},drops:{alliance:null,horde:{at:iso(now-5*MIN),confirmed:true}}},
  }));
  assert.match(text('ony-clear'),/^1[12]m \d\ds$/);
  assert.match(text('ony-clear-tag'),/ESTIMATE/);
  assert.match(text('ony-clear-note'),/low confidence from 7 past raids/);
  assert.ok(!/confirmed drop/i.test(text('ony-clear-note')));
  assert.match(text('ony-drop-alliance'),/^Alliance · 1h 0[45]m \d\ds ago$/);
  assert.equal(text('ony-drop-horde'),'Horde · NO DATA');
  assert.equal(text('bwl-clear'),'LEARNING');
  assert.match(text('bwl-clear-note'),/Needs 5 past raids .* 2 observed/);
  assert.match(text('bwl-drop-horde'),/^Horde · 5m \d\ds ago$/);
});

test('estimates degrade to any moment / overdue and never to a confirmed drop',async()=>{
  const now=Date.now();
  const clear=(est,latest)=>({status:'estimated',samples:9,minSamples:5,confidence:'low',estimatedAt:iso(est),earliestAt:iso(est-5*MIN),latestAt:iso(latest)});
  const text=await run(feed(now,{onyxia:{clear:clear(now-2*MIN,now+3*MIN),drops:{}},nefarian:{clear:clear(now-30*MIN,now-10*MIN),drops:{}}}));
  assert.equal(text('ony-clear'),'ANY MOMENT');
  assert.equal(text('bwl-clear'),'OVERDUE');
  assert.match(text('bwl-clear-note'),/no clear has been confirmed/);
});

test('a head drop names the head on the faction panel',async()=>{
  const now=Date.now();
  const text=await run(feed(now,{},{'Rallying Cry of the Dragonslayer:horde':{at:iso(now-3*MIN),buff:'Rallying Cry of the Dragonslayer',faction:'horde',source:'npc_yell',head:'nefarian'}}));
  assert.match(text('horde-last'),/ago/);
  assert.match(text('horde-last-note'),/Nefarian head/);
});

test('missing head data shows NO DATA rather than an invented estimate',async()=>{
  const text=await run(feed(Date.now(),{}));
  assert.equal(text('ony-clear'),'NO DATA');
  assert.equal(text('bwl-clear'),'NO DATA');
});

test('Darkmoon Faire is set manually to Mulgore until the bots report, and a fresh bot sighting always wins',async()=>{
  const now=Date.now();
  const manual=await run(feed(now,{}));
  assert.equal(manual('dmf-heading'),'Mulgore · Thunder Bluff');
  assert.equal(manual('dmf-state'),'MANUAL');                       // never shown as a bot confirmation
  assert.match(manual('dmf-observed'),/Set manually .* Not a bot observation/);
  const bot=await run({generated_at:iso(now),dmf:{location:'elwynn',observedAt:iso(now-2*MIN),source:'bot'},realms:[]});
  assert.equal(bot('dmf-heading'),'Elwynn Forest · Goldshire');
  assert.equal(bot('dmf-state'),'CONFIRMED');
  assert.match(bot('dmf-observed'),/Last observed/);
});

test('the Edge of Madness calendar sits inside its panel, closed by default, behind a down-arrow button',()=>{
  const panel=html.match(/<section class="world-panel" aria-labelledby="eom-heading">[\s\S]*?<\/section>/)[0];
  assert.match(panel,/id="calendar-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="calendar-body"/);
  assert.match(panel,/id="calendar-body" hidden/);
  for(const id of ['madness-calendar','calendar-prev','calendar-next','calendar-today','rotation-key'])assert.ok(panel.includes(`id="${id}"`),id);
  assert.ok(!html.includes('calendar-panel'),'no separate full-width calendar section');
  const script=readFileSync(new URL('../docs/world-info.js',import.meta.url),'utf8');
  assert.ok(script.includes("$('calendar-toggle').addEventListener('click'"));
});
