import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';

const sandbox=vm.createContext({Date});
vm.runInContext(readFileSync(join(import.meta.dirname,'../docs/realm-estimates.js'),'utf8'),sandbox);
const {estimateRealmHistory}=sandbox.RealmEstimates;
const now=Date.parse('2026-11-12T22:00:00Z');
const t0=now-7*86400000;
const history=[{t:t0,value:2000},{t:t0+60000,value:2100},{t:now-60000,value:1000}];
const snapshots={
 nzoth:{online:800,timestamp:new Date(now-10000).toISOString()},
 cthun:{online:100,timestamp:new Date(now-20000).toISOString()},
 yshaarj:{online:100,timestamp:new Date(now-30000).toISOString()}
};
test('backfill uses the current observed split across the complete All Realms history',()=>{
 const projected=estimateRealmHistory(history,snapshots,'nzoth',[],now);
 assert.deepEqual(Array.from(projected,row=>row.value),[1600,1680,800]);
 assert.equal(estimateRealmHistory(history,snapshots,'cthun',[],now)[0].value,200);
 assert.equal(estimateRealmHistory(history,snapshots,'yshaarj',[],now)[0].value,200);
 assert.equal(history[0].value,2000,'never modify observed All Realms data');
});
test('the estimated line ends where the realm actual observations begin',()=>{
 const actual=[{t:now-60000,value:803}];
 const projected=estimateRealmHistory(history,snapshots,'nzoth',actual,now);
 assert.deepEqual(Array.from(projected,row=>row.t),[t0,t0+60000]);
});
test('incomplete or expired realm counts do not invent a proportional split',()=>{
 assert.equal(estimateRealmHistory(history,{...snapshots,cthun:undefined},'nzoth',[],now).length,0);
 assert.equal(estimateRealmHistory(history,{...snapshots,nzoth:{online:800,timestamp:new Date(now-700000).toISOString()}},'nzoth',[],now).length,0);
 assert.equal(estimateRealmHistory(history,{...snapshots,cthun:{online:0,timestamp:new Date(now).toISOString()},nzoth:{online:0,timestamp:new Date(now).toISOString()},yshaarj:{online:0,timestamp:new Date(now).toISOString()}},'nzoth',[],now).length,0);
 assert.equal(estimateRealmHistory(history,snapshots,'all',[],now).length,0);
});
