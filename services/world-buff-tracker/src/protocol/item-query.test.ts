import {describe,it,expect} from "vitest";
import {PacketWriter} from "../net/byte-buffer.js";
import {buildItemQuery,parseItemTemplate} from "./item-query.js";
describe("Vanilla item metadata queries",()=>{
 it("uses the exact item ID and an empty GUID",()=>{
  expect(buildItemQuery(4304).toString("hex")).toBe("d01000000000000000000000");
  expect(()=>buildItemQuery(0)).toThrow();
 });
 it("decodes the item template prefix, retaining zero values",()=>{
  const p=new PacketWriter().u32LE(4304).u32LE(7).u32LE(0).cString("Thick Leather").cString("").cString("").cString("");
  [8711,1,0,1200,300,0,0xffffffff,0xffffffff,40,0].forEach(n=>p.u32LE(n));
  expect(parseItemTemplate(p.toBuffer())).toEqual({item_id:4304,display_id:8711,metadata:{item_name:"Thick Leather",quality:1,icon_url:null,item_level:40,req_level:0,class_id:7,subclass_id:0,slot_id:0}});
  expect(()=>parseItemTemplate(p.toBuffer().subarray(0,-1))).toThrow();
 });
 it("distinguishes missing templates from real data",()=>{
  expect(parseItemTemplate(new PacketWriter().u32LE(0x80000000+4304).toBuffer())).toEqual({item_id:4304,display_id:null,metadata:null});
 });
});
