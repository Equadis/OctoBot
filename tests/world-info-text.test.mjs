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
  for(const word of ['No data','Awaiting data','Drop recorded','No raid','Estimated','Stale','Learning','Overdue','Not found'])
    assert.ok(js.includes(`'${word}'`)||html.includes(`>${word}<`),word);
  assert.match(js,/name: 'Pug'/);
});

test('loading states show trailing dots one at a time through CSS, never by changing the text',()=>{
  assert.match(css,/\.dots::after\{content:"\.\.\.";[^}]*overflow:hidden;[^}]*animation:loading-dots 1\.2s steps\(4,end\) infinite\}/);
  assert.match(css,/@keyframes loading-dots\{to\{width:1\.13em\}\}/);
  assert.match(css,/prefers-reduced-motion:reduce\)\{\.dots::after\{animation:none;width:auto\}/,'reduced motion shows all three dots');
  assert.match(html,/id="eom-current" class="dots">Loading</);
  assert.match(html,/id="source-status" class="source-label dots"[^>]*>Connecting to OctoMetrics</);
  assert.ok(!/Loading…|Connecting to OctoMetrics…|Checking rotation…/.test(html),'no typed ellipsis next to the animated dots');
  assert.match(js,/out\.textContent = 'Learning'; out\.classList\.add\('dots'\)/);
  assert.match(js,/out\.classList\.remove\('dots'\)/,'dots are removed as soon as the real value arrives');
});

test('the tracker group name PUG is shown as Pug, and dashes in titles are en dashes',()=>{
  assert.match(js,/function groupLabel\(name\) \{ return String\(name\)\.trim\(\)\.toUpperCase\(\) === 'PUG' \? 'Pug' : name; \}/);
  assert.ok(!/\\u2014|—/.test(js+html+css),'no em dashes on the World Info page');
});
