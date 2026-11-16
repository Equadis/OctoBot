import {describe,it,expect,vi} from "vitest";
import {CATALOGUE_URL,metadataFromCatalogue,fetchAuctionCatalogue} from "./auction-metadata.js";
describe("Auction House item metadata sourced from the existing Gear Planner catalogue",()=>{
 it("maps names, rarity and icon identifiers with the same verified CDN as the planner",()=>{
  const map=metadataFromCatalogue([{id:19019,name:"A Verified Item",quality:4,icon:"INV_Sword_01"}]);
  expect(map.get(19019)).toEqual({item_name:"A Verified Item",quality:4,icon_url:"https://wow.zamimg.com/images/wow/icons/large/inv_sword_01.jpg"});
 });
 it("does not invent metadata when the catalogue is incomplete",()=>{
  const map=metadataFromCatalogue([{id:12,name:"No icon",quality:2},{id:13,name:"Unknown quality",icon:"evil/../url"},{id:-1,name:"Bad id"},{id:14,name:"   "}]);
  expect(map.get(12)).toEqual({item_name:"No icon",quality:2,icon_url:null});
  expect(map.get(13)).toEqual({item_name:"Unknown quality",quality:null,icon_url:null});
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
