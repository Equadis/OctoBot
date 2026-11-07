import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRealmStatuses,confirmRealm,validateAuthReply,statusLatest,statusHistory} from '../src/status.js';

test('explicit official realm labels are parsed, not guessed from a healthy HTTP response',()=>{
 const html=`
 <div class="realm-row"><div class="realm-name">C'Thun <span>(Hardcore)</span></div><div class="realm-status">Online</div></div>
 <div class="realm-row"><div class="realm-name">N'Zoth <span>(Normal)</span></div><div class="realm-status">Offline</div></div>
 <div class="realm-row"><div class="realm-name">Y'Shaarj <span>(PvP)</span></div><div class="realm-status">Online</div></div>`;
 assert.deepEqual(parseRealmStatuses(html),{nzoth:'offline',yshaarj:'online',cthun:'online'});
 assert.deepEqual(parseRealmStatuses('<title>Just a moment</title>'),{nzoth:'unknown',yshaarj:'unknown',cthun:'unknown'});
 assert.equal(confirmRealm('unknown','offline'),'unknown');
 assert.equal(confirmRealm('offline','offline'),'offline');
 assert.equal(confirmRealm('offline','online'),'online');
});

test('only full protocol-valid authentication challenges count as responsive',()=>{
 assert.equal(validateAuthReply(new Uint8Array([0,0,4])),true);
 assert.equal(validateAuthReply(new Uint8Array([0,0,0])),null); // incomplete SRP
 assert.equal(validateAuthReply(new Uint8Array([0,1,4])),false);
 assert.equal(validateAuthReply(new Uint8Array([0,0,30])),false);
 const frame=new Uint8Array(3+32+1+1+1+1+32+16+1);
 let p=0;frame.set([0,0,0],p);p+=3;p+=32;
 frame[p++]=1;frame[p++]=7;frame[p++]=1;frame[p++]=11;
 p+=32+16;frame[p++]=0;
 assert.equal(validateAuthReply(frame),true);
});

test('status Worker API returns only recorded samples and transparent paging',async()=>{
 const rows=[
  {timestamp_ms:1000,website:'available',nzoth:'online',yshaarj:'online',cthun:'online',
    tcp:'reachable',auth:'responsive',latency_ms:602,source_error:null},
  {timestamp_ms:2000,website:'unavailable',nzoth:'unknown',yshaarj:'unknown',cthun:'unknown',
    tcp:'unknown',auth:'unknown',latency_ms:null,source_error:'Website check failed'}
 ];
 const db={prepare(sql){const statement={args:[],bind(...args){this.args=args;return this;},
    async first(){return rows.at(-1)},
    async all(){return {results:rows.filter(r=>r.timestamp_ms>this.args[0])}}};
    return statement;
 }};
 const latest=await statusLatest({DB:db});
 assert.equal(latest.sample.realms.nzoth,'unknown');
 assert.equal(latest.sample.auth,'unknown');
 const hist=await statusHistory({DB:db},1000);
 assert.equal(hist.samples.length,1);
 assert.equal(hist.next_since,2000);
 assert.equal(hist.has_more,false);
 assert.equal(hist.samples[0].timestamp,new Date(2000).toISOString());
});
