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

test("migration verification checks every table separately, including schema objects and live snapshot continuity",()=>{const [ah,chat]=migrationPlan("octometrics","auction","chat");for(const plan of [ah,chat]){for(const table of plan.tables){for(const kind of ["rows:","schema:"]){const check=plan.verification.find(v=>v.name===kind+table);assert.ok(check,kind+table);assert.ok(check.source.includes("octometrics"));assert.ok(check.target.includes(plan.target));assert.equal(check.source.find(x=>x.startsWith("--command=")),check.target.find(x=>x.startsWith("--command=")));}}assert.ok(plan.verification.every(v=>!v.source.some(x=>x.includes("UNION ALL"))));}for(const prefix of ["ah_","pvp_ah_"])for(const suffix of ["latest_complete","historical_total","upload_lock"])assert.ok(ah.verification.some(v=>v.name===prefix+suffix));assert.ok(chat.verification.some(v=>v.name==="chat_latest"));});
