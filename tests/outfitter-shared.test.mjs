import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addShared,removeShared,sanitiseShared,sharedAgo,SHARED_LIMIT} from '../docs/outfitter/shared.mjs';
import {emptyOutfit} from '../docs/outfitter/state.mjs';

const read=p=>readFileSync(new URL('../docs/outfitter/'+p,import.meta.url),'utf8');
const outfit=(head=100)=>({...emptyOutfit(),gear:{1:head}});
const link=head=>`https://example.test/outfitter/#outfit=${head}`;

test('sharing stores the name, outfit, link and time, newest first',()=>{
 let list=addShared([],{name:'  Raid set ',outfit:outfit(1),url:link(1)},1000);
 list=addShared(list,{name:'Second',outfit:outfit(2),url:link(2)},2000);
 assert.deepEqual(list.map(entry=>entry.name),['Second','Raid set']);
 assert.equal(list[1].sharedAt,1000);assert.equal(list[1].url,link(1));assert.deepEqual(list[1].outfit.gear,{1:1});
});
test('re-sharing an identical outfit moves and renames the existing entry instead of duplicating it',()=>{
 let list=addShared([],{name:'A',outfit:outfit(1),url:link(1)},1000);
 list=addShared(list,{name:'B',outfit:outfit(2),url:link(2)},2000);
 list=addShared(list,{name:'A renamed',outfit:outfit(1),url:link(1)},3000);
 assert.deepEqual(list.map(entry=>entry.name),['A renamed','B']);
 assert.equal(list[0].sharedAt,3000);
});
test('the list is capped and an entry can be removed without touching the others',()=>{
 let list=[];for(let i=1;i<=SHARED_LIMIT+5;i++)list=addShared(list,{name:`n${i}`,outfit:outfit(i),url:link(i)},i);
 assert.equal(list.length,SHARED_LIMIT);assert.equal(list[0].name,`n${SHARED_LIMIT+5}`);
 const next=removeShared(list,list[0]);assert.equal(next.length,SHARED_LIMIT-1);assert.ok(next.every(entry=>entry.name!==list[0].name));
});
test('stored data is validated when loaded and damaged entries are dropped',()=>{
 const good={name:'Ok',outfit:outfit(5),url:link(5),sharedAt:5};
 const loaded=sanitiseShared([good,{...good,name:''},{...good,url:'javascript:alert(1)'},{...good,sharedAt:'x'},null,'x',{...good,outfit:null}]);
 assert.equal(loaded.length,1);assert.equal(loaded[0].name,'Ok');
 assert.deepEqual(sanitiseShared('nope'),[]);
});
test('times read as short relative phrases',()=>{
 assert.equal(sharedAgo(1000,1000),'just now');assert.equal(sharedAgo(0,5*60000),'5 min ago');assert.equal(sharedAgo(0,3*3600000),'3 h ago');assert.equal(sharedAgo(0,86400000),'1 day ago');
});
test('Share opens a named dialog like Save, and Recently Shared sits directly below Saved',()=>{
 const html=read('index.html'),code=read('outfitter.mjs');
 assert.match(html,/<dialog id="share-dialog"><form id="share-form"><h2>Share outfit<\/h2><label for="share-name">Outfit name<\/label><input id="share-name" maxlength="80" required>[\s\S]*?id="cancel-share">Cancel<\/button><button type="submit">Share<\/button>/);
 assert.ok(html.indexOf('saved-outfits')<html.indexOf('shared-outfits'),'Recently Shared follows Saved');
 assert.match(html,/<\/section>\s*<section class="saved-panel panel shared-panel"/,'directly below the Saved section');
 assert.match(html,/Recently Shared/);
 assert.doesNotMatch(code,/\$\('share'\)\.onclick=\(\)=>copy\(/,'the old one-click share is gone');
});
test('the confirmation appears only after the clipboard write succeeds, and Cancel never adds an entry',()=>{
 const code=read('outfitter.mjs');
 const submit=code.slice(code.indexOf("$('share-form').onsubmit"),code.indexOf("$('import').onclick"));
 assert.ok(submit.indexOf('clipboard.writeText')<submit.indexOf("feedback('Link copied to clipboard')"));
 assert.match(submit,/if\(copied\)feedback\('Link copied to clipboard'\)/);
 assert.match(code,/\$\('cancel-share'\)\.onclick=\(\)=>\$\('share-dialog'\)\.close\(\)/);
 assert.match(code,/octobot-outfits-shared-v1/,'its own storage key, separate from Saved');
});
