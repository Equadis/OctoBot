// Policies derived from the imported OctoWoW talent descriptions, not the
// older archived Turtle revisions. Runtime validation and live sampling remain separate.
const num=(n,label,min=0,max=Infinity)=>{if(!Number.isFinite(n)||n<min||n>max)throw new Error('Explicit '+label+' required');return n;};
const integer=(n,label,min=1)=>{if(!Number.isSafeInteger(n)||n<min)throw new Error('Explicit '+label+' required');return n;};
const id=(x,label)=>{if(typeof x!=='string'||!x.trim())throw new Error('Explicit '+label+' required');return x;};
export function validateCastProc(p,abilityIds){
 if(!p||typeof p!=='object')throw new Error('Explicit cast proc required');
 id(p.id,'proc id');id(p.name,'proc aura name');id(p.source,'proc provenance');
 if(!(p.id==='purifying-flames'&&p.consumerId===null)&&!abilityIds.has(p.consumerId)||!Array.isArray(p.triggerAbilityIds)||!p.triggerAbilityIds.length||new Set(p.triggerAbilityIds).size!==p.triggerAbilityIds.length||p.triggerAbilityIds.some(a=>!abilityIds.has(a)))throw new Error('Cast proc must refer to configured abilities');
 if(!Array.isArray(p.triggerKinds)||!p.triggerKinds.length||p.triggerKinds.some(k=>!['damage','periodic-damage'].includes(k)))throw new Error('Explicit cast proc damage event eligibility required');
 if(!['landed','critical'].includes(p.trigger))throw new Error('Explicit cast proc trigger required');
 num(p.chance,'cast proc chance',0,1);integer(p.durationMs,'proc aura duration');integer(p.maxStacks,'proc stack cap');
 integer(p.castReductionMsPerStack,'per stack cast reduction',0);num(p.manaCostFactor,'mana cost factor',0,1);
 for(const field of ['instant','guaranteeHit'])if(typeof p[field]!=='boolean')throw new Error('Explicit '+field+' policy required');
 if((p.consumerId===null||p.id==='purifying-flames')&&(p.consumerId!==null||p.id!=='purifying-flames'||p.name!=='Purifying Flames'||p.trigger!=='landed'||p.triggerKinds.length!==1||p.triggerKinds[0]!=='damage'||p.triggerAbilityIds.length!==1||p.triggerAbilityIds[0]!=='priest:holy-fire'||![.5,1].includes(p.chance)||p.durationMs!==10000||p.maxStacks!==1||p.castReductionMsPerStack!==0||p.manaCostFactor!==1||p.instant||p.guaranteeHit))throw new Error('Invalid Purifying Flames aura-only proc');
 return p;
}
export function buildCastProcs(build,actions,policies,{requireComplete=false}={}){
 const ids=new Set(actions.map(a=>a.abilityId)),out=[],omitted=[];
 const selected=id=>Number(build.talents?.[String(id)]??0);
 const add=(base,rank,consumerId,eligible)=>{
  if(!rank||!ids.has(consumerId))return;const triggers=eligible.filter(x=>ids.has(x));if(!triggers.length)return;
  const p={...base,consumerId,triggerAbilityIds:triggers,source:'Imported OctoWoW talent descriptions: https://octowow.st/talents/'+build.classId+'/'};
  if(base.id==='nightfall'){const duration=policies?.nightfall?.durationMs;if(!Number.isSafeInteger(duration)||duration<1){if(requireComplete)throw new Error('Nightfall requires an explicit Shadow Trance duration');omitted.push('Nightfall: unknown Shadow Trance duration');return;}p.durationMs=duration;}
  validateCastProc(p,ids);out.push(p);
 };
 if(build.classId==='mage'){const r=selected(15);if(r>0)add({id:'hot-streak',name:'Hot Streak',chance:[.5,1][r-1],trigger:'critical',triggerKinds:['damage'],durationMs:180000,maxStacks:5,castReductionMsPerStack:1000,instant:false,manaCostFactor:1,guaranteeHit:false},r,'mage:pyroblast',['mage:fireball','mage:fire-blast']);}
 if(build.classId==='priest'){const r=selected(177);if(r>0)add({id:'searing-light',name:'Searing Light',chance:[.33,.66,1][r-1],trigger:'critical',triggerKinds:['damage','periodic-damage'],durationMs:10000,maxStacks:1,castReductionMsPerStack:0,instant:true,manaCostFactor:.4,guaranteeHit:false},r,'priest:smite',['priest:smite','priest:holy-fire','priest:chastise','priest:holy-nova','priest:mana-burn']);}
 if(build.classId==='priest'){const r=selected(178);if(!Number.isSafeInteger(r)||r<0||r>2)throw new Error('Invalid Purifying Flames talent rank');if(r&&ids.has('priest:holy-fire')){const p={id:'purifying-flames',name:'Purifying Flames',consumerId:null,triggerAbilityIds:['priest:holy-fire'],triggerKinds:['damage'],trigger:'landed',chance:r*.5,durationMs:10000,maxStacks:1,castReductionMsPerStack:0,instant:false,manaCostFactor:1,guaranteeHit:false,source:'Imported OctoWoW talent descriptions: https://octowow.st/talents/priest/; reference assumption: landed direct Holy Fire, dynamic Holy damage'};validateCastProc(p,ids);out.push(p);}}
 if(build.classId==='warlock'){const r=selected(347);if(r>0)add({id:'nightfall',name:'Shadow Trance',chance:[.02,.04][r-1],trigger:'landed',triggerKinds:['damage','periodic-damage'],durationMs:null,maxStacks:1,castReductionMsPerStack:0,instant:true,manaCostFactor:1,guaranteeHit:true},r,'warlock:shadow-bolt',['warlock:corruption','warlock:dark-harvest','warlock:drain-life','warlock:drain-soul','warlock:drain-mana']);}
 return {procs:out,omitted};
}
