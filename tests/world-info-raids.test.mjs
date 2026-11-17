import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {MIN,iso,rebase,memoryDb,envFor,summaryJson,replay,post} from '../cloudflare/octometrics/tests/helpers.mjs';

const script=readFileSync(new URL('../docs/world-info.js',import.meta.url),'utf8');

function element(){
  const store={children:[],ownText:''};
  return new Proxy(function(){},{
    get(_t,key){
      if(key==='textContent')return store.ownText+store.children.map(n=>n.textContent??'').join('');
      if(key==='append')return (...nodes)=>{store.children.push(...nodes);};
      if(key==='replaceChildren')return (...nodes)=>{store.children=[...nodes];store.ownText='';};
      if(key in store)return store[key];
      if(key==='classList')return {toggle(){},add(){},remove(){}};
      if(key==='style'||key==='dataset')return store[key]={};
      return ()=>element();
    },
    set(_t,key,value){
      if(key==='textContent'){store.ownText=String(value??'');store.children=[];}
      else store[key]=value;
      return true;
    },
    apply(){return element();},
  });
}

async function run(payload){
  const intervals=[],created=[];let current=payload;
  const elements=new Map();
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const document={getElementById:get,createElement:()=>{const e=element();created.push(e);return e;},createTextNode:text=>({textContent:text}),addEventListener(){}};
  const context={document,console,URL,Intl,Date,Math,Number,Object,Array,String,Boolean,JSON,Promise,Error,
    setInterval(fn,ms){intervals.push([fn,ms]);return 0;},clearInterval(){},setTimeout,
    fetch:async url=>String(url).includes('octometrics')?{ok:true,json:async()=>current}:Promise.reject(new Error('offline'))};
  vm.runInNewContext(script,context);
  await new Promise(resolve=>setTimeout(resolve,50));
  const text=id=>elements.get(id)?.textContent;
  text.el=id=>elements.get(id);text.created=created;
  text.tick=async()=>{for(const [fn,ms] of intervals)if(ms===1000)await fn();};
  text.next=async next=>{current=next;for(const [fn,ms] of intervals)if(ms===60000)await fn();await new Promise(resolve=>setTimeout(resolve,50));};
  /** Raid rows read from their actual span/strong/small children, including guild formatting. */
  text.rows=()=>created.filter(e=>e.className==='timer-row').map(row=>{
    const [title,timer,note]=row.children;
    return {title:title.textContent,timer:timer.textContent,note:note?.textContent,
      guildBold:title.children.some(child=>child.className==='raid-guild')};
  });
  return text;
}
/** "1h 05m 03s" / "23m 14s" / "12s" -> seconds. */
const seconds=t=>{let total=0;for(const [n,u] of String(t).matchAll(/(\d+)([dhms])/g).map(m=>[Number(m[1]),m[2]]))total+=n*({d:86400,h:3600,m:60,s:1})[u];return total;};

async function pageFrom(name,ageMs=0){
  const env=envFor(memoryDb());
  const r=await replay(env,name,ageMs);
  return {text:await run(await summaryJson(env)),r,env};
}

test('Onyxia with two raids shows the tracker ids, guilds and elapsed times — never "Raid 1"',async()=>{
  const {text,r}=await pageFrom('onyxia-two-raids');
  const rows=text.rows();
  assert.deepEqual(rows.map(x=>x.title),['Raid #702 – <Nightfall>','Raid #703 – <Stormguard>']);
  assert.deepEqual(rows.map(x=>x.guildBold),[true,true],'guild text and brackets are bold');
  rows.forEach((row,i)=>assert.ok(Math.abs(seconds(row.timer)-r.expected.live[i].elapsedMs/1000)<=3,`${row.timer} vs ${r.expected.live[i].elapsedMs}`));
  assert.equal(text('ony-count'),'2');
  assert.equal(text('ony-count-label'),'Raids in progress:');
  assert.equal(text('ony-state'),'Tracked');
  assert.ok(!text.created.some(e=>/^Raid 1\b/.test(String(e.textContent))));
});

test('BWL shows raid #33 with the tracker elapsed time, about 49 minutes',async()=>{
  const {text}=await pageFrom('bwl-single');
  const [row]=text.rows();
  assert.equal(row.title,'Raid #33 – Pug');
  assert.equal(row.guildBold,false,'Pug is not a guild and remains normal weight');
  assert.ok(Math.abs(seconds(row.timer)-49*60)<=8,row.timer);
  assert.equal(text('bwl-count'),'1');
  assert.equal(text('bwl-count-label'),'Raid in progress:');
});

