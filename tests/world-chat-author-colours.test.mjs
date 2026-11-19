import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classInfo} from '../docs/world-chat/lfg-catalog.mjs';
const js=readFileSync(new URL('../docs/world-chat/world-chat.js',import.meta.url),'utf8');
const source=js.slice(js.indexOf('function colourAuthor('),js.indexOf('function appendChatLine('));
const colour=new Function('classInfo',source+'\nreturn colourAuthor;')(classInfo);
test('known player classes use the existing LFG palette',()=>{
 for(const [classId,[,expected]] of Object.entries(classInfo)){
  const author={style:{}};
  colour(author,{author:'Example',classId:Number(classId)});
  assert.equal(author.style.color,expected);
 }
});
test('unresolved or GM authors retain existing styling',()=>{
 for(const row of [{author:'Example',classId:null},{author:'Unknown player',classId:1},{author:'Example',classId:6},{author:'GM',gm:true,classId:8}]){
  const author={style:{}};colour(author,row);assert.equal(author.style.color,undefined);
 }
});
test('shared author renderer applies colours to chat and recruitment listings',()=>{
 assert.match(js,/colourAuthor\(author,row\);\s*content\.append\(author\)/);
 assert.match(js,/colourAuthor\(author,row\);\s*const who=/);
});
