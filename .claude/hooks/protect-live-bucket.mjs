// Claude Code PreToolUse hook: keeps automated sessions away from production.
//
// Blocks (exit 2, message back to the session):
//   * raw `wrangler r2 object put|delete` and `wrangler r2 bucket ...` on the live bucket (octobot-models; test buckets such as octobot-models-rollbacktest are fine),
//   * `wrangler deploy`, `wrangler rollback` and `wrangler delete` for the Worker,
//   * any write to tools/models/PUBLISH_PERMISSION.json (only the owner creates it, by hand),
// unless the owner's permission file already exists and is valid. tools/models/upload_overlay.mjs is not blocked here: it refuses the live bucket by itself
// (publish_guard.mjs), and a restore from a --backup folder is allowed there. Nothing here can stop the owner: run the command in your own terminal.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const permissionFile=path.join(root,'tools','models','PUBLISH_PERMISSION.json');

export function permissionValid(read=file=>fs.readFileSync(file,'utf8'),now=new Date()) {
  try {
    const grant=JSON.parse(read(permissionFile));
    return typeof grant.granted_by==='string'&&grant.granted_by.trim()!==''&&typeof grant.agreement==='string'&&grant.agreement.trim()!==''&&Date.parse(grant.expires)>now.getTime();
  } catch {return false;}
}

const LIVE=/octobot-models(?![\w-])/;
const RAW_BUCKET_WRITE=/wrangler[^|;&\n]*\br2\s+(?:object\s+(?:put|delete)|bucket\s+(?:create|delete))\b/i;
const WORKER_CHANGE=/wrangler[^|;&\n]*\b(?:deploy|rollback|delete)\b/i;
const READ_ONLY=/^\s*(?:cat|ls|type|Get-Content|Test-Path|test|\[|stat|head|tail|grep|Select-String)\b/;

/** Returns null to allow, or the reason to block. */
export function decide(input,{permitted=permissionValid()}={}) {
  const tool=input?.tool_name,args=input?.tool_input||{};
  if(['Write','Edit','MultiEdit'].includes(tool)) {
    return /PUBLISH_PERMISSION\.json$/i.test(String(args.file_path||''))?'PUBLISH_PERMISSION.json is the owner\'s permission to publish. Only the owner creates it, by hand. Do not write it.':null;
  }
  if(!['Bash','PowerShell'].includes(tool))return null;
  const command=String(args.command||'');
  if(/PUBLISH_PERMISSION/i.test(command)&&!READ_ONLY.test(command))return 'PUBLISH_PERMISSION.json is the owner\'s permission to publish. Only the owner creates it, by hand. Do not write it.';
  if(permitted)return null;
  if(RAW_BUCKET_WRITE.test(command)&&LIVE.test(command))return 'This writes to the live bucket "octobot-models" without the owner\'s permission file (tools/models/PUBLISH_PERMISSION.json). Use a private test bucket, or ask the owner.';
  if(WORKER_CHANGE.test(command)&&/cloudflare[\/]population|octobot-population|wrangler\.toml/i.test(command+' '+(input?.cwd||'')))return 'This changes the live Worker without the owner\'s permission file (tools/models/PUBLISH_PERMISSION.json). Ask the owner.';
  return null;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  let text='';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data',chunk=>{text+=chunk;});
  process.stdin.on('end',()=>{
    let input={};try {input=JSON.parse(text);} catch {}
    const reason=decide(input);
    if(reason){process.stderr.write(`Blocked by .claude/hooks/protect-live-bucket.mjs: ${reason}\n`);process.exit(2);}
    process.exit(0);
  });
}
