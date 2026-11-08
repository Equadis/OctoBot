/* Regression: Github's latest snapshot must never hide older real Cloudflare readings. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const source=readFileSync(join(import.meta.dirname,'../docs/population-history.js'),'utf8');
const root={};
new Function('window',source)(root);
const {createHistoryReader}=root.PopulationHistory;
const normalise=readings=>[...new Map(readings.map(r=>[Date.parse(r.timestamp),{
  t:Date.parse(r.timestamp),value:r.online
}])).values()].sort((a,b)=>a.t-b.t);
const row=(minute,count)=>({timestamp:new Date(Date.UTC(2026,10,8,0,minute)).toISOString(),online:count});
const when=minute=>Date.parse(row(minute,0).timestamp);

test('Cloudflare readings before the newest GitHub snapshot are still backfilled',async()=>{
  const github=normalise([row(0,50),row(5,55)]);
  const worker=[row(1,51),row(2,52),row(3,53),row(4,54)];
  const requested=[];
  const read=createHistoryReader({
    clock:()=>when(6),
    normalise,
    fetchPage:async(realm,since)=>{
      requested.push(since);
      return {readings:worker.filter(r=>Date.parse(r.timestamp)>since),has_more:false};
    }
  });
  const results=await read('nzoth',github);
  assert.deepEqual(results.map(r=>r.t),[0,1,2,3,4,5].map(when));
  assert.equal(results[2].value,52);
  assert.ok(requested[0]<when(0),'Initial Worker cursor must predate GitHub latest');
});

test('Pagination uses a Worker cursor and later reads fetch only newer samples',async()=>{
  const worker=[row(1,51),row(2,52),row(3,53),row(4,54)];
  const seen=[];
  const read=createHistoryReader({
    clock:()=>when(8),
    normalise,
    fetchPage:async(realm,since)=>{
      seen.push(since);
      const available=worker.filter(r=>Date.parse(r.timestamp)>since);
      const page=available.slice(0,2);
      return {readings:page,has_more:available.length>2,
        next_since:page.length?Date.parse(page.at(-1).timestamp):since};
    }
  });
  const github=normalise([row(0,50),row(5,55)]);
  const first=await read('nzoth',github);
  assert.deepEqual(first.map(r=>r.t),[0,1,2,3,4,5].map(when));
  assert.ok(seen.length>=2);
  worker.push(row(6,56),row(7,57));
  const second=await read('nzoth',github);
  assert.deepEqual(second.map(r=>r.t),[0,1,2,3,4,5,6,7].map(when));
  assert.equal(seen.at(-1),when(4),'Future loads resume after the latest Worker sample');
});

test('An unreachable Worker retains the previously fetched real observations',async()=>{
  const worker=[row(1,51)];
  let fails=false;
  const read=createHistoryReader({
    clock:()=>when(5),
    normalise,
    fetchPage:async(realm,since)=>{
      if(fails)throw Error('Cloudflare unavailable');
      return {readings:worker,has_more:false};
    }
  });
  const github=normalise([row(0,50),row(3,53)]);
  const first=await read('nzoth',github);
  fails=true;
  const oldWarn=console.warn;console.warn=()=>{};
  try{
    const second=await read('nzoth',github);
    assert.deepEqual(first,second);
    assert.equal(second.find(r=>r.t===when(1)).value,51);
  }finally{console.warn=oldWarn;}
});
