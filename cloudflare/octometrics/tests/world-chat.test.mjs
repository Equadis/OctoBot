import test from "node:test";import assert from "node:assert/strict";
import {listingKinds,cleanText} from "../world-chat-classify.mjs";
import {validLine} from "../world-chat.mjs";
import {decodeWorldPacket} from "../collector/dist-metrics/metrics/world-chat.js";
test("recruitment aliases, boundaries, multiple raids and trade exclusion",()=>{
  assert.deepEqual(listingKinds("LFM heal ZG / MC / Ony").map(x=>x.tag),["ZG","MC","Ony"]);
  assert.equal(listingKinds("I cleared MC yesterday").length,0);
  assert.equal(listingKinds("WTS MC boost")[0].kind,"wts");
  assert.equal(listingKinds("WTB [Arcane Crystal]")[0].kind,"wtb");
  assert.equal(listingKinds("LF2M WC")[0].tag,"WC");
  assert.equal(listingKinds("LFG DM north")[0].tag,"Dire Maul");
  assert.equal(cleanText("|cffa335ee|Hitem:1|h[Item]|h|r"),"[Item]");
});
test("fresh event validation",()=>{
 const now=Date.now(),line={time:now,id:"12345678-1234-1234-1234-123456789abc",authorKey:"1",author:"Player",message:"LFM WC",gm:false};
 assert.ok(validLine(line,now));assert.equal(validLine({...line,time:now-120001},now),null);assert.equal(validLine({...line,gm:"true"},now),null);
});
test("GM flag is packet metadata, not message text",()=>{
 const text="<GM> fake",name=Buffer.from("world\0"),msg=Buffer.from(text+"\0"),body=Buffer.alloc(5+name.length+4+8+4+msg.length+1);
 name.copy(body,5);const p=5+name.length+4;body.writeBigUInt64LE(42n,p);body.writeUInt32LE(msg.length,p+8);msg.copy(body,p+12);
 assert.equal(decodeWorldPacket("world",42n,text,body).gm,false);
 body[body.length-1]=4;assert.equal(decodeWorldPacket("world",42n,text,body).gm,true);
 assert.equal(decodeWorldPacket("guild",42n,text,body),null);assert.equal(decodeWorldPacket("world",43n,text,body),null);
 body.writeUInt32LE(0xffffffff,1);assert.equal(decodeWorldPacket("world",42n,text,body),null);
});
