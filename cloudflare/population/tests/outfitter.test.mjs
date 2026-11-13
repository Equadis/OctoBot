import test from 'node:test';
import assert from 'node:assert/strict';
import {assetPath,parseDisplayId,outfitter} from '../src/outfitter.js';
import worker from '../src/index.js';
test('appearance proxy accepts only model data and textures at the fixed origin',()=>{
 for(const path of ['meta/character/1.json','meta/charactercustomization/1.json','meta/armor/1/31260.json','meta/item/123.json','mo3/119940.mo3','textures/123.webp','bone/123.bone'])assert.equal(assetPath('/api/outfitter/assets/'+path),path);
 for(const path of ['https://evil.test/a','../../secrets','meta/character/1.json/../x','viewer/viewer.min.js','textures/x.svg','meta/character/1.json?url=https://evil.test'])assert.equal(assetPath('/api/outfitter/assets/'+path),null);
 assert.equal(parseDisplayId('<div>Display ID: 31260</div>'),31260);
 assert.throws(()=>parseDisplayId('<html>item not found</html>'));
});
test('item lookup fetches only the OctoWoW item page and returns its display ID',async()=>{
 let upstream;
 const response=await outfitter(new Request('https://api.test/api/outfitter/item/16866'),async(url,options)=>{upstream=url;assert.equal(options.redirect,'manual');return new Response('<div>Display ID: 31260</div>');});
 assert.equal(upstream,'https://octowow.st/db/?item=16866');
 assert.equal((await response.json()).displayId,31260);
 assert.equal(response.headers.get('access-control-allow-origin'),'*');
});
test('assets stream with correct types; missing custom appearances are explicit',async()=>{
 const request=new Request('https://api.test/api/outfitter/assets/meta/armor/1/31260.json');
 const response=await outfitter(request,async(url,options)=>{assert.equal(options.redirect,'manual');assert.equal(url,'https://wow.zamimg.com/modelviewer/classic/meta/armor/1/31260.json');return new Response('{"Model":1}');});
 assert.equal(response.headers.get('content-type'),'application/json');
 assert.equal(await response.text(),'{"Model":1}');
 const missing=await outfitter(request,async()=>new Response('',{status:403}));assert.equal(missing.status,404);
});
test('invalid proxy paths never make an upstream request and work without D1',async()=>{
 const fail=()=>{throw Error('Unexpected network access');};
 for(const path of ['/api/outfitter/item/0','/api/outfitter/item/1000001','/api/outfitter/assets/anything.html']){const r=await outfitter(new Request('https://api.test'+path),fail);assert.ok(r.status>=400);}
 const r=await worker.fetch(new Request('https://api.test/api/outfitter/nope'),{});assert.equal(r.status,404);
});

test('upstream redirects are rejected without following their destination',async()=>{
 for(const path of ['/api/outfitter/item/16866','/api/outfitter/assets/meta/character/1.json']){
  let calls=0;
  const response=await outfitter(new Request('https://api.test'+path),async(url,options)=>{
   calls++;assert.equal(options.redirect,'manual');
   return new Response(null,{status:302,headers:{location:'https://unexpected.test/'}});
  });
  assert.equal(response.status,502);assert.equal(calls,1);
 }
});