test('back-to-back raids: the second raid has its own clock and the first is "last finished", with no kill claimed',async()=>{
  const {text,r}=await pageFrom('onyxia-back-to-back');
  const rows=text.rows();
  assert.equal(rows.length,1);
  assert.equal(rows[0].title,'Raid #702 – <Beta>');
  assert.ok(seconds(rows[0].timer)<r.expected.live[0].elapsedMs/1000+5);
  assert.match(text('ony-finished'),/ago$/);
  assert.match(text.el('ony-finished').title,/Raid #701/);
  assert.match(text.el('ony-finished').title,/not confirmed/);
});

test('website elapsed time equals tracker elapsed time for every fixture session',async()=>{
  for(const name of ['onyxia-two-raids','bwl-single','onyxia-back-to-back']){
    const {text,r}=await pageFrom(name);
    const rows=text.rows();
    assert.equal(rows.length,r.expected.live.length,name);
    rows.forEach((row,i)=>{
      assert.ok(row.title.startsWith('Raid #'+r.expected.live[i].id),name);
      assert.ok(Math.abs(seconds(row.timer)-r.expected.live[i].elapsedMs/1000)<=8,`${name}: ${row.timer}`);
    });
  }
});

test('stale tracker data is flagged, keeps the same raids and start times, and claims no clear',async()=>{
  const {text}=await pageFrom('onyxia-two-raids',10*MIN);
  assert.equal(text('ony-state'),'Stale');
  assert.deepEqual(text.rows().map(x=>x.title),['Raid #702 – <Nightfall>','Raid #703 – <Stormguard>']);
  assert.match(text('ony-evidence'),/old .* last known raids/);
  assert.equal(text('ony-clear'),'Stale');
  assert.equal(text('ony-finished'),'No data');
});

test('a refresh does not reset or jump timers',async()=>{
  const env=envFor(memoryDb());
  await replay(env,'onyxia-two-raids');
  const payload=await summaryJson(env);
  const text=await run(payload);
  const before=text.rows().map(x=>seconds(x.timer));
  await text.next(await summaryJson(env));
  const after=text.rows().slice(-2).map(x=>seconds(x.timer));
  after.forEach((v,i)=>assert.ok(v>=before[i]&&v-before[i]<=5,`${before[i]} -> ${v}`));
});

test('the tracker dropping out and returning restores the authoritative view without a duplicate raid',async()=>{
  const env=envFor(memoryDb());
  const r=await replay(env,'onyxia-two-raids',10*MIN);
  const stale=await run(await summaryJson(env));
  assert.equal(stale('ony-state'),'Stale');
  // The tracker reconnects and reports the same raids again (newer seq).
  const fresh=rebase('onyxia-two-raids');
  const snap=JSON.parse(JSON.stringify(fresh.events.filter(e=>e.type==='raid_sessions').pop()));
  snap.seq+=1e6;snap.eventId=snap.eventId+'-b';
  assert.equal((await post(env,snap)).status,202);
  await stale.next(await summaryJson(env));
  assert.equal(stale('ony-state'),'Tracked');
  assert.equal(r.expected.live.length,2);
  assert.equal(stale('ony-count'),'2');
});

test('aggregate-only activity shows "1+" with no raid id, timer or claimed separation',async()=>{
  const now=Date.now();
  const text=await run({generated_at:iso(now),realms:[{realm:"N'Zoth",population:null,raids:{a:{zone:'Onyxia',players:40,at:iso(now-MIN),active:true,activityStart:iso(now-48*MIN)}},buffs:{},sessions:{},heads:{onyxia:{clear:{status:'learning',samples:1,minSamples:5,confidence:'none'},drops:{}}}}]});
  assert.equal(text('ony-count'),'1+');
  assert.equal(text('ony-state'),'Estimated');
  assert.deepEqual(text.rows(),[]);
  assert.ok(!text.created.some(e=>/^Raid #?\d/.test(String(e.textContent))));
  assert.match(text('ony-evidence'),/cannot be counted/);
});

test('ambiguity makes the count a lower bound and says so',async()=>{
  const env=envFor(memoryDb());
  const snap=rebase('onyxia-two-raids').events.filter(e=>e.type==='raid_sessions').pop();
  const amb={...snap,sessions:snap.sessions.slice(0,1),lair:{...snap.lair,ambiguity:{kind:'overlapping_assembly',players:19,reason:'cannot separate'}}};
  assert.equal((await post(env,amb)).status,202);
  const text=await run(await summaryJson(env));
  assert.equal(text('ony-count'),'1+');
  assert.equal(text('ony-state'),'Estimated');
  assert.match(text('ony-evidence'),/19 more players could not be separated/);
});

test('a tentative cohort is labelled an estimated group, not a verified raid',async()=>{
  const env=envFor(memoryDb());
  const snap=JSON.parse(JSON.stringify(rebase('onyxia-two-raids').events.filter(e=>e.type==='raid_sessions').pop()));
  snap.sessions[1].confidence='tentative';
  assert.equal((await post(env,snap)).status,202);
  const text=await run(await summaryJson(env));
  assert.equal(text('ony-state'),'Estimated');
  const rows=text.rows();
  assert.match(rows[1].note||'',/Estimated group/);
});

test('without tracker telemetry the card says so and keeps raid timers off',async()=>{
  const now=Date.now();
  const text=await run({generated_at:iso(now),realms:[{realm:"N'Zoth",population:null,raids:{a:{zone:'Blackwing Lair',players:30,at:iso(now-MIN),active:true,activityStart:iso(now-3*60*MIN)}},buffs:{},sessions:{},heads:{nefarian:{clear:{status:'estimated',source:'legacy_headcount',samples:9,minSamples:5,confidence:'low',estimatedAt:iso(now+10*MIN),earliestAt:iso(now),latestAt:iso(now+20*MIN)},drops:{}}}}]});
  assert.equal(text('bwl-count'),'1+');
  assert.deepEqual(text.rows(),[]);
  assert.match(text('bwl-clear-note'),/headcount-based, unverified/);
  assert.match(text('source-status'),/Aggregate raid activity only/);
});

test('each raid row shows its player count and a confidence label, and both timers advance on their own every second',async()=>{
  const {text}=await pageFrom('onyxia-two-raids');
  const before=text.rows();
  assert.equal(before.length,2);
  for(const row of before)assert.match(String(row.note),/\d+ players? · (Tracked|Estimated group|Confirmed)/,`${row.title}: ${row.note}`);
  await new Promise(resolve=>setTimeout(resolve,2100));
  text.created.length=0;await text.tick();
  const after=text.rows();
  assert.equal(after.length,2,'rows are re-rendered by the 1 s tick, no page refresh needed');
  after.forEach((row,i)=>assert.ok(seconds(row.timer)>=seconds(before[i].timer)+2,`${row.title}: ${before[i].timer} -> ${row.timer}`));
  assert.notEqual(after[0].timer,after[1].timer,'the two raids never share a timer');
});
