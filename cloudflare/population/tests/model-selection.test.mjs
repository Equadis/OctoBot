import test from 'node:test';
import assert from 'node:assert/strict';
import {outfitter,assetRequest,resetOverlayCache} from '../src/outfitter.js';
import worker from '../src/index.js';

// Regression tests for the "Goblin still shows Zam's model" bug: the converted Goblin and High Elf must always come from the private bucket, never
// fall back to Zam, and every cache lifetime must let a rebuilt model set reach returning visitors.
const VERSION='0123456789abcdef',OTHER='fedcba9876543210';
const CHARACTERS={17:{Model:9000000,Character:{Race:9,Gender:0,ChrModelId:17}},18:{Model:9000100,Character:{Race:9,Gender:1,ChrModelId:18}},19:{Model:9000200,Character:{Race:10,Gender:0,ChrModelId:19}},20:{Model:9000300,Character:{Race:10,Gender:1,ChrModelId:20}}};
function bucketWith(extra={}) {
 const files=new Map([['version.json',JSON.stringify({version:VERSION})]]);
 for(const [id,record] of Object.entries(CHARACTERS)){files.set(`meta/character/${id}.json`,JSON.stringify(record));files.set(`meta/charactercustomization/${id}.json`,JSON.stringify({Options:[]}));files.set(`m2/${record.Model}.m2`,`M2-${id}`);}
 for(const [key,value] of Object.entries(extra))files.set(key,value);
 const calls=[];
 return {calls,files,get:async key=>{calls.push(key);return files.has(key)?{body:files.get(key)}:null;}};
}
const noNetwork=async()=>{throw Error('Unexpected request to Zam');};
const get=(path,env,fetcher=noNetwork)=>outfitter(new Request('https://api.test/api/outfitter/assets/'+path),fetcher,env);
test.beforeEach(()=>resetOverlayCache());

test('character ids 17 to 20 map to the converted Goblin and High Elf records and model files in the bucket',async()=>{
 const env={MODELS:bucketWith()};
 for(const [id,record] of Object.entries(CHARACTERS)) {
  const character=await (await get(`meta/character/${id}.json`,env)).json();
  assert.equal(character.Model,record.Model);assert.ok(character.Model>=9000000,'converted model ids start at 9,000,000');
  assert.equal(character.Character.Race,id<19?9:10);
  assert.equal(await (await get(`m2/${record.Model}.m2`,env)).text(),`M2-${id}`);
  assert.equal((await get(`meta/charactercustomization/${id}.json`,env)).status,200);
 }
});

test('a missing converted asset is an explicit error and never a silent fallback to Zam',async()=>{
 for(const missingKey of ['meta/character/17.json','meta/character/18.json','meta/character/19.json','meta/character/20.json','meta/charactercustomization/17.json']) {
  const bucket=bucketWith();bucket.files.delete(missingKey);
  const r=await get(missingKey,{MODELS:bucket});            // the fetcher throws if Zam is contacted
  assert.equal(r.status,503,missingKey);
  const body=await r.json();
  assert.equal(body.error,'models_unavailable');assert.match(body.message,/Goblin and High Elf models are not available/);
  assert.equal(r.headers.get('cache-control'),'no-store','an error must not be cached');
 }
 const bucket=bucketWith();bucket.files.delete('m2/9000000.m2');
 const file=await get('m2/9000000.m2',{MODELS:bucket});
 assert.equal(file.status,404);assert.equal((await file.json()).error,'model_file_missing');
 for(const id of [17,18,19,20]) assert.equal((await get(`meta/character/${id}.json`,{})).status,503,`no bucket bound, id ${id}`);
});

test('the eight original races are untouched: they come from Zam with the long lifetime, whether or not a bucket is bound',async()=>{
 for(const env of [{},{MODELS:bucketWith()}]) {
  for(let id=1;id<=16;id++) {
   const urls=[];
   const r=await get(`meta/character/${id}.json`,env,async url=>{urls.push(url);return new Response(`{"Model":${id}}`);});
   assert.equal(r.status,200,String(id));assert.equal((await r.json()).Model,id);
   assert.deepEqual(urls,[`https://wow.zamimg.com/modelviewer/classic/meta/character/${id}.json`]);
   assert.equal(r.headers.get('cache-control'),'public, max-age=604800');
  }
 }
});

