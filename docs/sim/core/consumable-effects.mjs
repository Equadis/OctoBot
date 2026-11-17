// Source-snapshot effect parser. Only complete, explicit long-duration
// self/prepull effects are applied. Never infer uptime from an item name.
const n='(\\d+(?:\\.\\d+)?)',unit='(sec(?:ond)?s?|min(?:ute)?s?|hours?)';
const attrs={strength:'str',agility:'agi',stamina:'sta',intellect:'int',spirit:'spi',armor:'armour',armour:'armour'};
const rx=s=>new RegExp('^'+s+'$','i');
const add=(o,k,v)=>{if(k&&Number.isFinite(+v))o[k]=(o[k]||0)+Number(v)};
export function consumableEffectAudit(item){
 const text=(item?.effects||[]).join(' ').replace(/\s+/g,' ').trim();
 const result=(status,stats={},durationSeconds=null,reason='')=>({status,stats,durationSeconds,reason});
 if(!item?.verified||!text)return result('unverified');
 if(/^(?:Plans|Recipe|Pattern|Schematic|Formula|Design|Manual):/i.test(item.name)||/teaches you how to|learn how to (?:make|create)/i.test(text))return result('recipe');
 if(/permanently increase|permanently enchant|applied to your fishing pole|coats? (?:a|your) weapon|sharpen|weightstone|weapon oil/i.test(text))return result('enhancement');
 let t=text.replace(/^Use:\s*/i,'').replace(/\.\s*You can only have the effect of one (?:flask|Zanza potion) at a time\..*$/i,'').replace(/\.\s*Only one type of Zanza potion.*$/i,'').replace(/ and gets you drunk to boot!$/i,'').replace(/\.$/,'');
 // Select the actual well-fed clause, not the preceding eating/healing action.
 const fed=t.match(/(?:well fed and gain|(?:also )?increase(?:s)? (?:your )?)(.+) for \d+ (?:sec|min|hour)/i);
 if(/Must remain seated while eating/i.test(t)){
  const p=t.match(/(?:well fed and gain |(?:will )?also increase(?:s)? (?:your )?)(.+)$/i);
  if(!p)return result('event',{},null,'Eating/restoration requires time and an event.');
  t='Food: '+p[1];
 }
 t=t.replace(/ when consumed\. Effect lasts for /i,' for ');
 const d=t.match(new RegExp(' for '+n+' '+unit+'$','i'));
 if(!d)return result('event',{},null,'No complete duration or passive effect definition.');
 const duration=+d[1]*(/^min/i.test(d[2])?60:/^hour/i.test(d[2])?3600:1);
 if(duration<600)return result('timed',{},duration,'Requires timed activation; no assumed uptime.');
 const body=t.slice(0,d.index),stats={};let m;
 const match=s=>body.match(rx(s));
 if((m=match("(?:Increases? (?:(?:your|the player\\x27s|the target\\x27s) )?|Food: )"+n+" (Strength|Agility|Stamina|Intellect|Spirit)(?: and (Strength|Agility|Stamina|Intellect|Spirit))?"))){add(stats,attrs[m[2].toLowerCase()],m[1]);if(m[3])add(stats,attrs[m[3].toLowerCase()],m[1]);}
 else if((m=match("(?:Increases? (?:(?:your|the player\\x27s|the target\\x27s) )?|Food: )(?:(Strength|Agility|Stamina|Intellect|Spirit|Armor|Armour)(?: and (Strength|Agility|Stamina|Intellect|Spirit))?) by "+n))){add(stats,attrs[m[1].toLowerCase()],m[3]);if(m[2])add(stats,attrs[m[2].toLowerCase()],m[3]);}
 else if((m=match("Increases? (?:your |the player\\x27s )?maximum (health|mana) by "+n)))add(stats,m[1].toLowerCase(),m[2]);
 else if((m=match('(?:Regenerate|Restores?) '+n+' (mana|health) (?:every|per) 5 sec')))add(stats,m[2].toLowerCase()==='mana'?'mp5':'hp5',m[1]);
 else if((m=match('Increases? (?:your )?(?:spell (fire|frost|shadow|nature|arcane|holy) damage|(fire|frost|shadow|nature|arcane|holy) spell damage) by up to '+n)))add(stats,(m[1]||m[2]).toLowerCase()+'Sp',m[3]);
 else if((m=match('Increases? (?:your )?(?:spell damage|damage done by magical spells and effects) by up to '+n)))add(stats,'damageOnlySp',m[1]);
 else if((m=match('Increases? (?:your )?(?:damage and healing done by magical spells and effects|spell damage and healing power) by up to '+n)))add(stats,'sp',m[1]);
 else if((m=match('Increases? (?:your )?(?:melee )?attack power by '+n+'(?: and size)?')))add(stats,'ap',m[1]);
 else if((m=match('Food: (?:Attack Power by '+n+'|'+n+' (Ranged )?Attack Power)')))add(stats,m[3]?'rangedAP':'ap',m[1]||m[2]);
 else if((m=match('Food: '+n+' spell damage')))add(stats,'damageOnlySp',m[1]);
 else if((m=match('Food: '+n+'% Haste')))add(stats,'haste',m[1]);
 else if((m=match('Food: '+n+' Stamina and '+n+'% dodge'))){add(stats,'sta',m[1]);add(stats,'dodge',m[2]);}
 else if((m=match('Food: '+n+'% dodge and '+n+' defense'))){add(stats,'dodge',m[1]);add(stats,'defense',m[2]);}
 else if((m=match('Increases? (?:your )?Agility by '+n+' and chance to get a critical hit by '+n+'%'))){add(stats,'agi',m[1]);add(stats,'crit',m[2]);}
 else if((m=match('Increases? (?:your )?Strength and Stamina by '+n))){add(stats,'str',m[1]);add(stats,'sta',m[1]);}
 else if((m=match('Increases spell damage and healing power by up to '+n+', Agility by '+n+', and physical and spell critical strike chance by '+n+'%'))){add(stats,'sp',m[1]);add(stats,'agi',m[2]);add(stats,'crit',m[3]);add(stats,'spellCrit',m[3]);}
 else if((m=match('Increases spell damage by up to '+n+' and (Strength|melee attack power) by '+n))){add(stats,'damageOnlySp',m[1]);add(stats,m[2].toLowerCase()==='strength'?'str':'ap',m[3]);}
 else if((m=match('Grants '+n+'% spell critical and '+n+' spell power'))){add(stats,'spellCrit',m[1]);add(stats,'sp',m[2]);}
 else if((m=match("Increases the player\\x27s Spirit by "+n+" and Stamina by "+n))){add(stats,'spi',m[1]);add(stats,'sta',m[2]);}
 else if((m=match('Increases (?:your resistance to all schools of magic|all magical resistances) by '+n))){for(const school of ['arcane','fire','frost','nature','shadow'])add(stats,school+'Res',m[1]);}
 else if((m=match('Increases (?:your )?chance to dodge by '+n+'%')))add(stats,'dodge',m[1]);
 else if((m=match("Increases (?:your |the player\\x27s )?run speed by "+n+'%')))add(stats,'runSpeedPct',m[1]);
 else return result('unmapped',{},duration,'Long-duration description needs explicit review.');
 return result('prepull',stats,duration,'Assumes selected effect is active at encounter start; no uptime inferred.');
}
