import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchRallyYell,matchBuffYell,isWarchiefBlessingYell,normaliseYell,RALLY_BUFF,WARCHIEF_BUFF} from '../collector/dist-metrics/metrics/buffs.js';
import {createDropPipeline,DropDeduper,dropKey,eventIdFor,DEFAULT_DEDUPE_MS} from '../collector/dist-metrics/metrics/drop-pipeline.js';
import {ListenerHealth} from '../collector/dist-metrics/metrics/listener-health.js';

const live=JSON.parse(readFileSync(new URL('./fixtures/live-drops-2026-11-16.json',import.meta.url),'utf8')).rows;
const textOf=(faction,head)=>live.find(r=>r.payload.faction===faction&&r.payload.buff===RALLY_BUFF&&matchRallyYell(r.payload.text)?.head===head)?.payload.text;
const TEXT={allianceOnyxia:textOf('alliance','onyxia'),allianceNefarian:textOf('alliance','nefarian'),hordeOnyxia:textOf('horde','onyxia'),hordeNefarian:textOf('horde','nefarian')};
const REND=live.find(r=>r.payload.buff===WARCHIEF_BUFF).payload.text;
const SW={realmName:"N'Zoth",account:'OBPVESW',role:'sw',character:'Stormy'};
const ORG={realmName:"N'Zoth",account:'OBPVEORG',role:'org',character:'Orgy'};
const T0=Date.parse('2026-11-16T05:06:21.051Z');

function harness(options={}){
  let now=options.start??T0;const published=[],logs=[];
  const pipeline=createDropPipeline({publish:e=>published.push(e),now:()=>now,log:l=>logs.push(l),...options});
  return {pipeline,published,logs,advance:ms=>{now+=ms;},at:ms=>{now=ms;},now:()=>now};
}

test('the four real captured announcements are all present in the production history and all match their faction and head',()=>{
  for(const [name,text] of Object.entries(TEXT))assert.ok(text,`a real ${name} announcement exists in the captured D1 rows`);
  assert.deepEqual(matchRallyYell(TEXT.allianceOnyxia),{faction:'alliance',head:'onyxia'});
  assert.deepEqual(matchRallyYell(TEXT.allianceNefarian),{faction:'alliance',head:'nefarian'});
  assert.deepEqual(matchRallyYell(TEXT.hordeOnyxia),{faction:'horde',head:'onyxia'});
  assert.deepEqual(matchRallyYell(TEXT.hordeNefarian),{faction:'horde',head:'nefarian'});
  assert.equal(isWarchiefBlessingYell(REND),true,"Rend's announcement is the Warchief's Blessing, not a Rallying Cry");
  assert.equal(matchRallyYell(REND),null);
  assert.equal(matchBuffYell(TEXT.hordeOnyxia),'horde');
});

test('every Rallying Cry announcement stored in the production history matches (the matcher is not why a drop is missing)',()=>{
  const rally=live.filter(r=>r.payload.buff===RALLY_BUFF);
  assert.ok(rally.length>=20);
  for(const row of rally){
    const m=matchRallyYell(row.payload.text);
    assert.ok(m,`row ${row.id}: ${row.payload.text.slice(0,60)}`);
    assert.equal(m.faction,row.payload.faction);
  }
});

test('harmless formatting differences still match: case, whitespace, curly quotes, colour codes, control characters',()=>{
  const base='Behold the might of the Alliance! The dread lady, Onyxia, hangs from the arches! Let the rallying cry of the dragon slayer lift your spirits!';
  for(const variant of [
    base.toUpperCase(),base.toLowerCase(),base.replace(/ /g,'  '),base.replace(/ /g,'\n'),` \t${base}\r\n`,
    '|cff00ff00'+base+'|r',base.replace('Onyxia,','Onyxia, '),base.replace('Behold','Behold\u0007'),
  ])assert.deepEqual(matchRallyYell(variant),{faction:'alliance',head:'onyxia'},JSON.stringify(variant).slice(0,50));
  assert.deepEqual(matchRallyYell('Citizens of the Alliance, the Lord of Blackrock is slain! Nefarian has been subdued by the combined might of $n!'.replace('slain!','slain’!').replace('’','')),{faction:'alliance',head:'nefarian'});
  assert.equal(normaliseYell('It’s “quoted” — fine'),"it's \"quoted\" - fine");
});

test('nothing else becomes a drop: other NPC lines, partial phrases, player-style chat and absurd input',()=>{
  for(const text of [
    '','   ',undefined,null,42,{},'Welcome to Stormwind!','The dread lady, Onyxia, is a dragon.','Onyxia, hangs from the','Nefarian has been subdued',
    'the Lord of Blackrock is slain','NEFARIAN IS SLAIN','People of Orgrimmar, bow down','brood mother, Onyxia','Rallying Cry of the Dragonslayer',
    'x'.repeat(5000)+' Onyxia, hangs from the arches '+'x'.repeat(5000),
  ]){assert.equal(matchRallyYell(text),null,String(text).slice(0,40));assert.equal(isWarchiefBlessingYell(text),false);}
});

