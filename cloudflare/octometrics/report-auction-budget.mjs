// Run hourly with an account Analytics:Read token. A failed read leaves the
// previous report untouched so the collector pauses when that report goes stale.
import {readFile} from 'node:fs/promises';
const {CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_ANALYTICS_TOKEN:analyticsToken,
 AUCTION_ADMIN_TOKEN:adminToken,AUCTION_BILLING_START:billingStart,
 AUCTION_BUDGET_URL:target='https://octometrics.eqvoice.workers.dev/api/auction/budget'}=process.env;

const observed_at=new Date().toISOString(), date=observed_at.slice(0,10);
const values=(rows,field,kind='sum')=>rows.reduce((sum,row)=>{
 const n=row[kind]?.[field];
 if(typeof n!=='number'||!Number.isFinite(n)||n<0)throw new Error('Analytics field missing or invalid: '+field);
 return sum+n;
},0);
async function analytics(){
 if(!/^[a-f0-9]{32}$/i.test(account??'')||!analyticsToken)throw new Error('Missing Cloudflare Analytics access');
 if(!/^\d{4}-\d\d-\d\d$/.test(billingStart??'')||!Number.isFinite(Date.parse(billingStart))||
   billingStart>date||Date.parse(date)-Date.parse(billingStart)>=31*86400000){
  throw new Error('Set AUCTION_BILLING_START to the current subscription billing-period start in UTC');
 }
 const query=`query AuctionBudget($account:string!,$start:Date!,$date:Date!,$from:Time!,$now:Time!,$storage:Time!){
  viewer { accounts(filter:{accountTag:$account}) {
   d1:d1AnalyticsAdaptiveGroups(limit:10000,filter:{date_geq:$start,date_leq:$date}){
    dimensions { date } sum { rowsRead rowsWritten readQueries writeQueries }
   }
   d1Storage:d1StorageAdaptiveGroups(limit:10000,filter:{datetime_geq:$storage,datetime_leq:$now}){
    dimensions { databaseId } max { databaseSizeBytes }
   }
   workers:workersInvocationsAdaptive(limit:10000,filter:{datetime_geq:$from,datetime_leq:$now}){
    sum { cpuTimeUs requests }
   }
   r2:r2OperationsAdaptiveGroups(limit:10000,filter:{datetime_geq:$from,datetime_leq:$now}){
    dimensions { actionType } sum { requests }
   }
   r2Storage:r2StorageAdaptiveGroups(limit:10000,filter:{datetime_geq:$storage,datetime_leq:$now}){
    dimensions { bucketName } max { payloadSize metadataSize }
   }
  } }
 }`;
 const variables={account,start:billingStart,date,from:billingStart+'T00:00:00Z',now:observed_at,
  storage:new Date(Date.now()-86400000).toISOString()};
 const response=await fetch('https://api.cloudflare.com/client/v4/graphql',{
  method:'POST',headers:{authorization:'Bearer '+analyticsToken,'content-type':'application/json'},
  body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)
 });
 if(!response.ok)throw Error('Account analytics HTTP '+response.status);
 const result=await response.json();
 const data=result.data?.viewer?.accounts?.[0];
 const datasets=['d1','d1Storage','workers','r2','r2Storage'];
 if(result.errors?.length||!data||datasets.some(key=>!Array.isArray(data[key])||data[key].length>=10000)){
  throw Error('Account analytics incomplete or truncated. Check dataset availability and token permissions.');
 }
 const today=data.d1.filter(row=>row.dimensions?.date===date);
 const free=new Set(['deleteobject','deleteobjects','abortmultipartupload']);
 const classA=new Set(['listbuckets','putbucket','listobjects','putobject','copyobject','completemultipartupload',
  'createmultipartupload','listmultipartuploads','uploadpart','uploadpartcopy','listparts','putbucketlifecycleconfiguration']);
 const classB=new Set(['headbucket','headobject','getobject','getbucketlocation','getbucketlifecycleconfiguration']);
 let r2_class_a=0,r2_class_b=0;
 for(const row of data.r2){
  const action=(row.dimensions?.actionType??'').toLowerCase().replace(/[^a-z]/g,'');
  if(free.has(action))continue;
  const count=values([row],'requests');
  if(!classB.has(action))r2_class_a+=count;
  if(!classA.has(action))r2_class_b+=count;
 }
 return {observed_at,billing_period:billingStart,
  day_reads:Math.ceil(values(today,'rowsRead')),day_writes:Math.ceil(values(today,'rowsWritten')),
  month_reads:Math.ceil(values(data.d1,'rowsRead')),month_writes:Math.ceil(values(data.d1,'rowsWritten')),
  query_count:Math.ceil(values(data.d1,'readQueries')+values(data.d1,'writeQueries')),
  storage_bytes:Math.ceil(values(data.d1Storage,'databaseSizeBytes','max')),
  worker_requests:Math.ceil(values(data.workers,'requests')),worker_cpu_ms:Math.ceil(values(data.workers,'cpuTimeUs')/1000),
  r2_class_a:Math.ceil(r2_class_a),r2_class_b:Math.ceil(r2_class_b),
  r2_bytes:Math.ceil(values(data.r2Storage,'payloadSize','max')+values(data.r2Storage,'metadataSize','max'))};
}
const [mode,file]=process.argv.slice(2);
const report=mode==='--file'&&file?JSON.parse(await readFile(file,'utf8')):await analytics();
if(mode==='--print'){
 console.log(JSON.stringify(report,null,2));
}else{
 if(!adminToken)throw Error('Missing AUCTION_ADMIN_TOKEN');
 const url=new URL(target);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/api/auction/budget')throw Error('Invalid budget endpoint');
 const response=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+adminToken,'content-type':'application/json'},
  body:JSON.stringify(report),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Budget report rejected with HTTP '+response.status);
 console.log('Published Auction House budget observation for '+report.observed_at);
}
