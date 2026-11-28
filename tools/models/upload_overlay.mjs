// Uploads a folder made by build_overlay.py to a private Cloudflare R2 bucket, key for key, using wrangler (so it uses your own Cloudflare login).
//
//   node tools/models/upload_overlay.mjs <overlay folder> <bucket name> (--backup <folder> | --no-backup) [--concurrency 8] [--rate 3] [--dry-run] [--hold-version] [--bulk --previous <folder> [--batch 400]]
// --backup downloads the object a key already has in the bucket into <folder> before overwriting it (a new key has nothing to save), and writes
// <folder>/manifest.json in this tool's own format, so the previous state of every overwritten key, version.json included, can be put back with
//   node tools/models/upload_overlay.mjs <folder> <bucket name> --no-backup
// Restoring the version pointer alone is not a rollback when keys keep their names but change content (helms.json, textures), so a run that
// overwrites anything must say how to undo it: --backup <folder>, or --no-backup to say you have another copy.
// --rate is the most uploads started per second. Cloudflare's API allows about 1,200 requests per 5 minutes (4 a second) per user and answers
// 429 above that, so the default is 3; a 429 is retried after a pause instead of failing the file.
//
// --force ignores what .uploaded.json remembers and sends every file again. A rollback needs it: a backup folder keeps its own record after a first
// restore, so a second restore without --force would skip every file even if the bucket has changed since.
//
// Resumable: each uploaded file's sha256 is remembered in <overlay folder>/.uploaded.json, so a rerun only sends what is new or changed.
// --hold-version uploads everything except version.json (the switch that makes visitors use the new build); run again without it to activate. A backup folder may be reused by that second run.
// A live bucket also needs --owner-confirmed <the folder's build> (publish_guard.mjs).
// Nothing is uploaded without you running this yourself; the bucket must already exist (npx wrangler r2 bucket create <name>).
import {exec,spawn} from 'node:child_process';
import os from 'node:os';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkPublish,isTestBucket,isRestoreFolder} from './publish_guard.mjs';

