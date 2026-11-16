/** Reuses the OctoWoW catalogue already published by OctoBot's Gear Planner.
 * This is a dated, incomplete database snapshot, not a live in-game item lookup. */
export const CATALOGUE_URL="https://equadis.github.io/OctoBot/sim/data/items/catalogue.json";
export interface AuctionItemMetadata {
 readonly item_name:string;
 readonly quality:number|null;
 readonly icon_url:string|null;
 /** Catalogue fields used by the level/category/slot filters; null when the catalogue does not state them. */
 readonly item_level:number|null;
 readonly req_level:number|null;
 readonly class_id:number|null;
 readonly subclass_id:number|null;
 readonly slot_id:number|null;
}
const small=(v:unknown,max:number):number|null=>typeof v==="number"&&Number.isInteger(v)&&v>=0&&v<=max?v:null;
export function metadataFromCatalogue(raw:unknown):ReadonlyMap<number,AuctionItemMetadata>{
 if(!Array.isArray(raw)||raw.length>100000)throw new Error("Unexpected Auction House metadata catalogue");
 const metadata=new Map<number,AuctionItemMetadata>();
 for(const candidate of raw){
  if(!candidate||typeof candidate!=="object")continue;
  const item=candidate as Record<string,unknown>;
  const id=item.id;
  if(typeof id!=="number"||!Number.isSafeInteger(id)||id<1||id>4294967295||
    typeof item.name!=="string"||!item.name.trim()||item.name.length>160)continue;
  if(metadata.has(id))continue;
  const quality=typeof item.quality==="number"&&Number.isInteger(item.quality)&&item.quality>=0&&item.quality<=8?item.quality:null;
  const icon=typeof item.icon==="string"&&/^[a-z0-9_]{1,80}$/i.test(item.icon)?item.icon.toLowerCase():null;
  // The catalogue omits "reqlevel" when the requirement is zero, so absence of reqlevel on an item whose level is known means 0.
  const item_level=small(item.level,200);
  const req_level=small(item.reqlevel,70)??(item_level!==null?0:null);
  metadata.set(id,Object.freeze({item_name:item.name.trim(),quality,
    icon_url:icon?`https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`:null,
    item_level,req_level,class_id:small(item.classs,20),subclass_id:small(item.subclass,30),slot_id:small(item.slot,40)}));
 }
 return metadata;
}
export async function fetchAuctionCatalogue(fetcher:typeof fetch=fetch):Promise<ReadonlyMap<number,AuctionItemMetadata>>{
 const response=await fetcher(CATALOGUE_URL,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("Existing item catalogue HTTP "+response.status);
 if(Number(response.headers.get("content-length")||0)>8*1024*1024)throw new Error("Existing item catalogue exceeds size limit");
 return metadataFromCatalogue(await response.json());
}
