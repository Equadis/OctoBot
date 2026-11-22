// Claude Code PreToolUse hook: keeps automated sessions away from production by accident.
//
// Blocks (exit 2, message back to the session):
//   * raw `wrangler r2 object put|delete` and `wrangler r2 bucket ...` on the live bucket (octobot-models; test buckets such as octobot-models-rollbacktest are fine),
//   * `wrangler deploy`, `wrangler rollback` and `wrangler delete` for the Worker,
//   * any write to tools/models/PUBLISH_PERMISSION.json (the owner's hand-made permission file; nobody else makes one),
// unless the command carries the owner's deliberate confirmation, `OCTOBOT_OWNER_CONFIRMED=<the 16-character build>` (for example
// `OCTOBOT_OWNER_CONFIRMED=e073131f8ed6a1e9 npx wrangler deploy`), or a valid permission file exists. OctoWoW has confirmed that no permission document is needed; the marker
// replaces it. A session may type it only when the owner's own chat message tells it to publish that build (a button answer or an earlier "yes" does not count): CLAUDE.md.
// tools/models/upload_overlay.mjs is not blocked here: it refuses the live bucket by itself (publish_guard.mjs, `--owner-confirmed <build> --backup <folder>`).
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
// The marker names a build: 16 hex digits, as in a version.json.
const CONFIRMED=/(?:^|[\s;&|])(?:\$env:)?OCTOBOT_OWNER_CONFIRMED\s*=\s*['"]?[0-9a-f]{16}(?![0-9a-f])/;
const READ_ONLY=/^\s*(?:cat|ls|type|Get-Content|Test-Path|test|\[|stat|head|tail|grep|Select-String)\b/;

/** Returns null to allow, or the reason to block. */
export function decide(input,{permitted=permissionValid()}={}) {
  const tool=input?.tool_name,args=input?.tool_input||{};
  if(['Write','Edit','MultiEdit'].includes(tool)) {
    return /PUBLISH_PERMISSION\.json$/i.test(String(args.file_path||''))?'PUBLISH_PERMISSION.json is the owner\'s hand-made permission file. Do not write it: publishing uses --owner-confirmed <build> instead.':null;
  }
  if(!['Bash','PowerShell'].includes(tool))return null;
  const command=String(args.command||'');
  if(/PUBLISH_PERMISSION/i.test(command)&&!READ_ONLY.test(command))return 'PUBLISH_PERMISSION.json is the owner\'s hand-made permission file. Do not write it: publishing uses --owner-confirmed <build> instead.';
  if(permitted||CONFIRMED.test(command))return null;
  if(RAW_BUCKET_WRITE.test(command)&&LIVE.test(command))return 'This writes to the live bucket "octobot-models" without the owner\'s confirmation. Use a private test bucket, or, when the owner has told you in chat to publish this build, put OCTOBOT_OWNER_CONFIRMED=<build> in the command.';
  if(WORKER_CHANGE.test(command)&&/cloudflare[\/]population|octobot-population|wrangler\.toml/i.test(command+' '+(input?.cwd||'')))return 'This changes the live Worker without the owner\'s confirmation. Ask the owner, or, when they have told you in chat to deploy, put OCTOBOT_OWNER_CONFIRMED=<build> in the command.';
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
