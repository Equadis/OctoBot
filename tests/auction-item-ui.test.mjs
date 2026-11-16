import {test} from "node:test";
import assert from "node:assert/strict";
import {itemTooltip} from "../docs/auction-house/item-presentation.mjs";
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
