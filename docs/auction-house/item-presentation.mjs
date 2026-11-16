/** Source-grounded, text-only item hover labels; no guessed item stats. */
const QUALITY=Object.freeze(["Poor","Common","Uncommon","Rare","Epic","Legendary","Artifact"]);
export function itemTooltip(item){
 const itemId=Number(item?.item_id);
 const id=Number.isSafeInteger(itemId)&&itemId>0?String(itemId):"Unknown";
 const known=typeof item?.item_name==="string"&&item.item_name.trim().length>0;
 const name=known?item.item_name.trim().replace(/\s+/g," "):"Item #"+id;
 const quality=Number(item?.quality);
 const rarity=item?.quality!=null&&Number.isInteger(quality)&&quality>=0&&quality<QUALITY.length?QUALITY[quality]:null;
 return [
  name,
  "Rarity: "+(rarity||"unavailable"),
  "Item ID: "+id,
  known?"Name and rarity from the OctoWoW catalogue snapshot.":"Item details not found in the available catalogue.",
  "Open OctoWoW DB for full item details."
 ].join("\n");
}
