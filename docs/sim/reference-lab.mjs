import {labRanks} from './core/combat-reference-lab.mjs';
export function wireReferenceLab({classId,getBuild,getTalents,lookupGear,document:doc=document}){
 const $=id=>doc.getElementById(id),select=$('reference-rank'),run=$('run-reference'),confirm=$('reference-confirm'),status=$('reference-status'),output=$('reference-output');
 const ranks=labRanks(classId);for(const r of ranks){const o=doc.createElement('option');o.value=r.spellId;o.disabled=!r.available;o.textContent=r.name+' (Rank '+r.rank+')'+(r.available?'':' — future phase');select.append(o);}
 let worker=null,token=0;
 const chosen=()=>ranks.find(r=>r.spellId===Number(select.value));
 function reset(){token++;worker?.terminate();worker=null;run.disabled=false;status.textContent='';output.replaceChildren();}
 function sync(){reset();confirm.checked=false;const rank=chosen();if(!rank)return;$('reference-source').href=rank.source;$('reference-source').textContent=rank.status==='external-reference-only'?'External reference rank ↗':'OctoWoW database rank ↗';$('reference-cooldown').value=rank.referenceCooldownMs??0;$('reference-cost-row').hidden=!rank.requiredPolicy?.includes('costOverride');$('reference-coeff-row').hidden=!rank.components.some(c=>c.coefficient===null&&c.kind.startsWith('periodic'));$('reference-cost').value='';$('reference-coeff').value='';}
 select.addEventListener('change',sync);sync();
 const p=(parent,text)=>{const node=doc.createElement('p');node.textContent=text;parent.append(node);};
 run.addEventListener('click',()=>{
  reset();const rank=chosen();if(!rank?.available||!confirm.checked){status.textContent='Select a current-phase rank and confirm the assumptions.';return;}
  const build=structuredClone(getBuild()),gearById={};for(const item of Object.values(build.gear)){const gear=lookupGear(item.id);if(gear)gearById[String(item.id)]=gear;}
  const nullable=id=>$(id).value.trim()===''?null:Number($(id).value);
  const thisToken=++token;run.disabled=true;status.textContent='Running reference benchmark…';
  try{worker=new Worker(new URL('./reference-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=({data})=>{if(thisToken!==token)return;worker.terminate();worker=null;run.disabled=false;if(!data.ok){status.textContent=data.error;return;}status.textContent='Reference benchmark complete — not live validated.';const r=data.result,s=r.statistics;const heading=doc.createElement('h3');heading.textContent='Reference '+r.metric.toUpperCase()+': '+s.mean.toFixed(1);output.append(heading);p(output,s.n+' iterations · median '+s.median.toFixed(1)+' · 5th–95th percentile '+s.p05.toFixed(1)+'–'+s.p95.toFixed(1));for(const note of r.limitations)p(output,note);const table=doc.createElement('pre');table.textContent=JSON.stringify({rankRows:r.rankRows,example:r.example.actors.player,events:r.exampleEvents.slice(0,50)},null,2);table.style.whiteSpace='pre-wrap';table.style.maxHeight='320px';table.style.overflow='auto';const detail=doc.createElement('details'),summary=doc.createElement('summary');summary.textContent='Example breakdown and first 50 combat events';detail.append(summary,table);output.append(detail);};worker.onerror=()=>{if(thisToken!==token)return;worker.terminate();worker=null;run.disabled=false;status.textContent='Reference worker failed to load or execute.';};worker.postMessage({build,talents:getTalents(),gearById,spellId:rank.spellId,confirmed:true,seed:Number($('reference-seed').value),costOverride:nullable('reference-cost'),periodicCoefficient:nullable('reference-coeff'),cooldownMs:nullable('reference-cooldown')});}catch(error){run.disabled=false;status.textContent=error.message;}
 });
 $('reset-results').addEventListener('click',reset);$('cancel-reference').addEventListener('click',()=>{reset();status.textContent='Reference benchmark cancelled.';});
 return reset;
}
