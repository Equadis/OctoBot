/** One service, one account, one source tree. Offsets are wall-clock seconds. */
export const PROFILES=Object.freeze({
 OBPVESW:{account:"OBPVESW",realmName:"N'Zoth",role:"sw",buffs:true,raid:{zone:2159,zoneName:"Onyxia's Lair",minActivity:15,period:30,offset:8}},
 OBPVEORG:{account:"OBPVEORG",realmName:"N'Zoth",role:"org",buffs:true,raid:{zone:2677,zoneName:"Blackwing Lair",minActivity:20,period:30,offset:23}},
 OBPVEDMFA:{account:"OBPVEDMFA",realmName:"N'Zoth",role:"dmfa",dmf:"elwynn",info:{period:20,offset:0},chat:{period:10,offset:1}},
 OBPVEDMFH:{account:"OBPVEDMFH",realmName:"N'Zoth",role:"dmfh",dmf:"mulgore",info:{period:20,offset:10},chat:{period:10,offset:6}},
 OBPVEAH:{account:"OBPVEAH",realmName:"N'Zoth",role:"ah",auction:true,info:{period:10,offset:2}},
 OBPVPSW:{account:"OBPVPSW",realmName:"Y'Shaarj",role:"sw",auction:true,info:{period:10,offset:4}},
 OVHCSW:{account:"OBHCSW",realmName:"C'Thun",role:"sw",info:{period:10,offset:8}}
});
export function getProfile(env=process.env){
 const key=(env.COLLECTOR_PROFILE||env.RAILWAY_SERVICE_NAME||"").toUpperCase();
 const profile=PROFILES[key];
 if(!profile)throw Error("Unknown COLLECTOR_PROFILE: "+key);
 if(env.WOW_ACCOUNT&&env.WOW_ACCOUNT.toUpperCase()!==profile.account)throw Error("WOW_ACCOUNT does not match collector profile");
 if(env.WOW_REALM&&env.WOW_REALM!==profile.realmName)throw Error("WOW_REALM does not match collector profile");
 return {...profile,key,character:env.WOW_CHARACTER||profile.account};
}
export function nextSlotMs(now,period,offset){
 const p=period*1000,o=offset*1000;
 return Math.floor((now-o)/p+1)*p+o;
}
export function schedule(job,settings,{now=Date.now,onError=console.error}={}){
 let closed=false,timer=null,busy=false;
 const tick=()=>{
  if(closed)return;
  timer=setTimeout(tick,Math.max(1,nextSlotMs(now(),settings.period,settings.offset)-now()));
  if(busy)return;
  busy=true;Promise.resolve().then(job).catch(onError).finally(()=>{busy=false;});
 };
 timer=setTimeout(tick,Math.max(1,nextSlotMs(now(),settings.period,settings.offset)-now()));
 return ()=>{closed=true;clearTimeout(timer);};
}
