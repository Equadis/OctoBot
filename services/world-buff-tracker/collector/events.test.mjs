import {test} from "node:test";
import assert from "node:assert/strict";
import {EventPublisher} from "./events.mjs";
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test("saturated queue does not evict an in-flight event or drop a buff for routine telemetry",async()=>{
 const sent=[],replies=[];
 const p=new EventPublisher("/tmp/not-used","https://test.invalid","test",{maxQueue:2,append:async()=>{},log:()=>{},fetch:async(_url,opts)=>{sent.push(JSON.parse(opts.body).id);return new Promise(r=>replies.push(r));}});
 p.publish({id:1,type:"server_info"});
 p.publish({id:2,type:"world_buff_drop"});
 p.publish({id:3,type:"server_info"});
 assert.deepEqual(p.queue.map(e=>e.id),[1,2]);
 replies.shift()(new Response(null,{status:200}));
 await tick();
 assert.deepEqual(sent,[1,2]);
 replies.shift()(new Response(null,{status:200}));
 await tick();
 assert.equal(p.stats().delivered,2);assert.equal(p.stats().dropped,1);
 await p.close();
});
test("new buff can replace waiting routine item while active upload is preserved",async()=>{
 const sent=[],replies=[];
 const p=new EventPublisher("/tmp/not-used","https://test.invalid","test",{maxQueue:2,append:async()=>{},log:()=>{},fetch:async(_url,opts)=>{sent.push(JSON.parse(opts.body).id);return new Promise(r=>replies.push(r));}});
 p.publish({id:1,type:"server_info"});p.publish({id:2,type:"server_info"});p.publish({id:3,type:"world_buff_drop"});
 assert.deepEqual(p.queue.map(e=>e.id),[1,3]);
 replies.shift()(new Response(null,{status:200}));await tick();
 assert.deepEqual(sent,[1,3]);replies.shift()(new Response(null,{status:200}));await tick();await p.close();
});
