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

async function run(payload,extra={}){
  const intervals=[],created=[];let current=payload;
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const document={getElementById:get,createElement:()=>{const e=element();created.push(e);return e;},createTextNode:text=>({textContent:text}),addEventListener(){}};
  const context={
    document,console,URL,Intl,Date,Math,Number,Object,Array,String,Boolean,JSON,Promise,Error,
    setInterval(fn,ms){intervals.push([fn,ms]);return 0;},clearInterval(){},setTimeout,
    fetch:async url=>String(url).includes('octometrics')?{ok:true,json:async()=>current}:Promise.reject(new Error('offline')),
    ...extra,
  };
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setTimeout(resolve,50));
  const text=id=>elements.get(id)?.textContent;text.el=id=>elements.get(id);text.created=created;
  text.next=async next=>{current=next;for(const [fn,ms] of intervals)if(ms===60000)await fn();await new Promise(resolve=>setTimeout(resolve,50));};
  return text;
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
  assert.equal(text.el('ony-clear-tag').hidden,true);   // no tag under the estimate
  assert.match(text('ony-clear-note'),/low confidence from 7 past raids/);
  assert.ok(!/confirmed drop/i.test(text('ony-clear-note')));
  assert.match(text('ony-drop-alliance'),/^Alliance · 1h 0[45]m \d\ds ago$/);
  assert.equal(text('ony-drop-horde'),'Horde · No data');
  assert.equal(text('bwl-clear'),'Learning');
  assert.match(text('bwl-clear-note'),/Needs 5 past raids .* 2 observed/);
  assert.match(text('bwl-drop-horde'),/^Horde · 5m \d\ds ago$/);
});

test('estimates degrade to any moment / overdue and never to a confirmed drop',async()=>{
  const now=Date.now();
  const clear=(est,latest)=>({status:'estimated',samples:9,minSamples:5,confidence:'low',estimatedAt:iso(est),earliestAt:iso(est-5*MIN),latestAt:iso(latest)});
  const text=await run(feed(now,{onyxia:{clear:clear(now-2*MIN,now+3*MIN),drops:{}},nefarian:{clear:clear(now-30*MIN,now-10*MIN),drops:{}}}));
  assert.equal(text('ony-clear'),'Soon');
  assert.equal(text('bwl-clear'),'Overdue');
  assert.match(text('bwl-clear-note'),/no clear has been confirmed/);
});

test('a head drop names the head on the faction panel',async()=>{
  const now=Date.now();
  const text=await run(feed(now,{},{'Rallying Cry of the Dragonslayer:horde':{at:iso(now-3*MIN),buff:'Rallying Cry of the Dragonslayer',faction:'horde',source:'npc_yell',head:'nefarian'}}));
  assert.match(text('horde-last'),/ago/);
  assert.match(text('horde-last-note'),/Nefarian head/);
});

test('missing head data shows No data rather than an invented estimate',async()=>{
  const text=await run(feed(Date.now(),{}));
  assert.equal(text('ony-clear'),'No data');
  assert.equal(text('bwl-clear'),'No data');
});

test('Darkmoon Faire is set manually to Mulgore until the bots report, and a fresh bot sighting always wins',async()=>{
  const now=Date.now();
  const manual=await run(feed(now,{}));
  assert.equal(manual('dmf-heading'),'Mulgore · Thunder Bluff');
  assert.equal(manual('dmf-state'),'Manual');                       // never shown as a bot confirmation
  assert.match(manual('dmf-observed'),/Set manually .* Not a bot observation/);
  const bot=await run({generated_at:iso(now),dmf:{location:'elwynn',observedAt:iso(now-2*MIN),source:'bot'},realms:[]});
  assert.equal(bot('dmf-heading'),'Elwynn Forest · Goldshire');
  assert.equal(bot('dmf-state'),'Confirmed');
  assert.match(bot('dmf-observed'),/Last observed/);
});

