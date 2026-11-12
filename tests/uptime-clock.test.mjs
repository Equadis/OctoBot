import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';

const source=readFileSync(join(import.meta.dirname,'../docs/uptime-clock.js'),'utf8');
const sandbox=vm.createContext({Date,globalThis:{}});
vm.runInContext(source,sandbox);
const U=sandbox.globalThis.OctoBotUptime;
assert.ok(U);

const anchor=Date.parse('2026-11-08T16:38:48Z');
const references={nzoth:{observed_at:'2026-11-08T16:38:48Z',elapsed_seconds:374822}};
const reading=(minute,realm='online',website='available')=>({
 timestamp:new Date(anchor+minute*60000).toISOString(),
 website,realms:{nzoth:realm}
});

test('the clock continues without a 12-hour or 24-hour expiration',()=>{
 for(const hours of [1,13,24,72,24*60]){
  const t=anchor+hours*3600000;
  const n=U.compute('nzoth',references,t);
  assert.equal(n.kind,'running');
  assert.equal(n.seconds,374822+hours*3600);
 }
 assert.equal(U.format(374822),'4D 8H 7M 2S');
});

test('All Realms displays a N\'Zoth-labelled reference, never a fabricated realm total',()=>{
 const value=U.compute('all',references,anchor+60000);
 assert.equal(value.kind,'running');
 assert.equal(value.sourceRealm,'nzoth');
 assert.equal(value.seconds,374882);
 for(const realm of ['yshaarj','cthun'])
  assert.equal(U.compute(realm,references,anchor+3600000).kind,'unknown');
});

test('missing, stale and unknown probes and shared auth failures do not stop the clock',()=>{
 const samples=[
  reading(2,'unknown'),reading(4,'online'),
  {...reading(5,'offline'),website:'unavailable'},
  {...reading(6,'online'),tcp:'unreachable',auth:'unresponsive'},
  {...reading(7,'online'),tcp:'unknown',auth:'unknown'},
 ];
 assert.equal(U.confirmedOffline(samples,'nzoth',anchor,anchor+600000),null);
 assert.equal(U.compute('nzoth',references,anchor+7200000).kind,'running');
});

test('one offline signal is insufficient; two consecutive official offline probes interrupt',()=>{
 const one=[reading(2,'offline')];
 assert.equal(U.confirmedOffline(one,'nzoth',anchor,anchor+600000),null);
 const detected=U.confirmedOffline([...one,reading(3,'offline')],'nzoth',anchor,anchor+600000);
 assert.ok(detected);
 assert.equal(detected.first,anchor+2*60000);
 assert.equal(detected.confirmed,anchor+3*60000);
 const result=U.compute('all',references,anchor+3600000,detected);
 assert.equal(result.kind,'interrupted');
 assert.equal(result.sourceRealm,'nzoth');
});

test('offline observations before the in-game reading do not invalidate newer uptime',()=>{
 const earlier={...reading(-15,'offline')},earlier2=reading(-14,'offline');
 assert.equal(U.confirmedOffline([earlier,earlier2], 'nzoth',anchor,anchor+3600000),null);
 assert.equal(U.compute('nzoth',references,anchor+3600000).kind,'running');
});

test('widely spaced offline samples or an intervening online recovery do not prove one outage',()=>{
 const separated=[reading(2,'offline'),reading(20,'offline')];
 assert.equal(U.confirmedOffline(separated,'nzoth',anchor,anchor+3600000),null);
 const interrupted=[reading(2,'offline'),reading(3,'online'),reading(4,'offline')];
 assert.equal(U.confirmedOffline(interrupted,'nzoth',anchor,anchor+3600000),null);
});

test('a new in-game reference after an outage permits counting again',()=>{
 const offline=U.confirmedOffline([reading(2,'offline'),reading(3,'offline')],
   'nzoth',anchor,anchor+600000);
 const next={nzoth:{observed_at:new Date(anchor+20*60000).toISOString(),
   elapsed_seconds:250}};
 assert.equal(U.compute('nzoth',next,anchor+30*60000,offline).kind,'running');
 assert.equal(U.compute('nzoth',next,anchor+30*60000,offline).seconds,850);
});


test('NO DATA is temporary: recovery resumes from the original uptime, including the entire gap',()=>{
 const online=reading(2,'online'),missing=reading(3,'unknown'),recovered=reading(4,'online');
 const start=U.compute('nzoth',references,anchor+2*60000);
 assert.equal(U.monitorStatus([online],'nzoth',anchor,anchor+2*60000).kind,'online');
 assert.equal(U.monitorStatus([online,missing],'nzoth',anchor,anchor+3*60000).kind,'unknown');
 assert.equal(U.confirmedOffline([online,missing,recovered],'nzoth',anchor,anchor+4*60000),null);
 assert.equal(U.monitorStatus([online,missing,recovered],'nzoth',anchor,anchor+4*60000).kind,'online');
 const resumed=U.compute('nzoth',references,anchor+4*60000);
 assert.equal(resumed.kind,'running');
 assert.equal(resumed.seconds,start.seconds+120,'Gap time is included rather than resetting the clock');
});

test('stale monitoring hides the estimate without invalidating its anchor',()=>{
 const online=reading(1,'online');
 assert.equal(U.monitorStatus([online],'nzoth',anchor,anchor+2*60000).kind,'online');
 assert.equal(U.monitorStatus([online],'nzoth',anchor,anchor+20*60000).kind,'unknown');
 assert.equal(U.confirmedOffline([online],'nzoth',anchor,anchor+20*60000),null);
 const recovered=reading(21,'online');
 assert.equal(U.monitorStatus([online,recovered],'nzoth',anchor,anchor+21*60000).kind,'online');
 assert.equal(U.compute('nzoth',references,anchor+21*60000).seconds,374822+21*60);
});

test('NO DATA between DOWN reports prevents a false confirmation',()=>{
 const gap=[reading(2,'offline'),reading(3,'unknown'),reading(4,'offline')];
 assert.equal(U.confirmedOffline(gap,'nzoth',anchor,anchor+6*60000),null);
 const inaccessible=[reading(2,'offline'),reading(3,'offline','unavailable'),reading(4,'offline')];
 assert.equal(U.confirmedOffline(inaccessible,'nzoth',anchor,anchor+6*60000),null);
 assert.equal(U.monitorStatus([reading(2,'offline')],'nzoth',anchor,anchor+2*60000).kind,'uncertain');
});

test('conflicting same-time source observations cannot verify DOWN',()=>{
 const samples=[reading(2,'offline'),reading(3,'offline'),reading(3,'online')];
 assert.equal(U.confirmedOffline(samples,'nzoth',anchor,anchor+6*60000),null);
 assert.equal(U.monitorStatus(samples,'nzoth',anchor,anchor+3*60000).kind,'unknown');
});
