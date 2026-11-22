// A small headless-browser driver for the Dressing Room tests (Chrome DevTools Protocol over Node's built-in WebSocket; no packages).
//
//   const browser = await launch();            // a throwaway Edge or Chrome profile, a random debugging port, headless
//   await browser.goto(url); await browser.eval('document.title'); const png = await browser.screenshot({x,y,width,height});
//   await browser.close();                      // kills the browser and deletes the profile
//
// The profile folder is unique per run and the port is random, so a browser left behind by an earlier run can never be picked up by a later one.
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES=[
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/microsoft-edge'];
export const findBrowser=()=>process.env.BROWSER_PATH||CANDIDATES.find(file=>fs.existsSync(file));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function freePort() {return new Promise((resolve,reject)=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const {port}=server.address();server.close(()=>resolve(port));});server.on('error',reject);});}

export async function launch({width=1280,height=1100,scale=1}={}) {
  const exe=findBrowser();
  if(!exe)throw Error('No Edge or Chrome found; set BROWSER_PATH.');
  const port=await freePort(),profile=fs.mkdtempSync(path.join(os.tmpdir(),'octobot-cdp-'));
  const child=spawn(exe,['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-extensions',
    '--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding',
    `--window-size=${width},${height}`,'about:blank'],{stdio:'ignore',windowsHide:true});
  // A browser must never outlive the script that started it (an interrupted run once left 27 of them running): kill it on any exit.
  // Edge can hand the real browser over to a process other than the one spawned, so killing child.pid is not enough: every process whose command line names this run's profile folder is killed.
  const killBrowser=()=>{
    try {if(process.platform==='win32')execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'});else child.kill('SIGKILL');} catch {}
    try {
      if(process.platform==='win32')execFileSync('powershell',['-NoProfile','-Command',`Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${path.basename(profile)}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`],{stdio:'ignore'});
      else execFileSync('pkill',['-9','-f',path.basename(profile)],{stdio:'ignore'});
    } catch {}
  };
  process.on('exit',killBrowser);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{killBrowser();process.exit(130);});
  let target=null;
  for(let i=0;i<100&&!target;i++) {
    try {
      const list=await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      target=list.find(t=>t.type==='page')||null;
    } catch {}
    if(!target)await sleep(150);
  }
  if(!target){child.kill();throw Error('The browser did not start.');}
  const socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=()=>reject(Error('DevTools connection failed.'));});
  let nextId=0;const waiting=new Map(),listeners=[];
  socket.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id&&waiting.has(message.id)){const {resolve,reject}=waiting.get(message.id);waiting.delete(message.id);message.error?reject(Error(message.error.message)):resolve(message.result);}
    else for(const listener of listeners)listener(message);
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;waiting.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const consoleErrors=[],failedRequests=[],requests=[];
  listeners.push(message=>{
    if(message.method==='Runtime.exceptionThrown')consoleErrors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
    if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')consoleErrors.push(message.params.args.map(a=>a.value??a.description).join(' '));
    if(message.method==='Network.requestWillBeSent')requests.push(message.params.request.url);
    if(message.method==='Network.responseReceived'&&message.params.response.status>=400)failedRequests.push(`${message.params.response.status} ${message.params.response.url}`);
  });
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:scale,mobile:false});
  const api={
    consoleErrors,failedRequests,requests,send,
    async goto(url) {
      await send('Page.navigate',{url});
      for(let i=0;i<200;i++) {if(await api.eval('document.readyState')==='complete')return;await sleep(100);}
    },
    async eval(expression) {
      const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,timeout:60000});
      if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
      return result.result.value;
    },
    async waitFor(expression,timeout=30000,step=250) {
      const end=Date.now()+timeout;
      while(Date.now()<end) {try {if(await api.eval(expression))return true;} catch {}await sleep(step);}
      return false;
    },
    async screenshot(clip) {
      const {data}=await send('Page.captureScreenshot',{format:'png',...(clip?{clip:{...clip,scale:1}}:{})});
      return Buffer.from(data,'base64');
    },
    async resize(w,h) {await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:scale,mobile:w<600});},
    sleep,
    async close() {
      try {socket.close();} catch {}
      killBrowser();
      await sleep(400);
      try {fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:300});} catch {}
    },
  };
  return api;
}
