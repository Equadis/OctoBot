import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';

const root=join(import.meta.dirname,'../docs');
const html=readFileSync(join(root,'index.html'),'utf8');
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,'Population page must include its controller');
const math=readFileSync(join(root,'chart-data.js'),'utf8');
const history=readFileSync(join(root,'population-history.js'),'utf8');
const uptime=readFileSync(join(root,'uptime-clock.js'),'utf8');

function mockElement(tag='div'){
  const events=new Map(),attrs=new Map();
  const node={tagName:tag,style:{},textContent:'',value:'',children:[],
    hidden:false,clientWidth:1000,offsetWidth:150,
    parentElement:{clientWidth:1000},
    classList:{add(){},remove(){}},
    append(...items){this.children.push(...items)},
    replaceChildren(...items){this.children=[...items]},
    setAttribute(name,value){attrs.set(name,String(value))},
    getAttribute(name){return attrs.get(name)},
    addEventListener(name,handler){events.set(name,handler)},
    fire(name,payload){return events.get(name)?.(payload)},
    getBoundingClientRect(){return {left:0,width:908}},
    setPointerCapture(){},hasPointerCapture(){return false},
    releasePointerCapture(){}
  };
  return node;
}
function fixture(options={}){
  let timestamp=Date.parse('2026-11-08T01:00:00Z');
  class FakeDate extends Date {
    constructor(...args){super(...(args.length?args:[timestamp]));}
    static now(){return timestamp;}
  }
  let failed=false;
  const archival=options.archival||[
    {timestamp:new FakeDate(timestamp-180000).toISOString(),online:95},
    {timestamp:new FakeDate(timestamp-120000).toISOString(),online:98}
  ];
  const worker=options.worker||[
    {timestamp:new FakeDate(timestamp-60000).toISOString(),online:101}
  ];
  const statusSamples=[];
  const elements=new Map(),intervals=new Map();
  const get=id=>{
    if(!elements.has(id))elements.set(id,mockElement());
    return elements.get(id);
  };
  const document={
    getElementById:get,
    querySelector(sel){if(sel==='.ranges')return get('ranges');return get(sel)},
    querySelectorAll(sel){return sel==='.ranges button'?get('ranges').children:[]},
    createElement:mockElement,createElementNS:(_ns,tag)=>mockElement(tag)
  };
  const realms=[
    {id:'all',name:'All Realms',history:'online-history.json'},
    {id:'nzoth',name:"N'Zoth (Normal)",history:'history/nzoth.json'}
  ];
  const requests=[];
  const fetch=async path=>{
    const url=String(path);requests.push(url);
    if(url.includes('/api/status/history?')){
      if(failed)throw Error('Worker uptime monitoring temporarily unavailable');
      const since=Number(new URL(url).searchParams.get('since'));
      const rows=statusSamples.filter(r=>Date.parse(r.timestamp)>since);
      return {ok:true,json:async()=>({
        samples:rows,has_more:false,
        next_since:rows.length?Date.parse(rows.at(-1).timestamp):since
      })};
    }
    if(url.includes('/api/latest')){
      if(failed)throw Error('Worker temporarily unavailable');
      return {ok:true,json:async()=>({nzoth:{...worker.at(-1),source:'official census'}})};
    }
    if(url.includes('/api/history?')){
      if(failed)throw Error('Worker history temporarily unavailable');
      const params=new URL(url).searchParams;
      if(params.get('realm')==='all')return {ok:false,status:400};
      const since=Number(params.get('since'));
      return {ok:true,json:async()=>({
        readings:worker.filter(r=>Date.parse(r.timestamp)>since),has_more:false
      })};
    }
    if(url.includes('online-history.json'))return {ok:true,json:async()=>archival};
    if(url.includes('history/nzoth.json'))return {ok:true,json:async()=>([])};
    if(url.includes('live.json'))return {ok:true,json:async()=>({
      nzoth:{...archival.at(-1),source:'official census'}
    })};
    if(url==='realms.json')return {ok:true,json:async()=>realms};
    if(url==='releases.json')return {ok:true,json:async()=>([])};
    if(url==='uptime-reference.json')return {ok:true,json:async()=>({
      nzoth:{observed_at:'2026-11-07T00:00:00Z',elapsed_seconds:7200}
    })};
    if(url==='status/history.json')return {ok:true,json:async()=>([])};
    if(url==='status/latest.json')return {ok:true,json:async()=>({sample:null})};
    if(url==='telemetry.json')return {ok:true,json:async()=>({
      endpoint:'https://test.worker.dev'
    })};
    throw Error('Unexpected request '+url);
  };
  const window={};
  const context=vm.createContext({
    Date:FakeDate,URL,URLSearchParams,Intl,document,window,fetch,
    location:{hash:'server=all'},
    console:{warn(){},error(...e){throw Error(e.join(' '))}},
    setInterval:(handler,ms)=>{
      if(!intervals.has(ms))intervals.set(ms,[]);
      intervals.get(ms).push(handler);return intervals.size;
    },
    setTimeout:()=>{}
  });
  vm.runInContext(math,context);
  vm.runInContext(history,context);
  vm.runInContext(uptime,context);
  vm.runInContext(inline,context);
  return {
    get,requests,intervals,worker,statusSamples,
    view(){return vm.runInContext('({start,windowEnd})',context);},
    navigate(view){return vm.runInContext('navigateTimeline',context)(view);},
    advance(ms){timestamp+=ms},
    setWorkerFailed(v){failed=v}
  };
}
async function settle(){
  for(let i=0;i<75;i++)await Promise.resolve();
}

