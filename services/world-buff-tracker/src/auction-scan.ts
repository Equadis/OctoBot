/** Read-only auction pagination. Strict mode is retained for fixed test snapshots;
 * live mode tolerates the naturally changing size and overlapping IDs of a busy Auction House.
 * A live traversal is an estimate, not an atomic snapshot.
 */
import {AUCTION_PAGE_SIZE,type AuctionResult} from "./protocol/auction.js";
export class AuctionScanCursor{
 readonly ids=new Set<number>();
 total:number|null=null;
 latestTotal:number|null=null;
 page=0;
 retrieved=0;
 private liveDone=false;
 constructor(readonly live=false){}
 get complete():boolean{
  return this.live?this.liveDone:this.total!==null&&this.page>0&&this.retrieved===this.total;
 }
 accept(result:AuctionResult):void{
  if(this.complete)throw new Error("Auction scan already complete");
  if(!Number.isSafeInteger(result.total)||result.total<0||result.total>1000000||
     !Array.isArray(result.auctions)||result.auctions.length>AUCTION_PAGE_SIZE)
    throw new Error("Invalid server auction count");
  if(!this.live&&this.total!==null&&result.total!==this.total)
    throw new Error("Auction total changed during pagination; rescan");
  if(!this.live){
   const remaining=result.total-this.retrieved;
   const expected=Math.min(AUCTION_PAGE_SIZE,remaining);
   if(remaining<0||result.auctions.length!==expected)
    throw new Error("Missing or unexpected auction page rows; rescan");
  }
  if(this.live&&result.auctions.length<AUCTION_PAGE_SIZE&&this.retrieved+result.auctions.length<result.total)
   throw new Error("Auction traversal ended before the reported live total");
  const onPage=new Set<number>();
  for(const row of result.auctions){
   if(!Number.isSafeInteger(row.auction_id)||row.auction_id<1||
      onPage.has(row.auction_id)||(!this.live&&this.ids.has(row.auction_id)))
    throw new Error("Duplicate or invalid auction ID on page");
   onPage.add(row.auction_id);
  }
  for(const id of onPage)this.ids.add(id);
  if(this.total===null)this.total=result.total;
  this.latestTotal=result.total;
  this.retrieved+=result.auctions.length;
  this.page++;
  if(this.live){
   // Pagination is offset-based, so listings entering or leaving the market can
   // shift rows. Keep the latest occurrence of each ID on the server.
   this.liveDone=result.auctions.length<AUCTION_PAGE_SIZE||this.retrieved>=result.total;
  }else{
   this.total=result.total;
  }
 }
}
