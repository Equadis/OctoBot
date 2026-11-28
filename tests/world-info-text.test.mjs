import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const js=read('world-info.js'),css=read('world-info.css'),html=read('world-info/index.html');

test('status words and tags are in proper case, not all capitals',()=>{
  const literals=[...js.matchAll(/'([A-Z][A-Z' \/]+)'/g)].map(m=>m[1].trim()).filter(s=>/[A-Z]{2,}/.test(s));
  // Only abbreviations and the group name the tracker sends may stay upper case in the script.
  const allowed=new Set(['PUG','N/A','HTTP','UTC']);
  assert.deepEqual(literals.filter(s=>!allowed.has(s)),[]);
  const tags=[...html.matchAll(/class="(?:state-tag|eyebrow)[^"]*"[^>]*>([^<]+)</g)].map(m=>m[1].trim());
  assert.ok(tags.length>=6);
  for(const t of tags)assert.notEqual(t,t.toUpperCase(),'all-caps tag in the page: '+t);
  for(const word of ['No data','Awaiting data','Drop recorded','No raid','Estimated','Stale','Learning','Overdue','Unconfirmed'])
    assert.ok(js.includes(`'${word}'`)||html.includes(`>${word}<`),word);
  assert.match(js,/name: 'Pug'/);
});

test('loading states show trailing dots one at a time through CSS, never by changing the text',()=>{
  const theme=readFileSync(new URL('../docs/site-theme.css',import.meta.url),'utf8');
  // One shared animation: four 750 ms frames (80 BPM), zero to three dots, no fading, space for all three dots always reserved.
  assert.match(theme,/\.dots::after\{content:"\.\.\.";display:inline-block;white-space:nowrap;clip-path:inset\(0 100% 0 0\);animation:ellipsis-dots 3s step-end infinite\}/);
  assert.match(theme,/@keyframes ellipsis-dots\{0%\{clip-path:inset\(0 100% 0 0\)\}25%\{clip-path:inset\(0 66\.6667% 0 0\)\}50%\{clip-path:inset\(0 33\.3333% 0 0\)\}75%\{clip-path:inset\(0 0 0 0\)\}\}/);
  assert.doesNotMatch(theme.slice(theme.indexOf('@keyframes ellipsis-dots')),/opacity/,'no fading or pulsing');
  assert.match(theme,/prefers-reduced-motion:reduce\)\{\.dots::after\{animation:none;clip-path:none\}/,'reduced motion shows all three dots');
  assert.doesNotMatch(css,/loading-dots/,'the old page-local animation is gone');
  assert.match(js,/out\.textContent = 'Leaving'; out\.classList\.add\('dots'\)/);
  assert.match(html,/id="eom-current">Loading</,'the boss loads without animated dots');
  assert.match(html,/id="eom-current-until">Checking rotation</,'the UTC line does not animate');
  assert.doesNotMatch(html,/id="eom-current-until"[^>]*class="dots"/);
  assert.match(html,/id="source-status" class="source-label dots"[^>]*>Connecting to OctoMetrics</);
  assert.ok(!/Loading…|Connecting to OctoMetrics…|Checking rotation…/.test(html),'no typed ellipsis next to the animated dots');
  assert.match(js,/out\.textContent = 'Learning'; out\.classList\.add\('dots'\)/);
  assert.match(js,/out\.classList\.remove\('dots'\)/,'dots are removed as soon as the real value arrives');
});

test('Edge of Madness countdown switches green at 7 days, yellow at 1 day and red below 1 day',()=>{
  assert.match(js,/timeLeft >= 7 \* DAY \? 'rotation-safe' : timeLeft >= DAY \? 'rotation-week' : 'rotation-soon'/);
  assert.match(js,/countdown\.classList\.remove\('rotation-safe', 'rotation-week', 'rotation-soon'\)/);
  assert.match(js,/if \(Number\.isFinite\(timeLeft\) && timeLeft > 0\)/,'unavailable or expired data is not shown as urgent');
  for(const [tone,colour] of Object.entries({'rotation-safe':'#78dfa6','rotation-week':'#ffd100','rotation-soon':'#ff6b5e'}))
    assert.ok(css.includes('.zg-panel #eom-countdown.'+tone+'{color:'+colour+'}'),tone+' has the expected colour');
  assert.match(js,/setInterval\(renderLive, 1000\)/,'countdown transitions are recomputed each second');
});

test('only guild labels are bold inside angle brackets; Pugs remain plain',()=>{
  assert.match(js,/function setRaidTitle\(node, label, guild\)/);
  assert.match(js,/bold\.className = 'raid-guild'/);
  assert.match(js,/bold\.textContent = name/,'guild text is safely assigned, not parsed as HTML');
  assert.match(js,/setRaidTitle\(title, session\.id !== null/);
  assert.match(css,/\.timer-row span strong\.raid-guild\{color:inherit;font-size:inherit;font-weight:700/,'guild text does not inherit the timer font size');
});

test('the tracker group name PUG is shown as Pug, and dashes in titles are en dashes',()=>{
  assert.match(js,/function groupLabel\(name\) \{ return String\(name\)\.trim\(\)\.toUpperCase\(\) === 'PUG' \? 'Pug' : name; \}/);
  assert.ok(!/\\u2014|—/.test(js+html+css),'no em dashes on the World Info page');
});

test('Darkmoon Faire derives location only from fresh observed NPC sightings',()=>{
 assert.doesNotMatch(js,/MANUAL_DMF|Set manually until/);
 assert.match(js,/darkmoon: object\(realm\.darkmoon\)/,'per-realm summary includes the DMF observation feed');
 assert.match(js,/dmf\.latestConfirmed/);
 assert.match(js,/found\.fresh === true/);
 assert.match(js,/Elwynn observer:/);
 assert.match(js,/Mulgore observer:/);
 assert.match(html,/id="dmf-heading">Location unconfirmed/);
 assert.doesNotMatch(html,/Faire is moving and in neither location/,'silence is not evidence of absence');
});
