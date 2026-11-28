import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {matchesChat} from "../docs/world-chat/chat-history.mjs";
import {parseChatMessage} from "../docs/world-chat/chat-links.mjs";
import {itemTooltipRoute} from "../cloudflare/octometrics/world-chat.mjs";
const read=p=>readFileSync(new URL("../docs/"+p,import.meta.url),"utf8");
const row={author:"Lightsjwald",guild:"Raiders",...parseChatMessage("WTS |cff1eff00|Hitem:83244:0:0:0|h[Freebooter's Pirate Hat]|h|r")};
test("tagged chat queries match author and actual item links, not other fields or partial IDs",()=>{
 for(const q of ["from:lightsjwald","item:83244","item:Freebooter's Pirate Hat","from:lightsjwald item:83244","item:83244 from:lightsjwald","item:\"Freebooter's Pirate Hat\" WTS","item:83244 WTS","raiders pirate"])assert.equal(matchesChat(row,q),true,q);
 for(const q of ["from:lights","item:8324","item:raiders","from:lightsjwald WTB","item:","from:"])assert.equal(matchesChat(row,q),false,q);
 assert.equal(matchesChat({author:"Other",message:"WTS Freebooter's Pirate Hat"},"item:83244"),false);
});
test("item tooltip lookup rejects malformed IDs before making an upstream request",async()=>{
 const response=await itemTooltipRoute(new URL("https://example.test/api/world-chat/item-tooltip?id=bad"),()=>{throw Error("unexpected fetch");},class {});
 assert.equal(response.status,400);
});
test("site layout and rarity keep existing controls and use the requested palette",()=>{
 const outfit=read("outfitter/index.html"),planner=read("sim/combat-layout.css"),theme=read("site-theme.css");
 assert.ok(outfit.indexOf('<h2>Character</h2>')<outfit.indexOf('id="race-picker"'));
 assert.ok(outfit.indexOf('id="gender-picker"')<outfit.indexOf('class="paperdoll"'));
 assert.match(planner,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\);width:100%/);
 assert.match(theme,/--quality-0:#9d9d9d/);
 assert.match(read("world-chat/index.html"),/placeholder="Search chat\.\.\."/);
 assert.doesNotMatch(read("auction-house/chart.mjs"),/'High '\+money/);
});
