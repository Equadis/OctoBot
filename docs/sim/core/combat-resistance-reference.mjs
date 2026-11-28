// Explicit, opt-in reference approximation. This is NOT the server resist table.
// Linear interpolation between caller-selected adjacent bins preserves the
// supplied mean, but does not establish higher moments or actual bin weights.
export function resistanceReference({rating,penetration=0,attackerLevel,cap,policy,bins,provenance}){
 if(!Number.isFinite(rating)||rating<0||!Number.isFinite(penetration)||penetration<0||!Number.isInteger(attackerLevel)||attackerLevel<1||attackerLevel>63||!Number.isFinite(cap)||cap<0||cap>1||typeof provenance!=='string'||!provenance.trim())throw new Error('Explicit resistance rating, level, cap and provenance required');
 if(!['binary','nonbinary','none'].includes(policy))throw new Error('Explicit resistance policy required');
 const effective=Math.max(0,rating-penetration),mean=policy==='none'?0:Math.min(cap,cap*effective/(5*attackerLevel));
 if(policy==='none')return {effective,mean,resistance:[{fraction:0,probability:1}],liveVerified:false};
 if(policy==='binary')return {effective,mean,resistance:[{fraction:0,probability:1-mean},{fraction:1,probability:mean}],liveVerified:false};
 if(!Array.isArray(bins)||bins.length<2||bins[0]!==0||bins.at(-1)!==1||bins.some((v,i)=>!Number.isFinite(v)||v<0||v>1||(i>0&&v<=bins[i-1])))throw new Error('Explicit sorted resistance bins from zero to one required');
 const hi=bins.findIndex(v=>v>=mean);
 if(bins[hi]===mean)return {effective,mean,resistance:[{fraction:mean,probability:1}],liveVerified:false};
 const lo=bins[hi-1],upper=bins[hi],p=(mean-lo)/(upper-lo);
 return {effective,mean,resistance:[{fraction:lo,probability:1-p},{fraction:upper,probability:p}],liveVerified:false};
}
