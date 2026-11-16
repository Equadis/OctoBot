/** Strict read-only auction pagination validation, before any page is uploaded. */
import {AUCTION_PAGE_SIZE,type AuctionResult} from "./protocol/auction.js";
export class AuctionScanCursor{
 readonly ids=new Set<number>();
 total:number|null=null;
 page=0;
 retrieved=0;
 get complete():boolean{return this.total!==null&&this.page>0&&this.retrieved===this.total;}
 accept(result:AuctionResult):void{
  if(this.complete)throw new Error("Auction scan already complete");
  if(!Number.isSafeInteger(result.total)||result.total<0||result.total>1000000||
     !Array.isArray(result.auctions))throw new Error("Invalid server auction count");
  if(this.total!==null&&result.total!==this.total)throw new Error("Auction total changed during pagination; rescan");
  const remaining=result.total-this.retrieved;
  const expected=Math.min(AUCTION_PAGE_SIZE,remaining);
  if(remaining<0||result.auctions.length!==expected)throw new Error("Missing or unexpected auction page rows; rescan");
  const onPage=new Set<number>();
  for(const row of result.auctions){
   if(!Number.isSafeInteger(row.auction_id)||row.auction_id<1||
      onPage.has(row.auction_id)||this.ids.has(row.auction_id))
    throw new Error("Duplicate or invalid auction ID across pages; rescan");
   onPage.add(row.auction_id);
  }
  for(const id of onPage)this.ids.add(id);
  this.total=result.total;
  this.retrieved+=result.auctions.length;
  this.page++;
 }
}
