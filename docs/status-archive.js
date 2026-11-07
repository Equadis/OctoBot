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
  const DURATIONS = {'1H':3600000,'1D':DAY,'1W':7*DAY,'1M':30*DAY,'3M':90*DAY,'ALL':0};
  const COLOUR={online:'#63df9a',reachable:'#63df9a',responsive:'#63df9a',
    partial:'#e3bd57',offline:'#ed777f',unreachable:'#ed777f',
    unresponsive:'#ed777f',malformed_response:'#ed777f',unknown:'#455363'};
  let data=null, source='service', range='1M', lower=0, upper=0, intervals=[], showAllIncidents=false;
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
  const uptimeColour = value => !Number.isFinite(value) ? '' :
    value >= 99.95 ? '#63df9a' : value >= 99.9 ? '#e3bd57' : value >= 99 ? '#f39a53' : '#ed777f';
  const pct = n => n==null?'NO DATA':n.toFixed(3)+'%';
  function currentRows(){return get(source).filter(r=>r&&ms(r.start)<upper&&ms(r.end)>lower);}
  function buildStats(){
    const last=Math.max(0,...get('service').map(r=>ms(r.end)).filter(Number.isFinite));
    for(const [days,id] of [[1,'archive-24'],[7,'archive-7'],[30,'archive-30']]){
      const result=last?coverage(get('service'),last-days*DAY,last):{uptime:null,coverage:0};
      $(id).textContent=pct(result.uptime);
      $(id).style.color=uptimeColour(result.uptime);
      $(id+'-coverage').textContent=Math.round(result.coverage)+'% recorded coverage';
    }
    $('archive-as-of').textContent=last?'Recorded through '+date(last)+' UTC':'NO DATA';
  }
  function archiveBounds(){
    const valid=get(source).filter(r=>Number.isFinite(ms(r.start))&&Number.isFinite(ms(r.end))&&ms(r.end)>ms(r.start));
    return {
      floor:valid.length?Math.min(...valid.map(r=>ms(r.start))):NaN,
      now:valid.length?Math.max(...valid.map(r=>ms(r.end))):NaN
    };
  }
  const x=t=>65+(t-lower)/Math.max(1,upper-lower)*920;
  function syncDates(){
    const limits=archiveBounds(),from=$('archive-date-from'),to=$('archive-date-to');
    from.value=lower?new Date(lower).toISOString().slice(0,10):'';
    to.value=upper?new Date(upper).toISOString().slice(0,10):'';
    for(const el of [from,to]){
      el.min=Number.isFinite(limits.floor)?new Date(limits.floor).toISOString().slice(0,10):'';
      el.max=Number.isFinite(limits.now)?new Date(limits.now).toISOString().slice(0,10):'';
    }
  }
  function hideInspection(){
    $('archive-tooltip').hidden=true;
    $('archive-crosshair').style.display='none';
    $('archive-hover-dot').style.display='none';
  }
  function setRange(name){
    range=name;
    intervals=get(source).filter(r=>Number.isFinite(ms(r.start))&&Number.isFinite(ms(r.end))&&ms(r.end)>ms(r.start));
    const {floor,now}=archiveBounds();
    if(!Number.isFinite(floor)||!Number.isFinite(now)){
      lower=0;upper=0;
    }else if(name==='ALL'){
      lower=floor;upper=now;
    }else if(name==='CUSTOM'&&lower&&upper&&lower<upper){
      const span=Math.min(upper-lower,now-floor);
      lower=Math.max(floor,Math.min(lower,now-span));upper=lower+span;
    }else{
      upper=now;lower=Math.max(floor,now-(DURATIONS[name]||30*DAY));
    }
    if(lower&&upper&&upper<=lower)lower=Math.max(floor,upper-60000);
    hideInspection();draw();syncDates();
  }
  function navigateArchive(next){
    if(!next||!Number.isFinite(next.start)||!Number.isFinite(next.end)||next.end<=next.start)return;
    if(Math.abs(lower-next.start)<1&&Math.abs(upper-next.end)<1)return;
    lower=next.start;upper=next.end;range='CUSTOM';
    hideInspection();draw();syncDates();
    $('archive-date-error').textContent='';
  }
  function draw(){
    const axis=$('archive-axis'),bands=$('archive-bars'),missing=$('archive-missing');
    axis.replaceChildren();bands.replaceChildren();missing.replaceChildren();
    for(const b of $('archive-ranges').querySelectorAll('button'))
      b.setAttribute('aria-pressed',String(b.textContent===range));
    $('archive-view-label').textContent=SIGNALS[source][0]+' · '+(range==='CUSTOM'?'Custom range':range)+' · bot-confirmed history';
    if(!lower||!upper||upper<=lower){
      bands.append(svg('text',{x:520,y:82,'text-anchor':'middle',style:'fill:#e3bd57'},'NO HISTORICAL RECORDS'));
      $('archive-readout').textContent='NO DATA · No archived history for this metric';
      $('archive-readout').style.color='#e3bd57';hideInspection();return;
    }
    const rows=currentRows().sort((a,b)=>ms(a.start)-ms(b.start));
    axis.append(svg('rect',{x:65,y:39,width:920,height:42,fill:'#28313e',stroke:'#405063'}));
    for(let i=0;i<=5;i++){
      const t=lower+(upper-lower)*i/5,p=x(t);
      axis.append(svg('line',{x1:p,y1:29,x2:p,y2:86,stroke:'#343a43'}));
      axis.append(svg('text',{x:p,y:120,'text-anchor':i===0?'start':i===5?'end':'middle'},
        new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(t)));
    }
    let cursor=lower;
    for(const row of rows){
      const a=Math.max(ms(row.start),lower),b=Math.min(ms(row.end),upper);
      if(!(b>a))continue;
      if(a>cursor){
        const left=x(cursor),width=x(a)-left;
        missing.append(svg('rect',{x:left,y:40,width,height:40,fill:'#e3bd57','fill-opacity':'.11'}));
        missing.append(svg('line',{x1:left,x2:left+width,y1:80,y2:80,stroke:'#e3bd57','stroke-dasharray':'6 4'}));
        if(width>80)missing.append(svg('text',{x:left+width/2,y:65,'text-anchor':'middle',style:'fill:#e3bd57;font-size:11px'},'NO DATA'));
      }
      bands.append(svg('rect',{x:x(a),y:43,width:Math.max(.8,x(b)-x(a)),height:34,
        fill:COLOUR[row.status]||COLOUR.unknown,opacity:'.89'}));
      cursor=Math.max(cursor,b);
    }
    if(cursor<upper){
      const left=x(cursor),width=x(upper)-left;
      missing.append(svg('rect',{x:left,y:40,width,height:40,fill:'#e3bd57','fill-opacity':'.11'}));
      missing.append(svg('line',{x1:left,x2:left+width,y1:80,y2:80,stroke:'#e3bd57','stroke-dasharray':'6 4'}));
      if(width>80)missing.append(svg('text',{x:left+width/2,y:65,'text-anchor':'middle',style:'fill:#e3bd57;font-size:11px'},'NO DATA'));
    }
    const c=coverage(rows,lower,upper);
    $('archive-readout').textContent=pct(c.uptime)+' recorded uptime · '+Math.round(c.coverage)+'% covered · '+SIGNALS[source][0];
    $('archive-readout').style.color=uptimeColour(c.uptime);
  }
  function archiveInspection(e){
    if(!lower||!upper||upper<=lower)return;
    const hit=$('archive-hit'),rect=hit.getBoundingClientRect();
    if(!rect.width)return;
    const t=lower+(upper-lower)*Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    const match=currentRows().find(row=>ms(row.start)<=t&&t<ms(row.end));
    const timestamp=date(t)+' UTC',crosshair=$('archive-crosshair'),dot=$('archive-hover-dot');
    crosshair.setAttribute('x1',x(t));crosshair.setAttribute('x2',x(t));
    crosshair.style.display='';
    dot.setAttribute('cx',x(t));dot.setAttribute('cy',60);
    dot.setAttribute('fill',match?(COLOUR[match.status]||COLOUR.unknown):'#e3bd57');
    dot.style.display='';
    $('archive-readout').textContent=timestamp+' · '+(match?SIGNALS[source][0]+': '+match.status.toUpperCase()+' (recorded)':'NO DATA · '+SIGNALS[source][0]);
    $('archive-readout').style.color=match?COLOUR[match.status]||COLOUR.unknown:'#e3bd57';
    const tooltip=$('archive-tooltip');
    tooltip.replaceChildren();
    const heading=document.createElement('strong');heading.textContent=match?SIGNALS[source][0]+' · '+match.status.toUpperCase():'NO DATA';
    const time=document.createElement('div');time.textContent=timestamp;
    tooltip.append(heading,time);
    if(match){
      const interval=document.createElement('div');
      interval.textContent='Confirmed from '+date(ms(match.start))+' to '+date(ms(match.end))+' UTC';
      tooltip.append(interval);
    }else{
      const note=document.createElement('div');note.textContent='No confirmed status recorded';tooltip.append(note);
    }
    tooltip.hidden=false;
    const outer=hit.closest('.graph').getBoundingClientRect();
    tooltip.style.left=Math.max(0,Math.min(outer.width-240,e.clientX-outer.left+12))+'px';
  }
  function showIncidents() {
    const holder=$('archive-incidents');
    holder.replaceChildren();
    const list=Array.isArray(data.incidents)?data.incidents:[];
    if(!list.length){
      const p=document.createElement('p');p.className='muted';
      p.textContent='No recorded incidents in the imported bot archive.';holder.append(p);return;
    }
    for(const incident of list.slice(0,showAllIncidents?list.length:12)){
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
    if(list.length>12){
      const toggle=document.createElement('button');toggle.type='button';
      toggle.textContent=showAllIncidents?'Show fewer incidents':'Show all '+list.length+' incidents';
      toggle.addEventListener('click',()=>{showAllIncidents=!showAllIncidents;showIncidents();});
      holder.append(toggle);
    }
  }
  function calendarFromBot(){
    const rows=get('service');
    const latest=Math.max(0,...rows.map(r=>ms(r.end)).filter(Number.isFinite));
    if(!latest)return;
    const midnight=Date.UTC(new Date(latest).getUTCFullYear(),new Date(latest).getUTCMonth(),new Date(latest).getUTCDate());
    const holder=$('calendar');
    holder.replaceChildren();
    const panel=holder.closest('.panel');
    panel.querySelector('h2').textContent='Historical availability calendar';
    panel.querySelector('.panel-head p').textContent='Last 90 days · bot-confirmed';
    const note=holder.parentElement.querySelector('p.muted');
    if(note)note.textContent='Calendar shows the original OctoBot confirmed-state history, ending at the last recorded bot check. Days before monitoring started remain NO DATA. Click a date to examine its archived status; all times UTC.';
    const legend=holder.parentElement.querySelector('.legend');
    if(legend)legend.innerHTML='<span><i class="key"></i>Confirmed healthy</span><span><i class="key down"></i>Confirmed interruption</span><span><i class="key missing"></i>No recorded state</span>';
    for(let index=89;index>=0;index--){
      const begin=midnight-index*DAY,end=Math.min(begin+DAY,latest);
      const info=coverage(rows,begin,end);
      const enough=info.coverage>=.5*100;
      const day=new Date(begin).toISOString().slice(0,10);
      const button=document.createElement('button');
      button.type='button';
      button.className=!enough?'':info.uptime<99.999?'bad':info.coverage>=85?'good':'partial';
      button.title=day+' UTC · '+pct(info.uptime)+' official uptime · '+Math.round(info.coverage)+'% covered';
      button.setAttribute('aria-label',button.title);
      button.addEventListener('click',()=>{
        source='service';$('archive-signal').value=source;range='CUSTOM';
        lower=begin;upper=end;hideInspection();draw();syncDates();
        $('bot-archive').scrollIntoView({block:'center',behavior:'smooth'});
      });
      holder.append(button);
    }
    window.OctoBotHistoricCalendarActive=true;
  }
  function setup(){
    const D=window.PopulationData;
    for(const [key,[name]] of Object.entries(SIGNALS)){
      const option=document.createElement('option');option.value=key;option.textContent=name;
      $('archive-signal').append(option);
    }
    $('archive-signal').addEventListener('change',e=>{source=e.target.value;setRange(range==='CUSTOM'?'1M':range);});
    for(const name of Object.keys(DURATIONS)){
      const b=document.createElement('button');b.textContent=name;b.type='button';
      b.setAttribute('aria-pressed','false');
      b.addEventListener('click',()=>setRange(name));
      $('archive-ranges').append(b);
    }
    $('archive-apply-dates').addEventListener('click',()=>{
      const start=Date.parse($('archive-date-from').value+'T00:00:00Z');
      const end=Date.parse($('archive-date-to').value+'T23:59:59Z');
      const {floor,now}=archiveBounds();
      if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(floor)||
         start>=end||end<floor||start>now){
        $('archive-date-error').textContent='Choose valid dates within the recorded history.';return;
      }
      $('archive-date-error').textContent='';
      const a=Math.max(start,floor),b=Math.min(end,now);
      if(b>a)navigateArchive({start:a,end:b});
    });
    window.OctoChartInteractions.attach({
      hit:$('archive-hit'),
      range:()=>({start:lower,end:upper}),
      bounds:archiveBounds,
      navigate:navigateArchive,
      hover:archiveInspection,
      leave:hideInspection
    });
    void D;
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
      buildStats();setRange('1M');showIncidents();calendarFromBot();
      const service=get('service'),last=Math.max(0,...service.map(r=>ms(r.end)).filter(Number.isFinite));
      if(last>0){
        const windows={};
        for(const days of [1,7,30])windows[days]=coverage(service,last-days*DAY,last);
        window.dispatchEvent(new CustomEvent('octobot:archive-ready',{detail:{
          asOf:last,windows
        }}));
      }
    }catch(e){
      console.error('OctoBot historical archive failed to display',e);
      $('archive-note').textContent=data
        ?'Historical data loaded, but the archive display encountered an error. See browser console.'
        :'Historical archive could not be fetched. Independent website monitoring continues.';
    }
  }
  initialise();
})();