test('new readings refresh the chart and headline without page reload',async()=>{
  const env=fixture();
  await settle();
  assert.equal(env.get('online-now').textContent,'101');
  const initialPath=env.get('raw-population').getAttribute('d');
  assert.ok(initialPath?.includes('L'),'Initial chart includes recorded samples');
  const initialRange=env.get('range-label').textContent;
  assert.match(initialRange,/1D/);
  const refresh=env.intervals.get(30000)?.[0];
  assert.equal(typeof refresh,'function','live poll must repeat automatically');
  env.advance(60000);
  env.worker.push({timestamp:new Date('2026-11-08T01:01:00Z').toISOString(),online:127});
  await refresh();await settle();
  assert.equal(env.get('online-now').textContent,'127');
  assert.equal(env.get('peak24').textContent,'127');
  assert.notEqual(env.get('raw-population').getAttribute('d'),initialPath);
  assert.equal(env.get('range-label').textContent,'1D');
});

test('a temporary Worker outage leaves recorded history in place and reports stale data',async()=>{
  const env=fixture();await settle();
  const before=env.get('raw-population').getAttribute('d');
  env.setWorkerFailed(true);env.advance(600000);
  await env.intervals.get(30000)[0]();await settle();
  assert.equal(env.get('online-now').textContent,'101',
    'Historical real value must not be replaced with a fabricated population count');
  assert.equal(env.get('online-label').textContent,'Latest recorded');
  assert.match(env.get('online-freshness').textContent,/Last observation:/);
  assert.ok(env.get('raw-population').getAttribute('d'));
  assert.notEqual(before,'');
});

test('custom time ranges are not reset as new observations arrive',async()=>{
  const env=fixture();await settle();
  const range=env.get('ranges').children.find(b=>b.textContent==='1H');
  assert.ok(range);
  range.fire('click');
  const initialEnd=env.get('date-to').value;
  const hit=env.get('plot-hit');
  hit.fire('wheel',{
    clientX:450,deltaX:0,deltaY:-80,deltaMode:0,shiftKey:false,
    preventDefault(){}
  });
  const custom=env.get('range-label').textContent;
  assert.ok(!custom.startsWith('1H'),'Mouse zoom enters custom view');
  env.advance(60000);
  env.worker.push({timestamp:new Date('2026-11-08T01:01:00Z').toISOString(),online:121});
  await env.intervals.get(30000)[0]();await settle();
  assert.equal(env.get('online-now').textContent,'121');
  assert.ok(!env.get('range-label').textContent.startsWith('1H'),
    'Do not reset manual zoom on background refresh');
  assert.equal(env.get('date-to').value,initialEnd);
});


test('Shift+scroll up pans population left and down pans right, including browser deltaX',async()=>{
  const env=fixture();await settle();
  const hit=env.get('plot-hit');
  function turn(deltaY,deltaX=0,shiftKey=true){
    hit.fire('wheel',{clientX:450,deltaX,deltaY,deltaMode:0,shiftKey,
      preventDefault(){}});
  }
  // Zoom first to leave room on both sides of the starting one-day range.
  turn(-120,0,false);
  const before=env.view();
  turn(-120,0,true); // Scroll up must move to earlier time.
  const left=env.view();
  assert.ok(left.start<before.start);
  assert.ok(Math.abs((left.windowEnd-left.start)-(before.windowEnd-before.start))<1,
    'Horizontal panning does not change the zoom level');
  turn(120,120,true); // Browser remaps Shift+scroll down to deltaX.
  const right=env.view();
  assert.ok(right.start>left.start);
  assert.ok(Math.abs((right.windowEnd-right.start)-(left.windowEnd-left.start))<1);
});

