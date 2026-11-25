import {test} from "node:test";
import assert from "node:assert/strict";
import {PROFILES,getProfile,nextSlotMs,validateLiveProfile} from "./profiles.mjs";
test("seven distinct accounts and exact job periods",()=>{assert.equal(Object.keys(PROFILES).length,7);assert.equal(new Set(Object.values(PROFILES).map(p=>p.account)).size,7);assert.equal(PROFILES.OBPVESW.raid.period,30);assert.equal(PROFILES.OBPVEORG.raid.period,30);for(const k of ["OBPVEDMFA","OBPVEDMFH"]){assert.equal(PROFILES[k].info.period,20);assert.equal(PROFILES[k].chat.period,5);}for(const k of ["OBPVEAH","OBPVPSW","OVHCSW"])assert.equal(PROFILES[k].info.period,10);});
test("population and chat jobs have distinct global slots over a minute",()=>{
  const slots = new Map();
  for (const [profile, config] of Object.entries(PROFILES)) {
    for (const kind of ["info", "chat"]) {
      const job = config[kind];
      if (!job) continue;
      const label = `${profile}.${kind}`;
      for (let second = job.offset; second < 60; second += job.period) {
        assert.ok(!slots.has(second), `${label} overlaps ${slots.get(second)} at second ${second}`);
        slots.set(second, label);
      }
    }
  }
});
test("profile fails closed on wrong account or realm",()=>{assert.throws(()=>getProfile({COLLECTOR_PROFILE:"OBPVESW",WOW_ACCOUNT:"OBPVEORG"}));assert.throws(()=>getProfile({COLLECTOR_PROFILE:"OBPVPSW",WOW_REALM:"N'Zoth"}));assert.equal(getProfile({COLLECTOR_PROFILE:"OVHCSW"}).account,"OBHCSW");});
test("clock slots do not drift",()=>{assert.equal(nextSlotMs(10001,10,2),12000);assert.equal(nextSlotMs(12000,10,2),22000);});

test("live jobs fail closed if their enablement or private variables are missing",()=>{for(const key of Object.keys(PROFILES)){const p=getProfile({COLLECTOR_PROFILE:key});assert.throws(()=>validateLiveProfile(p,{}),/METRICS_PUSH_TOKEN/);assert.doesNotThrow(()=>validateLiveProfile(p,{METRICS_PUSH_TOKEN:"test-only",RAID_STATE_KEY:"synthetic-key-for-test",WORLD_CHAT_ENABLED:"true",AUCTION_PUSH_TOKEN:"test-only",AUCTION_COLLECTOR_ENABLED:"true",AUCTION_RULES_APPROVED:"true"}));}assert.throws(()=>validateLiveProfile(getProfile({COLLECTOR_PROFILE:"OBPVEAH"}),{METRICS_PUSH_TOKEN:"test-only"}),/AUCTION_PUSH_TOKEN/);});
