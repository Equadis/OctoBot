/** Vanilla 1.12 read-only item-template lookup.
 * https://gtker.com/wow_messages/docs/cmsg_item_query_single.html
 * https://gtker.com/wow_messages/docs/smsg_item_query_single_response.html
 * Decode only the stable prefix; the trailing combat statistics differ by core.
 */
import {PacketReader,PacketWriter} from "../net/byte-buffer.js";
import type {AuctionItemMetadata} from "../auction-metadata.js";

export interface ItemTemplateReply {item_id:number;display_id:number|null;metadata:AuctionItemMetadata|null}
export function buildItemQuery(id:number):Buffer{
 if(!Number.isSafeInteger(id)||id<1||id>=0x80000000)throw new RangeError("Invalid item-template ID");
 // The queried item need not be owned; the Vanilla item-query request has a GUID field.
 return new PacketWriter().u32LE(id).u64LE(0n).toBuffer();
}
export function parseItemTemplate(body:Buffer):ItemTemplateReply{
 const r=new PacketReader(body),raw=r.u32LE(),item_id=raw&0x7fffffff;
 if(!item_id)throw new RangeError("Invalid item-template reply");
 if((raw&0x80000000)!==0||r.remaining===0)return {item_id,display_id:null,metadata:null};
 const class_id=r.u32LE(),subclass_id=r.u32LE(),item_name=r.cString().trim();
 r.cString();r.cString();r.cString();
 const display_id=r.u32LE(),quality=r.u32LE();
 r.u32LE();r.u32LE();r.u32LE(); // flags, buy price, sell price
 const slot_id=r.u32LE();
 r.u32LE();r.u32LE(); // class and race masks
 const item_level=r.u32LE(),req_level=r.u32LE();
 if(!item_name||item_name.length>160||item_name.includes("\ufffd")||class_id>20||
    subclass_id>30||quality>8||slot_id>40||item_level>200||req_level>70)
   throw new RangeError("Invalid or unsupported item-template fields");
 return {item_id,display_id,metadata:{item_name,quality,icon_url:null,item_level,req_level,class_id,subclass_id,slot_id}};
}
