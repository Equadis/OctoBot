import {test} from "node:test";
import assert from "node:assert/strict";
import {sealCheckpoint,openCheckpoint,createRaidPersistence,legacyStateNeedsMigration} from "./raid-persistence.mjs";
const secret="synthetic-checkpoint-key-123",zone="onyxia",state={version:1,at:Date.now(),slots:[],ended:[],seen:[{name:"SyntheticCharacter"}],locks:{}};
test("checkpoint encrypts roster, authenticates zone and key",()=>{
 const blob=sealCheckpoint(state,zone,secret);assert.ok(!blob.includes("SyntheticCharacter"));assert.deepEqual(openCheckpoint(blob,zone,secret),state);
 assert.throws(()=>openCheckpoint(blob,"bwl",secret));assert.throws(()=>openCheckpoint(blob,zone,"different-secret-test"));
 const b=Buffer.from(blob,"base64");b[20]^=1;assert.throws(()=>openCheckpoint(b.toString("base64"),zone,secret));
});
test("restores new state and fails closed on nonempty legacy state",async()=>{
 const make=fetcher=>createRaidPersistence({url:"https://test.invalid",token:"test",secret,zone,fetcher});
 const p=make(async()=>Response.json({payload:sealCheckpoint(state,zone,secret),observedAt:state.at}));let restored;
 assert.equal(await p.restore({restoreCheckpoint:s=>restored=s}),"restored");assert.deepEqual(restored,state);
 const old=make(async url=>url.pathname.endsWith("/checkpoint")?Response.json({}, {status:404}):Response.json({state:{slots:[{}]}}));
 await assert.rejects(old.restore({}),/requires migration/);
});
test("allocated numbering uses an idempotent session key",async()=>{
 const requests=[];const p=createRaidPersistence({url:"https://test.invalid",token:"test",secret,zone,fetcher:async(url,opts)=>{requests.push(JSON.parse(opts.body));return Response.json({n:701});}});
 const s={key:"u123-0",id:null};const tracker={sessions:()=>({sessions:[s]}),assignNumber:(key,n)=>{assert.equal(key,s.key);s.id=n;return true;}};
 await p.number(tracker);await p.number(tracker);assert.equal(s.id,701);assert.deepEqual(requests,[{zone,requestId:"onyxia:u123-0"}]);
});

test("legacy cutover accepts only expired lockouts and no active slots",()=>{const now=Date.now(),lockoutMs=7200000;assert.equal(legacyStateNeedsMigration({slots:[],lockouts:{a:now-lockoutMs}},lockoutMs,now),false);assert.equal(legacyStateNeedsMigration({slots:[],lockouts:{a:now-lockoutMs+1}},lockoutMs,now),true);assert.equal(legacyStateNeedsMigration({slots:[{}],lockouts:{}},lockoutMs,now),true);assert.equal(legacyStateNeedsMigration({slots:[],lockouts:{a:NaN}},lockoutMs,now),true);assert.equal(legacyStateNeedsMigration({slots:[],lockouts:{a:now-lockoutMs}},undefined,now),true);});
