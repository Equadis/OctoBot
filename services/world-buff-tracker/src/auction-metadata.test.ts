import {describe,it,expect,vi} from "vitest";
import {CATALOGUE_URL,metadataFromCatalogue,fetchAuctionCatalogue} from "./auction-metadata.js";
describe("Auction House item metadata sourced from the existing Gear Planner catalogue",()=>{
 it("maps names, rarity and icon identifiers with the same verified CDN as the planner",()=>{
  const map=metadataFromCatalogue([{id:19019,name:"A Verified Item",quality:4,icon:"INV_Sword_01"}]);
  expect(map.get(19019)).toEqual({item_name:"A Verified Item",quality:4,icon_url:"https://wow.zamimg.com/images/wow/icons/large/inv_sword_01.jpg",item_level:null,req_level:null,class_id:null,subclass_id:null,slot_id:null});
 });
 it("does not invent metadata when the catalogue is incomplete",()=>{
  const map=metadataFromCatalogue([{id:12,name:"No icon",quality:2},{id:13,name:"Unknown quality",icon:"evil/../url"},{id:-1,name:"Bad id"},{id:14,name:"   "}]);
  expect(map.get(12)).toMatchObject({item_name:"No icon",quality:2,icon_url:null});
  expect(map.get(13)).toMatchObject({item_name:"Unknown quality",quality:null,icon_url:null});
  expect(map.has(-1)).toBe(false);
  expect(map.has(14)).toBe(false);
  expect(map.get(99999)).toBeUndefined();
 });
 it("rejects structurally invalid data and never guesses names",()=>{
  expect(()=>metadataFromCatalogue({items:[]})).toThrow();
  expect(()=>metadataFromCatalogue(new Array(100001).fill(null))).toThrow();
 });
 it("retrieves only the existing first-party published catalogue",async()=>{
  const mocked=vi.fn(async()=>new Response(JSON.stringify([{id:5,name:"Source item",quality:1,icon:"inv_misc_bag_01"}]),{status:200}));
  const map=await fetchAuctionCatalogue(mocked as typeof fetch);
  expect(mocked).toHaveBeenCalledWith(CATALOGUE_URL,expect.objectContaining({headers:{Accept:"application/json"}}));
  expect(map.get(5)?.item_name).toBe("Source item");
 });
});
describe("filter metadata",()=>{
 it("carries level, class, subclass and slot, and never invents them",()=>{
  const map=metadataFromCatalogue([
   {id:1,name:"Gear",quality:3,level:40,reqlevel:30,classs:4,subclass:2,slot:7},
   {id:2,name:"Consumable",quality:1,level:18,classs:0,subclass:0},
   {id:3,name:"Sparse",quality:1}]);
  expect(map.get(1)).toMatchObject({item_level:40,req_level:30,class_id:4,subclass_id:2,slot_id:7});
  expect(map.get(2)).toMatchObject({item_level:18,req_level:0,class_id:0,subclass_id:0,slot_id:null});
  expect(map.get(3)).toMatchObject({item_level:null,req_level:null,class_id:null,subclass_id:null,slot_id:null});
 });
});
describe("against the real published catalogue file (docs/sim/data/items/catalogue.json)",()=>{
 it("parses the actual structure and gives most items a name, rarity and icon",async()=>{
  const {readFileSync}=await import("node:fs");
  const raw=JSON.parse(readFileSync(new URL("../../../docs/sim/data/items/catalogue.json",import.meta.url),"utf8"));
  const map=metadataFromCatalogue(raw);
  expect(map.size).toBe(raw.length);                       // every entry has a valid id and name
  expect(map.size).toBeGreaterThan(19000);
  const withIcon=[...map.values()].filter(m=>m.icon_url).length;
  expect(withIcon/map.size).toBeGreaterThan(0.98);         // a few malformed icon ids are deliberately dropped
  expect([...map.values()].every(m=>m.quality!==null)).toBe(true);
  expect(map.get(36701)?.icon_url).toBeNull();             // malformed icon id is not turned into a URL
 });
});
