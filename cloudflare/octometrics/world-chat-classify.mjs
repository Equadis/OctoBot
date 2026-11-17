const aliases=[["ZG","zul gurub","zulgurub","zg"],["MC","molten core","mc"],["Ony","onyxia(?:'s lair)?","ony"],["BWL","blackwing lair","bwl"],["AQ20","aq\\s*20","ruins of ahn qiraj"],["AQ40","aq\\s*40","temple of ahn qiraj"],["Naxx","naxx(?:ramas)?"],["Kara","karazhan","kara","k40","kara40"],["WC","wailing caverns","wc"],["RFC","ragefire chasm","rfc"],["Deadmines","deadmines","vc"],["DM","dm"],["SFK","shadowfang keep","sfk"],["BFD","blackfathom deeps","bfd"],["Stockades","stockades?","stocks"],["RFK","razorfen kraul","rfk"],["RFD","razorfen downs","rfd"],["SM","scarlet monastery","sm(?:\\s*(?:gy|lib|arm|cath))?"],["Ulda","uldaman","ulda"],["ZF","zul farrak","zulfarrak","zf"],["Mara","mara(?:udon)?"],["ST","sunken temple","st"],["BRD","blackrock depths","brd"],["LBRS","lower blackrock spire","lbrs"],["UBRS","upper blackrock spire","ubrs"],["Strat","strat(?:holme)?"],["Scholo","scholo(?:mance)?"],["Dire Maul","dire maul","dm[ewn]","dm\\s+(?:east|west|north)"],["BRS","brs"],["BRC","blackrock caverns","brc"],["Kara Crypt","karazhan crypt(?:s)?","kara crypt(?:s)?","kcrypt"],["Gilneas","gilneas city","gilneas"],["Crescent Grove","crescent grove","tcg"],["Hateforge","hateforge quarry","hfq"],["Stormwind Vault","stormwind vault","swv"],["Black Morass","black morass","bm"]];
export function cleanText(value) {
  return String(value).replace(/\|c[0-9a-f]{8}|\|r/gi,"").replace(/\|H[^|]*\|h(.*?)\|h/gi,"$1").replace(/\|T[^|]*\|t/gi,"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();
}
export function listingKinds(message) {
  const plain=cleanText(message).toLowerCase().replace(/[’']/g,"").replace(/[-_]/g," ");
  const trade=[];
  if(/\b(?:wtb|want to buy|buying)\b/.test(plain)) trade.push({kind:"wtb",tag:plain});
  if(/\b(?:wts|want to sell|selling)\b/.test(plain)) trade.push({kind:"wts",tag:plain});
  if(trade.length) return trade;
  const tags=aliases.filter(([name,...patterns])=>new RegExp("\\b(?:"+patterns.join("|")+")\\b","i").test(plain)).map(a=>a[0]);
  if(tags.includes("Dire Maul")&&tags.includes("DM")) tags.splice(tags.indexOf("DM"),1);
  if(tags.includes("Kara Crypt")&&tags.includes("Kara")) tags.splice(tags.indexOf("Kara"),1);
  const intent=/\b(?:lfg|lfm|lf\s*\d*\s*m|lf\s+(?:tank|heal(?:er|s)?|dps|group|more)|looking for|need(?:ing)?|recruiting|forming|last spot|spots? open)\b/i.test(plain);
  const standalone=tags.length>0&&aliases.some(([, ...p])=>new RegExp("^(?:"+p.join("|")+")[!? .]*$","i").test(plain));
  return intent||standalone?tags.map(tag=>({kind:"lfg",tag})):[];
}
