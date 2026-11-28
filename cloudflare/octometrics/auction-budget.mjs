import {AuctionError, getJson, readJson, putJson} from './auction-r2.mjs';

export const BUDGET_KEY='auction/v1/account-budget';
const limits={
 day_reads:500000000, day_writes:1000000, month_reads:15000000000, month_writes:30000000, storage_bytes:4000000000,
 worker_requests:8500000, worker_cpu_ms:24000000, r2_class_a:800000, r2_class_b:8000000, r2_bytes:8500000000
};

export async function setAuctionBudget(bucket,request,now){
 const report=await readJson(request.body,null,4096);
 const time=Date.parse(report?.observed_at);
 if(!Number.isFinite(time)||time>now+60000||now-time>3600000||typeof report?.billing_period!=='string'||report.billing_period.length>40||
   Object.keys(limits).some(key=>!Number.isSafeInteger(report[key])||report[key]<0)){
  throw new AuctionError('invalid account usage report');
 }
 const existing=await getJson(bucket,BUDGET_KEY);
 if(existing&&Date.parse(existing.value.observed_at)>=time)throw new AuctionError('account usage report is not newer',409);
 const result=await putJson(bucket,BUDGET_KEY,report,{
  onlyIf:existing?{etagMatches:existing.etag}:new Headers({'If-None-Match':'*'})
 });
 if(!result)throw new AuctionError('account usage report changed concurrently',409);
 return {ok:true};
}

export async function verifyAuctionBudget(bucket,env,now){
 if(env.AUCTION_BUDGET_REQUIRED==='false')return;
 const report=(await getJson(bucket,BUDGET_KEY))?.value;
 const maxAge=Math.min(21600000,Math.max(300000,Number(env.AUCTION_BUDGET_MAX_AGE_MS)||7200000));
 if(!report||!Number.isFinite(Date.parse(report.observed_at))||now-Date.parse(report.observed_at)>maxAge){
  throw new AuctionError('auction collection suspended: account usage report missing or stale',429);
 }
 for(const [key,target] of Object.entries(limits)){
  const override=Number(env['AUCTION_BUDGET_'+key.toUpperCase()]);
  const limit=Number.isSafeInteger(override)&&override>0?Math.min(override,target):target;
  if(!Number.isSafeInteger(report[key])||report[key]>=limit)throw new AuctionError('auction collection suspended: account budget '+key,429);
 }
}