test('the models-version route reports the build in the bucket, and null when there is none',async()=>{
 const r=await outfitter(new Request('https://api.test/api/outfitter/models-version'),noNetwork,{MODELS:bucketWith()});
 assert.deepEqual(await r.json(),{version:VERSION});
 assert.equal(r.headers.get('cache-control'),'public, max-age=60');
 for(const env of [{},{MODELS:{get:async()=>null}},{MODELS:{get:async()=>({body:'not json'})}},{MODELS:{get:async()=>({body:JSON.stringify({version:'../x'})})}}]) {
  resetOverlayCache();
  assert.deepEqual(await (await outfitter(new Request('https://api.test/api/outfitter/models-version'),noNetwork,env)).json(),{version:null});
 }
});

test('cache invalidation: a versioned URL naming the current build is cached for good, any other version is never cached, and a new build changes the URL',async()=>{
 const env={MODELS:bucketWith()};
 const current=await get(`v${VERSION}/meta/character/17.json`,env);
 assert.equal(current.headers.get('cache-control'),'public, max-age=31536000, immutable');
 assert.equal((await current.json()).Model,9000000);
 const stale=await get(`v${OTHER}/meta/character/17.json`,env);
 assert.equal(stale.status,200,'a stale page still works');
 assert.equal(stale.headers.get('cache-control'),'no-store','but its answer is never cached under a version we cannot vouch for');
 const unversioned=await get('meta/character/17.json',env);
 assert.equal(unversioned.headers.get('cache-control'),'public, max-age=60','old pages get a short lifetime for converted data');
 // The bucket is rebuilt: the version moves on, so the previous version stops being immutable and the new URL is what the site will request.
 const rebuilt=bucketWith({'version.json':JSON.stringify({version:OTHER}),'meta/character/17.json':JSON.stringify({Model:9000999})});
 resetOverlayCache();
 const next=await get(`v${OTHER}/meta/character/17.json`,{MODELS:rebuilt});
 assert.equal((await next.json()).Model,9000999);
 assert.equal(next.headers.get('cache-control'),'public, max-age=31536000, immutable');
 resetOverlayCache();
 assert.equal((await get(`v${VERSION}/meta/character/17.json`,{MODELS:rebuilt})).headers.get('cache-control'),'no-store');
});

test('versioned URLs reach the same assets: the prefix is stripped, Zam paths work, and malformed prefixes are not found',async()=>{
 assert.deepEqual(assetRequest('/api/outfitter/assets/v0123456789abcdef/meta/character/1.json'),{path:'meta/character/1.json',version:'0123456789abcdef'});
 assert.deepEqual(assetRequest('/api/outfitter/assets/meta/character/1.json'),{path:'meta/character/1.json',version:null});
 for(const bad of ['vXYZ/meta/character/1.json','v123/meta/character/1.json','v0123456789abcdef/index.html','v0123456789abcdef/../meta/character/1.json','v0123456789abcdef/v0123456789abcdef/meta/character/1.json'])
  assert.equal(assetRequest('/api/outfitter/assets/'+bad),null,bad);
 const urls=[];
 const r=await get(`v${VERSION}/m2/119940.m2`,{MODELS:bucketWith()},async url=>{urls.push(url);return new Response('ZAM');});
 assert.equal(await r.text(),'ZAM');assert.deepEqual(urls,['https://wow.zamimg.com/modelviewer/classic/m2/119940.m2']);
 assert.equal(r.headers.get('cache-control'),'public, max-age=31536000, immutable');
});

test('helm data follows the same rules: Zam data merged with the converted models, cached by version',async()=>{
 const env={MODELS:bucketWith({'helms.json':JSON.stringify({'31260':{'9:0':9500000}})})};
 const zam=async()=>new Response(JSON.stringify({ModelFiles:{'1':[]},Item:{HideGeosetMale:[],HideGeosetFemale:[]}}));
 const r=await get(`v${VERSION}/meta/armor/1/31260.json`,env,zam);
 assert.equal((await r.json()).ModelFiles['1'][0].FileDataId,9500000);
 assert.equal(r.headers.get('cache-control'),'public, max-age=31536000, immutable');
 assert.equal((await get('meta/armor/1/31260.json',env,zam)).headers.get('cache-control'),'public, max-age=60');
});

test('the deployed worker entry point passes its bucket through for versioned requests',async()=>{
 const env={MODELS:bucketWith()};
 const r=await worker.fetch(new Request(`https://api.test/api/outfitter/assets/v${VERSION}/meta/character/20.json`),env);
 assert.equal((await r.json()).Model,9000300);
 const version=await worker.fetch(new Request('https://api.test/api/outfitter/models-version'),env);
 assert.deepEqual(await version.json(),{version:VERSION});
});
