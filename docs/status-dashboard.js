/* OctoBot server-status dashboard. Independent recorded probes, never inferred check results. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const D = window.PopulationData, DAY = 86400000, MAX_GAP = 15 * 60000;
  const LANE = [
    ['nzoth', "N'Zoth"], ['yshaarj', "Y'Shaarj"], ['cthun', "C'Thun"],
    ['tcp', 'Login TCP'], ['auth', 'Authentication']
  ];
  const PERIODS = {'1H':3600000,'1D':DAY,'1W':7*DAY,'1M':30*DAY,'3M':90*DAY};
  let history = [], current = null, period = '1D', viewStart = Date.now()-DAY,
      viewEnd = Date.now(), dragging = null, requestId = 0;
  const colour = {up:'#63df9a',down:'#ed777f',unknown:'#455363'};
  const fmt = t => new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(t);
  const short = ms => {
    if (ms < 60000) return 'under 1m';
    const d=Math.floor(ms/DAY),h=Math.floor(ms%DAY/3600000),m=Math.floor(ms%3600000/60000);
    return [d&&d+'d',h&&h+'h',m&&m+'m'].filter(Boolean).join(' ')||'under 1m';
  };
  const node = (tag,attrs={},value) => {
    const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
    for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));
    if(value!==undefined)n.textContent=String(value);
    return n;
  };
  const label = (value) => ({
    online:'Online',offline:'Offline',reachable:'Reachable',
    unreachable:'Unreachable',responsive:'Responsive',unresponsive:'Unresponsive',
    malformed_response:'Invalid response',available:'Available',unavailable:'Unavailable',
    unknown:'Unknown'
  }[value]||'Unknown');
  const status = (r,key) => {
    if(!r) return 'unknown';
    const raw = key==='tcp'||key==='auth' ? r[key] : r.realms?.[key];
    if (['online','reachable','responsive'].includes(raw)) return 'up';
    if (['offline','unreachable','unresponsive','malformed_response'].includes(raw)) return 'down';
    return 'unknown';
  };
  const overall = r => {
    if (!r || r.website!=='available') return 'unknown';
    const states=LANE.map(([k])=>status(r,k));
    if(states.includes('down'))return 'down';
    if(states.includes('unknown'))return 'unknown';
    return 'up';
  };
  const at = r => {
    const t = Date.parse(r?.timestamp);
    return Number.isFinite(t)&&t<=Date.now()+60000?t:NaN;
  };
  function sanitise(rows) {
    if(!Array.isArray(rows))return [];
    const byTime=new Map();
    for(const row of rows){
      const t=at(row);
      if(Number.isFinite(t)&&row&&typeof row.realms==='object'&&t>=Date.now()-92*DAY)
        byTime.set(t,{...row,t});
    }
    return [...byTime.values()].sort((a,b)=>a.t-b.t);
  }
  function recent() {return current&&Date.now()-current.t<=15*60000&&current.t<=Date.now()+60000;}
  function pill(raw,stale=false) {
    if(stale) return '<span class="pill unknown-text"><i class="dot unknown"></i>STALE</span>';
    const safe=['online','offline','reachable','unreachable','responsive','unresponsive','malformed_response','available','unavailable'].includes(raw)?raw:'unknown';
    const kind = ['online','reachable','responsive','available'].includes(safe)?'ok':
      ['offline','unreachable','unresponsive','malformed_response'].includes(safe)?'bad':'unknown-text';
    const dot = safe==='available'?'online':safe==='unavailable'?'unknown':safe;
    return '<span class="pill '+kind+'"><i class="dot '+dot+'"></i>'+label(safe)+'</span>';
  }
  function availability(key,begin,end) {
    let up=0,down=0;
    for(let i=1;i<history.length;i++){
      const a=history[i-1],b=history[i],span=b.t-a.t;
      if(a.t>=end||b.t<=begin)continue;
      if(span<=0||span>MAX_GAP)continue;
      const first=Math.max(a.t,begin),last=Math.min(b.t,end);
      if(last<=first)continue;
      const s1=key==='overall'?overall(a):status(a,key);
      const s2=key==='overall'?overall(b):status(b,key);
      // A transition can occur anywhere between probes; omit its entire interval.
      if(s1!==s2)continue;
      if(s1==='up')up+=last-first;
      else if(s1==='down')down+=last-first;
    }
    const length=end-begin,covered=up+down;
    return {up,down,covered,coverage:length>0?covered/length:0,
      percent:covered?up/covered*100:null};
  }
  function percentage(v) {return v.percent===null?'NO DATA':v.percent.toFixed(3)+'%';}
  function updateStats() {
    const fresh=!!recent(), s=fresh?overall(current):'unknown';
    const top=$('overall');top.textContent=s==='up'?'Online':s==='down'?'Issues detected':'NO DATA';
    top.className=s==='up'?'':s==='down'?'is-down':'is-unknown';
    $('overall-note').textContent=!current?'Waiting for first observation':!fresh?'Last probe is stale; status unknown':
      s==='up'?'Realms, TCP and authentication responding':s==='down'?'One or more checked services failed':'One or more signals unavailable';
    for(const [days,suffix] of [[1,'24'],[7,'7'],[30,'30']]){
      const result=availability('overall',Date.now()-days*DAY,Date.now());
      $('uptime-'+suffix).textContent=percentage(result);
      $('coverage-'+suffix).textContent=Math.round(result.coverage*100)+'% observed coverage · sampled';
    }
    $('freshness-badge').textContent=!current?'AWAITING TELEMETRY':!fresh?'CHECKS STALE':
      s==='up'?'MONITORING · ONLINE':s==='down'?'MONITORING · ISSUES':'MONITORING · INCOMPLETE';
    const stale=!fresh;
    for(const id of ['nzoth','yshaarj','cthun'])
      $('realm-'+id).innerHTML=pill(current?.realms?.[id],stale);
    $('website-state').innerHTML=pill(current?.website,stale);
    $('tcp-state').innerHTML=pill(current?.tcp,stale);
    $('auth-state').innerHTML=pill(current?.auth,stale);
    $('latency-now').textContent=fresh&&current?.auth==='responsive'&&
      Number.isFinite(current.latency_ms)?current.latency_ms+' ms':'NO DATA';
    $('official-note').textContent=!current?'Waiting for the first scheduled check.':
      !fresh?'Previous observation '+fmt(current.t)+' UTC; no current status can be confirmed.':
      current.website==='available'?'Official status checked '+fmt(current.t)+' UTC.':
      'Official site could not be read reliably; realm status may be unknown.';
    $('last-check').textContent=current?'Last recorded check: '+fmt(current.t)+' UTC ('+short(Math.max(0,Date.now()-current.t))+' ago)':'No observations recorded';
    let streak=null;
    if(fresh&&overall(current)==='up'){
      let first=current.t;
      for(let i=history.length-1;i>=0;i--){
        const r=history[i];
        if(r.t>first)continue;
        if(overall(r)!=='up'||first-r.t>MAX_GAP)break;
        first=r.t;
      }
      streak=first===current.t?'Observed now':short(current.t-first)+' (observed)';
    }
    $('streak').textContent=streak||'NO DATA';
    $('source-note').textContent='Source: official realm page + independent TCP / credential-free auth checks from GitHub Actions. '+
      'Community reports and earlier Discord bot incident records are not available to this public monitor.'+
      (current?.source_error?' Latest website diagnostic: '+current.source_error:'');
    updateStability();
  }
  function updateStability() {
    const el=$('stability');el.replaceChildren();
    for(const minutes of [10,20,30]){
      const a=availability('overall',Date.now()-minutes*60000,Date.now());
      const known=a.coverage>=0.7;
      const state=!known?'NO DATA':a.down>0?'ISSUES':'STABLE';
      const span=document.createElement('span');
      span.textContent=minutes+'m · '+state;
      span.style.color=!known?'#e3bd57':a.down>0?'#ef929b':'#78dfa6';
      span.title=Math.round(a.coverage*100)+'% observed coverage. Does not guarantee uninterrupted service between checks.';
      el.append(span);
    }
  }
  function boundaries() {
    const now=Date.now(),floor=now-90*DAY;
    return {floor,now};
  }
  function preset(p) {
    period=p;
    const {now}=boundaries();viewEnd=now;viewStart=now-PERIODS[p];
    draw();syncDates();
  }
  function syncDates() {
    $('date-from').value=new Date(viewStart).toISOString().slice(0,10);
    $('date-to').value=new Date(viewEnd).toISOString().slice(0,10);
  }
  function updateButtons() {
    for(const b of $('ranges').querySelectorAll('button'))
      b.setAttribute('aria-pressed',String(period===b.textContent));
  }
  const X=t=>128+(t-viewStart)/Math.max(viewEnd-viewStart,1)*882;
  function timeline() {
    const axes=$('timeline-axis'),bands=$('timeline-bands');
    axes.replaceChildren();bands.replaceChildren();
    const axisRows=[36,86,136,186,236],size=32;
    for(let i=0;i<LANE.length;i++){
      const y=axisRows[i];
      axes.append(node('text',{x:6,y:y+21},LANE[i][1]));
      axes.append(node('rect',{x:128,y,width:882,height:size,fill:'#242c37',stroke:'#384454','stroke-width':'.7'}));
    }
    const span=viewEnd-viewStart;
    for(let i=0;i<=5;i++){
      const t=viewStart+span*i/5,x=X(t);
      axes.append(node('line',{x1:x,x2:x,y1:25,y2:269,stroke:'#ffffff','stroke-opacity':'.07'}));
      axes.append(node('text',{x,y:310,'text-anchor':i===0?'start':i===5?'end':'middle'},
        new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(t)));
    }
    const columns=441;
    // Rasterise evidence into fixed-width bins: chart remains fast at 90 days.
    for(let j=0;j<LANE.length;j++){
      const key=LANE[j][0],cells=new Uint8Array(columns);
      for(let i=1;i<history.length;i++){
        const a=history[i-1],b=history[i],gap=b.t-a.t;
        if(gap<=0||gap>MAX_GAP||b.t<viewStart||a.t>viewEnd)continue;
        const sa=status(a,key),sb=status(b,key);
        if(sa!==sb||sa==='unknown')continue;
        const left=Math.max(0,Math.floor((Math.max(a.t,viewStart)-viewStart)/span*columns));
        const right=Math.min(columns-1,Math.floor((Math.min(b.t,viewEnd)-viewStart)/span*columns));
        for(let k=left;k<=right;k++) cells[k]=sa==='down'?2:cells[k]===2?2:1;
      }
      // Individual probes are dots, including short failures without a confirmed interval.
      for(const r of history){
        if(r.t<viewStart||r.t>viewEnd)continue;
        const s=status(r,key),bin=Math.min(columns-1,Math.floor((r.t-viewStart)/span*columns));
        if(s==='down')cells[bin]=2;
        else if(s==='up'&&cells[bin]!==2)cells[bin]=1;
      }
      let bin=0;
      while(bin<columns){
        if(!cells[bin]){bin++;continue;}
        const colourCode=cells[bin],begin=bin;
        while(bin<columns&&cells[bin]===colourCode)bin++;
        bands.append(node('rect',{x:128+begin*2,y:axisRows[j]+3,width:Math.max(2,(bin-begin)*2),height:26,
          fill:colourCode===2?colour.down:colour.up,opacity:'.88'}));
      }
    }
    const samples=history.filter(r=>r.t>=viewStart&&r.t<=viewEnd);
    if(!samples.length)
      bands.append(node('text',{x:565,y:170,'text-anchor':'middle','font-size':'19',style:'fill:#e3bd57'},'NO DATA'));
    $('range-label').textContent=(period==='CUSTOM'?'Custom range':period)+' · '+samples.length.toLocaleString('en-GB')+' recorded observations';
    latencyChart(samples);
    updateButtons();
  }
  function latencyChart(samples) {
    const axes=$('latency-axes'),points=$('latency-points'),path=$('latency-path');
    axes.replaceChildren();points.replaceChildren();
    const candidates=samples.filter(r=>r.auth==='responsive'&&Number.isFinite(r.latency_ms)&&r.latency_ms>=0);
    const peak=Math.max(100,...candidates.map(r=>r.latency_ms)),max=Math.ceil(peak/50)*50;
    for(let i=0;i<=3;i++){
      const y=138-110*i/3;
      axes.append(node('line',{x1:128,x2:1010,y1:y,y2:y,stroke:'#617085','stroke-opacity':'.25'}));
      axes.append(node('text',{x:112,y:y+4,'text-anchor':'end'},Math.round(max*i/3)+' ms'));
    }
    if(!candidates.length) {
      path.setAttribute('d','');
      axes.append(node('text',{x:566,y:82,'text-anchor':'middle',style:'fill:#e3bd57'},'NO LATENCY DATA'));
      return;
    }
    // Retain one actual sample per horizontal pixel bin, without interpolating missing periods.
    const picked=new Map();
    for(const r of candidates){
      const bin=Math.max(0,Math.min(881,Math.floor(X(r.t)-128)));
      const old=picked.get(bin);
      if(!old||r.latency_ms>old.latency_ms)picked.set(bin,r);
    }
    const values=[...picked.values()].sort((a,b)=>a.t-b.t);
    let d='',previous=null;
    for(const r of values) {
      const x=X(r.t),y=138-r.latency_ms/max*110;
      d+=(previous&&r.t-previous.t<=MAX_GAP?'L':'M')+x.toFixed(2)+','+y.toFixed(2)+' ';
      previous=r;
    }
    path.setAttribute('d',d);
    for(const r of values.filter((_,i)=>i%Math.max(1,Math.floor(values.length/35))===0)){
      points.append(node('circle',{cx:X(r.t),cy:138-r.latency_ms/max*110,r:1.9,fill:'#74c6ef'}));
    }
  }
  function nearest(t) {
    if(!history.length)return null;
    let left=0,right=history.length-1;
    while(left<right){const mid=(left+right)>>1;if(history[mid].t<t)left=mid+1;else right=mid;}
    return left>0&&Math.abs(t-history[left-1].t)<Math.abs(history[left].t-t)?history[left-1]:history[left];
  }
  function inspection(e) {
    const hit=$('timeline-hit'),rect=hit.getBoundingClientRect();
    if(!rect.width)return;
    const ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    const t=viewStart+(viewEnd-viewStart)*ratio,point=nearest(t);
    $('timeline-crosshair').setAttribute('x1',X(t));
    $('timeline-crosshair').setAttribute('x2',X(t));
    $('timeline-crosshair').style.display='';
    if(!point||point.t<viewStart||point.t>viewEnd){
      $('tooltip').hidden=true;$('readout').textContent='NO DATA · '+fmt(t)+' UTC';return;
    }
    const names=LANE.map(([key,n])=>n+': '+label(key==='tcp'||key==='auth'?point[key]:point.realms?.[key]));
    const age=Math.abs(t-point.t),usable=age<=Math.max(MAX_GAP,(viewEnd-viewStart)/882);
    $('readout').textContent=usable?fmt(point.t)+' UTC · '+names.join(' · '):'NO DATA · No nearby observation';
    if(!usable){$('tooltip').hidden=true;return;}
    const tooltip=$('tooltip');
    tooltip.replaceChildren();
    const heading=document.createElement('strong');heading.textContent=fmt(point.t)+' UTC';tooltip.append(heading);
    for(const str of [...names,'Authentication latency: '+(Number.isFinite(point.latency_ms)?point.latency_ms+' ms':'NO DATA')]){
      const div=document.createElement('div');div.textContent=str;tooltip.append(div);
    }
    tooltip.hidden=false;
    const outer=hit.closest('.graph').getBoundingClientRect();
    tooltip.style.left=Math.max(0,Math.min(outer.width-235,e.clientX-outer.left+12))+'px';
  }
  function showIncidents() {
    const list=[];
    let active=null;
    for(let i=0;i<history.length;i++){
      const r=history[i],state=overall(r),prior=history[i-1];
      const connected=prior&&r.t-prior.t<=MAX_GAP;
      if(active&&(!connected||state==='unknown')){
        list.push(active);active=null;
      }
      if(state==='down'&&!active){
        const problems=LANE.filter(([k])=>status(r,k)==='down').map(([,name])=>name);
        active={start:r.t,end:null,problems:problems.length?problems.join(', '):'Service'};
      } else if(state==='up'&&active) {
        active.end=r.t;list.push(active);active=null;
      }
    }
    if(active)list.push(active);
    const holder=$('incidents');holder.replaceChildren();
    if(!list.length){
      const p=document.createElement('p');p.className='muted';
      p.textContent=history.length?'No interruptions detected in the recorded monitoring history.':'No monitoring history yet.';
      holder.append(p);return;
    }
    for(const incident of list.reverse().slice(0,12)){
      const article=document.createElement('div');article.className='incident';
      const time=document.createElement('time');time.dateTime=new Date(incident.start).toISOString();time.textContent=fmt(incident.start)+' UTC';
      const title=document.createElement('strong');title.textContent=incident.problems+' · '+(incident.end?'Recovered':'Recovery unconfirmed');
      const duration=document.createElement('small');duration.textContent=incident.end?
        'Observed window: '+short(incident.end-incident.start):
        'First failure detected; no confirmed recovery within continuous monitoring';
      article.append(time,title,duration);holder.append(article);
    }
  }
  function calendar() {
    const el=$('calendar');el.replaceChildren();const now=Date.now();
    const midnight=Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth(),new Date(now).getUTCDate());
    for(let index=89;index>=0;index--){
      const begin=midnight-index*DAY,end=Math.min(begin+DAY,now);
      const info=availability('overall',begin,end);
      const day=new Date(begin).toISOString().slice(0,10);
      const b=document.createElement('button');b.type='button';
      const enough=info.coverage>=0.5;
      b.className=!enough?'':info.down>0?'bad':info.coverage>=0.85?'good':'partial';
      b.title=day+' UTC · '+percentage(info)+' availability · '+Math.round(info.coverage*100)+'% observed';
      b.setAttribute('aria-label',b.title);
      b.addEventListener('click',()=>{
        period='CUSTOM';viewStart=begin;viewEnd=end;draw();syncDates();
        $('date-error').textContent='Showing '+day+' UTC.';
        $('timeline-hit').scrollIntoView({block:'center',behavior:'smooth'});
      });
      el.append(b);
    }
  }
  function draw() {timeline();}
  function changeRange(next) {
    if(!next||Math.abs(viewStart-next.start)<1&&Math.abs(viewEnd-next.end)<1)return;
    viewStart=next.start;viewEnd=next.end;period='CUSTOM';draw();syncDates();
    $('tooltip').hidden=true;
  }
  function setup() {
    for(const p of Object.keys(PERIODS)){
      const b=document.createElement('button');b.type='button';b.textContent=p;
      b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>preset(p));$('ranges').append(b);
    }
    const hit=$('timeline-hit');
    hit.addEventListener('pointerdown',e=>{
      if(e.button!==0||dragging)return;
      dragging={id:e.pointerId,x:e.clientX};
      hit.setPointerCapture(e.pointerId);hit.classList.add('is-panning');
      $('tooltip').hidden=true;e.preventDefault();
    });
    hit.addEventListener('pointermove',e=>{
      if(dragging){
        if(dragging.id!==e.pointerId)return;
        const width=hit.getBoundingClientRect().width,dx=e.clientX-dragging.x;
        dragging.x=e.clientX;
        if(width)changeRange(D.panRange(viewStart,viewEnd,-dx/width*(viewEnd-viewStart),...Object.values(boundaries())));
      }else inspection(e);
    });
    const finish=e=>{
      if(!dragging||dragging.id!==e.pointerId)return;
      dragging=null;hit.classList.remove('is-panning');
      if(hit.hasPointerCapture(e.pointerId))hit.releasePointerCapture(e.pointerId);
    };
    hit.addEventListener('pointerup',finish);hit.addEventListener('pointercancel',finish);
    hit.addEventListener('lostpointercapture',()=>{dragging=null;hit.classList.remove('is-panning')});
    hit.addEventListener('pointerleave',()=>{$('tooltip').hidden=true;$('timeline-crosshair').style.display='none'});
    hit.addEventListener('wheel',e=>{
      const rect=hit.getBoundingClientRect();if(!rect.width)return;
      e.preventDefault();
      const delta=(Math.abs(e.deltaX)>0&&e.shiftKey?e.deltaX:e.deltaY)*(e.deltaMode===1?16:e.deltaMode===2?800:1);
      const {floor,now}=boundaries();
      if(e.shiftKey)changeRange(D.panRange(viewStart,viewEnd,delta/100*.12*(viewEnd-viewStart),floor,now));
      else {
        const ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
        changeRange(D.zoomRange(viewStart,viewEnd,ratio,delta,floor,now));
      }
    },{passive:false});
    $('apply-dates').addEventListener('click',()=>{
      const a=Date.parse($('date-from').value+'T00:00:00Z');
      const b=Math.min(Date.now(),Date.parse($('date-to').value+'T23:59:59Z'));
      const {floor}=boundaries();
      if(!Number.isFinite(a)||!Number.isFinite(b)||a>=b||b<floor){
        $('date-error').textContent='Choose valid dates within the last 90 days.';return;
      }
      $('date-error').textContent='';viewStart=Math.max(a,floor);viewEnd=b;period='CUSTOM';draw();
    });
    preset('1D');
  }
  async function load(){
    const request=++requestId;
    try{
      const results=await Promise.all([
        fetch('status/history.json',{cache:'no-store'}),
        fetch('status/latest.json',{cache:'no-store'})
      ]);
      if(results.some(r=>!r.ok))throw Error('HTTP status feed unavailable');
      const [all,latest]=await Promise.all(results.map(r=>r.json()));
      if(request!==requestId)return;
      history=sanitise(all);
      const sample=latest?.sample;
      const t=at(sample);
      current=Number.isFinite(t)&&sample&&typeof sample.realms==='object'?{...sample,t}:history.at(-1)||null;
      if(current&&!history.some(r=>r.t===current.t))history=sanitise([...history,current]);
      updateStats();draw();calendar();showIncidents();
    }catch(e){
      $('source-note').textContent='Status feed currently unavailable; no realm or availability readings have been invented.';
      if(!current){updateStats();draw();calendar();}
    }
  }
  setup();load();
  setInterval(load,60000);
  setInterval(updateStats,15000);
})();
