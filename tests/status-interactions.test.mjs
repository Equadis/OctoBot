/* Shared interaction regression tests for all time-series dashboards. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const js=readFileSync(join(root,'docs/chart-interactions.js'),'utf8');
const chartMath=readFileSync(join(root,'docs/chart-data.js'),'utf8');
const page=readFileSync(join(root,'docs/status.html'),'utf8');
const archive=readFileSync(join(root,'docs/status-archive.js'),'utf8');
const status=readFileSync(join(root,'docs/status-dashboard.js'),'utf8');

function setup(){
  const window={};
  new Function('window',chartMath)(window);
  new Function('window',js)(window);
  const handlers=new Map();
  let captured=false;
  const classes=new Set();
  const hit={
    addEventListener(name,handler){handlers.set(name,handler);},
    getBoundingClientRect(){return {left:100,width:800};},
    classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},
    setPointerCapture(){captured=true;},
    hasPointerCapture(){return captured;},
    releasePointerCapture(){captured=false;}
  };
  let view={start:20*3600000,end:44*3600000},limits={floor:0,now:100*3600000},hovered=0,left=0;
  const config={
    hit,
    range:()=>({...view}),
    bounds:()=>limits,
    navigate:next=>{view=next;},
    hover:()=>{hovered++;},
    leave:()=>{left++;}
  };
  window.OctoChartInteractions.attach(config);
  return {handlers,hit,classes,get view(){return view;},set view(v){view=v;},get bounds(){return limits;},set bounds(v){limits=v;},
    get hovered(){return hovered;},get left(){return left;},config};
}
function wheel(event,delta,opts={}){
  let prevented=false;
  event({clientX:500,deltaX:0,deltaY:delta,deltaMode:0,shiftKey:false,
    preventDefault(){prevented=true},...opts});
  assert.equal(prevented,true);
}

test('zoom follows Players online: mouse-centred, smooth and bounded',()=>{
  const s=setup(),old=s.view,handler=s.handlers.get('wheel');
  wheel(handler,-100);
  const current=s.view,midBefore=(old.start+old.end)/2,midAfter=(current.start+current.end)/2;
  assert.ok(current.end-current.start<old.end-old.start);
  assert.ok(Math.abs(midAfter-midBefore)<1);
  assert.ok(current.end-current.start>=600000);
  for(let i=0;i<100;i++)wheel(handler,-250);
  assert.ok(s.view.end-s.view.start>=600000);
});

test('Shift+scroll up moves left, down moves right, without zoom (deltaX included)',()=>{
  const s=setup(),before=s.view,handler=s.handlers.get('wheel');
  // Shift + wheel up has negative deltaY: move to earlier history.
  wheel(handler,-120,{shiftKey:true,deltaX:0});
  const earlier=s.view;
  assert.equal(earlier.end-earlier.start,before.end-before.start);
  assert.ok(earlier.start<before.start);
  // Browsers may remap Shift + wheel down to positive deltaX: move right.
  wheel(handler,120,{shiftKey:true,deltaX:120});
  assert.equal(s.view.end-s.view.start,before.end-before.start);
  assert.ok(s.view.start>earlier.start);
  const returned=s.view;
  // The opposite horizontal remapping also moves left.
  wheel(handler,-120,{shiftKey:true,deltaX:-120});
  assert.ok(s.view.start<returned.start);
  // Vertical wheel down, without a deltaX remapping, moves right again.
  const leftAgain=s.view;
  wheel(handler,120,{shiftKey:true,deltaX:0});
  assert.ok(s.view.start>leftAgain.start);
});

test('pointer drag pans without changing zoom and hover resumes afterwards',()=>{
  const s=setup(),before=s.view;
  const down=s.handlers.get('pointerdown'),move=s.handlers.get('pointermove');
  down({button:0,pointerId:9,clientX:500,preventDefault(){}});
  assert.equal(s.classes.has('is-panning'),true);
  move({pointerId:9,clientX:580});
  assert.ok(s.view.start<before.start);
  assert.equal(s.view.end-s.view.start,before.end-before.start);
  s.handlers.get('pointerup')({pointerId:9});
  assert.equal(s.classes.has('is-panning'),false);
  move({pointerId:9,clientX:580});
  assert.equal(s.hovered,1);
  s.handlers.get('pointerleave')();
  assert.ok(s.left>=2);
});

test('empty history is safe: no pan or zoom attempted',()=>{
  const s=setup();
  s.bounds={floor:NaN,now:NaN};
  const a=s.view;
  s.handlers.get('wheel')({clientX:500,deltaY:100,deltaX:0,deltaMode:0,
    shiftKey:false,preventDefault(){throw Error('Must not prevent page scroll on empty chart')}});
  assert.deepEqual(s.view,a);
});

test('all three charts use the shared navigation and identical plot styling',()=>{
  assert.match(page,/id="timeline-hit"/);
  assert.match(page,/id="latency-hit"/);
  assert.match(page,/id="archive-hit"/);
  assert.match(page,/id="latency-tooltip"/);
  assert.match(page,/id="archive-tooltip"/);
  assert.match(page,/id="archive-date-from"/);
  assert.match(page,/id="archive-date-to"/);
  assert.match(page,/chart-interactions\.js/);
  assert.match(status,/OctoChartInteractions\.attach\(\{\.\.\.shared,hit:\$\('timeline-hit'\)/);
  assert.match(status,/OctoChartInteractions\.attach\(\{\.\.\.shared,hit:\$\('latency-hit'\)/);
  assert.match(archive,/OctoChartInteractions\.attach\(/);
  assert.match(status,/function latencyInspection\(/);
  assert.match(archive,/function archiveInspection\(/);
});

test('Jump to present controls exist above Apply on both status timelines and preserve their range',()=>{
  assert.match(page,/id="jump-to-present"[^>]*>Jump to present →<\/button><button type="button" id="apply-dates">Apply<\/button>/);
  assert.match(page,/id="archive-jump-to-present"[^>]*>Jump to present →<\/button><button type="button" id="archive-apply-dates">Apply<\/button>/);
  assert.match(status,/changeRange\(D\.panRange\(viewStart,viewEnd,now-viewEnd,floor,now\)\)/);
  assert.match(status,/\$\('jump-to-present'\)\.disabled=period!=='CUSTOM'\|\|viewEnd>=Date\.now\(\)-30000/);
  assert.match(archive,/navigateArchive\(D\.panRange\(lower,upper,now-upper,floor,now\)\)/);
  assert.match(archive,/\$\('archive-jump-to-present'\)\.disabled=/);
});