test('Alliance Onyxia announcement: Stormwind drop published with its head, faction and a stable event id',()=>{
  const h=harness();
  const r=h.pipeline.handleYell(SW,'Highlord Bolvar',TEXT.allianceOnyxia);
  assert.equal(r.outcome,'published');
  const e=h.published[0];
  assert.deepEqual([e.type,e.realm,e.account,e.role,e.buff,e.faction,e.head,e.source],['world_buff_drop',"N'Zoth",'OBPVESW','sw',RALLY_BUFF,'alliance','onyxia','npc_yell']);
  assert.equal(e.time,new Date(T0).toISOString());
  assert.match(e.eventId,/^[0-9a-f]{24}$/);
  assert.equal(e.eventId,eventIdFor(e),'the id is a pure function of the announcement');
});

test('each head and faction publishes: Alliance Nefarian, Horde Onyxia, Horde Nefarian',()=>{
  const h=harness();
  const cases=[[SW,TEXT.allianceNefarian,'alliance','nefarian'],[ORG,TEXT.hordeOnyxia,'horde','onyxia'],[ORG,TEXT.hordeNefarian,'horde','nefarian']];
  for(const [account,text,faction,head] of cases){
    h.advance(10*60_000);
    const r=h.pipeline.handleYell(account,'NPC',text);
    assert.equal(r.outcome,'published',`${faction} ${head}`);
    assert.deepEqual([h.published.at(-1).faction,h.published.at(-1).head,h.published.at(-1).role],[faction,head,account.role]);
  }
  assert.equal(h.published.length,3);
});

test('Rend\'s Warchief\'s Blessing is Horde, Orgrimmar only, and has no head',()=>{
  const h=harness();
  assert.equal(h.pipeline.handleYell(ORG,'Thrall',REND).outcome,'published');
  assert.deepEqual([h.published[0].buff,h.published[0].faction,h.published[0].head],[WARCHIEF_BUFF,'horde',undefined]);
  assert.equal(h.pipeline.handleYell(SW,'Thrall',REND).outcome,'ignored','the Stormwind listener never reports it');
  assert.equal(h.published.length,1);
});

// ---- The production bug: Horde at 05:06:21 swallowed an Alliance drop in the next five minutes ---------------------------------
/** The old collector code (dist-metrics/metrics/index.js, v0.2.1), kept as a control. */
function legacy(published,now){
  const lastBuffAt=new Map();
  return (account,buff,details)=>{
    const key=`${account.realmName}:${buff}`;
    if(now()-(lastBuffAt.get(key)??0)<5*60_000)return false;
    lastBuffAt.set(key,now());published.push({buff,...details,realm:account.realmName,role:account.role});return true;
  };
}
test('control: the old shared key suppressed an Alliance drop that followed a Horde drop within five minutes',()=>{
  let now=T0;const published=[],emitBuff=legacy(published,()=>now);
  assert.equal(emitBuff(ORG,RALLY_BUFF,{faction:'horde'}),true);        // 05:06:21 Horde Onyxia (stored in production)
  now=T0+90_000;                                                           // 05:07:51 Alliance Onyxia, heard in Stormwind
  assert.equal(emitBuff(SW,RALLY_BUFF,{faction:'alliance'}),false,'silently dropped: no event, no log line');
  assert.equal(published.length,1);
});
test('fixed: the same two announcements are both recorded, with the production timestamps and real texts',()=>{
  const h=harness();
  assert.equal(h.pipeline.handleYell(ORG,'Overlord Runthak',TEXT.hordeOnyxia).outcome,'published');
  h.advance(90_000);
  assert.equal(h.pipeline.handleYell(SW,'Highlord Bolvar',TEXT.allianceOnyxia).outcome,'published');
  assert.deepEqual(h.published.map(e=>e.faction),['horde','alliance']);
  assert.equal(h.logs.filter(l=>l.stage==='deduplicated').length,0);
});
test('and in the other order, and with Nefarian and Onyxia back to back for the same faction',()=>{
  const h=harness();
  h.pipeline.handleYell(SW,'x',TEXT.allianceOnyxia);h.advance(20_000);
  assert.equal(h.pipeline.handleYell(ORG,'x',TEXT.hordeNefarian).outcome,'published');
  h.advance(20_000);
  assert.equal(h.pipeline.handleYell(SW,'x',TEXT.allianceNefarian).outcome,'published','a different head is a different drop even seconds later');
  assert.deepEqual(h.published.map(e=>`${e.faction}:${e.head}`),['alliance:onyxia','horde:nefarian','alliance:nefarian']);
});

