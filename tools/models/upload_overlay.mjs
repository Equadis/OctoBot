// Uploads a folder made by build_overlay.py to a private Cloudflare R2 bucket, key for key, using wrangler (so it uses your own Cloudflare login).
//
//   node tools/models/upload_overlay.mjs <overlay folder> <bucket name> (--backup <folder> | --no-backup) [--concurrency 8] [--rate 3] [--dry-run]
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
// Nothing is uploaded without you running this yourself; the bucket must already exist (npx wrangler r2 bucket create <name>).
import {exec} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkPublish} from './publish_guard.mjs';

export function contentType(key) {
 return key.endsWith('.json')?'application/json':key.endsWith('.webp')?'image/webp':'application/octet-stream';
}
// Which manifest entries still need uploading, given what a previous run recorded.
// version.json goes last: the site and Worker switch to a new build only once every file of it is in the bucket.
export function plan(manifest,uploaded={}) {
 return Object.entries(manifest.files||{}).filter(([key,info])=>/^[A-Za-z0-9_./-]+$/.test(key)&&!key.includes('..')&&uploaded[key]!==info.sha256).map(([key,info])=>({key,sha256:info.sha256,bytes:info.bytes})).sort((a,b)=>(a.key==='version.json')-(b.key==='version.json'));
}
// Flags that take a value; everything else starting with -- is a switch. What is left are the positional arguments.
const VALUE_FLAGS=['--concurrency','--rate','--backup'];
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
 // A live bucket is only written with the owner's permission file for exactly this build (publish_guard.mjs); test buckets and backup restores pass.
 const build=await fs.readFile(path.join(folder,'version.json'),'utf8').then(text=>JSON.parse(text).version,()=>manifest.version||null);
 const gate=checkPublish({bucket,build,manifest});
 if(!gate.ok&&!dry){console.error(`Refusing to upload to "${bucket}": ${gate.reason}`);return 3;}
 const stateFile=path.join(folder,'.uploaded.json');
 const uploaded=argv.includes('--force')?{}:await fs.readFile(stateFile,'utf8').then(JSON.parse,()=>({}));
 const todo=plan(manifest,uploaded);
 const total=todo.reduce((sum,f)=>sum+f.bytes,0);
 console.log(`${todo.length} of ${Object.keys(manifest.files).length} files to upload (${(total/1e6).toFixed(1)} MB) to bucket "${bucket}"${dry?' (dry run: nothing sent)':''}`);
 if(dry||!todo.length)return 0;
 let next=0,done=0,failed=[],slot=0;
 const saved={};
 if(backupDir)await fs.mkdir(backupDir,{recursive:true});
 const last=todo.filter(f=>f.key==='version.json'),rest=todo.filter(f=>f.key!=='version.json');
 async function worker(queue) {
  while(next<queue.length) {
   const file=queue[next++];
   const command=`npx --yes wrangler r2 object put "${bucket}/${file.key}" --file "${path.join(folder,file.key)}" --content-type "${contentType(file.key)}" --remote`;
   let error=null;
   const pace=async()=>{const wait=Math.max(0,(slot=Math.max(slot,Date.now())+1000/rate)-1000/rate-Date.now());if(wait)await new Promise(r=>setTimeout(r,wait));};
   if(backupDir) {
    // Save what the bucket holds under this key before it is overwritten. A key that is not there yet has nothing to save; any other failure stops this file.
    const target=path.join(backupDir,file.key);
    await fs.mkdir(path.dirname(target),{recursive:true});
    for(let attempt=0;attempt<6;attempt++){
     await pace();
     try{await run(`npx --yes wrangler r2 object get "${bucket}/${file.key}" --file "${target}" --remote`);const bytes=await fs.readFile(target);saved[file.key]={bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};error=null;break;}
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
 if(!failed.length){next=0;await worker(last);}else console.log('  version.json NOT uploaded because some files failed; rerun to finish.');
 await fs.writeFile(stateFile,JSON.stringify(uploaded));
 if(backupDir){await fs.writeFile(path.join(backupDir,'manifest.json'),JSON.stringify({files:saved,note:'previous bucket content of every overwritten key'},null,1));console.log(`  backed up ${Object.keys(saved).length} existing objects to ${backupDir}; restore with: node tools/models/upload_overlay.mjs ${backupDir} ${bucket} --no-backup`);}
 console.log(`uploaded ${done} of ${todo.length}, failed ${failed.length}`);
 failed.slice(0,5).forEach(line=>console.log('  FAILED',line));
 return failed.length?1:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).then(code=>process.exit(code));
