/** Read-only WoW 1.12 auction protocol. Not tested against OctoWoW's live server.
 *  https://gtker.com/wow_messages/docs/cmsg_auction_list_items.html
 *  https://gtker.com/wow_messages/docs/smsg_auction_list_result.html
 *  The only emitted opcodes are AUCTION_HELLO and AUCTION_LIST_ITEMS.
 */
import {PacketReader,PacketWriter} from "../net/byte-buffer.js";

export const AUCTION_PAGE_SIZE=50;
export interface AuctionRow {
  auction_id:number;
  item_id:number;
  enchant_id:number;
  random_property_id:number;
  suffix_factor:number;
  variant:string;
  quantity:number;
  start_bid:number;
  current_bid:number;
  min_next_bid:number;
  buyout:number;
  owner_guid:string;
  time_left_ms:number;
  captured_at:string;
}
export interface AuctionResult { readonly total:number; readonly auctions:AuctionRow[]; }
export function buildAuctionHello(guid:bigint):Buffer{
 if(guid<=0n)throw new Error("auctioneer GUID required");
 return new PacketWriter().u64LE(guid).toBuffer();
}
export function buildAuctionSearch(guid:bigint,offset:number):Buffer{
 if(guid<=0n)throw new Error("auctioneer GUID required");
 if(!Number.isSafeInteger(offset)||offset<0||offset>1_000_000)throw new RangeError("invalid auction offset");
 // Empty name and all categories means the complete unfiltered auction house.
 return new PacketWriter().u64LE(guid).u32LE(offset).cString("").u8(0).u8(0)
   .u32LE(0xffffffff).u32LE(0xffffffff).u32LE(0xffffffff).u32LE(0xffffffff).u8(0).toBuffer();
}
export function parseAuctionHello(body:Buffer):{guid:bigint;houseId:number}{
 if(body.length!==12)throw new RangeError("unexpected MSG_AUCTION_HELLO body length");
 const r=new PacketReader(body);
 return {guid:r.u64LE(),houseId:r.u32LE()};
}
export function parseAuctionList(body:Buffer,observedAt=new Date().toISOString()):AuctionResult{
 if(body.length<8)throw new RangeError("auction list truncated");
 const r=new PacketReader(body),count=r.u32LE();
 if(count>AUCTION_PAGE_SIZE)throw new RangeError("auction result exceeds known 1.12 page limit");
 if(body.length!==8+count*64)throw new RangeError("unexpected 1.12 auction packet size");
 const auctions:AuctionRow[]=[];
 for(let i=0;i<count;i++){
  const auction_id=r.u32LE(),item_id=r.u32LE(),enchant_id=r.u32LE(),
    random_property_id=r.u32LE(),suffix_factor=r.u32LE(),
    quantity=r.u32LE();
  r.u32LE(); // item charges: unused for MVP
  const owner_guid=r.u64LE();
  const start_bid=r.u32LE(),bid_increment=r.u32LE(),buyout=r.u32LE(),
    time_left_ms=r.u32LE();
  r.u64LE(); // highest bidder guid: not exposed by this read-only dashboard
  const current_bid=r.u32LE();
  if(!auction_id||!item_id||!quantity)throw new RangeError("invalid auction row");
  const min_next_bid=current_bid?Math.min(4294967295,current_bid+bid_increment):start_bid;
  auctions.push({auction_id,item_id,enchant_id,random_property_id,suffix_factor,
   variant:[enchant_id,random_property_id,suffix_factor].join(':'),
   quantity,start_bid,current_bid,min_next_bid,buyout,owner_guid:owner_guid.toString(),
   time_left_ms,captured_at:observedAt});
 }
 const total=r.u32LE();
 if(total<count)throw new RangeError("server total smaller than returned page");
 return {total,auctions};
}
