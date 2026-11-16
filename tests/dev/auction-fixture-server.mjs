// LOCAL TESTING ONLY. Serves docs/ plus an Auction House API backed by SQLite, filled with SYNTHETIC prices.
// Item names, icons and categories come from the real catalogue; every price, quantity and listing is invented.
// Nothing here is ever deployed or published as market data.   Run: node tests/dev/auction-fixture-server.mjs [port]
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {extname,join,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
import {auctionRoute} from '../../cloudflare/octometrics/auction.mjs';
import {d1,post,env as makeEnv} from '../../cloudflare/octometrics/tests/auction-sqlite.mjs';

const docs=fileURLToPath(new URL('../../docs/',import.meta.url));
const catalogue=JSON.parse(readFileSync(join(docs,'sim/data/items/catalogue.json'),'utf8'));
const pick=(pred,n)=>catalogue.filter(pred).slice(0,n);
const items=[...pick(i=>i.classs===2&&i.quality>=2&&i.reqlevel>=20,18),...pick(i=>i.classs===4&&i.quality>=3,18),...pick(i=>i.classs===7,12),...pick(i=>i.classs===0&&i.quality>=1,12),...pick(i=>i.classs===9,8)];
let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
const url=i=>i.icon&&/^[a-z0-9_]{1,80}$/i.test(i.icon)?`https://wow.zamimg.com/images/wow/icons/large/${i.icon.toLowerCase()}.jpg`:null;
let n=0;
function scanListings(day){
  n=0;const out=[];
  for(const [idx,i] of items.entries()){
    const base=200+Math.floor((idx*7919)%90000);
    const drift=1+(day-3)*0.08*(idx%3-1)+(day===5&&idx%5===0?0.45:0);
    const stacks=1+(idx%4);
    for(let s=0;s<stacks;s++){
      const quantity=i.classs===7||i.classs===0?[1,5,10,20][(idx+s)%4]:1;
      const unit=Math.max(1,Math.round(base*drift*(1+s*0.12)*(0.9+rnd()*0.2)));
      out.push({auction_id:++n,item_id:i.id,variant:idx%9===0&&s===1?'0:'+(100+idx)+':5':'0:0:0',quantity,item_name:i.name,quality:i.quality,icon_url:url(i),
        start_bid:Math.max(1,Math.round(unit*quantity*0.6)),current_bid:s===2?Math.round(unit*quantity*0.7):0,min_next_bid:Math.round(unit*quantity*0.65),
        buyout:s===3?null:unit*quantity,owner_guid:String(1000+(idx*13+s)%37),time_left_ms:[1200000,5400000,28800000,72000000][(idx+s)%4],captured_at:new Date().toISOString(),
        item_level:i.level??null,req_level:i.reqlevel??(i.level!==undefined?0:null),class_id:i.classs,subclass_id:i.subclass,slot_id:i.slot??null});
    }
  }
  return out;
}
const e=makeEnv();
for(let day=1;day<=5;day++){
  const list=scanListings(day),pages=Math.ceil(list.length/50),id='ah_fixture_0'+day;
  const d=new Date(Date.now()-(5-day)*86400e3).toISOString().slice(0,10);   // five consecutive days ending today (UTC)
  await post(e,'start',{scan_id:id,started_at:d+'T00:00:01.000Z',reported_total:list.length});
  for(let p=0;p<pages;p++)await post(e,'page',{scan_id:id,page:p,response_ms:1,items:list.slice(p*50,p*50+50)});
  const r=await post(e,'complete',{scan_id:id,completed_at:d+'T00:00:30.000Z',expected_pages:pages,reported_total:list.length});
  if(r.status!==201)throw new Error('fixture scan failed '+JSON.stringify(r));
}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const port=Number(process.argv[2])||4173;
createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname.startsWith('/api/auction/')){
    const body=req.method==='POST'?await new Promise(r=>{let s='';req.on('data',c=>s+=c);req.on('end',()=>r(s));}):undefined;
    const response=await auctionRoute(new Request('http://localhost'+req.url,{method:req.method,headers:{authorization:'Bearer '+'lifecycle-test-only-token'},body}),e);
    res.writeHead(response.status,{'content-type':'application/json','access-control-allow-origin':'*'});
    res.end(await response.text());return;
  }
  let path=normalize(join(docs,decodeURIComponent(u.pathname)));
  if(!path.startsWith(docs)){res.writeHead(403).end();return;}
  if(existsSync(path)&&statSync(path).isDirectory())path=join(path,'index.html');
  if(!existsSync(path)){res.writeHead(404).end('not found');return;}
  res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream','cache-control':'no-store'});
  res.end(readFileSync(path));
}).listen(port,()=>console.log('Fixture server (synthetic prices) on http://localhost:'+port+'/auction-house/?api=http://localhost:'+port));
