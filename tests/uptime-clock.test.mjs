import {test} from 'node:test';
import assert from 'node:assert/strict';
import U from '../docs/uptime-clock.js';

const start=Date.parse('2026-11-08T16:38:48Z');
const minute=60000;
const reference={observed_at:new Date(start).toISOString(),elapsed_seconds:374822};
const reading=(offset,nzoth,website='available')=>[start+offset*minute,{website,realms:{nzoth}}];
const status=(samples,now=start+20*minute)=>U.realmStatus(samples,'nzoth',reference,now);

test('an in-game reference is preserved through unknown, stale and isolated offline observations',()=>{
 const samples=[reading(1,'offline'),reading(2,'offline','unavailable'),reading(3,'offline')];
 const now=start+20*minute;
 const result=U.summarize({nzoth:status(samples)},'nzoth',now);
 assert.deepEqual(result,{kind:'running',seconds:374822+20*60,stale:true});
 assert.equal(U.format(result.seconds),'4D 8H 27M 2S');
});

test('only the latest confirmed outage resets the clock, which resumes on verified recovery',()=>{
 const samples=[reading(1,'offline'),reading(2,'offline'),reading(3,'online'),
  reading(4,'offline'),reading(5,'offline'),reading(6,'unknown')];
 assert.equal(status(samples).offline,true);
 assert.equal(status(samples).startedAt,null);
 assert.equal(status([...samples,reading(7,'online')]).startedAt,start+7*minute);
 assert.equal(status([reading(1,'offline'),reading(17,'offline')]).offline,false);
});

test('realms without an in-game reference start from their first observed online status',()=>{
 const samples=[reading(1,'unknown'),reading(2,'online'),reading(3,'online')];
 assert.equal(U.realmStatus(samples,'nzoth',null,start+5*minute).startedAt,start+2*minute);
 assert.equal(U.realmStatus(samples.slice(0,1),'nzoth',null,start+5*minute).startedAt,null);
});

test('same-time conflicts only affect the realm that disagrees',()=>{
 const old={website:'available',realms:{nzoth:'offline',cthun:'online'}};
 const next={website:'available',realms:{nzoth:'online',cthun:'unknown'}};
 const merged=U.mergeStatus(old,next,['nzoth','cthun']);
 assert.deepEqual(merged.realms,{nzoth:'conflict',cthun:'online'});
 assert.deepEqual(U.mergeStatus(merged,old,['nzoth','cthun']),merged);
});
