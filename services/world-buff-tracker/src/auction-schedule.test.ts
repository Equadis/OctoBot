import {expect,it} from "vitest";
import {utcScanSlot,AUCTION_SCAN_DURATION_MS} from "./auction-schedule.js";
import {AuctionScanCursor} from "./auction-scan.js";
import type {AuctionRow} from "./protocol/auction.js";

it("accepts only the UTC boundary window even across a UTC day rollover",()=>{
 const boundary=Date.parse("2026-11-21T00:00:00Z");
 expect(utcScanSlot(boundary-1)).toBeNull();
 expect(utcScanSlot(boundary)).toBe(boundary);
 expect(utcScanSlot(boundary+14999)).toBe(boundary);
 expect(utcScanSlot(boundary+15000)).toBeNull();
 expect(utcScanSlot(boundary+AUCTION_SCAN_DURATION_MS)).toBeNull();
 expect(utcScanSlot(boundary+3600000)).toBe(boundary+3600000);
});
it("allows a fluctuating live total and rejects unexplained short pages",()=>{
 const cursor=new AuctionScanCursor(true);
 const rows=(start:number,n:number)=>Array.from({length:n},(_,i)=>({auction_id:start+i} as AuctionRow));
 cursor.accept({total:80,auctions:rows(1,50)});
 expect(()=>cursor.accept({total:60,auctions:rows(51,5)})).toThrow(/ended before/);
 cursor.accept({total:55,auctions:rows(50,5)});
 expect(cursor.complete).toBe(true);
 expect(cursor.ids.size).toBe(54);
});
