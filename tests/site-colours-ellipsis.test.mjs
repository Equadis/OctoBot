import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

const root=new URL('../docs/',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const theme=read('site-theme.css');

test('the three base colours are shared tokens with the specified values',()=>{
 assert.match(theme,/--bg-page:#101727;--bg-panel:#1b293c;--bg-control:#182333;/);
 assert.match(theme,/--panel:var\(--bg-panel\)/,'existing panel users follow the token');
 assert.match(theme,/background:var\(--bg-page\);color:#e5e9ef/);
});
test('pages no longer hard-code competing page, panel or control backgrounds',()=>{
 const files=execFileSync('git',['ls-files','docs'],{cwd:new URL('../',import.meta.url),encoding:'utf8'}).split('\n').filter(f=>/\.(css|html)$/.test(f)&&!/social|sim\/data/.test(f));
 const stale=/background(?:-color)?\s*:\s*(#171a21|#1f2b3b|#1e242e|#1b2029|#171c24|#202630|#252e3b)\b/i;
 for(const file of files){
  const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const match=text.match(stale);
  assert.ok(!match,`${file} still hard-codes ${match&&match[1]}`);
 }
 for(const page of ['population/index.html','status/index.html','sim/planner.css','outfitter/outfitter.css'])assert.match(read(page),/background:var\(--bg-page\)/,page);
 assert.match(read('population/index.html'),/\.chart-card\{background:var\(--bg-panel\)/);
 assert.match(read('world-chat/world-chat.css'),/\.chat-controls select\{background:var\(--bg-control\)/);
 assert.match(read('auction-house/auction.css'),/\.ah-filters input:not\(\[type=checkbox\]\),\.ah-filters select,\.ah-btn\{[^}]*background:var\(--bg-control\)/);
 assert.match(read('home.css'),/\.home-card\{[^}]*background:var\(--bg-panel\)/);
});
test('intentional state colours are untouched',()=>{
 assert.match(read('auction-house/auction.css'),/\.ah-btn\[aria-pressed=true\],\.ah-btn\[aria-expanded=true\]\{background:#3a3827/);
 assert.match(read('home.css'),/\.home-card:hover,\.home-card:focus-visible\{border-color:#9d8a35;background:#243346/);
 assert.match(read('world-info.css'),/\.state-tag\.online\{background:#1e3b33/);
});
test('the animated ellipsis is one shared 80 BPM animation: 4 frames of 750 ms, zero to three dots, no fading',()=>{
 assert.match(theme,/\.dots::after\{content:"\.\.\.";display:inline-block;white-space:nowrap;clip-path:inset\(0 100% 0 0\);animation:ellipsis-dots 3s step-end infinite\}/);
 const frames=[...theme.matchAll(/(\d+)%\{clip-path:inset\(0 ([\d.]+)%? 0 0\)\}/g)].map(m=>[Number(m[1]),Number(m[2])]);
 assert.deepEqual(frames,[[0,100],[25,66.6667],[50,33.3333],[75,0]],'none, one, two, three dots at even quarter points of a 3 s cycle');
 assert.equal(3000/frames.length,750);
 assert.match(theme,/prefers-reduced-motion:reduce\)\{\.dots::after\{animation:none;clip-path:none\}/);
 assert.doesNotMatch(theme.slice(theme.indexOf('@keyframes ellipsis-dots')),/opacity|ease|bounce|alternate/);
 const info=read('world-info.js');
 for(const word of ['Leaving','Learning','Overdue'])assert.match(info,new RegExp(`out\\.textContent = '${word}'; out\\.classList\\.add\\('dots'\\)`));
 assert.doesNotMatch(read('world-info.css'),/loading-dots/,'no second implementation');
});
