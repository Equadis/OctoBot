import {describe,it,expect} from "vitest";
import {AuctionScanCursor} from "./auction-scan.js";
import type {AuctionResult,AuctionRow} from "./protocol/auction.js";
function page(total:number,ids:number[]):AuctionResult{
 return {total,auctions:ids.map(auction_id=>({auction_id} as AuctionRow))};
}
describe("complete snapshot pagination validation",()=>{
 it("accepts a 50+1 scan and marks completion only after every unique row",()=>{
  const cursor=new AuctionScanCursor();
  cursor.accept(page(51,Array.from({length:50},(_,i)=>i+1)));
  expect(cursor.complete).toBe(false);expect(cursor.page).toBe(1);expect(cursor.retrieved).toBe(50);
  cursor.accept(page(51,[51]));
  expect(cursor.complete).toBe(true);expect(cursor.page).toBe(2);expect(cursor.ids.size).toBe(51);
  expect(()=>cursor.accept(page(51,[]))).toThrow(/already complete/);
 });
 it("accepts exactly one empty page for an empty Auction House",()=>{
  const cursor=new AuctionScanCursor();cursor.accept(page(0,[]));
  expect(cursor.complete).toBe(true);expect(cursor.page).toBe(1);
 });
 it("rejects changed totals, duplicate rows and a nonfinal short page",()=>{
  const cursor=new AuctionScanCursor();cursor.accept(page(51,Array.from({length:50},(_,i)=>i+1)));
  expect(()=>cursor.accept(page(52,[51,52]))).toThrow(/total changed/);
  expect(()=>cursor.accept(page(51,[50]))).toThrow(/Duplicate/);
  expect(cursor.retrieved).toBe(50);expect(cursor.page).toBe(1);
  const short=new AuctionScanCursor();
  expect(()=>short.accept(page(51,[1,2]))).toThrow(/Missing/);
  expect(short.page).toBe(0);
  const duplicate=new AuctionScanCursor();
  expect(()=>duplicate.accept(page(2,[1,1]))).toThrow(/Duplicate/);
  expect(duplicate.ids.size).toBe(0);
 });
 it("rejects totals above ingestion limits",()=>{
  expect(()=>new AuctionScanCursor().accept(page(1000001,[]))).toThrow(/Invalid/);
 });
});