test('Jump to present preserves the population time scale and disables at the right edge',async()=>{
  const env=fixture();await settle();
  const jump=env.get('jump-to-present');
  assert.equal(jump.disabled,true,'A present-anchored preset cannot jump any further');
  const hit=env.get('plot-hit');
  hit.fire('wheel',{clientX:450,deltaX:0,deltaY:-140,deltaMode:0,shiftKey:false,
    preventDefault(){}});
  const before=env.view();
  assert.equal(jump.disabled,false,'Zoomed historical view should enable Jump to present');
  const span=before.windowEnd-before.start;
  jump.fire('click');
  const after=env.view();
  assert.equal(after.windowEnd,Date.parse('2026-11-08T01:00:00Z'));
  assert.ok(Math.abs((after.windowEnd-after.start)-span)<1,
    'Jump must pan the timeline, not restore a preset zoom level');
  assert.equal(jump.disabled,true,'Jump button must be greyed out after arriving at present');
});


test('minute-level historical panning renders boundary readings without false NO DATA or right-edge snap',async()=>{
 const now=Date.parse('2026-11-08T01:00:00Z');
 const archival=Array.from({length:90},(_,i)=>({
  timestamp:new Date(now-(90-i)*60000).toISOString(),online:1300+i
 }));
 const env=fixture({archival});await settle();
 const start=now-55*60000+25000,end=start+600000;
 env.navigate({start,end});
 assert.equal(env.get('range-label').textContent,'10m');
 const view=env.view();
 assert.equal(view.start,start);
 assert.equal(view.windowEnd,end);
 const raw=env.get('raw-population').getAttribute('d');
 const smooth=env.get('population').getAttribute('d');
 assert.match(raw,/^M56\.00,/,'Recorded path must begin at the exact left boundary');
 assert.match(raw,/L964\.00,/,'Recorded path must reach the exact right boundary');
 assert.match(smooth,/^M56\.00,/);
 assert.match(smooth,/964\.00,/);
 assert.equal(env.get('outages').children.length,0,'Continuous data must not create a missing-data band');
 assert.doesNotMatch(env.get('readout').textContent,/NO DATA/,
  'A historical graph with visible readings must not show an unrelated NO DATA headline');
 const hit=env.get('plot-hit');
 const delta=35;
 const first=env.view();
 for(let i=0;i<25;i++){
  hit.fire('wheel',{clientX:450,deltaX:0,deltaY:-delta,deltaMode:0,
   shiftKey:true,preventDefault(){}});
  const visible=env.view(),d=env.get('raw-population').getAttribute('d');
  assert.equal(visible.windowEnd-visible.start,600000);
  assert.match(d,/^M56\.00,/);
  assert.match(d,/L964\.00,/);
  assert.doesNotMatch(env.get('readout').textContent,/NO DATA/);
 }
 for(let i=0;i<25;i++){
  hit.fire('wheel',{clientX:450,deltaX:delta,deltaY:0,deltaMode:0,
   shiftKey:true,preventDefault(){}});
 }
 const returned=env.view();
 assert.ok(Math.abs(returned.start-first.start)<1);
 assert.ok(Math.abs(returned.windowEnd-first.windowEnd)<1);
 hit.fire('pointermove',{clientX:0,pointerId:9});
 assert.match(env.get('readout').textContent,/INTERPOLATED/);
 assert.notEqual(env.get('dot').style.display,'none',
  'An interpolated but valid edge has a real visible value');
});

test('an unobserved minute-level period does not fabricate a line or yellow zero-value marker',async()=>{
 const env=fixture();await settle();
 const farPast=Date.parse('2026-11-07T01:00:00Z');
 env.navigate({start:farPast,end:farPast+600000});
 assert.equal(env.get('raw-population').getAttribute('d'),'');
 assert.equal(env.get('population').getAttribute('d'),'');
 assert.match(env.get('readout').textContent,/NO DATA/);
 assert.equal(env.get('dot').style.display,'none',
  'NO DATA must not be drawn as a fake population value of zero');
});

test('legacy website-wide census is never shown as N\'Zoth population',async()=>{
  const env=fixture();await settle();
  assert.equal(env.get('online-now').textContent,'101');
  assert.ok(env.requests.some(url=>url.includes('/api/history?realm=nzoth')),
    'All Realms is allowed to retrieve the old Worker census until redeploy');
  const legacyCalls=env.requests.filter(url=>url.includes('/api/history?realm=nzoth')).length;
  env.get('server-select').fire('change',{target:{value:'nzoth'}});
  await settle();
  assert.equal(env.get('online-now').textContent,'NO DATA');
  assert.equal(env.requests.filter(url=>url.includes('/api/history?realm=nzoth')).length,legacyCalls,
    'The legacy census must only be read by All Realms, not by N\'Zoth');
});


