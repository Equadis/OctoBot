import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=join(import.meta.dirname,'..');
const code=readFileSync(join(root,'docs/chart-data.js'),'utf8');
const window={};
new Function('window',code)(window);
const D=window.PopulationData;
const MINUTE=60000;
const epoch=Date.parse('2026-11-03T02:00:00Z');
const reading=(minute,value=1300+minute)=>({t:epoch+minute*MINUTE,value});
const source=Array.from({length:61},(_,n)=>reading(n));

test('10-minute window preserves continuous recorded and smoothed curves at both exact boundaries',()=>{
 const start=epoch+12.5*MINUTE,end=start+10*MINUTE;
 const visible=D.visibleSeries(source,start,end,45000);
 assert.equal(visible.recorded.length,1);
 assert.equal(visible.smoothed.length,1);
 const raw=visible.recorded[0],smoothed=visible.smoothed[0];
 assert.equal(raw[0].t,start);
 assert.equal(raw.at(-1).t,end);
 assert.equal(smoothed[0].t,start);
 assert.equal(smoothed.at(-1).t,end);
 assert.equal(raw[0].value,1312.5);
 assert.equal(raw.at(-1).value,1322.5);
 assert.ok(raw.some(p=>p.t===epoch+13*MINUTE),'Interior recorded samples cannot disappear');
 assert.ok(raw.every(p=>p.t>=start&&p.t<=end));
 assert.ok(smoothed.every(p=>p.t>=start&&p.t<=end));
 assert.equal((raw[0].t-start)/(end-start),0);
 assert.equal((raw.at(-1).t-start)/(end-start),1);
});

test('isolated real observations stay visible; do not connect genuinely missing data',()=>{
 const rows=[reading(0,100),reading(1,110),reading(13,125),reading(14,130),
  reading(40,180)];
 const start=epoch+30000,end=epoch+14.5*MINUTE;
 const visible=D.visibleSeries(rows,start,end,45000);
 assert.equal(visible.recorded.length,2,'Gap longer than ten minutes must split the path');
 assert.equal(visible.recorded[0][0].t,start);
 assert.equal(visible.recorded[0].at(-1).t,epoch+MINUTE);
 assert.equal(visible.recorded[1][0].t,epoch+13*MINUTE);
 assert.equal(visible.recorded[1].at(-1).t,epoch+14*MINUTE);
 assert.equal(D.at(rows,epoch+7*MINUTE),null);
 assert.ok(D.intervals(rows,start,end).estimated.length>0,
  'Long missing intervals remain distinct from recorded population data');
 const isolated=D.visibleSeries([reading(10,999)],epoch+9*MINUTE,epoch+11*MINUTE,45000);
 assert.equal(isolated.recorded.length,1);
 assert.equal(isolated.recorded[0].length,1);
 assert.equal(isolated.recorded[0][0].value,999);
 const outside=D.visibleSeries([reading(10,999)],epoch+12*MINUTE,epoch+22*MINUTE,45000);
 assert.equal(outside.recorded.length,0,'No extrapolation past a single reading');
});

test('actual Nov 3 population history in screenshot renders all the way across a 10-minute window',()=>{
 const actual=D.normalise(JSON.parse(readFileSync(join(root,'docs/online-history.json'),'utf8')));
 const start=Date.parse('2026-11-03T02:12:30Z'),end=start+10*MINUTE;
 const visible=D.visibleSeries(actual,start,end,45000);
 assert.equal(visible.recorded.length,1,'Actual 10-minute period has continuous observations');
 assert.equal(visible.recorded[0][0].t,start);
 assert.equal(visible.recorded[0].at(-1).t,end);
 assert.equal(visible.smoothed[0][0].t,start);
 assert.equal(visible.smoothed[0].at(-1).t,end);
 for(const time of ['2026-11-03T02:13:18.536Z','2026-11-03T02:17:38.968Z',
                    '2026-11-03T02:22:01.773Z']){
  const t=Date.parse(time);
  const row=actual.find(x=>x.t===t);
  assert.ok(visible.recorded[0].some(x=>x.t===t&&x.value===row.value),
   'Exact observed timestamp must be represented in the visible path: '+time);
 }
 assert.ok(Math.abs(visible.recorded[0][0].value-D.at(actual,start))<1e-8);
 assert.ok(Math.abs(visible.recorded[0].at(-1).value-D.at(actual,end))<1e-8);
});