test('the same announcement heard again is recorded once; a later one is a new drop',()=>{
  const h=harness();
  assert.equal(h.pipeline.handleYell(SW,'a',TEXT.allianceOnyxia).outcome,'published');
  h.advance(5_000);
  assert.equal(h.pipeline.handleYell(SW,'a',TEXT.allianceOnyxia).outcome,'duplicate');
  h.advance(30_000);
  assert.equal(h.pipeline.handleYell(SW,'a',TEXT.allianceOnyxia).outcome,'duplicate','still inside the window, which a duplicate does not extend');
  assert.equal(h.published.length,1);
  h.advance(DEFAULT_DEDUPE_MS);
  assert.equal(h.pipeline.handleYell(SW,'a',TEXT.allianceOnyxia).outcome,'published','a genuinely new turn-in a minute and more later is a new drop');
  assert.equal(h.published.length,2);
  const dup=h.logs.find(l=>l.stage==='deduplicated');
  assert.ok(dup&&dup.windowMs===DEFAULT_DEDUPE_MS&&dup.firstSeenMsAgo>=5_000,'the suppression is logged with its reason');
});

test('realms are independent, and the buff name alone never decides what a duplicate is',()=>{
  const d=new DropDeduper(60_000,()=>T0);
  assert.equal(d.check(dropKey({realm:"N'Zoth",faction:'alliance',buff:RALLY_BUFF,head:'onyxia'})).result,'new');
  assert.equal(d.check(dropKey({realm:"Y'Shaarj",faction:'alliance',buff:RALLY_BUFF,head:'onyxia'})).result,'new');
  assert.equal(d.check(dropKey({realm:"N'Zoth",faction:'horde',buff:RALLY_BUFF,head:'onyxia'})).result,'new');
  assert.equal(d.check(dropKey({realm:"N'Zoth",faction:'alliance',buff:RALLY_BUFF,head:'nefarian'})).result,'new');
  assert.equal(d.check(dropKey({realm:"N'Zoth",faction:'alliance',buff:WARCHIEF_BUFF,head:null})).result,'new');
  assert.equal(d.check(dropKey({realm:"N'Zoth",faction:'alliance',buff:RALLY_BUFF,head:'onyxia'})).result,'duplicate');
  assert.notEqual(dropKey({realm:'r',faction:'alliance',buff:'b',head:'onyxia'}),dropKey({realm:'r',faction:'horde',buff:'b',head:'onyxia'}));
});

test('a listener only reports its own capital: a Horde yell heard in Stormwind is refused locally and logged',()=>{
  const h=harness();
  const r=h.pipeline.handleYell(SW,'x',TEXT.hordeOnyxia);
  assert.equal(r.outcome,'faction_mismatch');assert.equal(h.published.length,0);
  assert.equal(h.logs.at(-1).reason,'faction_does_not_match_listener');
});

test('every stage that decides something writes one structured line, with no credentials',()=>{
  const h=harness();
  const health=new ListenerHealth(SW);
  h.pipeline.handleYell(SW,'Bolvar',TEXT.allianceOnyxia,health);h.advance(1000);h.pipeline.handleYell(SW,'Bolvar',TEXT.allianceOnyxia,health);
  assert.deepEqual(h.logs.map(l=>l.stage),['matched','published','matched','deduplicated']);
  for(const l of h.logs){assert.equal(l.realm,"N'Zoth");assert.equal(l.faction,'alliance');assert.equal(l.role,'sw');assert.equal(l.head,'onyxia');}
  assert.ok(!/password|token|authorization|secret/i.test(JSON.stringify(h.logs)));
  const snap=health.snapshot(h.now());
  assert.equal(snap.lastMatchedFaction,'alliance');assert.equal(snap.dropsSuppressed,1);assert.ok(snap.lastDropQueuedAt);
});

test('listener health reports facts: connection, last yell of any kind, last recognised announcement, last publication',()=>{
  const health=new ListenerHealth(SW);
  const t=Date.parse('2026-11-16T05:00:00Z');
  const fresh=health.snapshot(t);
  assert.equal(fresh.connected,false);assert.equal(fresh.lastYellAt,null);assert.equal(fresh.yellsHeard,0);
  health.connected(t-60_000);health.heardYell(t-30_000);health.heardYell(t-10_000);
  const up=health.snapshot(t,{lastOkAt:t-5000,queued:0,rejected:0});
  assert.deepEqual([up.connected,up.connectedSince,up.lastYellAt,up.yellsHeard,up.lastIngestOkAt],[true,new Date(t-60_000).toISOString(),new Date(t-10_000).toISOString(),2,new Date(t-5000).toISOString()]);
  health.disconnected(t,'connection closed');
  const down=health.snapshot(t+1000,{lastError:'HTTP 500',lastErrorAt:t,queued:3});
  assert.deepEqual([down.connected,down.reason,down.lastIngestError,down.ingestQueued],[false,'connection closed','HTTP 500',3]);
  assert.ok(!('connectedSince' in down)||down.connectedSince===null);
});
