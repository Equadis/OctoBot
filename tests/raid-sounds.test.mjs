import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../docs/raid-sounds.js',import.meta.url),'utf8');

function load(storage={}){
  const players=[];
  class FakeAudio{
    constructor(src){this.src=src;this.volume=1;this.paused=false;this.currentTime=5;this.listeners={};players.push(this);}
    addEventListener(name,fn){this.listeners[name]=fn;}
    play(){return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const store={...storage};
  const window={};
  const context={window,Audio:FakeAudio,JSON,Math,Number,Object,Array,String,
    localStorage:{getItem:key=>store[key]??null,setItem:(key,value)=>{store[key]=String(value);}},document:{createElement:()=>({})}};
  vm.runInNewContext(script,context);
  return {sounds:window.RaidSounds,players,store};
}

test('sound alerts are off by default and nothing plays until they are turned on',()=>{
  const {sounds,players}=load();
  assert.equal(sounds.settings().enabled,false);
  assert.equal(sounds.notify('finished'),false);
  assert.equal(players.length,0);
});

test('fifteen sounds are available and every one points at the Wowhead sound server',()=>{
  const {sounds}=load();
  assert.equal(sounds.SOUNDS.length,15);
  assert.equal(new Set(sounds.SOUNDS.map(s=>s.id)).size,15);
  for(const s of sounds.SOUNDS)assert.match(s.file,/^\d+\/\d+\/[A-Za-z0-9_\-. ]+\.ogg$/);
});

test('a new sound cuts the one that is still playing short',()=>{
  const {sounds,players}=load();
  sounds.play('dragon-roar');
  sounds.play('war-horn');
  assert.equal(players.length,2);
  assert.equal(players[0].paused,true);          // the first sound was stopped
  assert.equal(players[0].currentTime,0);
  assert.equal(players[1].paused,false);         // the second is playing
  sounds.play('gong');
  assert.equal(players[1].paused,true);
  assert.equal(players[2].paused,false);
});

test('a sound that has already ended is not touched when the next one starts',()=>{
  const {sounds,players}=load();
  sounds.play('map-ping');
  players[0].listeners.ended();                  // finished on its own
  players[0].currentTime=99;
  sounds.play('gong');
  assert.equal(players[0].paused,false);
  assert.equal(players[0].currentTime,99);
});

test('the ending-soon alert is silent while it is unavailable, and an event that is switched off stays silent',()=>{
  const {sounds,players}=load({'octobot-raid-sounds':JSON.stringify({enabled:true,events:{finished:{on:false,sound:'gong'}}})});
  assert.equal(sounds.settings().enabled,true);
  assert.equal(sounds.notify('soon'),false);     // unavailable until the page says the confidence is high enough
  sounds.setAvailability('soon',true);
  assert.equal(sounds.notify('soon'),true);
  assert.equal(sounds.notify('finished'),false); // turned off by the visitor
  assert.equal(players.length,1);
});