test('repeated 10-minute panning has proportional movement and reversible offsets without edge gaps',()=>{
 const min=epoch,max=epoch+60*MINUTE;
 let windowStart=epoch+20*MINUTE,windowEnd=windowStart+10*MINUTE;
 const initial={start:windowStart,end:windowEnd};
 const shift=D.wheelPanOffset(0,35,1,windowEnd-windowStart);
 assert.ok(shift>0&&shift<2*MINUTE);
 for(let i=0;i<30;i++){
  const previous=windowStart;
  const result=D.panRange(windowStart,windowEnd,-shift,min,max);
  windowStart=result.start;windowEnd=result.end;
  assert.ok(Math.abs(windowStart-previous+shift)<0.01);
  assert.equal(windowEnd-windowStart,10*MINUTE);
  const v=D.visibleSeries(source,windowStart,windowEnd,45000);
  assert.equal(v.recorded.length,1);
  assert.ok(Math.abs(v.recorded[0][0].t-windowStart)<0.01);
  assert.ok(Math.abs(v.recorded[0].at(-1).t-windowEnd)<0.01);
 }
 for(let i=0;i<30;i++){
  const result=D.panRange(windowStart,windowEnd,shift,min,max);
  windowStart=result.start;windowEnd=result.end;
 }
 assert.ok(Math.abs(windowStart-initial.start)<0.01);
 assert.ok(Math.abs(windowEnd-initial.end)<0.01);
});

test('Shift-wheel remapping and huge deltas never jump to the wrong boundary',()=>{
 const span=10*MINUTE;
 for(const unit of [1,16,800]){
  const up=D.wheelPanOffset(-120,0,unit,span),down=D.wheelPanOffset(120,0,unit,span);
  assert.ok(up<0&&down>0);
  assert.equal(up,-down);
  assert.ok(Math.abs(up)<=span*.3);
  assert.equal(D.wheelPanOffset(999999,0,unit,span),span*.3);
  assert.equal(D.wheelPanOffset(-999999,0,unit,span),-span*.3);
 }
 assert.equal(D.wheelPanOffset(0,0,1,span),0);
});

test('cursor-anchored zoom keeps the timestamp beneath left, middle and right positions',()=>{
 const original={start:epoch+15*MINUTE,end:epoch+45*MINUTE},min=epoch,max=epoch+60*MINUTE;
 for(const ratio of [0,.5,1]){
  const oldTime=original.start+(original.end-original.start)*ratio;
  const result=D.zoomRange(original.start,original.end,ratio,-120,min,max);
  const newTime=result.start+(result.end-result.start)*ratio;
  assert.ok(Math.abs(oldTime-newTime)<1);
  assert.ok(result.end-result.start<original.end-original.start);
  assert.ok(result.end-result.start>=D.MIN_VIEW_MS);
 }
 let current=original;
 for(let i=0;i<80;i++)current=D.zoomRange(current.start,current.end,.5,-250,min,max);
 assert.ok(current.end-current.start>=D.MIN_VIEW_MS);
});

test('projected series is realm agnostic and never manufactures missing realm data',()=>{
 const realms={
  all:source,
  nzoth:Array.from({length:16},(_,i)=>reading(i,100+i)),
  yshaarj:[reading(0,20),reading(1,21),reading(2,22)],
  cthun:[]
 };
 for(const [id,entries] of Object.entries(realms)){
  const result=D.visibleSeries(entries,epoch,epoch+2*MINUTE,45000);
  if(id==='cthun')assert.equal(result.recorded.length,0);
  else assert.ok(result.recorded.length>0);
  assert.ok(result.recorded.flat().every(x=>entries.some(y=>y.value===x.value) ||
   Number.isFinite(D.at(entries,x.t))),
   'Clipped/interpolated values must derive from real observations, '+id);
 }
});
