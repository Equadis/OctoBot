/* Node-only regression test: the historical archive must render with real DOM IDs.
 * Prevents a missing element from being misreported as an unavailable database.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const root=join(import.meta.dirname,'..');
const html=readFileSync(join(root,'docs/status.html'),'utf8');
const script=readFileSync(join(root,'docs/status-archive.js'),'utf8');

function element(tag='div'){
  const n={tag,children:[],attributes:{},textContent:'',hidden:false,value:'',style:{},
    classList:{add(){},remove(){}},
    setAttribute(key,value){this.attributes[key]=String(value);},
    append(...nodes){this.children.push(...nodes);},
    replaceChildren(...nodes){this.children=[...nodes];},
    addEventListener(type,fn){this['on'+type]=fn;},
    querySelectorAll(){return this.children;},
    querySelector(){return element();},
    getBoundingClientRect(){return {width:920,left:0};},
    closest(){return {getBoundingClientRect(){return {width:1000,left:0};},
      querySelector(){return element()}};},
    scrollIntoView(){}};
  n.parentElement={querySelector(){return element()}};
  return n;
}

test('archived monitoring chart, calendar and incidents render after import',async()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  const nodes=new Map(),errors=[],events=[],attached=[];
  const document={
    getElementById(id){
      if(!ids.has(id))return null; // mimic real DOM, never auto-create missing nodes
      if(!nodes.has(id))nodes.set(id,element());
      return nodes.get(id);
    },
    createElement:tag=>element(tag),
    createElementNS:(_namespace,tag)=>element(tag)
  };
  const fixture={
    schema:1,source:'octobot_database',exported_at:'2026-11-07T15:52:32Z',
    service:[
      {start:'2026-10-09T11:41:10Z',end:'2026-11-04T08:31:02Z',status:'online'},
      {start:'2026-11-04T08:31:02Z',end:'2026-11-04T08:32:38Z',status:'partial'},
      {start:'2026-11-04T08:32:38Z',end:'2026-11-07T15:52:32Z',status:'online'}
    ],
    realms:{nzoth:[],yshaarj:[],cthun:[]},
    tcp:[{start:'2026-11-01T11:00:00Z',end:'2026-11-07T15:52:32Z',status:'reachable'}],
    auth:[{start:'2026-11-01T11:00:00Z',end:'2026-11-07T15:52:32Z',status:'responsive'}],
    incidents:Array.from({length:31},()=>({kind:'official',
      start:'2026-11-04T08:31:02Z',end:'2026-11-04T08:32:38Z',status:'partial'}))
  };
  const window={OctoBotHistoricCalendarActive:false,
    OctoChartInteractions:{attach(cfg){attached.push(cfg);}},
    dispatchEvent(e){events.push(e);}};
  const CustomEvent=function(type,{detail}){this.type=type;this.detail=detail;};
  const fetch=async()=>({ok:true,json:async()=>fixture});
  const console={error:(...args)=>errors.push(args.join(' '))};
  new Function('document','window','CustomEvent','fetch','console',script)(
    document,window,CustomEvent,fetch,console);
  await new Promise(resolve=>setImmediate(resolve));
  const $=id=>document.getElementById(id);
  assert.deepEqual(errors,[]);
  assert.match($('archive-note').textContent,/Imported from the original bot database/);
  assert.match($('archive-view-label').textContent,/bot-confirmed history/);
  assert.match($('archive-readout').textContent,/recorded uptime/);
  assert.equal($('archive-content').hidden,false);
  assert.equal($('archive-empty').hidden,true);
  assert.equal($('calendar').children.length,90);
  assert.equal($('archive-incidents').children.length,13); // 12 + Show all
  assert.equal(events.length,1);
  assert.equal(events[0].type,'octobot:archive-ready');
  assert.ok(Number.isFinite(events[0].detail.windows[30].uptime));
  assert.equal(window.OctoBotHistoricCalendarActive,true);
  assert.equal(attached.length,1);
  assert.equal(attached[0].hit,$('archive-hit'));
  assert.equal($('archive-ranges').children.length,5);
  assert.ok($('archive-bars').children.length>0);
  assert.match($('archive-view-label').textContent,/1M/);

  // Hover an original confirmed period. A missing tooltip/DOM element must fail.
  attached[0].hover({clientX:460});
  assert.equal($('archive-tooltip').hidden,false);
  assert.match($('archive-readout').textContent,/recorded/);
  attached[0].leave();
  assert.equal($('archive-tooltip').hidden,true);

  // Date navigation and custom zoom must share the same underlying range.
  const end=Date.parse('2026-11-07T15:52:32Z');
  attached[0].navigate({start:end-86400000,end});
  assert.match($('archive-view-label').textContent,/Custom range/);
  assert.equal($('archive-date-to').value,'2026-11-07');
  assert.ok($('archive-bars').children.length>0);

  // Metric switching should re-bound the chart, without missing-data invention.
  $('archive-signal').onchange({target:{value:'auth'}});
  assert.match($('archive-view-label').textContent,/Authentication/);
  assert.ok($('archive-bars').children.length>0);
});
