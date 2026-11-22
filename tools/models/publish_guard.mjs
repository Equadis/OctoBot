// The gate in front of every upload to a bucket that is not a private test bucket.
//
// Why it exists: converted client files must not be published without OctoWoW's agreement (README.md), and on 2026-11-22 a one-click "Yes, upload it" answer started an upload to the
// live bucket 17 seconds later, which a new instruction then interrupted after 12 files. An answer in a chat box is not the agreement. The live bucket therefore refuses to be written
// unless the owner has created tools/models/PUBLISH_PERMISSION.json by hand for exactly that build:
//
//   {"bucket":"octobot-models","version":"<the build's version, from its version.json>","granted_by":"<name>","agreement":"<where OctoWoW agreed>","expires":"<ISO date>"}
//
// The file is git-ignored. Nobody else (and no automated session) may create it: .claude/hooks/protect-live-bucket.mjs blocks agents from writing it, and from running
// uploads or Worker deploys without it. A restore from a --backup folder (the documented rollback) is allowed without the file, because it only puts back what was live.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const PERMISSION_FILE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'PUBLISH_PERMISSION.json');
// Private buckets used for tests may be written freely; everything else is treated as live.
export const isTestBucket=name=>/(?:^|-)(?:test|staging|rollbacktest)$/.test(name);

/** A folder written by `upload_overlay.mjs --backup` marks itself; restoring it puts back what the bucket held before. */
export function isRestoreFolder(manifest) {return typeof manifest?.note==='string'&&manifest.note.startsWith('previous bucket content');}

/** Returns {ok:true} or {ok:false, reason}. `build` is the version of the folder being uploaded (null when it has none). */
export function checkPublish({bucket,build,manifest,now=new Date(),read=file=>fs.readFileSync(file,'utf8')}) {
  if(isTestBucket(bucket))return {ok:true,why:'test bucket'};
  if(isRestoreFolder(manifest))return {ok:true,why:'restore of a backup'};
  let grant;
  try {grant=JSON.parse(read(PERMISSION_FILE));} catch {return {ok:false,reason:`"${bucket}" is a live bucket and ${PERMISSION_FILE} does not exist. Publishing needs the owner's written permission (README.md).`};}
  if(grant.bucket!==bucket)return {ok:false,reason:`the permission file is for bucket "${grant.bucket}", not "${bucket}".`};
  if(!build||grant.version!==build)return {ok:false,reason:`the permission file is for build ${grant.version}, this folder is build ${build||'(unknown)'}.`};
  if(typeof grant.granted_by!=='string'||!grant.granted_by.trim()||typeof grant.agreement!=='string'||!grant.agreement.trim())return {ok:false,reason:'the permission file must name who granted it (granted_by) and where OctoWoW agreed (agreement).'};
  const expires=Date.parse(grant.expires);
  if(!Number.isFinite(expires)||expires<now.getTime())return {ok:false,reason:'the permission has expired or has no valid expires date.'};
  return {ok:true,why:`permitted by ${grant.granted_by}`};
}
