import {test} from "node:test";
import assert from "node:assert/strict";
import {PROFILES,getProfile,nextSlotMs} from "./profiles.mjs";
test("seven distinct accounts and exact job periods",()=>{assert.equal(Object.keys(PROFILES).length,7);assert.equal(new Set(Object.values(PROFILES).map(p=>p.account)).size,7);assert.equal(PROFILES.OBPVESW.raid.period,30);assert.equal(PROFILES.OBPVEORG.raid.period,30);for(const k of ["OBPVEDMFA","OBPVEDMFH"]){assert.equal(PROFILES[k].info.period,20);assert.equal(PROFILES[k].chat.period,10);}for(const k of ["OBPVEAH","OBPVPSW","OVHCSW"])assert.equal(PROFILES[k].info.period,10);});
test("population and chat jobs have distinct global slots over a minute",()=>{const seen=new Set();for(const p of Object.values(PROFILES))for(const j of [p.info,p.chat].filter(Boolean))for(let s=j.offset;s<60;s+=j.period){assert.ok(!seen.has(s),"collision at "+s);seen.add(s);}});
test("profile fails closed on wrong account or realm",()=>{assert.throws(()=>getProfile({COLLECTOR_PROFILE:"OBPVESW",WOW_ACCOUNT:"OBPVEORG"}));assert.throws(()=>getProfile({COLLECTOR_PROFILE:"OBPVPSW",WOW_REALM:"N'Zoth"}));assert.equal(getProfile({COLLECTOR_PROFILE:"OVHCSW"}).account,"OBHCSW");});
test("clock slots do not drift",()=>{assert.equal(nextSlotMs(10001,10,2),12000);assert.equal(nextSlotMs(12000,10,2),22000);});
