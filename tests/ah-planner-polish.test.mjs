import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moneyParts,timeClass,bidAmount,money,scanStatus,lastScanClass,IDLE_SECONDS,clock} from '../docs/auction-house/format.mjs';
import {validateBuild,newBuild,encodeBuild,decodeBuild} from '../docs/sim/core/builds.mjs';
const docs=new URL('../docs/',import.meta.url);
const read=p=>readFileSync(new URL(p,docs),'utf8');

/* ---------- Auction House ---------- */
test('the explanatory text is gone from the Auction House, and a healthy snapshot prints no status line',()=>{
  const html=read('auction-house/index.html'),js=read('auction-house/auction.js'),css=read('auction-house/auction.css');
  assert.doesNotMatch(html,/Read-only N'Zoth market observations/);
  assert.doesNotMatch(html+js,/Latest full snapshot/);
  assert.match(html,/id="ah-status"[^>]*><\/div>/,'the status line starts empty');
  assert.match(css,/\.ah-status:empty\{display:none\}/);
  assert.match(js,/note\(s\.completed_at\?'':'No data/,'only a problem produces a line');
});

test('prices are white numbers with a coin after each, and a zero amount is not shown',()=>{
  assert.deepEqual(moneyParts(123456).map(p=>[p.unit,p.number]),[['g','12'],['s','34'],['c','56']]);
  assert.deepEqual(moneyParts(250).map(p=>[p.unit,p.number]),[['s','2'],['c','50']]);
  assert.deepEqual(moneyParts(10000).map(p=>[p.unit,p.number]),[['g','1']],'1g exactly shows only gold, not 0s 0c');
  assert.deepEqual(moneyParts(10005).map(p=>[p.unit,p.number]),[['g','1'],['c','5']],'a zero silver is skipped');
  assert.deepEqual(moneyParts(100).map(p=>[p.unit,p.number]),[['s','1']]);
  assert.deepEqual(moneyParts(7).map(p=>[p.unit,p.number]),[['c','7']]);
  assert.deepEqual(moneyParts(0.5).map(p=>[p.unit,p.number]),[['c','<1']]);
  assert.deepEqual(moneyParts(0).map(p=>[p.unit,p.number]),[['c','0']],'a price of exactly nothing still shows something');
  assert.equal(moneyParts(null),null);
  assert.equal(money(10000),'1g');assert.equal(money(10005),'1g 5c');assert.equal(money(0),'0c');
  assert.equal(moneyParts(123456).map(p=>p.text).join(' '),money(123456),'same text as the plain formatter');
  const css=read('auction-house/auction.css'),js=read('auction-house/auction.js');
  assert.match(css,/\.ah-num\{color:#fff\}/);
  assert.match(css,/\.ah-coin\{width:16px;height:16px/);
  assert.doesNotMatch(css,/\.ah-m-[gsc]\{/,'the coloured letters are gone');
  for(const coin of ['gold','silver','copper'])assert.ok(readFileSync(new URL('img/coin-'+coin+'.png',docs)).subarray(1,4).toString()==='PNG','coin-'+coin+'.png is a PNG');
  assert.match(js,/'\.\.\/img\/coin-'\+COIN\[p\.unit\]\+'\.png'/);
  assert.match(js,/wrap\.append\(el\('span',p\.number,'ah-num'\)\);/,'the number comes first, the coin after it');
});

test('Auction House time-left colours follow 30m red, 2h orange, 8h yellow, 24h green, 72h blue',()=>{
  const seen='2026-11-01T00:00:00.000Z',t0=Date.parse(seen),H=3600000;
  const at=hours=>timeClass(hours*H,seen,t0);
  assert.equal(at(0.5),'ah-time-red');assert.equal(at(1.99),'ah-time-red');
  assert.equal(at(2),'ah-time-orange');assert.equal(at(7.99),'ah-time-orange');
  assert.equal(at(8),'ah-time-yellow');assert.equal(at(23.99),'ah-time-yellow');
  assert.equal(at(24),'ah-time-green');assert.equal(at(71.99),'ah-time-green');
  assert.equal(at(72),'ah-time-blue');assert.equal(at(200),'ah-time-blue');
  assert.equal(timeClass(null,seen,t0),null,'unknown stays uncoloured');
  assert.equal(timeClass(H,seen,t0+2*H),null,'an expired estimate is not coloured as if it were live');
  assert.equal(timeClass(3*H,seen,t0+H+1),'ah-time-red');
  const css=read('auction-house/auction.css');
  for(const [colour,hex] of Object.entries({red:'#ff0000',orange:'#ff9218',yellow:'#ffff00',green:'#1eff00',blue:'#2992ff'}))
    assert.ok(css.includes('.ah-auction-time.ah-time-'+colour+'{color:'+hex+'}'),'specific auction countdown colour for '+colour);
  const js=read('auction-house/auction.js');
  assert.match(js,/cls\?'ah-auction-time '\+cls:'ah-auction-time'/,'all countdowns are styled without recolouring status indicators');
});

test('a bid that just repeats the stack or unit price shows a hyphen; the "(start)" label is gone',()=>{
  assert.equal(bidAmount(0,500,500,500),null,'start bid equal to the stack price');
  assert.equal(bidAmount(0,50,500,50),null,'start bid equal to the unit price');
  assert.equal(bidAmount(300,50,500,50),300,'a real current bid is shown');
  assert.equal(bidAmount(500,50,500,50),null,'a current bid equal to the stack price');
  assert.equal(bidAmount(0,40,500,50),40,'no bids: the starting bid, unlabelled');
  assert.equal(bidAmount(0,40,null,null),40,'no buyout to compare with');
  assert.equal(bidAmount(0,0.5,1,0.5),null,'fractional unit prices compare exactly');
  assert.doesNotMatch(read('auction-house/auction.js'),/\(start\)/);
  assert.match(read('auction-house/auction.js'),/if\(bid===null\)td\(tr,'-'\)/);
});

test('item icons have a rarity-coloured border and glow, like the Dressing Room and Gear Planner slots',()=>{
  const css=read('auction-house/auction.css'),planner=read('sim/combat-layout.css');
  assert.match(css,/\.ah-icon\{width:32px;height:32px;object-fit:cover;border:1px solid var\(--item-quality,#536277\);border-radius:3px;/);
  assert.match(css,/box-shadow:0 0 5px color-mix\(in srgb,var\(--item-quality,#536277\) 60%,transparent\)/);
  assert.match(planner,/border-color:var\(--item-quality\);box-shadow:0 0 5px color-mix\(in srgb,var\(--item-quality\) 60%,transparent\)/,'the same glow recipe as the planner');
});

/* ---------- one rarity palette ---------- */
test('the Gear Planner palette is the single source: the shared variables, the Dressing Room, the dropdowns and the Auction House all follow it',()=>{
  const planner=read('sim/combat-layout.css'),theme=read('site-theme.css');
  const fromPlanner={};
  for(const m of planner.matchAll(/\.slot\[data-quality="(\d)"\](?:,\.slot\[data-quality="(\d)"\])?\{--item-quality:(#[0-9a-f]{3,6})\}/gi))for(const q of [m[1],m[2]].filter(Boolean))fromPlanner[q]=m[3].toLowerCase();
  assert.deepEqual(Object.keys(fromPlanner).sort(),['0','1','2','3','4','5','6']);
  const vars=theme.match(/:root\{--quality-0:[^}]*\}/)[0];
  for(const [q,hex] of Object.entries(fromPlanner))assert.ok(vars.toLowerCase().includes(`--quality-${q}:${hex}`),`--quality-${q} equals the planner's ${hex}`);
  const dr=read('outfitter/outfitter.css');
  for(let q=0;q<=5;q++)assert.ok(dr.includes(`.quality-${q}{color:var(--quality-${q})}`),`Dressing Room quality ${q}`);
  assert.ok(!/\.quality-\d\{color:#/.test(dr),'no stray hard-coded Dressing Room item colours');
  assert.ok(planner.includes('.q2{color:#1eff00!important}'),'the planner item-name green is the same #1eff00');
  assert.match(vars,/--quality-2:#1eff00/);
});

/* ---------- Gear Planner ---------- */
test('Race and Level are the same height, and Race is a narrow control',()=>{
  const css=read('sim/combat-layout.css');
  assert.match(css,/\.rp-button\{[^}]*height:36px/);
  assert.match(css,/\.character-controls input\[type=number\]\{[^}]*height:36px/);
  assert.match(css,/grid-template-columns:132px 58px/);
});

test('the button row is Save, Load, Share, Export, Import',()=>{
  const row=read('sim/index.html').match(/<div class="actions">[\s\S]*?<\/div>\s*\n/)[0];
  const ids=[...row.matchAll(/<button id="([a-z-]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,['save-build','load-build','share-build','export-build','import-build']);
});

test('the character has a name box, which is offered as the default name when saving but can still be changed',()=>{
  const html=read('sim/index.html'),js=read('sim/planner.mjs');
  assert.match(html,/<input id="character-name" maxlength="24"/);
  assert.match(js,/\$\('save-name'\)\.value=\$\('character-name'\)\.value\.trim\(\)\|\|build\.name/,'the dialog opens with the character name');
  assert.match(js,/characterName:\$\('character-name'\)\.value\.trim\(\),name:\$\('save-name'\)\.value\.trim\(\)/,'the saved build keeps both, and the name field in the dialog is still what is saved as the build name');
  assert.match(html,/<input id="save-name" maxlength="80" required/,'the save dialog name stays editable');
  assert.match(js,/\['character-name', 'characterName'\]/,'edits go through the normal build update');
});

test('character names are optional, trimmed, cleaned and limited to 24 characters; old builds are unchanged',()=>{
  const data=JSON.parse(readFileSync(new URL('sim/data/talents/warrior.json',docs)));
  const base=newBuild('warrior');
  const plain=validateBuild(base,data);
  assert.equal('characterName' in plain,false,'a build with no name has no characterName, so saved builds and share links are unchanged');
  assert.equal(validateBuild({...base,characterName:'  Thrall  '},data).characterName,'Thrall');
  assert.equal(validateBuild({...base,characterName:'Gro\u0000m\u001fmash'},data).characterName,'Grommash','control characters are removed');
  assert.equal('characterName' in validateBuild({...base,characterName:'   '},data),false,'blank means no name');
  assert.equal(validateBuild({...base,characterName:'x'.repeat(24)},data).characterName.length,24);
  assert.throws(()=>validateBuild({...base,characterName:'x'.repeat(25)},data),/24 characters/);
  assert.equal('characterName' in validateBuild({...base,characterName:42},data),false,'a non-string name is ignored, not stored');
  // it survives a share link
  const round=decodeBuild(encodeBuild(validateBuild({...base,characterName:'Thrall'},data)),data);
  assert.equal(round.characterName,'Thrall');
});

/* ---------- scan status, last scan, collector ---------- */
test('the scan status counts down from 5:00 after a scan finishes, then shows a running In Progress timer',()=>{
  const done='2026-11-01T10:00:00.000Z',t=Date.parse(done),sec=n=>t+n*1000;
  assert.equal(IDLE_SECONDS,300);
  assert.deepEqual(scanStatus({completedAt:done},sec(0)),{text:'Idle - 5:00',className:'ah-time-yellow'});
  assert.equal(scanStatus({completedAt:done},sec(28)).text,'Idle - 4:32','28s after a scan the display reads 4:32');
  assert.equal(scanStatus({completedAt:done},sec(299)).text,'Idle - 0:01');
  assert.equal(scanStatus({completedAt:done},sec(300)).text,'Idle','after 5:00 with no scan running it just says Idle');
  assert.equal(scanStatus({completedAt:done},sec(4000)).className,'ah-time-yellow');
  const start='2026-11-01T10:05:00.000Z',s0=Date.parse(start);
  assert.deepEqual(scanStatus({completedAt:done,scanning:true,startedAt:start},s0+192000),{text:'In Progress 3m:12s',className:'ah-time-green'});
  assert.equal(scanStatus({scanning:true,startedAt:start},s0+5000).text,'In Progress 0m:05s');
  assert.equal(scanStatus({scanning:true,startedAt:null},s0).text,'In Progress','an unknown start time is not invented');
  assert.equal(scanStatus({scanning:true,startedAt:start,completedAt:done},s0-9000).text,'In Progress 0m:00s','a clock slightly behind never shows a negative time');
  assert.equal(scanStatus({},Date.now()).text,'Idle','no scan data at all');
  assert.equal(clock(272),'4:32');assert.equal(clock(5),'0:05');
});

test('the last complete scan is green under 2 hours, yellow under 24 hours, red after that, and uncoloured with no data',()=>{
  const done='2026-11-01T00:00:00.000Z',t=Date.parse(done),H=3600000;
  assert.equal(lastScanClass(done,t+H),'ah-time-green');assert.equal(lastScanClass(done,t+2*H-1),'ah-time-green');
  assert.equal(lastScanClass(done,t+2*H),'ah-time-yellow');assert.equal(lastScanClass(done,t+24*H-1),'ah-time-yellow');
  assert.equal(lastScanClass(done,t+24*H),'ah-time-red');assert.equal(lastScanClass(done,t+500*H),'ah-time-red');
  assert.equal(lastScanClass(null),null);assert.equal(lastScanClass('garbage'),null);
  assert.equal(lastScanClass(done,t-5000),'ah-time-green','a slightly early client clock stays green');
});

test('the Collector card is gone and the scan card is wired to the timers',()=>{
  const html=read('auction-house/index.html'),js=read('auction-house/auction.js'),css=read('auction-house/auction.css');
  assert.doesNotMatch(html,/Collector/);assert.doesNotMatch(html+js,/id="collector"|\$\('collector'\)/);
  assert.equal((html.match(/class="ah-kpi"/g)||[]).length,4,'four cards remain');
  assert.match(html,/<span>Scan status<\/span><strong id="scan-progress">/);
  assert.match(css,/repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(js,/setInterval\(renderScan,1000\)/,'the display updates every second');
  assert.match(js,/request\('\/api\/auction\/scan-status'\)/,'the start time of a running scan comes from the scan-status endpoint');
  assert.match(js,/last\.className=lastScanClass\(sc\.completedAt,now\)/);
});

test('Auction House yellow text is the site yellow (--gold), not its own shade',()=>{
  const css=read('auction-house/auction.css'),theme=read('site-theme.css');
  assert.match(theme,/--gold:#efce47/);
  for(const rule of [/\.ah-kpi strong\{[^}]*color:var\(--gold\)/,/\.ah-stats dd\{[^}]*color:var\(--gold\)/,/\.ah-status\{color:var\(--gold\)/,/\.ah-expand\{color:var\(--gold\)/])
    assert.match(css,rule);
  for(const old of ['#e9d175','#d4c485'])assert.ok(!css.includes(old),'retired one-off yellow '+old);
});
