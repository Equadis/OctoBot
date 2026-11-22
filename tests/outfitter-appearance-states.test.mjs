import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stateKey,parseStates,stateNote,infoKind,NOTES} from '../docs/outfitter/appearance.mjs';

test('the states table is keyed by item and slot, with shields filed as off-hand items like the audit does',()=>{
  assert.equal(stateKey(55177,9),'55177:9');
  assert.equal(stateKey(1168,14),'1168:22');
  assert.equal(stateKey(1168,22),'1168:22');
});

test('only well-formed entries of the table are kept',()=>{
  const states=parseStates({version:1,items:{
    '55177:9':{state:'invisible',cause:'display-id-0',why:'The game client gives it display id 0.'},
    '3522:5':{state:'missing',why:'files are not in the client'},
    '1:5':{state:'incomplete',why:'no female texture',sexes:['female','robot']},
    'x:5':{state:'invisible',why:'bad key'},'2:5':{state:'estimated',why:'not a table state'},'3:5':{state:'missing'},'4:5':null}});
  assert.deepEqual([...states.keys()],['55177:9','3522:5','1:5']);
  assert.deepEqual(states.get('1:5').sexes,['female']);
  assert.equal(parseStates(null).size,0);assert.equal(parseStates({items:'no'}).size,0);assert.equal(parseStates('x').size,0);
});

test('every state has its own wording and the icon kind follows the first words of the note',()=>{
  const entry=(state,extra={})=>({state,why:'The reason',sexes:[],...extra});
  const notes={invisible:stateNote(entry('invisible')),missing:stateNote(entry('missing')),unresolved:stateNote(entry('unresolved')),incomplete:stateNote(entry('incomplete',{sexes:['female']}))};
  for(const [kind,note] of Object.entries(notes)){assert.equal(infoKind(note),kind,note);assert.match(note,/The reason\./);}
  assert.match(notes.invisible,/shows nothing, as the game does/);
  assert.match(notes.incomplete,/affects female characters/);
  assert.match(notes.missing,/no preview/i);
  assert.equal(infoKind(NOTES.name),'estimated');assert.equal(infoKind(NOTES.icon),'estimated');
  assert.equal(infoKind(NOTES.error),'error');assert.equal(infoKind(NOTES.legacy),'error');
  assert.equal(infoKind(NOTES.missing),'missing');assert.equal(infoKind(NOTES.unresolved),'unresolved');
});

test('the page asks the table before the appearance service, and shows a state only for the pairs in it',()=>{
  const js=readFileSync(new URL('../docs/outfitter/outfitter.mjs',import.meta.url),'utf8');
  assert.match(js,/appearanceStates\.get\(stateKey\(item\.id,slot\)\)/);
  assert.match(js,/known&&known\.state!=='incomplete'\)return \{slot,displayId:null,kind:known\.state,note:stateNote\(known\)\}/,'an exact answer skips the lookup and every estimate');
  assert.match(js,/note:known\?stateNote\(known\):''/,'an incomplete model keeps its model and gains its warning');
  assert.match(js,/info\.dataset\.kind=infoKind\(note\)/);
  assert.match(js,/meta\/octobot\/appearance-states\.json/);
  assert.match(js,/catch\{appearanceStates=new Map\(\);\}/,'a build without the table behaves as before');
});