test('All Realms shows continuously advancing N\'Zoth uptime even after 12 hours',async()=>{
 const env=fixture();await settle();
 assert.equal(env.get('uptime-label').textContent,"N'Zoth uptime");
 assert.equal(env.get('uptime-freshness').textContent,'Estimated');
 const original=env.get('uptime').textContent;
 assert.notEqual(original,'NO DATA');
 env.advance(13*3600000);
 const tick=env.intervals.get(1000)?.[0];
 assert.equal(typeof tick,'function');
 tick();
 assert.notEqual(env.get('uptime').textContent,'NO DATA');
 assert.notEqual(env.get('uptime').textContent,original);
 assert.equal(env.get('uptime-freshness').textContent,'Estimated');
});

test('a single unconfirmed DOWN report temporarily hides uptime, then recovery preserves its start',async()=>{
 const env=fixture();await settle();
 env.statusSamples.push({
  timestamp:'2026-11-08T00:59:00Z',website:'available',
  realms:{nzoth:'offline'}
 });
 await env.intervals.get(60000)?.[0]();await settle();
 assert.equal(env.get('uptime').textContent,'NO DATA');
 assert.match(env.get('uptime-freshness').textContent,/clock preserved/);
 env.setWorkerFailed(true);
 env.advance(600000);
 await env.intervals.get(60000)?.[0]();await settle();
 env.intervals.get(1000)?.[0]();
 assert.equal(env.get('uptime').textContent,'NO DATA','A gap is hidden without resetting uptime');
 env.setWorkerFailed(false);
 env.statusSamples.push({
  timestamp:'2026-11-08T01:10:00Z',website:'available',
  realms:{nzoth:'online'}
 });
 await env.intervals.get(60000)?.[0]();await settle();
 assert.equal(env.get('uptime').textContent,'1D 3H 10M 0S',
  'The 10-minute monitoring gap contributes to the original uptime');
 assert.equal(env.get('uptime-freshness').textContent,'Estimated');
});

test('explicit NO DATA gap displays NO DATA, then resumes the clock without losing time',async()=>{
 const env=fixture();await settle();
 env.statusSamples.push({
  timestamp:'2026-11-08T00:59:00Z',website:'available',realms:{nzoth:'online'}
 });
 await env.intervals.get(60000)?.[0]();await settle();
 assert.equal(env.get('uptime-freshness').textContent,'Estimated');
 env.advance(60000);
 env.statusSamples.push({
  timestamp:'2026-11-08T01:01:00Z',website:'available',realms:{nzoth:'unknown'}
 });
 await env.intervals.get(60000)?.[0]();await settle();
 assert.equal(env.get('uptime').textContent,'NO DATA');
 assert.equal(env.get('uptime-freshness').textContent,'Monitoring unavailable · clock preserved');
 env.advance(120000);
 env.statusSamples.push({
  timestamp:'2026-11-08T01:03:00Z',website:'available',realms:{nzoth:'online'}
 });
 await env.intervals.get(60000)?.[0]();await settle();
 assert.equal(env.get('uptime').textContent,'1D 3H 3M 0S');
 assert.equal(env.get('uptime-freshness').textContent,'Estimated');
});

test('two explicit N\'Zoth offline observations interrupt uptime until a fresh in-game reference',async()=>{
 const env=fixture();await settle();
 env.statusSamples.push(
  {timestamp:'2026-11-08T00:45:00Z',website:'available',realms:{nzoth:'offline'}},
  {timestamp:'2026-11-08T00:46:00Z',website:'available',realms:{nzoth:'offline'}}
 );
 await env.intervals.get(60000)?.[0]();await settle();
 assert.equal(env.get('uptime').textContent,'NO DATA');
 assert.equal(env.get('uptime-freshness').textContent,'Confirmed DOWN · new uptime reading needed');
 env.advance(60000);
 env.statusSamples.push({timestamp:'2026-11-08T01:01:00Z',website:'available',
  realms:{nzoth:'online'}});
 await env.intervals.get(60000)?.[0]();await settle();
 assert.equal(env.get('uptime').textContent,'NO DATA',
  'Confirmed downtime requires a new in-game uptime reference even after recovery');
});
