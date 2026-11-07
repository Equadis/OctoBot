/* Archived state intervals from the original OctoBot SQLite database.
 * These are independently marked as bot-confirmed periods, not web probe samples.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const DAY = 86400000;
  const SIGNALS = {
    service: ['Official overall', 'service'],
    nzoth: ["N'Zoth", 'realms'],
    yshaarj: ["Y'Shaarj", 'realms'],
    cthun: ["C'Thun", 'realms'],
    tcp: ['Login TCP', 'tcp'],
    auth: ['Authentication', 'auth']
  };
  const DURATIONS = {'1D':DAY,'1W':7*DAY,'1M':30*DAY,'3M':90*DAY,'ALL':0};
  const COLOUR={online:'#63df9a',reachable:'#63df9a',responsive:'#63df9a',
    partial:'#e3bd57',offline:'#ed777f',unreachable:'#ed777f',
    unresponsive:'#ed777f',malformed_response:'#ed777f',unknown:'#455363'};
  let data=null, source='service', range='1M', lower=0, upper=0, intervals=[];
  const date = t => new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(t);
  const svg = (tag,attrs={},label) => {
    const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([key,value])=>n.setAttribute(key,String(value)));
    if(label!==undefined)n.textContent=String(label);
    return n;
  };
  const ms = value => Date.parse(value);
  const get = id => {
    if(id==='service'||id==='tcp'||id==='auth')return data[id]||[];
    return data.realms?.[id]||[];
  };
  const classify = status => ['online','reachable','responsive'].includes(status)?'online':
    ['offline','partial','unreachable','unresponsive','malformed_response'].includes(status)?'offline':'unknown';
  function coverage(rows,begin,end) {
    let online=0,known=0;
    for(const row of rows) {
      const a=Math.max(begin,ms(row.start)),b=Math.min(end,ms(row.end));
      if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)continue;
      const kind=classify(row.status);
      if(kind==='unknown')continue;
      known+=b-a;
      if(kind==='online')online+=b-a;
    }
    const length=Math.max(1,end-begin);
    return {uptime:known?online/known*100:null,coverage:Math.min(1,known/length)*100};
  }
  const pct = n => n==null?'NO DATA':n.toFixed(3)+'%';
  function currentRows(){return get(source).filter(r=>r&&ms(r.start)<upper&&ms(r.end)>lower);}
  function buildStats(){
    const last=Math.max(0,...get('service').map(r=>ms(r.end)).filter(Number.isFinite));
    for(const [days,id] of [[1,'archive-24'],[7,'archive-7'],[30,'archive-30']]){
      const result=last?coverage(get('service'),last-days*DAY,last):{uptime:null,coverage:0};
      $(id).textContent=pct(result.uptime);
      $(id+'-coverage').textContent=Math.round(result.coverage)+'% recorded coverage';
    }
    $('archive-as-of').textContent=last?'Recorded through '+date(last)+' UTC':'NO DATA';
  }
  function setRange(name){
    range=name;
    const all=Object.values(SIGNALS).flatMap(()=>[]); // no synthetic samples
    void all;
    intervals=get(source).filter(r=>Number.isFinite(ms(r.start))&&Number.isFinite(ms(r.end))&&ms(r.end)>ms(r.start));
    upper=Math.max(0,...intervals.map(r=>ms(r.end)));
    const earliest=Math.min(...intervals.map(r=>ms(r.start)));
    if(!Number.isFinite(earliest)||upper===0) {
      lower=0;
    }else{
      lower=name==='ALL'?earliest:Math.max(earliest,upper-DURATIONS[name]);
      if(lower>=upper)lower=upper-60000;
    }
    draw();
  }
  function draw(){
    const axis=$('archive-axis'),bands=$('archive-bars');
    axis.replaceChildren();bands.replaceChildren();
    $('archive-view-label').textContent=SIGNALS[source][0]+' · '+range+' · bot-confirmed history';
    for(const b of $('archive-ranges').querySelectorAll('button'))
      b.setAttribute('aria-pressed',String(b.textContent===range));
    if(!lower||!upper||upper<=lower){
      bands.append(svg('text',{x:520,y:98,'text-anchor':'middle',style:'fill:#e3bd57'},'NO HISTORICAL RECORDS'));
      $('archive-readout').textContent='No archived history for this signal.';
      return;
    }
    const x=t=>65+(t-lower)/(upper-lower)*920;
    axis.append(svg('rect',{x:65,y:39,width:920,height:42,fill:'#28313e',stroke:'#405063'}));
    for(let i=0;i<=5;i++){
      const t=lower+(upper-lower)*i/5,p=x(t);
      axis.append(svg('line',{x1:p,y1:29,x2:p,y2:86,stroke:'#fff','stroke-opacity':'.12'}));
      axis.append(svg('text',{x:p,y:120,'text-anchor':i===0?'start':i===5?'end':'middle'},date(t)));
    }
    for(const row of currentRows()){
      const a=Math.max(ms(row.start),lower),b=Math.min(ms(row.end),upper);
      if(!(b>a))continue;
      bands.append(svg('rect',{x:x(a),y:43,width:Math.max(.75,x(b)-x(a)),height:34,
        fill:COLOUR[row.status]||COLOUR.unknown,opacity:'.88'}));
    }
    const c=coverage(currentRows(),lower,upper);
    $('archive-readout').textContent=pct(c.uptime)+' recorded uptime · '+Math.round(c.coverage)+'% covered · '+SIGNALS[source][0];
    $('archive-hit').onpointermove=ev=>{
      const rect=$('archive-hit').getBoundingClientRect();
      if(!rect.width)return;
      const t=lower+Math.max(0,Math.min(1,(ev.clientX-rect.left)/rect.width))*(upper-lower);
      const matched=currentRows().find(r=>ms(r.start)<=t&&t<=ms(r.end));
      $('archive-readout').textContent=date(t)+' UTC · '+(matched?
        'Bot-confirmed '+matched.status.toUpperCase():'NO DATA')+' · '+SIGNALS[source][0];
    };
    $('archive-hit').onpointerleave=()=>{
      $('archive-readout').textContent=pct(c.uptime)+' recorded uptime · '+Math.round(c.coverage)+'% covered · '+SIGNALS[source][0];
    };
  }
  function showIncidents() {
    const holder=$('archive-incidents');
    holder.replaceChildren();
    const list=Array.isArray(data.incidents)?data.incidents:[];
    if(!list.length){
      const p=document.createElement('p');p.className='muted';
      p.textContent='No recorded incidents in the imported bot archive.';holder.append(p);return;
    }
    for(const incident of list.slice(0,20)){
      const wrapper=document.createElement('div');wrapper.className='incident';
      const time=document.createElement('time');time.textContent=date(ms(incident.start))+' UTC';
      const label=document.createElement('strong');
      const kind={official:'Official realm',authentication:'Authentication',community:'Community reports'}[incident.kind]||'Incident';
      label.textContent=kind+' · '+(incident.end?'Recovered':'No recorded recovery');
      const small=document.createElement('small');
      if(incident.end&&Number.isFinite(ms(incident.end))){
        const seconds=Math.max(0,Math.round((ms(incident.end)-ms(incident.start))/1000));
        small.textContent=seconds<3600?Math.floor(seconds/60)+'m '+seconds%60+'s':(seconds/3600).toFixed(1)+'h';
      }else small.textContent='Open at time of export';
      if(incident.kind==='community'&&Number.isInteger(incident.peak_reporters))
        small.textContent+=' · peak '+incident.peak_reporters+' reporters';
      wrapper.append(time,label,small);holder.append(wrapper);
    }
  }
  function setup() {
    for(const [key,[name]] of Object.entries(SIGNALS)){
      const option=document.createElement('option');option.value=key;option.textContent=name;
      $('archive-signal').append(option);
    }
    $('archive-signal').addEventListener('change',e=>{source=e.target.value;setRange(range)});
    for(const name of Object.keys(DURATIONS)){
      const b=document.createElement('button');b.textContent=name;b.type='button';
      b.addEventListener('click',()=>setRange(name));
      $('archive-ranges').append(b);
    }
  }
  async function initialise() {
    setup();
    try{
      const result=await fetch('status/bot-history.json',{cache:'no-store'});
      if(!result.ok)throw Error('Archive unavailable');
      const archive=await result.json();
      if(archive?.schema!==1||archive?.source!=='octobot_database')throw Error('Unknown archive schema');
      const count=['service','tcp','auth'].reduce((n,key)=>n+(Array.isArray(archive[key])?archive[key].length:0),0);
      const realmCount=Object.values(archive.realms||{}).reduce((n,rows)=>n+(Array.isArray(rows)?rows.length:0),0);
      if(count+realmCount===0){
        $('archive-note').textContent='Existing bot history has not yet been exported from data/octobot.db. The independent web monitoring above continues recording normally.';
        return;
      }
      data=archive;
      $('archive-empty').hidden=true;
      $('archive-content').hidden=false;
      $('archive-note').textContent='Imported from the original bot database · exported '+date(ms(data.exported_at))+
        ' UTC. History represents confirmed states recorded by OctoBot; it is distinct from the independent web probes above.';
      buildStats();setRange('1M');showIncidents();
    }catch(e){
      $('archive-note').textContent='Original OctoBot database history is not available on the public site. Independent web monitoring continues above.';
    }
  }
  initialise();
})();
