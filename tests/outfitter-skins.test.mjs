import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visibleOptions,lookPairs,SKIN_CHOICE_FIRST} from '../docs/outfitter/customization.mjs';
import {emptyOutfit,normalise,encode,decode} from '../docs/outfitter/state.mjs';
import {parseCatalogue,compatibility,resolveSkin,filterSkins,categories,thumbnailFor,sanitiseSkinId,variantFor,bodyId,raceOfBody} from '../docs/outfitter/skins.mjs';

const variant=(gender,race,choiceId)=>({gender,body:bodyId(race,gender),choiceId});
const raw={version:1,skins:[
  {id:'skin-50291',name:'Mark of Fel Power',category:'Human',races:[1],genders:[0],tokenItemId:50291,status:'Recovered',mapping:{basis:'name+visual'},verification:{visual:'compared with the shop thumbnail by eye (not in game)'},missing:[],variants:[variant(0,1,9950011)],thumbnails:{'-':9900100}},
  {id:'skin-50106',name:'Mark of Necromancy I',category:'Human',races:[1],genders:[0,1],tokenItemId:50106,status:'Recovered',mapping:{basis:'visual'},verification:{visual:'none'},missing:[],variants:[variant(0,1,9950012),variant(1,1,9950013)],thumbnails:{_1:9900101,_2:9900102}},
  {id:'skin-50204',name:'Mark of the Wildhammer Clan I',category:'Dwarf',races:[3],genders:[0,1],tokenItemId:50204,status:'Partially Recovered',mapping:{basis:'ordinal'},verification:{visual:'none'},missing:['no female texture linked'],variants:[variant(0,3,9950020)],thumbnails:{}},
  {id:'skin-50207',name:'Mark of Blackrock Clan I',category:'Orc',races:[2],genders:[0],tokenItemId:50207,status:'Partially Recovered',mapping:{basis:null},verification:{visual:'none'},missing:[],variants:[],candidates:[{path:'x'}],thumbnails:{}},
  {id:'skin-u-1-0-humanmale_pirate',name:'Unlabelled skin: humanmale_pirate',category:'Human',races:[1],genders:[0],tokenItemId:null,status:'Partially Recovered',missing:['shop token (name) unknown'],variants:[variant(0,1,9950030)],thumbnails:{}},
  {id:'bad id',name:'x',variants:[]},
  {id:'skin-low',name:'Low choice',category:'Human',races:[1],variants:[{gender:0,body:1,choiceId:5}]},
]};
const skins=parseCatalogue(raw);

test('the catalogue keeps well-formed skins, drops malformed ones and variants that would shadow a library choice',()=>{
  assert.deepEqual(skins.map(s=>s.id),['skin-50291','skin-50106','skin-50204','skin-50207','skin-u-1-0-humanmale_pirate','skin-low']);
  assert.equal(skins.find(s=>s.id==='skin-low').variants.length,0);
  assert.equal(parseCatalogue(null).length,0);
  assert.equal(parseCatalogue({skins:'no'}).length,0);
  assert.equal(skins[0].variants[0].race,1);
});

test('body and race arithmetic round-trips for every race and sex',()=>{
  for(let race=1;race<=10;race++)for(const gender of [0,1])assert.equal(raceOfBody(bodyId(race,gender),gender),race);
});

test('skin ids are sanitised',()=>{
  assert.equal(sanitiseSkinId('skin-50291'),'skin-50291');
  assert.equal(sanitiseSkinId('skin-u-1-0-humanmale_pirate'),'skin-u-1-0-humanmale_pirate');
  for(const bad of ['', 'skin-', 'x-1', 'skin-<b>', 5, null, undefined, 'skin-'+'a'.repeat(81)])assert.equal(sanitiseSkinId(bad),null);
});

test('compatibility says why a skin cannot be worn and never substitutes another',()=>{
  const fel=skins[0],wild=skins[2],orc=skins[3];
  assert.equal(compatibility(fel,1,0).ok,true);
  assert.match(compatibility(fel,1,1).reason,/Only has a male look/);
  assert.match(compatibility(fel,2,0).reason,/Only for Human characters/);
  assert.match(compatibility(wild,3,1).reason,/Only has a male look for Dwarfs/);
  const unsupported=compatibility(orc,2,0);
  assert.equal(unsupported.ok,false);assert.equal(unsupported.unsupported,true);assert.match(unsupported.reason,/has not been identified/);
  assert.equal(compatibility(null,1,0).ok,false);
});

