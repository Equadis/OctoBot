import {test} from "node:test";
import assert from "node:assert/strict";
import {itemTooltip,variantDetails,variantLines,displayItemName,richItemTooltip} from "../docs/auction-house/item-presentation.mjs";
test("catalogue tooltip describes sourced fields without making up item attributes",()=>{
 const text=itemTooltip({item_id:19019,item_name:"Example Sword",quality:4});
 assert.match(text,/Example Sword/);assert.match(text,/Rarity: Epic/);
 assert.match(text,/Item ID: 19019/);assert.doesNotMatch(text,/damage|strength|stamina/i);
});
test("unresolved item IDs retain honest placeholders",()=>{
 const text=itemTooltip({item_id:12345,item_name:null,quality:null});
 assert.match(text,/Item #12345/);assert.match(text,/Rarity: unavailable/);
 assert.match(text,/not found in the available catalogue/);
});
test("artifact rarity is not mislabeled as legendary",()=>{
 assert.match(itemTooltip({item_id:123,item_name:"Example",quality:6}),/Rarity: Artifact/);
});

test("random green properties resolve exact recorded rolls, not generic suffix guesses",()=>{
 const bear={item_id:1234,item_name:"Example Vest",quality:2,variant:"0:1246:0"};
 const other={...bear,variant:"0:1233:0"};
 assert.equal(displayItemName(bear),"Example Vest of the Bear");
 assert.deepEqual(variantDetails(bear).bonuses,["+24 Stamina","+23 Strength"]);
 assert.deepEqual(variantLines(other),["+19 Stamina","+19 Strength"]);
 assert.notDeepEqual(variantLines(bear),variantLines(other),"different property IDs are different stat rolls");
 assert.match(itemTooltip(bear),/\+24 Stamina/);
 assert.match(itemTooltip(bear),/Classic DBC reference/);
});
test("unknown custom suffixes never invent attributes",()=>{
 const unknown={item_id:1234,item_name:"Example Vest",quality:2,variant:"0:4294967287:12345"};
 assert.equal(variantDetails(unknown).propertyId,-9);
 assert.equal(variantDetails(unknown).unresolved,true);
 assert.match(itemTooltip(unknown),/Unmapped random enchantment/);
 assert.doesNotMatch(itemTooltip(unknown),/\+\d+ (?:Agility|Stamina|Strength)/);
 assert.deepEqual(variantLines({item_id:1234,item_name:"Plain",variant:"0:0:0"}),[]);
});
test("permanent enchant ID can be shown without guessing suffix scaling",()=>{
 const permanent={item_id:1234,item_name:"Example Vest",quality:2,variant:"362:0:0"};
 assert.deepEqual(variantLines(permanent),["Enchant: +10 Strength"]);
});

test("Auction House tooltips reserve small notes for data provenance and unavailable rolls",async()=>{
 const unresolved=await richItemTooltip({item_id:0,item_name:"Example",variant:"0:4294967287:12345"});
 assert.ok(unresolved.notes.some(line=>/Unmapped random enchantment/.test(line)));
 assert.ok(!unresolved.lines.some(line=>/Unmapped random enchantment/.test(line)));
 const standard=await richItemTooltip({item_id:0,item_name:"Example",variant:"0:1246:0"});
 assert.ok(standard.lines.some(line=>/\+24 Stamina/.test(line)));
 assert.ok(standard.notes.some(line=>/Standard Classic DBC reference/.test(line)));
 const css=(await import('node:fs')).readFileSync(new URL('../docs/auction-house/auction.css',import.meta.url),'utf8');
 assert.match(css,/\.planner-tooltip p\.tooltip-note\{[^}]*font-size:10px[^}]*\}/);
 assert.match(css,/\.ah-roll-detail small\{[^}]*font-size:10px[^}]*\}/);
});


test("shared rich tooltips use actual same-origin official equipment and consumable snapshots before external DB",async()=>{
 const {readFile}=await import("node:fs/promises");
 const original=globalThis.fetch,requests=[];
 globalThis.fetch=async url=>{
  const u=new URL(url);requests.push(u.href);
  if(u.protocol==="file:")return {ok:true,json:async()=>JSON.parse(await readFile(u,"utf8"))};
  throw Error("Simulated blocked cross-origin database request");
 };
 try{
  const equipment=JSON.parse(await readFile(new URL("../docs/sim/data/items/details.json",import.meta.url),"utf8"));
  const sample=Object.values(equipment).find(x=>x.id&&x.tooltipText?.split("\n").length>3);
  assert.ok(sample,"real official equipment fixture exists");
  const result=await richItemTooltip({item_id:sample.id,item_name:sample.name});
  assert.ok(result.lines.length>=2);
  assert.ok(result.notes.includes("Base stats: OctoWoW DB snapshot."));
  const potion=await richItemTooltip({item_id:118,item_name:"Minor Healing Potion"});
  assert.ok(potion.lines.some(l=>/Use: Restores 70 to 91 health/.test(l)));
  const arrow=await richItemTooltip({item_id:2512,item_name:"Rough Arrow"});
  assert.ok(arrow.lines.some(l=>/1.5 damage per second/.test(l)));
  assert.equal(requests.filter(u=>u.includes("/details.json")).length,1);
  assert.equal(requests.some(u=>u.startsWith("https:")),false);
  const missing=await richItemTooltip({item_id:2147483647,item_name:"Unknown item"});
  assert.ok(missing.notes.some(l=>/No verified item tooltip/.test(l)));
  assert.equal(missing.lines.length,0);
 }finally{globalThis.fetch=original;}
});
