import test from 'node:test';import assert from 'node:assert/strict';
import {CombatTimeline} from '../../docs/sim/core/combat-timeline.mjs';
import {CombatAuras} from '../../docs/sim/core/combat-auras.mjs';
import {ThreatLedger} from '../../docs/sim/core/combat-threat.mjs';
import {applyFade,compileFade} from '../../docs/sim/core/combat-priest-fade.mjs';
test('Fade removes threat per enemy, returns existing masked threat without re-counting generated threat, and preserves later damage threat',()=>{
 const timeline=new CombatTimeline(),threat=new ThreatLedger(timeline,{enemyIds:['boss','add'],actorIds:['p']}),auras=new CombatAuras(timeline);
 const e={timeline,threat,auras,unit:()=>({alive:true})};
 threat.add({enemyId:'boss',actorId:'p',value:1000});threat.add({enemyId:'add',actorId:'p',value:50});
 const p=compileFade({talents:{208:2}},{record:{fields:{flatThreatReduction:440}}},{fraction:.15,order:'percent-then-flat'});
 applyFade(e,'p',['boss','add'],p);assert.equal(threat.current('boss','p'),410);assert.equal(threat.current('add','p'),0);
 applyFade(e,'p',['boss','add'],p);assert.equal(threat.current('boss','p'),410);
 timeline.runUntil(5000);threat.add({enemyId:'boss',actorId:'p',value:200});assert.equal(threat.current('boss','p'),610);
 timeline.runUntil(10000);assert.equal(threat.current('boss','p'),905);assert.equal(threat.current('add','p'),25);assert.equal(threat.snapshot().generated.p,1250);
 assert.equal(auras.active('p').length,0);
});
