import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const docs=new URL('../docs/',import.meta.url);
const source=readFileSync(new URL('icon-fallback.js',docs),'utf8');
const {fallbackFor,onError}=(()=>{const module={exports:{}};vm.runInNewContext(source,{module,window:undefined,document:undefined});return module.exports;})();
const CDN=n=>`https://wow.zamimg.com/images/wow/icons/large/${n}.jpg`;
const fakeImg=src=>({tagName:'IMG',src,currentSrc:src,dataset:{}});
const fakeEvent=target=>({target,stopped:false,stopImmediatePropagation(){this.stopped=true;}});

test('a missing Wowhead CDN icon maps to the OctoWoW database PNG of the same name and size',()=>{
  assert.equal(fallbackFor(CDN('inv_tenhead_v3')),'https://octowow.st/db/images/icons/large/inv_tenhead_v3.png');
  assert.equal(fallbackFor('https://wow.zamimg.com/images/wow/icons/medium/INV_Helmet_69.jpg'),'https://octowow.st/db/images/icons/medium/inv_helmet_69.png');
  assert.equal(fallbackFor('https://wow.zamimg.com/images/wow/icons/tiny/x_1.jpg'),'https://octowow.st/db/images/icons/small/x_1.png');
});
test('only Wowhead CDN icon URLs are rewritten, never anything else',()=>{
  for(const url of ['https://evil.example/images/wow/icons/large/a.jpg','https://wow.zamimg.com/images/wow/icons/large/../../x.jpg','https://wow.zamimg.com/images/wow/icons/large/a.png','https://octowow.st/db/images/icons/large/a.png','data:image/png;base64,AAAA','',null,undefined])
    assert.equal(fallbackFor(url),null,String(url));
});
test('the first failure retries from the OctoWoW database and hides the error from the page; the second is left to the page',()=>{
  const img=fakeImg(CDN('inv_tenhead_v3'));
  const first=fakeEvent(img);onError(first);
  assert.equal(img.src,'https://octowow.st/db/images/icons/large/inv_tenhead_v3.png');
  assert.equal(first.stopped,true,'a page handler that clears the image must not run for a recoverable failure');
  const second=fakeEvent(img);onError(second);
  assert.equal(second.stopped,false,'if the fallback also fails the page handles it as before');
  assert.equal(img.src,'https://octowow.st/db/images/icons/large/inv_tenhead_v3.png','no retry loop');
});
test('errors on other elements or other images are ignored',()=>{
  for(const target of [{tagName:'SCRIPT',src:CDN('a'),dataset:{}},fakeImg('https://example.com/a.jpg'),null]){
    const e=fakeEvent(target);onError(e);assert.equal(e.stopped,false);
  }
});
test('the Dressing Room and Gear Planner load the fallback as a plain script (it runs before any deferred module creates icons)',()=>{
  for(const page of ['outfitter/index.html','sim/index.html']){
    const html=readFileSync(new URL(page,docs),'utf8');
    assert.match(html,/<script src="\.\.\/icon-fallback\.js\?v=1"><\/script>/,page);
  }
  const ah=readFileSync(new URL('auction-house/index.html',docs),'utf8');
  if(ah.includes('icon-fallback.js'))assert.match(ah,/<script src="\.\.\/icon-fallback\.js\?v=1"><\/script>/);
});
