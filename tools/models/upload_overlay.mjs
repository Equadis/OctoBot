// Uploads a folder made by build_overlay.py to a private Cloudflare R2 bucket, key for key, using wrangler (so it uses your own Cloudflare login).
//
//   node tools/models/upload_overlay.mjs <overlay folder> <bucket name> [--concurrency 8] [--dry-run]
//
// Resumable: each uploaded file's sha256 is remembered in <overlay folder>/.uploaded.json, so a rerun only sends what is new or changed.
// Nothing is uploaded without you running this yourself; the bucket must already exist (npx wrangler r2 bucket create <name>).
import {exec} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function contentType(key) {
 return key.endsWith('.json')?'application/json':key.endsWith('.webp')?'image/webp':'application/octet-stream';
}
// Which manifest entries still need uploading, given what a previous run recorded.
// version.json goes last: the site and Worker switch to a new build only once every file of it is in the bucket.
export function plan(manifest,uploaded={}) {
 return Object.entries(manifest.files||{}).filter(([key,info])=>/^[A-Za-z0-9_./-]+$/.test(key)&&!key.includes('..')&&uploaded[key]!==info.sha256).map(([key,info])=>({key,sha256:info.sha256,bytes:info.bytes})).sort((a,b)=>(a.key==='version.json')-(b.key==='version.json'));
}
function run(command) {
 return new Promise((resolve,reject)=>exec(command,{cwd:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..','cloudflare','population'),maxBuffer:1<<24},(error,stdout,stderr)=>error?reject(new Error((stderr||stdout||error.message).trim().split('\n').slice(-3).join(' '))):resolve(stdout)));
}

async function main(argv) {
 const args=argv.filter(a=>!a.startsWith('--')&&!/^\d+$/.test(a));
 const dry=argv.includes('--dry-run');
 const at=argv.indexOf('--concurrency'),workers=at>=0?Math.max(1,Math.min(32,Number(argv[at+1])||8)):8;
 if(args.length<2){console.error('usage: node tools/models/upload_overlay.mjs <overlay folder> <bucket name> [--concurrency 8] [--dry-run]');return 2;}
 const [folder,bucket]=[path.resolve(args[0]),args[1]];
 if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)){console.error('That does not look like a bucket name.');return 2;}
 const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
 const stateFile=path.join(folder,'.uploaded.json');
 const uploaded=await fs.readFile(stateFile,'utf8').then(JSON.parse,()=>({}));
 const todo=plan(manifest,uploaded);
 const total=todo.reduce((sum,f)=>sum+f.bytes,0);
 console.log(`${todo.length} of ${Object.keys(manifest.files).length} files to upload (${(total/1e6).toFixed(1)} MB) to bucket "${bucket}"${dry?' (dry run: nothing sent)':''}`);
 if(dry||!todo.length)return 0;
 let next=0,done=0,failed=[];
 const last=todo.filter(f=>f.key==='version.json'),rest=todo.filter(f=>f.key!=='version.json');
 async function worker(queue) {
  while(next<queue.length) {
   const file=queue[next++];
   const command=`npx --yes wrangler r2 object put "${bucket}/${file.key}" --file "${path.join(folder,file.key)}" --content-type "${contentType(file.key)}" --remote`;
   let error=null;
   for(let attempt=0;attempt<3;attempt++){try{await run(command);error=null;break;}catch(e){error=e;}}
   if(error){failed.push(`${file.key}: ${error.message}`);continue;}
   uploaded[file.key]=file.sha256;done++;
   if(done%50===0){await fs.writeFile(stateFile,JSON.stringify(uploaded));console.log(`  ${done} / ${todo.length}`);}
  }
 }
 await Promise.all(Array.from({length:workers},()=>worker(rest)));
 if(!failed.length){next=0;await worker(last);}else console.log('  version.json NOT uploaded because some files failed; rerun to finish.');
 await fs.writeFile(stateFile,JSON.stringify(uploaded));
 console.log(`uploaded ${done} of ${todo.length}, failed ${failed.length}`);
 failed.slice(0,5).forEach(line=>console.log('  FAILED',line));
 return failed.length?1:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).then(code=>process.exit(code));
