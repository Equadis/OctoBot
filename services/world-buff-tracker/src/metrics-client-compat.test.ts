import {describe,it,expect} from "vitest";
import {WorldClient} from "./net/world-client.js";
import {buildSay} from "./protocol/chat.js";
import {ChatType,LANG_UNIVERSAL} from "./protocol/opcodes.js";
describe("metrics world client compatibility",()=>{
 it("retains say, raid polling, chat, and auction methods",()=>{
  for(const name of ["say","whoOnce","joinChannel","resolveName","whisper","queryCreature","auctionHello","auctionList","queryItemTemplate","close","start"] as const)expect(typeof WorldClient.prototype[name],name).toBe("function");
 });
 it("encodes .server info as a say, not a yell or whisper",()=>{
  const body=buildSay(".server info");
  expect(body.readUInt32LE(0)).toBe(ChatType.Say);
  expect(body.readUInt32LE(4)).toBe(LANG_UNIVERSAL);
  expect(body.subarray(8)).toEqual(Buffer.from(".server info\0"));
 });
});