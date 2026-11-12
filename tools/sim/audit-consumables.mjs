// A coverage report, never an assertion that missing server rules are known.
import {writeFileSync} from 'node:fs';
import {CONSUMABLES,explicitStacking,consumableGroup} from '../../docs/sim/core/consumables.mjs';
const records=CONSUMABLES.map(item=>({id:item.id,name:item.name,source:item.source,tooltipVerified:item.verified,
 stacking:explicitStacking(item),referenceReplacementGroup:consumableGroup(item),
 sharedCooldown:{category:item.sharedCooldown,verified:item.cooldownVerified},spellIds:item.spellIds||[]}));
const report={listingCount:records.length,verifiedTooltips:records.filter(i=>i.tooltipVerified).length,
 verifiedExclusivity:records.filter(i=>i.stacking.status==='verified-tooltip').length,
 complete:records.every(i=>i.tooltipVerified&&i.stacking.status==='verified-tooltip'),
 note:'Tooltip facts, reference replacement groups and cooldown categories are separate evidence. No rule listed means unresolved, not confirmed stacking. Community Turtle data is not OctoWoW server proof.',records};
writeFileSync(new URL('../../docs/sim/data/consumables/stacking-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`${report.verifiedTooltips}/${report.listingCount} tooltips; ${report.verifiedExclusivity} explicit exclusivity statements; remaining interactions unresolved.`);
