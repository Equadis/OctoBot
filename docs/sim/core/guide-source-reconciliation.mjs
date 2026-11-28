// Official guide proposals are not live observations. Keep scope explicit.
const mage='https://octowow.st/mage',hunter='https://octowow.st/index.php/hunter',rogue='https://octowow.st/index.php/rogue',priest='https://octowow.st/index.php/priest';
export const GUIDE_CANDIDATES=Object.freeze([
 {abilityId:'mage:fireball',rank:11,field:'manaCost',value:275,unit:'mana',source:mage,scope:'exact-rank'},
 {abilityId:'mage:fireball',rank:12,field:'manaCost',value:295,unit:'mana',source:mage,scope:'exact-rank'},
 {abilityId:'hunter:aimed-shot',rank:6,field:'manaCost',value:205,unit:'mana',source:hunter,scope:'exact-rank'},
 {abilityId:'hunter:aimed-shot',field:'cooldown',value:26000,unit:'ms',source:hunter,scope:'ability'},
 {abilityId:'hunter:trueshot-aura',field:'availability',value:'removed',unit:'category',source:hunter,scope:'historical-conflict-superseded-by-player-observation'},
 ...[['sinister-strike',40],['eviscerate',30],['rupture',20],['slice-and-dice',20]].map(([slug,value])=>({abilityId:'rogue:'+slug,field:'cost',value,unit:'energy',source:rogue,scope:'all-ranks'})),
 {abilityId:'priest:holy-nova',field:'manaCost',value:180,unit:'mana',source:priest,scope:'shadowform-guide-rank-unspecified'}
]);
export function reconcileGuideSources(queue){
 return GUIDE_CANDIDATES.map(g=>({
  ...g,status:'published-guide-candidate',liveVerified:false,
  linkedRanks:queue.spellRows.filter(r=>r.abilityId===g.abilityId&&(g.rank==null||r.rank===g.rank)).map(r=>({spellId:r.spellId,rank:r.rank,source:r.source,conflicts:r.conflicts})),
  canAutoApply:false
 }));
}