test('the Edge of Madness calendar sits inside its panel, closed by default, behind a down-arrow button',()=>{
  const panel=html.match(/<section class="world-panel zg-panel" aria-labelledby="eom-heading">[\s\S]*?<\/section>/)[0];
  assert.match(panel,/id="calendar-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="calendar-body"/);
  assert.match(panel,/id="calendar-body" hidden/);
  for(const id of ['madness-calendar','calendar-prev','calendar-next','calendar-today','rotation-key'])assert.ok(panel.includes(`id="${id}"`),id);
  assert.ok(!html.includes('calendar-panel'),'no separate full-width calendar section');
  const script=readFileSync(new URL('../docs/world-info.js',import.meta.url),'utf8');
  assert.ok(script.includes("$('calendar-toggle').addEventListener('click'"));
});

test('no raid: the count says "No raid" once, the label is hidden, and the estimated clear is N/A in red',async()=>{
  const now=Date.now();
  const quiet={generated_at:iso(now),realms:[{realm:"N'Zoth",population:null,raids:{a:{zone:'Onyxia',players:0,at:iso(now-MIN),active:false}},buffs:{},sessions:{},heads:{onyxia:{clear:{status:'idle',confirmed:false,samples:0,minSamples:5,confidence:'none'},drops:{}}}}]};
  const text=await run(quiet);
  assert.equal(text('ony-count'),'No raid');
  assert.equal(text.el('ony-count-label').hidden,true);
  assert.equal(text('ony-clear'),'N/A');
  assert.match(readFileSync(new URL('../docs/world-info.css',import.meta.url),'utf8'),/\.clock\.na\{color:#ff6b5e\}/);   // the N/A class is red
});

test('aggregate activity shows a lower bound with the label, and the clear estimate is not N/A',async()=>{
  const now=Date.now();
  const live={generated_at:iso(now),realms:[{realm:"N'Zoth",population:null,raids:{a:{zone:'Onyxia',players:20,at:iso(now-MIN),active:true,activityStart:iso(now-30*MIN)}},buffs:{},sessions:{},heads:{onyxia:{clear:{status:'learning',confirmed:false,samples:2,minSamples:5,confidence:'none'},drops:{}}}}]};
  const text=await run(live);
  assert.equal(text('ony-count'),'1+');           // a lower bound: headcount cannot count raids
  assert.equal(text.el('ony-count-label').hidden,false);
  assert.equal(text('ony-count-label'),'Raid in progress:');
  assert.equal(text('ony-clear'),'Learning');
});

test('headcount activity never invents a numbered raid, even when guild counts are attached',async()=>{
  const now=Date.now();
  const make=guilds=>({generated_at:iso(now),realms:[{realm:"N'Zoth",population:null,raids:{a:{zone:'Onyxia',players:20,at:iso(now-MIN),active:true,activityStart:iso(now-30*MIN),...(guilds?{guilds}:{})}},buffs:{},sessions:{},heads:{}}]});
  for(const guilds of [[{name:'Octo Raiders',count:12},{name:'Other',count:3}],{A:6,B:5,C:5,D:4},undefined]){
    const page=await run(make(guilds));
    assert.ok(!page.created.some(e=>/^Raid/.test(String(e.textContent))),'no placeholder raid row');
    assert.equal(page('ony-count'),'1+');
  }
});

test('sound alerts fire only on something new, never on first load, and only for the events that changed',async()=>{
  const now=Date.now(),heard=[];
  const player={notify:key=>{heard.push(key);return true;},settings:()=>({soonMinutes:5}),setAvailability(){},mount(){}};
  const feed=(finishedAt,allianceAt,estimatedInMinutes)=>({generated_at:iso(now),realms:[{realm:"N'Zoth",population:null,raids:{a:{zone:'Onyxia',players:0,at:iso(now-MIN),active:false,activityEnd:iso(finishedAt)}},
    buffs:allianceAt?{'Rallying Cry of the Dragonslayer:alliance':{at:iso(allianceAt),buff:'Rallying Cry of the Dragonslayer',faction:'alliance',source:'npc_yell',head:'onyxia'}}:{},sessions:{},
    heads:{onyxia:{clear:estimatedInMinutes===null?{status:'idle'}:{status:'estimated',confirmed:false,samples:9,minSamples:5,confidence:'low',estimatedAt:iso(now+estimatedInMinutes*MIN),earliestAt:iso(now+(estimatedInMinutes-5)*MIN),latestAt:iso(now+(estimatedInMinutes+5)*MIN)},drops:{}}}}]});
  // First load: an old finished raid, an old drop and an estimate already inside the window are recorded silently.
  const page=await run(feed(now-60*MIN,now-50*MIN,3),{window:{RaidSounds:player}});
  assert.deepEqual(heard,[]);
  // The same data again: still nothing.
  await page.next(feed(now-60*MIN,now-50*MIN,3));
  assert.deepEqual(heard,[]);
  // A newer finish and a newer drop are announced once each; Horde and a confirmed clear did not happen.
  await page.next(feed(now-2*MIN,now-1*MIN,3));
  assert.deepEqual([...heard].sort(),['allianceDrop','finished']);
});

test('the estimate alert fires when the estimated clear comes within the chosen window, once per estimate',async()=>{
  const now=Date.now(),heard=[];
  const player={notify:key=>{heard.push(key);return true;},settings:()=>({soonMinutes:5}),setAvailability(){},mount(){}};
  const feed=minutes=>({generated_at:iso(now),realms:[{realm:"N'Zoth",population:null,raids:{},buffs:{},sessions:{},heads:{onyxia:{clear:{status:'estimated',confirmed:false,samples:9,minSamples:5,confidence:'medium',estimatedAt:iso(now+minutes*MIN),earliestAt:iso(now+(minutes-5)*MIN),latestAt:iso(now+(minutes+5)*MIN)},drops:{}}}}]});
  const page=await run(feed(40),{window:{RaidSounds:player}});
  assert.deepEqual(heard,[]);                 // 40 minutes away: too early
  await page.next(feed(3));                   // a different estimate, now 3 minutes away
  assert.deepEqual(heard,['soon']);
  await page.next(feed(3));                   // the same estimate again: not announced twice
  assert.deepEqual(heard,['soon']);
});

test('a low-confidence estimate never triggers the ending-soon alert, and the option reports itself unavailable',async()=>{
  const now=Date.now(),heard=[],availability=[];
  const player={notify:key=>{heard.push(key);return true;},settings:()=>({soonMinutes:5}),setAvailability:(key,ok)=>availability.push([key,ok]),mount(){}};
  const feed=confidence=>({generated_at:iso(now),realms:[{realm:"N'Zoth",population:null,raids:{},buffs:{},sessions:{},heads:{onyxia:{clear:{status:'estimated',confirmed:false,samples:11,minSamples:5,confidence,estimatedAt:iso(now+3*MIN),earliestAt:iso(now-2*MIN),latestAt:iso(now+8*MIN)},drops:{}}}}]});
  const page=await run(feed('low'),{window:{RaidSounds:player}});
  await page.next(feed('low'));
  assert.deepEqual(heard,[]);
  assert.equal(availability.at(-1)[1],false);
  await page.next(feed('medium'));
  assert.equal(availability.at(-1)[1],true);
});
