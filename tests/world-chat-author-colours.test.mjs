import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classInfo} from '../docs/world-chat/lfg-catalog.mjs';
const js=readFileSync(new URL('../docs/world-chat/world-chat.js',import.meta.url),'utf8');
const source=js.slice(js.indexOf('function colourAuthor('),js.indexOf('function appendChatLine('));
const profileSource=js.slice(js.indexOf('function refreshKnownClasses('),js.indexOf('function focusSignature('));
const knownClasses=new Map(),history={},feeds=["world","gm"],current={};
const playerKey=name=>String(name??"").trim().toLowerCase();
const {colourAuthor:colour,refreshKnownClasses}=new Function('classInfo','knownClasses','history','feeds','current','playerKey',profileSource+'\n'+source+'\nreturn {colourAuthor,refreshKnownClasses};')(classInfo,knownClasses,history,feeds,current,playerKey);
test('known player classes use the existing LFG palette',()=>{
 for(const [classId,[,expected]] of Object.entries(classInfo)){
  const author={style:{}};
  colour(author,{author:'Example',classId:Number(classId)});
  assert.equal(author.style.color,expected);
 }
});
test('unknown class uses poor-quality grey and GMs retain their style',()=>{
 for(const row of [{author:'Example',classId:null},{author:'Unknown player',classId:1},{author:'Example',classId:6}]){
  const author={style:{}};colour(author,row);assert.equal(author.style.color,'#9D9D9D');
 }
 const gm={style:{}};colour(gm,{author:'GM',gm:true,classId:8});assert.equal(gm.style.color,undefined);
});
test('historical author recolours as soon as a live profile is available',()=>{
 const row={author:'Example',classId:null},author={style:{}};
 colour(author,row);assert.equal(author.style.color,'#9D9D9D');
 current.world=[{author:'example',classId:8}];refreshKnownClasses();
 colour(author,row);assert.equal(author.style.color,classInfo[8][1]);
 assert.match(js,/function focusSignature\(row\).*resolvedClass\(row\)/);
 assert.match(js,/function reset\(\).*knownClasses\.clear\(\)/);
 knownClasses.clear();current.world=[];
});
test('shared author renderer applies colours to chat and recruitment listings',()=>{
 assert.match(js,/colourAuthor\(author,row\);\s*content\.append\(author\)/);
 assert.match(js,/colourAuthor\(author,row\);\s*const who=/);
});
