import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../docs/world-info.js',import.meta.url),'utf8');
const iso=ms=>new Date(ms).toISOString(),MIN=60_000,RALLY='Rallying Cry of the Dragonslayer';

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
  const intervals=[];let current=payload;
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const document={getElementById:get,createElement:()=>element(),createTextNode:text=>({textContent:text}),addEventListener(){}};
  const context={
    document,console,URL,Intl,Date,Math,Number,Object,Array,String,Boolean,JSON,Promise,Error,
    setInterval(fn,ms){intervals.push([fn,ms]);return 0;},clearInterval(){},setTimeout,
    fetch:async url=>String(url).includes('octometrics')?{ok:true,json:async()=>current}:Promise.reject(new Error('offline')),
  };
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setTimeout(resolve,50));
  const text=id=>elements.get(id)?.textContent;
  text.next=async next=>{current=next;for(const [fn,ms] of intervals)if(ms===60000)await fn();await new Promise(resolve=>setTimeout(resolve,50));};
  return text;
}

const drop=(at,head,extra={})=>({at:iso(at),buff:RALLY,head,source:'npc_yell',confirmed:true,...extra});
const feed=(now,{lastDrops={alliance:null,horde:null},buffs={},listeners=null,monitoring=null,generated=now}={})=>({generated_at:iso(generated),realms:[{realm:"N'Zoth",population:null,raids:{},buffs,lastDrops,sessions:{},heads:{},listeners,monitoring}]});
const healthy={sw:{status:'healthy'},org:{status:'healthy'}};
const fresh={collectorFresh:true};

test('an Onyxia drop from the API shows the elapsed time with its head, from the confirmed event timestamp',async()=>{
  const now=Date.now(),text=await run(feed(now,{lastDrops:{alliance:drop(now-15*MIN,'onyxia'),horde:null},listeners:healthy,monitoring:fresh}));
  assert.match(text('alliance-last'),/^1[45]m \d\ds ago$/);
  assert.match(text('alliance-last-note'),/^Recorded .* · Onyxia head$/);
  assert.equal(text('alliance-state'),'DROP RECORDED');
  assert.equal(text('horde-last'),'NO DATA');
});

test('a newer Nefarian drop replaces an older Onyxia drop for the same faction; the other faction is untouched',async()=>{
  const now=Date.now(),text=await run(feed(now,{
    lastDrops:{alliance:drop(now-4*MIN,'nefarian'),horde:drop(now-90*MIN,'onyxia')},
    buffs:{[`${RALLY}:alliance`]:{...drop(now-4*MIN,'nefarian'),faction:'alliance'},[`${RALLY}:horde`]:{...drop(now-90*MIN,'onyxia'),faction:'horde'}},
    listeners:healthy,monitoring:fresh}));
  assert.match(text('alliance-last'),/^[34]m \d\ds ago$/);assert.match(text('alliance-last-note'),/Nefarian head/);
  assert.match(text('horde-last'),/^1h 3[01]m \d\ds ago$/);assert.match(text('horde-last-note'),/Onyxia head/);
});

test('the newest timestamp wins wherever it appears in the response, and a later response never replaces a newer drop with an older one',async()=>{
  const now=Date.now(),newer=drop(now-3*MIN,'onyxia'),older=drop(now-200*MIN,'nefarian');
  const text=await run(feed(now,{lastDrops:{alliance:older,horde:null},buffs:{[`${RALLY}:alliance`]:{...newer,faction:'alliance'}},listeners:healthy,monitoring:fresh}));
  assert.match(text('alliance-last'),/^[23]m \d\ds ago$/);
  await text.next(feed(now,{lastDrops:{alliance:older,horde:null},listeners:healthy,monitoring:fresh}));   // a stale edge copy
  assert.match(text('alliance-last'),/^[34]m \d\ds ago$/,'the newer drop already shown is kept');
  assert.match(text('alliance-last-note'),/Onyxia head/);
  const later=drop(now-1*MIN,'nefarian');
  await text.next(feed(now,{lastDrops:{alliance:later,horde:null},listeners:healthy,monitoring:fresh}));
  assert.match(text('alliance-last-note'),/Nefarian head/,'a genuinely newer drop does replace it');
});

test('only a confirmed npc_yell announcement is shown; anything else is NO DATA',async()=>{
  const now=Date.now();
  for(const bad of [{...drop(now-MIN,'onyxia'),source:'addon_report'},{...drop(now-MIN,'onyxia'),confirmed:false},{...drop(now-MIN,'onyxia'),source:undefined}]){
    const text=await run(feed(now,{lastDrops:{alliance:bad,horde:null},listeners:healthy,monitoring:fresh}));
    assert.equal(text('alliance-last'),'NO DATA');assert.equal(text('alliance-state'),'AWAITING DATA');
  }
});