export function contentType(key) {
 return key.endsWith('.json')?'application/json':key.endsWith('.webp')?'image/webp':'application/octet-stream';
}
// Which manifest entries still need uploading, given what a previous run recorded.
// version.json goes last: the site and Worker switch to a new build only once every file of it is in the bucket.
export function plan(manifest,uploaded={}) {
 return Object.entries(manifest.files||{}).filter(([key,info])=>/^[A-Za-z0-9_./-]+$/.test(key)&&!key.includes('..')&&uploaded[key]!==info.sha256).map(([key,info])=>({key,sha256:info.sha256,bytes:info.bytes})).sort((a,b)=>(a.key==='version.json')-(b.key==='version.json'));
}
// Flags that take a value; everything else starting with -- is a switch. What is left are the positional arguments.
// WRANGLER_BIN=<path to wrangler.js> skips the slow `npx` start for every file (the machine is CPU-bound on process starts, not on the network).
const WRANGLER=process.env.WRANGLER_BIN?`node "${process.env.WRANGLER_BIN}"`:'npx --yes wrangler';
const VALUE_FLAGS=['--concurrency','--rate','--backup','--owner-confirmed','--previous','--batch'];
export function positional(argv) {
 const out=[];
 for(let i=0;i<argv.length;i++){if(VALUE_FLAGS.includes(argv[i])){i++;continue;}if(!argv[i].startsWith('--'))out.push(argv[i]);}
 return out;
}
// wrangler's message when a key is not in the bucket yet (nothing to back up).
export function isMissingKey(message) {return /does not exist|not found|10007|NoSuchKey/i.test(message||'');}
function run(command) {
 return new Promise((resolve,reject)=>exec(command,{cwd:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..','cloudflare','population'),maxBuffer:1<<24},(error,stdout,stderr)=>error?reject(new Error((stderr||stdout||error.message).trim().split('\n').slice(-3).join(' '))):resolve(stdout)));
}

// --bulk: one wrangler process per batch (`wrangler r2 bulk put`, a persistent connection and its own small worker pool) instead of one process per file, which saturates a PC's CPU
// with process starts. The process runs at below-normal priority and its children inherit it. Overwritten objects are not fetched one by one: --previous <folder> is the verified local
// copy of the build that is live now (its manifest.json says what each key held), and the backup folder is filled from it, so the backup is complete before anything is overwritten.
// Uploaded keys are recorded in .uploaded.json per batch; checking the bytes through the Worker is a separate step (verify_remote.py).
async function bulkUpload({folder,bucket,todo,uploaded,stateFile,backupDir,manifest,build,gate,argv}) {
 const arg=name=>{const at=argv.indexOf(name);return at>=0?argv[at+1]:null;};
 const previousDir=arg('--previous')?path.resolve(arg('--previous')):null;
 const workers=Math.max(1,Math.min(8,Number(arg('--concurrency'))||3)),batch=Math.max(20,Math.min(1000,Number(arg('--batch'))||400));
 if(backupDir&&!previousDir){console.error('--bulk with --backup needs --previous <folder>: the verified local copy of the build that is live (its manifest.json).');return 2;}
 try{os.setPriority(process.pid,os.constants.priority.PRIORITY_BELOW_NORMAL);}catch{}
 const hold=argv.includes('--hold-version');
 const files=todo.filter(f=>f.key!=='version.json');
 if(backupDir) {
  await fs.mkdir(backupDir,{recursive:true});
  const previous=JSON.parse(await fs.readFile(path.join(previousDir,'manifest.json'),'utf8')).files||{};
  const saved=await fs.readFile(path.join(backupDir,'manifest.json'),'utf8').then(text=>JSON.parse(text).files||{},()=>({}));
  let copied=0;
  for(const file of todo) {
   const old=previous[file.key];
   if(!old)continue; // a key the live build does not have: nothing to save
   const target=path.join(backupDir,file.key);
   const have=await fs.readFile(target).catch(()=>null);
   if(!have||createHash('sha256').update(have).digest('hex')!==old.sha256) {
    const bytes=await fs.readFile(path.join(previousDir,file.key));
    if(createHash('sha256').update(bytes).digest('hex')!==old.sha256){console.error(`The local copy of ${file.key} does not match its manifest; refusing to build a backup from it.`);return 1;}
    await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);copied++;
   }
   saved[file.key]={bytes:old.bytes,sha256:old.sha256};
  }
  await fs.writeFile(path.join(backupDir,'manifest.json'),JSON.stringify({files:saved,note:'previous bucket content of every overwritten key'},null,1));
  console.log(`  backup: ${Object.keys(saved).length} overwritten keys saved in ${backupDir} (${copied} copied now from ${previousDir})`);
 }
 const groups=new Map();
 for(const file of files){const type=contentType(file.key);if(!groups.has(type))groups.set(type,[]);groups.get(type).push(file);}
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'octobot-bulk-'));
 const wranglerArgs=process.env.WRANGLER_BIN?[process.env.WRANGLER_BIN]:null;
 let done=0,failed=0;
 for(const [type,list] of groups) {
  for(let at=0;at<list.length;at+=batch) {
   const slice=list.slice(at,at+batch),listFile=path.join(tmp,`list-${done}.json`);
   await fs.writeFile(listFile,JSON.stringify(slice.map(f=>({key:f.key,file:path.join(folder,f.key)}))));
   const argvList=['r2','bulk','put',bucket,'--filename',listFile,'--concurrency',String(workers),'--content-type',type,'--remote','-y'];
   const code=await new Promise(resolve=>{
    const child=wranglerArgs?spawn(process.execPath,[...wranglerArgs,...argvList],{stdio:'ignore'}):spawn(process.platform==='win32'?'npx.cmd':'npx',['--yes','wrangler',...argvList],{stdio:'ignore',shell:process.platform==='win32'});
    child.on('exit',c=>resolve(c));child.on('error',()=>resolve(1));
   });
   if(code===0){for(const f of slice)uploaded[f.key]=f.sha256;done+=slice.length;}else{failed+=slice.length;console.log(`  batch of ${slice.length} (${type}) FAILED with exit ${code}; rerun to retry it`);}
   await fs.writeFile(stateFile,JSON.stringify(uploaded));
   console.log(`  ${done} / ${files.length}${failed?` (${failed} failed)`:''}`);
  }
 }
 await fs.rm(tmp,{recursive:true,force:true});
 if(backupDir&&gate.ok&&!isTestBucket(bucket)&&!isRestoreFolder(manifest))await fs.writeFile(path.join(backupDir,'publish-record.json'),JSON.stringify({bucket,build,gate:gate.why,at:new Date().toISOString(),mode:'bulk',uploaded:done,failed},null,1));
 console.log(`bulk uploaded ${done} of ${files.length}, failed ${failed}${todo.some(f=>f.key==='version.json')?'; version.json NOT uploaded (verify the files first, then run without --bulk or --hold-version)':''}`);
 return failed?1:0;
}

