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
 // Official ID/name/level: https://octowow.st/db/?item=4304; standard Classic quality and icon cross-checked.
 if(!metadata.has(4304))metadata.set(4304,Object.freeze({item_name:"Thick Leather",quality:1,icon_url:"https://wow.zamimg.com/images/wow/icons/large/inv_misc_leatherscrap_08.jpg",item_level:40,req_level:0,class_id:7,subclass_id:null,slot_id:null}));
 return metadata;
}
export async function fetchAuctionCatalogue(fetcher:typeof fetch=fetch):Promise<ReadonlyMap<number,AuctionItemMetadata>>{
 const response=await fetcher(CATALOGUE_URL,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("Existing item catalogue HTTP "+response.status);
 if(Number(response.headers.get("content-length")||0)>8*1024*1024)throw new Error("Existing item catalogue exceeds size limit");
 return metadataFromCatalogue(await response.json());
}

/** Exact-ID fallback for auctionable records missing from the capped listing catalogue.
 * Require the real item tooltip marker and title together, never infer a category from a name.
 * An incomplete response remains incomplete; catalogue records take precedence. */
function decodeHtml(value:string):string{
 return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(_,token:string)=>{
  const named:Record<string,string>={amp:"&",quot:'"',apos:"'",lt:"<",gt:">",nbsp:" "};
  if(token[0]!=="#")return named[token.toLowerCase()]??"";
  const n=token[1]?.toLowerCase()==="x"?parseInt(token.slice(2),16):Number(token.slice(1));
  return n>0&&n<=0x10ffff?String.fromCodePoint(n):"";
 });
}
export function metadataFromItemPage(id:number,html:string):AuctionItemMetadata|null{
 if(!Number.isSafeInteger(id)||id<=0)return null;
 const marker=new RegExp("\\bid\\s*=\\s*['\"]tooltip"+id+"-generic['\"]","i").exec(html);
 const title=/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
 const name=title&&decodeHtml(title).replace(/\s+-\s+Items?\s+-\s+OctoWoW Database\s*$/i,"").trim();
 if(!marker||!title||!name||name===decodeHtml(title).trim()||name.length>160||/[<>]/.test(name))return null;
 const tooltip=html.slice(marker.index,marker.index+4000);
 const bold=/<b\b[^>]*\bclass\s*=\s*['"]q([0-8])['"][^>]*>([^<]+)<\/b>/i.exec(tooltip);
 const quality=bold&&decodeHtml(bold[2]).trim()===name?Number(bold[1]):null;
 const icon=new RegExp("_\\["+id+"\\]\\s*=\\s*\\{icon:\\s*['\"]([a-z0-9_]{1,80})['\"]","i").exec(html)?.[1]?.toLowerCase();
 const level=/<(?:li|div|span)[^>]*>\s*(?:<[^>]+>\s*)?Level:\s*(?:<\/[^>]+>\s*)?(\d+)/i.exec(html);
 return Object.freeze({item_name:name,quality,icon_url:icon?"https://wow.zamimg.com/images/wow/icons/large/"+icon+".jpg":null,
 item_level:level?small(Number(level[1]),200):null,req_level:null,class_id:null,subclass_id:null,slot_id:null});
}
export async function fetchAuctionItem(id:number,fetcher:typeof fetch=fetch):Promise<AuctionItemMetadata|null>{
 if(!Number.isSafeInteger(id)||id<1||id>4294967295)return null;
 try{
  const response=await fetcher("https://octowow.st/db/?item="+id,{headers:{Accept:"text/html"},redirect:"error",signal:AbortSignal.timeout(6000)});
  if(!response.ok||Number(response.headers.get("content-length")||0)>2*1024*1024)return null;
  const html=await response.text();
  return html.length<=2*1024*1024?metadataFromItemPage(id,html):null;
 }catch{return null;}
}
