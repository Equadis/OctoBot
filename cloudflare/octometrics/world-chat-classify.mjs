import {analyseRecruitment,normalise} from "../../docs/world-chat/lfg-catalog.mjs";
export function cleanText(value) {
  return String(value).replace(/\|c[0-9a-f]{8}|\|r/gi,"").replace(/\|H[^|]*\|h(.*?)\|h/gi,"$1").replace(/\|T[^|]*\|t/gi,"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
}
export function listingKinds(message){
 const plain=normalise(cleanText(message)),trade=[];
 if(/\b(?:wtb|want to buy|buying)\b/.test(plain))trade.push({kind:"wtb",tag:plain});
 if(/\b(?:wts|want to sell|selling)\b/.test(plain))trade.push({kind:"wts",tag:plain});
 if(trade.length)return trade;
 const result=analyseRecruitment(cleanText(message));
 return result.closed?[]:result.tags.map(tag=>({kind:"lfg",tag}));
}
