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
   URL,console,document:{currentScript:{src:new URL(src,pageUrl).href},visibilityState:'visible',
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
