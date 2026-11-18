import {describe,it,expect} from "vitest";
import {pvpAuctionEligible,createPvpAuction} from "./pvp-auction-session.js";
describe("PvP auction session guard",()=>{
 const enabled={AUCTION_COLLECTOR_ENABLED:"true",AUCTION_RULES_APPROVED:"true",AUCTION_PUSH_TOKEN:"test-only"};
 it("allows only the existing PvP account with both opt-ins and token",()=>{
  expect(pvpAuctionEligible({account:"OBPVPSW",realmName:"Y'Shaarj"},enabled)).toBe(true);
  for(const [account,realmName] of [["OBHCSW","C'Thun"],["OBPVESW","N'Zoth"],["OBPVPSW","N'Zoth"]])expect(pvpAuctionEligible({account,realmName},enabled)).toBe(false);
  expect(pvpAuctionEligible({account:"OBPVPSW",realmName:"Y'Shaarj"},{})).toBe(false);
 });
 it("never touches the socket for Hardcore",()=>{
  const hook=createPvpAuction({account:{account:"OBHCSW",realmName:"C'Thun"},log:null as never,getWorld:()=>{throw Error("unexpected socket access");}});
  hook.start();hook.stop();expect(hook.handlers).toEqual({});
 });
});
