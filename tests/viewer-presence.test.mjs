import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../docs/viewer-presence.js',import.meta.url),'utf8');
test('viewer presence resolves root configuration from the shared script on every tab',async()=>{
 for(const page of ['index.html','status.html','sim/index.html']){
  const markup=readFileSync(new URL('../docs/'+page,import.meta.url),'utf8');
  const src=markup.match(/<script src="([^"]*viewer-presence\.js[^"]*)"/)[1];
  const pageUrl=new URL(page,'https://equadis.github.io/OctoBot/');
  const requests=[],count={},status={classList:{add(){},remove(){}}};
  const savedId='12345678-1234-1234-1234-123456789abc';
  vm.runInNewContext(script,{
   URL,AbortSignal,console,document:{currentScript:{src:new URL(src,pageUrl).href},visibilityState:'visible',
    getElementById:id=>id==='viewer-status'?status:count,addEventListener(){}},
   sessionStorage:{getItem:()=>savedId,setItem(){}},crypto:{randomUUID:()=>{throw Error('Session should be reused');}},
   setInterval(){},fetch:async(url,options)=>{
    requests.push({url,options});return {ok:true,json:async()=>options?.method==='POST'?{viewers:7}:{endpoint:'https://presence.example/'}};
   }
  });
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(requests[0].url,'https://equadis.github.io/OctoBot/telemetry.json');
  assert.equal(requests[1].url,'https://presence.example/api/presence/heartbeat');
  assert.equal(JSON.parse(requests[1].options.body).session_id,savedId);
  assert.equal(count.textContent,'7');
  assert.match(status.title,/DPS Sim/);
  for(const id of ['viewer-status','viewer-count'])assert.ok(markup.includes(`id="${id}"`));
 }
});


test('viewer count updates every five seconds without navigation and renews presence every thirty',async()=>{
 let now=100000,viewers=2,visible='visible',interval,timer,release;
 const events=new Map(),requests=[],count={},status={classList:{add(){},remove(){}}};
 const doc={currentScript:{src:'https://equadis.github.io/OctoBot/viewer-presence.js'},
  get visibilityState(){return visible},getElementById:id=>id==='viewer-status'?status:count,
  addEventListener:(name,fn)=>events.set(name,fn)};
 let fail=false,stall=false;
 vm.runInNewContext(script,{
  URL,AbortSignal,Date:{now:()=>now},console:{warn(){}},document:doc,
  sessionStorage:{getItem:()=> '12345678-1234-1234-1234-123456789abc',setItem(){}},
  setInterval:(fn,ms)=>{interval=ms;timer=fn;},fetch:async(url,options)=>{
   requests.push({url,options});
   if(url.endsWith('telemetry.json'))return {ok:true,json:async()=>({endpoint:'https://presence.example'})};
   if(stall)await new Promise(resolve=>{release=resolve});
   if(fail)throw Error('Temporary outage');
   return {ok:true,json:async()=>({viewers})};
  }
 });
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 await settle();
 assert.equal(count.textContent,'2');
 assert.equal(interval,5000);
 viewers=4;now+=5000;await timer();
 assert.equal(count.textContent,'4','Count changes while staying on the same page');
 assert.ok(requests.at(-1).url.endsWith('/api/presence/count'));
 assert.equal(requests.at(-1).options.method,'GET');
 assert.equal(requests.at(-1).options.cache,'no-store');
 assert.ok(requests.at(-1).options.signal,'Requests have a timeout signal');
 now+=25000;await timer();
 assert.ok(requests.at(-1).url.endsWith('/api/presence/heartbeat'));
 const before=requests.length;visible='hidden';await timer();
 assert.equal(requests.length,before,'Hidden tabs pause polling');
 visible='visible';viewers=6;events.get('visibilitychange')();await settle();
 assert.equal(count.textContent,'6');
 assert.equal(requests.at(-1).options.method,'POST','Returning immediately renews presence');
 fail=true;now+=5000;await timer();assert.equal(count.textContent,'—');
 fail=false;viewers=7;now+=5000;await timer();assert.equal(count.textContent,'7','Next poll recovers after failure');
 stall=true;now+=5000;const pending=timer();await settle();
 const pendingCount=requests.length;await timer();
 assert.equal(requests.length,pendingCount,'Requests cannot overlap');
 stall=false;release();await pending;
});