test('invalid or future timestamps show NO DATA instead of a nonsense timer',async()=>{
  const now=Date.now();
  for(const at of ['not a date',iso(now+3*3600_000),'']){
    const text=await run(feed(now,{lastDrops:{alliance:{...drop(now,'onyxia'),at},horde:null},listeners:healthy,monitoring:fresh}));
    assert.equal(text('alliance-last'),'NO DATA',String(at));
  }
});

test('when the API is unavailable the last known drop stays visible, clearly labelled as last known',async()=>{
  const now=Date.now(),text=await run(feed(now,{lastDrops:{alliance:drop(now-15*MIN,'onyxia'),horde:null},listeners:healthy,monitoring:fresh}));
  await text.next(null);
  assert.match(text('alliance-last'),/^1[56]m \d\ds ago$/);
  assert.equal(text('alliance-state'),'LAST KNOWN');
  assert.match(text('alliance-last-note'),/^Last known: .*OctoMetrics is unavailable/);
});

test('a collector that has stopped reporting, or an offline listener, labels the drop as last known and says a newer one may be missing',async()=>{
  const now=Date.now(),lastDrops={alliance:drop(now-15*MIN,'onyxia'),horde:drop(now-15*MIN,'onyxia')};
  let text=await run(feed(now,{lastDrops,listeners:healthy,monitoring:{collectorFresh:false}}));
  assert.equal(text('alliance-state'),'LAST KNOWN');assert.match(text('alliance-last-note'),/collector has stopped reporting/);
  text=await run(feed(now,{lastDrops,listeners:{sw:{status:'offline'},org:{status:'healthy'}},monitoring:fresh}));
  assert.equal(text('alliance-state'),'LAST KNOWN');assert.match(text('alliance-last-note'),/Stormwind listener is offline/);
  assert.equal(text('horde-state'),'DROP RECORDED','one faction\'s listener problem does not mark the other');assert.doesNotMatch(text('horde-last-note'),/listener/);
});

test('a silent or degraded listener adds a caution but keeps the drop recorded',async()=>{
  const now=Date.now(),lastDrops={alliance:drop(now-15*MIN,'onyxia'),horde:drop(now-15*MIN,'onyxia')};
  const text=await run(feed(now,{lastDrops,listeners:{sw:{status:'silent'},org:{status:'degraded'}},monitoring:fresh}));
  assert.equal(text('alliance-state'),'DROP RECORDED');assert.match(text('alliance-last-note'),/Stormwind listener has heard nothing/);
  assert.equal(text('horde-state'),'DROP RECORDED');assert.match(text('horde-last-note'),/Orgrimmar are not being delivered reliably/);
});

test('an unverified listener (collector not yet reporting health) raises no false alarm',async()=>{
  const now=Date.now(),text=await run(feed(now,{lastDrops:{alliance:drop(now-15*MIN,'onyxia'),horde:null},listeners:{sw:{status:'unverified'},org:{status:'unverified'}},monitoring:fresh}));
  assert.equal(text('alliance-state'),'DROP RECORDED');assert.doesNotMatch(text('alliance-last-note'),/listener/);
});

test('a browser clock that is minutes wrong neither hides a fresh drop nor invents a future one: elapsed time uses the server\'s clock',async()=>{
  const real=Date.now(),serverNow=real+10*MIN;        // the browser runs ten minutes behind the Worker
  const text=await run(feed(serverNow,{lastDrops:{alliance:drop(serverNow-2*MIN,'onyxia'),horde:null},listeners:healthy,monitoring:fresh,generated:serverNow}));
  assert.match(text('alliance-last'),/^[12]m \d\ds ago$/,'a drop two minutes old on the server is shown, not rejected as "in the future"');
  assert.notEqual(text('alliance-last'),'NO DATA');
});

test('a new drop after a long gap resets the timer',async()=>{
  const now=Date.now(),text=await run(feed(now,{lastDrops:{alliance:drop(now-26*3600_000,'onyxia'),horde:null},listeners:healthy,monitoring:fresh}));
  assert.match(text('alliance-last'),/^26h 0[01]m/);
  await text.next(feed(now,{lastDrops:{alliance:drop(now-30_000,'nefarian'),horde:null},listeners:healthy,monitoring:fresh}));
  assert.match(text('alliance-last'),/^\d+s ago$/);
});
