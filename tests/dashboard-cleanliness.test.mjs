import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const docs=join(import.meta.dirname,'../docs');
const read=path=>readFileSync(join(docs,path),'utf8');
const population=read('index.html'),status=read('status.html');
const popScript=population.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const probeScript=read('status-dashboard.js'),archiveScript=read('status-archive.js');

test('both dashboards keep core controls, data and hover details',()=>{
 for(const id of ['server-select','plot-hit','tooltip','population','raw-population','estimate-path'])
  assert.match(population,new RegExp('id="'+id+'"'));
 for(const id of ['timeline-hit','timeline-gaps','tooltip','latency-hit','latency-gaps',
                   'latency-tooltip','archive-hit','archive-missing','archive-tooltip',
                   'ranges','calendar','uptime-24'])
  assert.match(status,new RegExp('id="'+id+'"'));
 assert.match(popScript,/D\.estimateAt/);
 assert.match(probeScript,/availability\('overall'/);
 assert.match(archiveScript,/archiveInspection/);
});

test('no large chart-backdrop labels are created',()=>{
 assert.ok(popScript,'Population page controller missing');
 assert.doesNotMatch(popScript,/\$\('outages'\)\.append\(svg\('text'/);
 assert.doesNotMatch(probeScript,/gaps\.append\(node\('text'/);
 assert.doesNotMatch(probeScript,/bands\.append\(node\('text'/);
 assert.doesNotMatch(probeScript,/NO LATENCY DATA/);
 assert.doesNotMatch(archiveScript,/missing\.append\(svg\('text'/);
 assert.doesNotMatch(archiveScript,/NO HISTORICAL RECORDS/);
});

test('instructional copy and stability chips are removed from both pages',()=>{
 const removed=[
  /Hover to inspect original readings/i,/Observed readings are preserved/i,
  /Hover for exact recorded values/i,/Hold Shift and scroll down/i,
  /Missed checks are monitoring gaps/i,/Estimates are never counted as recorded observations/i,
  /These are periods recorded by the original bot/i,
 ];
 for(const page of [population,status])for(const pattern of removed)
  assert.doesNotMatch(page,pattern);
 assert.doesNotMatch(status,/id="stability"/);
 assert.doesNotMatch(probeScript,/updateStability|10m · |20m · |30m · /);
 assert.doesNotMatch(population,/id="source-note"|id="record-note"/);
 assert.doesNotMatch(status,/id="source-note"|id="official-note"/);
});

test('no orphaned direct DOM ID lookups remain after cleanup',()=>{
 for(const [markup,code] of [[population,popScript],[status,probeScript],[status,archiveScript]]){
  const htmlIds=new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const match of code.matchAll(/\$\('([\w-]+)'\)/g))
   assert.ok(htmlIds.has(match[1]),'Removed element is still referenced: '+match[1]);
 }
});
