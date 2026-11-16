import {describe,it,expect} from "vitest";
import {buildAuctionHello,buildAuctionSearch,parseAuctionHello,parseAuctionList} from "./auction.js";

describe("1.12 read-only auction protocol",()=>{
 it("writes Auction House hello with GUID, never an action packet",()=>{
  expect(buildAuctionHello(0xdeadbeefn).toString("hex")).toBe("efbeadde00000000");
  expect(()=>buildAuctionHello(0n)).toThrow();
 });
 it("requests a totally unfiltered search with the correct offset",()=>{
  const bytes=buildAuctionSearch(0x12n,100);
  expect(bytes.length).toBe(32);
  expect(bytes.readBigUInt64LE(0)).toBe(0x12n);
  expect(bytes.readUInt32LE(8)).toBe(100);
  expect(bytes[12]).toBe(0); // empty CString
  expect(bytes[13]).toBe(0);expect(bytes[14]).toBe(0); // no level bounds
  for(let offset=15;offset<31;offset+=4)expect(bytes.readUInt32LE(offset)).toBe(0xffffffff);
  expect(bytes[31]).toBe(0); // usable=false
  expect(()=>buildAuctionSearch(1n,-1)).toThrow();
 });
 it("parses the server's 12-byte Auction House confirmation",()=>{
  const bytes=Buffer.alloc(12);bytes.writeBigUInt64LE(34n,0);bytes.writeUInt32LE(7,8);
  expect(parseAuctionHello(bytes)).toEqual({guid:34n,houseId:7});
  expect(()=>parseAuctionHello(Buffer.alloc(8))).toThrow();
 });
 it("parses auction IDs, item suffixes, live bid, buyout and milliseconds without inventing names",()=>{
  const bytes=Buffer.alloc(72);
  bytes.writeUInt32LE(1,0); // one 64-byte auction
  const at=(offset:number,value:number)=>bytes.writeUInt32LE(value,4+offset);
  at(0,4321);at(4,19019);at(8,0);at(12,777);at(16,13);
  at(20,4);at(24,0);bytes.writeBigUInt64LE(789n,4+28);
  at(36,10000);at(40,500);at(44,25000);at(48,123456);
  bytes.writeBigUInt64LE(900n,4+52);at(60,12000);
  bytes.writeUInt32LE(1,68);
  const row=parseAuctionList(bytes,"2026-11-16T12:00:00Z").auctions[0];
  expect(row).toMatchObject({auction_id:4321,item_id:19019,variant:"0:777:13",quantity:4,
   start_bid:10000,current_bid:12000,min_next_bid:12500,buyout:25000,
   owner_guid:"789",time_left_ms:123456,captured_at:"2026-11-16T12:00:00Z"});
 });
 it("rejects truncated/malformed packets and refuses >50 rows",()=>{
  const tooMany=Buffer.alloc(8);tooMany.writeUInt32LE(51);
  expect(()=>parseAuctionList(tooMany)).toThrow();
  expect(()=>parseAuctionList(Buffer.alloc(4))).toThrow();
  expect(()=>parseAuctionList(Buffer.alloc(16))).toThrow();
 });
 it("allows a verified empty Auction House response",()=>{
  const body=Buffer.alloc(8);
  expect(parseAuctionList(body)).toMatchObject({total:0,auctions:[]});
 });
});
