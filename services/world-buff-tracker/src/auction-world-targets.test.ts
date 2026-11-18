import {describe,expect,it,vi} from "vitest";
import {auctionWorldTargets,connectAuctionWorld,type WorldTarget} from "./auction-world-targets.js";
const target=(host:string,port=8091):WorldTarget=>({host,port});
describe("auction world endpoint failover",()=>{
 it("uses remembered working endpoint, advertised realm and approved alternatives once each",()=>{
  expect(auctionWorldTargets(target("realm.example"),null,target("last.example"),"realm.example, fallback.example, LAST.EXAMPLE")).toEqual([target("last.example"),target("realm.example"),target("fallback.example")]);
 });
 it("keeps manual override first and discards remembered targets on the wrong realm port",()=>{
  expect(auctionWorldTargets(target("realm.example"),target("manual.example"),target("old.example",8092),"manual.example")).toEqual([target("manual.example"),target("realm.example")]);
 });
 it("does not infer other addresses or realm ports",()=>{
  expect(auctionWorldTargets(target("realm.example",8090),null,null,"alternate.example")).toEqual([target("realm.example",8090),target("alternate.example",8090)]);
  expect(()=>auctionWorldTargets(target("realm.example"),null,null,"http://other.example")).toThrow();
  expect(()=>auctionWorldTargets(target("realm.example"),null,null,"a,b,c,d,e,f")).toThrow();
 });
 it("tries alternatives sequentially after TCP failure and stops on success",async()=>{
  const connect=vi.fn(async(t:WorldTarget)=>{if(t.host==="bad.example")throw Error("timeout");return "socket";});
  const failed=vi.fn();
  const result=await connectAuctionWorld([target("bad.example"),target("good.example"),target("unused.example")],connect,()=>false,failed);
  expect(result).toEqual({connection:"socket",target:target("good.example")});
  expect(connect.mock.calls.map(([t])=>t.host)).toEqual(["bad.example","good.example"]);
  expect(failed).toHaveBeenCalledTimes(1);
 });
 it("reports total failure and stops without another attempt on shutdown",async()=>{
  const connect=vi.fn(async()=>{throw Error("timeout");});
  await expect(connectAuctionWorld([target("a"),target("b")],connect,()=>false,()=>{})).rejects.toThrow("All auction world TCP endpoints failed");
  expect(connect).toHaveBeenCalledTimes(2);
  let stop=false;connect.mockClear();
  await expect(connectAuctionWorld([target("a"),target("b")],connect,()=>stop,()=>{stop=true;})).rejects.toThrow("stopping");
  expect(connect).toHaveBeenCalledTimes(1);
 });
});