test('a saved skin resolves to the viewer choice for this body or is removed with a reason',()=>{
  assert.deepEqual({...resolveSkin(skins,'skin-50106',1,1),skin:undefined},{skin:undefined,choiceId:9950013,problem:''});
  assert.equal(resolveSkin(skins,'skin-50106',1,0).choiceId,9950012);
  const wrongBody=resolveSkin(skins,'skin-50291',1,1);
  assert.equal(wrongBody.choiceId,0);assert.match(wrongBody.problem,/Mark of Fel Power was removed/);
  assert.match(resolveSkin(skins,'skin-99999',1,0).problem,/not available/);
  assert.deepEqual(resolveSkin(skins,undefined,1,0),{skin:null,choiceId:0,problem:''});
});

test('filters search names, races and categories, hide unlabelled skins by default and honour "fits this character"',()=>{
  assert.deepEqual(filterSkins(skins,{race:1,gender:0}).map(s=>s.id),['skin-50291','skin-50106','skin-50207','skin-50204']);
  assert.ok(!filterSkins(skins,{race:1,gender:0}).some(s=>!s.labelled));
  assert.ok(filterSkins(skins,{race:1,gender:0,unlabelled:true}).some(s=>!s.labelled));
  assert.deepEqual(filterSkins(skins,{query:'wildhammer'}).map(s=>s.id),['skin-50204']);
  assert.deepEqual(filterSkins(skins,{query:'dwarf'}).map(s=>s.id),['skin-50204']);
  assert.deepEqual(filterSkins(skins,{category:'Orc'}).map(s=>s.id),['skin-50207']);
  assert.deepEqual(filterSkins(skins,{race:1,gender:1,compatibleOnly:true}).map(s=>s.id),['skin-50106']);
  assert.deepEqual(categories(skins).slice(0,3),['Human','Orc','Dwarf']);
});

test('the shop picture follows the body, with a sensible fallback',()=>{
  assert.equal(thumbnailFor(skins[1],0),9900101);
  assert.equal(thumbnailFor(skins[1],1),9900102);
  assert.equal(thumbnailFor(skins[0],1),9900100);
  assert.equal(thumbnailFor(skins[2],0),null);
});

const customization={Options:[
  {Id:9,Name:'Skin Color',OrderIndex:1,Choices:[{Id:5,OrderIndex:0},{Id:6,OrderIndex:1},{Id:9950011,Name:'Mark of Fel Power',OrderIndex:1000},{Id:9950012,Name:'Necro',OrderIndex:1001}]},
  {Id:10,Name:'Face',OrderIndex:2,Choices:[{Id:21,OrderIndex:0}]},
]};

test('skin choices stay out of the ordinary appearance list and are applied only by id',()=>{
  const options=visibleOptions(customization);
  assert.deepEqual(options[0].choices.map(c=>c.id),[5,6]);
  assert.deepEqual(options[0].skinChoiceIds,[9950011,9950012]);
  assert.deepEqual(options[1].skinChoiceIds,[]);
  assert.deepEqual(lookPairs(options,{}),[{optionId:9,choiceId:5},{optionId:10,choiceId:21}]);
  assert.deepEqual(lookPairs(options,{9:6},9950011),[{optionId:9,choiceId:9950011},{optionId:10,choiceId:21}]);
  assert.deepEqual(lookPairs(options,{9:6},4242),[{optionId:9,choiceId:6},{optionId:10,choiceId:21}],'an unknown skin choice is ignored, not substituted');
  assert.equal(SKIN_CHOICE_FIRST,9950000);
});

test('outfits keep a valid skin, old outfits have none, and links round-trip it',()=>{
  assert.equal('skin' in emptyOutfit(),false);
  assert.equal('skin' in normalise({race:1,gender:0,gear:{},look:{}}),false,'an outfit made before skins loads with the default appearance');
  assert.equal(normalise({race:1,skin:'skin-50291'}).skin,'skin-50291');
  assert.equal('skin' in normalise({race:1,skin:'<script>'}),false);
  const link=encode({...emptyOutfit(),race:3,skin:'skin-50204'});
  assert.equal(decode(link).skin,'skin-50204');
  assert.equal(decode(encode(emptyOutfit())).skin,undefined);
  assert.ok(!encode(emptyOutfit()).includes('skin'),'links without a skin are unchanged');
});

test('the page wires the skins panel and tells the old and new service apart',()=>{
  const html=readFileSync(new URL('../docs/outfitter/index.html',import.meta.url),'utf8');
  const source=readFileSync(new URL('../docs/outfitter/outfitter.mjs',import.meta.url),'utf8');
  for(const id of ['skin-row','skins-open','skin-clear','skins-dialog','skins-search','skins-category','skins-compatible','skins-unlabelled','skins-list','skins-default'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/id="skin-row"[^>]*hidden/,'the skin row stays hidden until the service lists skins');
  assert.match(source,/api\/outfitter\/skins/);
  assert.match(source,/was removed|reconcileSkin/);
});