async function main(argv) {
 const args=positional(argv);
 const dry=argv.includes('--dry-run');
 const at=argv.indexOf('--concurrency'),workers=at>=0?Math.max(1,Math.min(32,Number(argv[at+1])||8)):8;
 const rateAt=argv.indexOf('--rate'),rate=rateAt>=0?Math.max(0.2,Math.min(10,Number(argv[rateAt+1])||3)):3;
 const backupAt=argv.indexOf('--backup'),backupDir=backupAt>=0&&argv[backupAt+1]?path.resolve(argv[backupAt+1]):null;
 if(args.length<2||(!backupDir&&!argv.includes('--no-backup')&&!argv.includes('--dry-run'))){console.error('usage: node tools/models/upload_overlay.mjs <overlay folder> <bucket name> (--backup <folder> | --no-backup) [--concurrency 8] [--rate 3] [--dry-run]');return 2;}
 const [folder,bucket]=[path.resolve(args[0]),args[1]];
 if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)){console.error('That does not look like a bucket name.');return 2;}
 const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
 // A live bucket is only written with --owner-confirmed <this folder's exact build> and --backup (or the owner's permission file for this build); see publish_guard.mjs. Test buckets and backup restores pass.
 const build=await fs.readFile(path.join(folder,'version.json'),'utf8').then(text=>JSON.parse(text).version,()=>manifest.version||null);
 const confirmedAt=argv.indexOf('--owner-confirmed'),confirmed=confirmedAt>=0?(argv[confirmedAt+1]||''):null;
 const gate=checkPublish({bucket,build,manifest,confirmed,backup:Boolean(backupDir)});
 if(!gate.ok&&!dry){console.error(`Refusing to upload to "${bucket}": ${gate.reason}`);return 3;}
 console.log(`gate: ${gate.why||'dry run'} (bucket ${bucket}, build ${build})`);
 const stateFile=path.join(folder,'.uploaded.json');
 const uploaded=argv.includes('--force')?{}:await fs.readFile(stateFile,'utf8').then(JSON.parse,()=>({}));
 const todo=plan(manifest,uploaded);
 const total=todo.reduce((sum,f)=>sum+f.bytes,0);
 console.log(`${todo.length} of ${Object.keys(manifest.files).length} files to upload (${(total/1e6).toFixed(1)} MB) to bucket "${bucket}"${dry?' (dry run: nothing sent)':''}`);
 if(dry||!todo.length)return 0;
 if(argv.includes('--bulk'))return bulkUpload({folder,bucket,todo,uploaded,stateFile,backupDir,manifest,build,gate,argv});
 let next=0,done=0,failed=[],slot=0;
 const saved={};
 if(backupDir)await fs.mkdir(backupDir,{recursive:true});
 const last=todo.filter(f=>f.key==='version.json'),rest=todo.filter(f=>f.key!=='version.json');
 async function worker(queue) {
  while(next<queue.length) {
   const file=queue[next++];
   const command=`${WRANGLER} r2 object put "${bucket}/${file.key}" --file "${path.join(folder,file.key)}" --content-type "${contentType(file.key)}" --remote`;
   let error=null;
   const pace=async()=>{const wait=Math.max(0,(slot=Math.max(slot,Date.now())+1000/rate)-1000/rate-Date.now());if(wait)await new Promise(r=>setTimeout(r,wait));};
   if(backupDir) {
    // Save what the bucket holds under this key before it is overwritten. A key that is not there yet has nothing to save; any other failure stops this file.
    const target=path.join(backupDir,file.key);
    await fs.mkdir(path.dirname(target),{recursive:true});
    for(let attempt=0;attempt<6;attempt++){
     await pace();
     try{await run(`${WRANGLER} r2 object get "${bucket}/${file.key}" --file "${target}" --remote`);const bytes=await fs.readFile(target);saved[file.key]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};error=null;break;}
     catch(e){if(isMissingKey(e.message)){error=null;break;}error=e;await new Promise(r=>setTimeout(r,/429|Too Many/i.test(e.message)?15000*(attempt+1):2000*(attempt+1)));}
    }
    if(error){failed.push(`${file.key}: could not back up the existing object (${error.message}); not overwritten`);continue;}
   }
   for(let attempt=0;attempt<6;attempt++){
    await pace();
    try{await run(command);error=null;break;}catch(e){error=e;await new Promise(r=>setTimeout(r,/429|Too Many/i.test(e.message)?15000*(attempt+1):2000*(attempt+1)));}
   }
   if(error){failed.push(`${file.key}: ${error.message}`);continue;}
   uploaded[file.key]=file.sha256;done++;
   if(done%50===0){await fs.writeFile(stateFile,JSON.stringify(uploaded));console.log(`  ${done} / ${todo.length}`);}
  }
 }
 await Promise.all(Array.from({length:workers},()=>worker(rest)));
 const hold=argv.includes('--hold-version');
 if(failed.length)console.log('  version.json NOT uploaded because some files failed; rerun to finish.');
 else if(hold&&last.length)console.log('  version.json HELD back (--hold-version): the new build is not active yet. Run the same command without --hold-version to activate it.');
 else {next=0;await worker(last);}
 await fs.writeFile(stateFile,JSON.stringify(uploaded));
 if(backupDir&&gate.ok&&!isTestBucket(bucket)&&!isRestoreFolder(manifest))await fs.writeFile(path.join(backupDir,'publish-record.json'),JSON.stringify({bucket,build,gate:gate.why,at:new Date().toISOString(),uploaded:done,failed:failed.length},null,1));
 if(backupDir){const before=await fs.readFile(path.join(backupDir,'manifest.json'),'utf8').then(text=>JSON.parse(text).files||{},()=>({}));Object.assign(saved,{...before,...saved});await fs.writeFile(path.join(backupDir,'manifest.json'),JSON.stringify({files:saved,note:'previous bucket content of every overwritten key'},null,1));console.log(`  backed up ${Object.keys(saved).length} existing objects to ${backupDir}; restore with: node tools/models/upload_overlay.mjs ${backupDir} ${bucket} --no-backup`);}
 console.log(`uploaded ${done} of ${todo.length}, failed ${failed.length}`);
 failed.slice(0,5).forEach(line=>console.log('  FAILED',line));
 return failed.length?1:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).then(code=>process.exit(code));
