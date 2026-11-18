import {test} from "node:test";
import assert from "node:assert/strict";
import {migrationPlan,AUCTION_TABLES,CHAT_TABLES} from "../migrate-isolated-d1.mjs";
test("every auction and chat table has exactly one safe Wrangler export",()=>{
 const plans=migrationPlan("octometrics","octobot-auction","octobot-worldchat");
 assert.deepEqual(plans.map(x=>x.target),["octobot-auction","octobot-worldchat"]);
 assert.deepEqual(plans[0].tables,AUCTION_TABLES);
 assert.deepEqual(plans[1].tables,CHAT_TABLES);
 const exports=plans.flatMap(x=>x.exports);
 assert.equal(exports.length,AUCTION_TABLES.length+CHAT_TABLES.length);
 assert.equal(new Set(exports.map(x=>x.file)).size,exports.length);
 for(const e of exports){
  assert.equal(e.export.filter(x=>x.startsWith("--table=")).length,1);
  assert.ok(e.export.includes("--remote"));
  assert.ok(e.import.includes("--remote"));
  assert.ok(e.import.includes("--file="+e.file));
 }
});
test("invalid names and same source/target fail closed",()=>{
 for(const names of [["","auction","chat"],["octometrics","octometrics","chat"],["octometrics","auction","auction"],["octometrics","a;rm","chat"]]){
  assert.throws(()=>migrationPlan(...names));
 }
});
