import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventPublisher,classifyStatus} from '../collector/dist-metrics/metrics/events.js';

const drop=(n,extra={})=>({type:'world_buff_drop',time:`2026-11-16T05:0${n}:00.000Z`,realm:"N'Zoth",account:'OBPVESW',role:'sw',buff:'Rallying Cry of the Dragonslayer',faction:'alliance',head:'onyxia',source:'npc_yell',text:'x',eventId:`e${n}`.padEnd(24,'0'),...extra});
const routine=n=>({type:'raid_who',time:new Date(Date.UTC(2026,10,16,5,n)).toISOString(),realm:"N'Zoth",account:'OBPVESW',role:'sw'});

/** A publisher wired to a scripted fake network: `plan` is a list of responses ({status,body} or an Error), then 202 forever. */
function rig(plan,options={}){
  const calls=[],sleeps=[],logs=[];
  const publisher=new EventPublisher('unused.jsonl','https://m.test/api/ingest','secret',{
    fetch:async(url,init)=>{
      calls.push({url,event:JSON.parse(init.body),auth:init.headers.authorization});
      const step=plan.shift();
      if(step instanceof Error)throw step;
      const status=step?.status??202;
      return {status,ok:status>=200&&status<300,text:async()=>step?.body??''};
    },
    sleep:async ms=>{sleeps.push(ms);},append:async()=>{},stdout:{write:()=>true},now:()=>Date.parse('2026-11-16T05:30:00Z'),log:l=>logs.push(l),...options,
  });
  const restore=()=>{};
  return {publisher,calls,sleeps,logs,restore,settle:async()=>{while(publisher.pumping||publisher.queue.length)await new Promise(r=>setTimeout(r,1));}};
}

test('status classes: success delivers, temporary failures retry, any other client error is a permanent rejection',()=>{
  for(const s of [200,201,202,204])assert.equal(classifyStatus(s),'delivered',String(s));
  for(const s of [408,425,429,500,502,503,504])assert.equal(classifyStatus(s),'retry',String(s));
  for(const s of [400,401,403,404,409,413,422])assert.equal(classifyStatus(s),'reject',String(s));
});

test('an accepted drop is delivered once and the acceptance is logged with its event id',async()=>{
  const r=rig([]);r.publisher.publish(drop(1));await r.settle();r.restore();
  assert.equal(r.calls.length,1);assert.equal(r.calls[0].auth,'Bearer secret');assert.equal(r.publisher.stats().delivered,1);
  const accepted=r.logs.find(l=>l.stage==='accepted');
  assert.deepEqual([accepted.status,accepted.faction,accepted.eventId],[202,'alliance',drop(1).eventId]);
  assert.ok(!JSON.stringify(r.logs).includes('secret'),'the token is never logged');
});

test('a permanent rejection is logged with the Worker\'s reason and dropped: it does not block the events behind it',async()=>{
  const r=rig([{status:400,body:'{"error":"invalid telemetry event","reason":"faction_does_not_match_listener"}'}]);
  r.publisher.publish(drop(1));r.publisher.publish(drop(2));r.publisher.publish(routine(3));await r.settle();r.restore();
  assert.deepEqual(r.calls.map(c=>c.event.eventId??c.event.type),[drop(1).eventId,drop(2).eventId,'raid_who'],'the next events were still sent');
  const s=r.publisher.stats();
  assert.equal(s.rejected,1);assert.equal(s.delivered,2);assert.equal(s.queued,0);
  assert.match(s.lastError,/HTTP 400/);assert.match(s.lastError,/faction_does_not_match_listener/);
  const rej=r.logs.find(l=>l.stage==='rejected');
  assert.deepEqual([rej.status,rej.eventId],[400,drop(1).eventId]);assert.match(rej.reason,/faction_does_not_match_listener/);
  assert.equal(r.sleeps.length,0,'a permanent rejection is not retried or waited on');
});

test('temporary failures are retried with backoff, in order, and the retry carries the same event identity',async()=>{
  const r=rig([{status:503},new Error('connect ETIMEDOUT'),{status:429},{status:202}]);
  r.publisher.publish(drop(1));r.publisher.publish(drop(2));await r.settle();r.restore();
  assert.equal(r.calls.length,5,'three failed attempts, then the first drop, then the second');
  assert.deepEqual(r.calls.slice(0,4).map(c=>c.event.eventId),Array(4).fill(drop(1).eventId),'the same event, same id, every time: the Worker can recognise a retry it already stored');
  assert.equal(r.calls[4].event.eventId,drop(2).eventId,'order is kept');
  assert.deepEqual(r.sleeps,[10_000,20_000,40_000],'backoff grows');
  assert.equal(r.publisher.stats().retries,3);assert.equal(r.publisher.stats().delivered,2);
  assert.equal(r.logs.filter(l=>l.stage==='publish_deferred').length,3);
});

test('when the queue is full the oldest routine event goes first and drop announcements are kept',async()=>{
  const r=rig([{status:503},{status:503},{status:503},{status:503}],{maxQueue:3,sleep:async()=>{}});
  const p=r.publisher;
  p.queue.push(routine(1),drop(1),routine(2));          // a full queue, as after a long outage
  p.publish(drop(2));
  assert.deepEqual(p.queue.map(e=>e.eventId??e.type),[drop(1).eventId,'raid_who',drop(2).eventId],'the oldest routine event was removed, both drops remain');
  assert.equal(p.stats().dropped,1);
  p.shuttingDown=true;
  p.queue.push(routine(9));p.publish(drop(3));
  assert.equal(p.queue.filter(e=>e.type==='world_buff_drop').length,2,'nothing is published after shutdown begins');
});

test('with no ingest URL events are only written locally and nothing is sent',async()=>{
  let sent=false;
  const p=new EventPublisher('unused.jsonl','','',{fetch:async()=>{sent=true;},append:async()=>{},stdout:{write:()=>true}});
  p.publish(drop(1));await p.close();
  assert.equal(sent,false);assert.equal(p.stats().queued,0);
});
