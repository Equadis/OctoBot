import {test} from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.mjs";
import {ensureRaidSchema,validateTrackerState,pruneRaidState} from "../raid-state.mjs";
let DatabaseSync;try{({DatabaseSync}=await import("node:sqlite"));}catch{}
const skip=!DatabaseSync;
function makeDb(){
 const sqlite=new DatabaseSync(":memory:");
 return {sqlite,prepare(sql){
  let args=[];const run=()=>{
   // node:sqlite treats ?1 named placeholders differently from D1: replace
   // indexed placeholders with ordinary placeholders and expand duplicates.
   const indices=[];const query=sql.replace(/\?(\d+)/g,(_,n)=>(indices.push(Number(n)-1),"?"));
   return {stmt:sqlite.prepare(query),values:indices.length?indices.map(i=>args[i]):args};
  };
  const s={bind(...a){args=a;return s;},async first(){const {stmt,values}=run();return stmt.get(...values)??null;},async run(){const {stmt,values}=run();return stmt.run(...values);}};return s;
 },async batch(stmts){sqlite.exec("BEGIN");try{for(const s of stmts)await s.run();sqlite.exec("COMMIT");}catch(e){sqlite.exec("ROLLBACK");throw e;}}};
}
const TOKEN="raid-test-token";
async function call(db,path,method="GET",body,token=TOKEN){
 const r=await worker.fetch(new Request("https://example.test/api/raid/"+path,{method,headers:{authorization:"Bearer "+token,"content-type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)})}),{DB:db,METRICS_PUSH_TOKEN:TOKEN});
 return {status:r.status,json:await r.json()};
}
test("private routes reject unauthorised requests before touching D1",async()=>{
 const db={prepare(){throw Error("unexpected DB access");}};
 for(const [path,method] of [["seed","POST"],["number","POST"],["state?zone=onyxia","GET"],["state","PUT"]])
  assert.equal((await call(db,path,method,undefined,"wrong")).status,401);
});
test("restore existing per-zone number and checkpoint tables without resetting data",{skip},async()=>{
 const db=makeDb();await ensureRaidSchema(db);
 db.sqlite.prepare("INSERT INTO raid_number_floor VALUES(?,?,?)").run("onyxia",700,new Date().toISOString());
 db.sqlite.prepare("INSERT INTO raid_number_floor VALUES(?,?,?)").run("bwl",30,new Date().toISOString());
 db.sqlite.prepare("INSERT INTO raid_numbers VALUES(?,?,?,?)").run("onyxia-existing","onyxia",705,new Date().toISOString());
 assert.equal((await call(db,"number","POST",{zone:"onyxia",requestId:"onyxia-existing"})).json.n,705);
 const ony=await call(db,"number","POST",{zone:"onyxia",requestId:"onyxia-new-01"});
 assert.equal(ony.json.n,706);
 assert.equal((await call(db,"number","POST",{zone:"onyxia",requestId:"onyxia-new-01"})).json.n,706);
 assert.equal((await call(db,"number","POST",{zone:"bwl",requestId:"bwl-new-001"})).json.n,31);
 assert.equal((await call(db,"number","POST",{zone:"bwl",requestId:"onyxia-new-01"})).status,409);
 assert.equal((await call(db,"seed","POST",{zone:"onyxia",floor:1})).json.floor,700);
 assert.equal((await call(db,"number","POST",{zone:"onyxia",requestId:"onyxia-new-02"})).json.n,707);
 const now=Date.now(),state={v:1,slots:[{slot:0,state:{formedAt:now-60000,number:707,roster:["0123456789abcdef"],peak:26,belowSince:null}}],lockouts:{"0123456789abcdef":now}};
 assert.equal((await call(db,"state","PUT",{zone:"onyxia",state})).status,200);
 assert.deepEqual((await call(db,"state?zone=onyxia")).json.state,state);
 assert.equal((await call(db,"state?zone=bwl")).status,404);
 const bwl={...state,slots:[{slot:0,state:{...state.slots[0].state,number:31}}]};
 assert.equal((await call(db,"state","PUT",{zone:"bwl",state:bwl})).status,200);
 assert.deepEqual((await call(db,"state?zone=bwl")).json.state,bwl);
 assert.deepEqual((await call(db,"state?zone=onyxia")).json.state,state);
 const invalid=structuredClone(state);invalid.slots[0].state.roster=["RawCharacterName"];
 assert.equal((await call(db,"state","PUT",{zone:"onyxia",state:invalid})).status,400);
 assert.deepEqual((await call(db,"state?zone=onyxia")).json.state,state);
 await pruneRaidState(db);
 assert.equal(db.sqlite.prepare("SELECT COUNT(*) n FROM raid_numbers").get().n,4);
});
test("unseeded zones never start numbering at one",{skip},async()=>{
 const db=makeDb();
 const r=await call(db,"number","POST",{zone:"onyxia",requestId:"onyxia-unseeded"});
 assert.equal(r.status,409);assert.equal(r.json.error,"counter_not_seeded");
 assert.equal(db.sqlite.prepare("SELECT COUNT(*) n FROM raid_numbers").get().n,0);
});

test("encrypted checkpoint endpoints reject stale writes and preserve legacy state",{skip},async()=>{
 const db=makeDb(),now=Date.now(),payload=Buffer.alloc(48,1).toString("base64");
 assert.equal((await call(db,"checkpoint?zone=onyxia")).status,404);
 assert.equal((await call(db,"checkpoint","PUT",{zone:"onyxia",observedAt:now,payload})).status,200);
 assert.equal((await call(db,"checkpoint","PUT",{zone:"onyxia",observedAt:now-1,payload})).status,409);
 assert.equal((await call(db,"checkpoint?zone=onyxia")).json.payload,payload);
 assert.equal((await call(db,"checkpoint?zone=bwl")).status,404);
 assert.equal((await call(db,"state?zone=onyxia")).status,404);
 assert.equal((await call(db,"checkpoint","PUT",{zone:"onyxia",observedAt:now,payload:"plaintext"})).status,400);
});
