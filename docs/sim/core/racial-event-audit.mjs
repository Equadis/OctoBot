// Source facts are not a combat engine. Conditional racial abilities are
// deliberately not added to unconditional character sheet stats.
const source=(id)=>'https://octowow.st/db/?spell='+id;
export const RACIAL_EVENT_FACTS=Object.freeze({
 Orc:[{id:'blood-fury',name:'Blood Fury',kind:'activated',source:source(20572),cooldownSeconds:120,durationSeconds:15,modifiers:{baseMeleeAttackPowerPct:25,healingReceivedPct:-50},healingPenaltySeconds:25,note:'Temporary base melee AP, not total AP; separate healing penalty lasts 25 seconds.'}],
 Troll:[{id:'beast-slaying',name:'Beast Slaying',kind:'target-conditional',source:source(20557),modifiers:{damageDealtPct:5},targetCreatureType:'Beast',note:'Applies only against Beasts; target creature type and combat damage engine not yet implemented.'}],
 Tauren:[{id:'war-stomp',name:'War Stomp',kind:'activated-control',source:source(20549),cooldownSeconds:150,durationSeconds:2,castSeconds:.5,radiusYards:8,maxTargets:5,note:'Control effect, not damage; encounter immunity and time cost require an engine.'}],
 'High Elf':[{id:'queldorei-meditation',name:"Quel'dorei Meditation",kind:'activated-resource',source:'https://forge.octowow.st/high-elves',durationSeconds:5,modifiers:{maxManaPct:10,energy:50,rage:20},note:'Alternative resources, not simultaneous gains. Tick timing, cooldown, caps and form handling unverified.'}],
 Goblin:[{id:'exit-strategy',name:'Exit Strategy',kind:'activated-movement',source:'https://forge.octowow.st/goblins',durationSeconds:5,modifiers:{movementSpeedPct:40},disablesAttacks:true,disablesSpellcasting:true,note:'Movement only; attacks and casting disabled. Cooldown not established.'}]
});
export function racialEventAudit(race){
 return (RACIAL_EVENT_FACTS[race]||[]).map(effect=>({...effect,status:'source-backed-not-simulated',appliedToSheet:false}));
}
