// Local end-to-end server for the model overlay: the real website (docs/) and the real appearance Worker code on one origin, with the Worker's
// MODELS bucket backed by a folder made by build_overlay.py.
//
//   node tools/models/e2e_server.mjs <overlay folder> [port]      then open http://127.0.0.1:<port>/outfitter/
//
// Nothing is uploaded and nothing leaves this machine except the Worker's normal requests to Zam, Wowhead and the OctoWoW database (item lookups).
// /telemetry.json is answered here (pointing the site at this server) so the repository file is not touched. Pass --no-overlay to run the
// Worker with no bucket, i.e. exactly what is deployed today, for a before/after comparison.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {outfitter} from '../../cloudflare/population/src/outfitter.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const docs=path.resolve(here,'..','..','docs');
const args=process.argv.slice(2).filter(a=>!a.startsWith('--'));
const overlay=args[0]&&path.resolve(args[0]);
const port=Number(args[1]||8080);
const noOverlay=process.argv.includes('--no-overlay');
if(!overlay){console.error('usage: node tools/models/e2e_server.mjs <overlay folder> [port] [--no-overlay]');process.exit(2);}

// A file-backed stand-in for an R2 bucket: exact keys only, no listing, never outside the folder.
const bucket={async get(key){
 if(!/^[A-Za-z0-9_./-]+$/.test(key)||key.includes('..'))return null;
 try{return {body:await fs.readFile(path.join(overlay,key))};}catch{return null;}
}};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
const log=[];

http.createServer(async(req,res)=>{
 const url=new URL(req.url,`http://127.0.0.1:${port}`);
 try {
  if(url.pathname==='/telemetry.json'){const body=JSON.stringify({endpoint:`http://127.0.0.1:${port}`});res.writeHead(200,{'content-type':'application/json'});return res.end(body);}
  if(url.pathname.startsWith('/api/outfitter/')){
   const response=await outfitter(new Request(url,{method:req.method,headers:{}}),fetch,noOverlay?{}:{MODELS:bucket});
   log.push(`${response.status} ${url.pathname.replace('/api/outfitter/','')}`);
   // The Worker's own cache headers are passed through, so the browser behaves as it does against the deployed Worker (versioned URLs are cached
   // for good, and a rebuilt overlay has a new version and therefore new URLs).
   res.writeHead(response.status,Object.fromEntries(response.headers));
   return res.end(Buffer.from(await response.arrayBuffer()));
  }
  if(url.pathname==='/__log'){res.writeHead(200,{'content-type':'text/plain'});return res.end(log.join('\n'));}
  let file=path.join(docs,decodeURIComponent(url.pathname));
  if(!file.startsWith(docs)){res.writeHead(403);return res.end();}
  let stat=await fs.stat(file).catch(()=>null);
  if(stat?.isDirectory()){file=path.join(file,'index.html');stat=await fs.stat(file).catch(()=>null);}
  if(!stat){res.writeHead(404);return res.end('not found');}
  res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
  res.end(await fs.readFile(file));
 } catch(error){res.writeHead(500);res.end(String(error));}
}).listen(port,'127.0.0.1',()=>console.log(`serving the site and Worker on http://127.0.0.1:${port}/ (${noOverlay?'no overlay':'overlay from '+overlay})`));
