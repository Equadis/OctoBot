/** Auditable price maths used by the AH pricing contract; all input money is copper. */
export const unitBuyout=(stack,quantity)=>Number.isSafeInteger(stack)&&stack>0&&Number.isSafeInteger(quantity)&&quantity>0?stack/quantity:null;
export function marketPercent(current,average){
 return current==null||average==null||!Number.isFinite(current)||!Number.isFinite(average)||average<=0?null:100*current/average;
}
export function trendPercent(current,previous){
 return current==null||previous==null||!Number.isFinite(current)||!Number.isFinite(previous)||previous<=0?null:100*(current-previous)/previous;
}
export function trendArrow(percent){
 if(percent==null||!Number.isFinite(percent))return '—';
 if(Math.abs(percent)<10)return '→';
 return (percent>0?'↑':'↓').repeat(Math.abs(percent)>=25?2:1);
}
export function historicalAverage(dailyPrices,minDays=4){
 const eligible=dailyPrices.filter(x=>x!=null&&Number.isFinite(x)&&x>0);
 return eligible.length<minDays?null:eligible.reduce((a,b)=>a+b,0)/eligible.length;
}
export function estimatedRemaining(timeLeftMs,elapsedMs){
 if(!Number.isFinite(timeLeftMs)||timeLeftMs<0)return null;
 if(!Number.isFinite(elapsedMs)||elapsedMs<0)return null;
 return Math.max(0,timeLeftMs-elapsedMs);
}
