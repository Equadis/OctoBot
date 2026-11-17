import {describe,it,expect} from "vitest";
import {auditMongoDurations} from "./audit-mongo-raid-history.js";
const doc=(sessionKey:string,ms:number,valid:boolean,ts:number)=>({sessionKey,ms,valid,ts:new Date(ts)});
describe("Mongo history audit",()=>{
  it("does not learn a superseded duplicate, and reports unlinked samples",()=>{
    const report=auditMongoDurations([doc("n1",30,false,400),doc("n2",40,true,300),doc("n1",20,true,200),{ms:15,ts:new Date(100)}],"onyxia");
    expect(report.eligibleSessions).toBe(1);
    expect(report.learningWindow.medianMs).toBe(40);
    expect(report.duplicateKeys).toEqual([{key:"n1",count:2}]);
    expect(report.unkeyedLegacyRows).toBe(1);
  });
  it("compares D1 retained and excluded keys without assuming missing evidence is a false completion",()=>{
    const report=auditMongoDurations([doc("n1",30,true,400),doc("n2",40,true,300),doc("n3",20,true,200),doc("n4",10,true,100)],"onyxia",{realm:"N'Zoth",zone:"onyxia",standaloneKeysExcluded:["n1"],retainedDetails:[{key:"n2",durationMs:40,trusted:true},{key:"n3",durationMs:25,trusted:false},{key:"n5",durationMs:30,trusted:true}]});
    expect(report.comparisons).toMatchObject({matching:1,excludedButMongoValid:["n1"],durationMismatch:[{key:"n3",mongoMs:20,d1Ms:25}],d1UntrustedButMongoValid:["n3"],mongoWithoutRetainedD1Evidence:["n4"],trustedD1MissingValidMongoSample:["n5"]});
  });
});
