// The gate in front of every upload to a bucket that is not a private test bucket.
//
// Why it exists: on 2026-11-22 a one-click "Yes, upload it" answer started an upload to the live bucket 17 seconds later, which a new instruction then interrupted after 12 files.
// A button or a passing answer must never be enough to write the live bucket. OctoWoW has since confirmed that the owner may use and redistribute the converted files and that no
// permission document is required, so the gate no longer asks for one. It asks for a deliberate, exact act instead. A live bucket is written only when the command itself says
// `--owner-confirmed <build>`, where <build> is the version of the folder being uploaded (from its version.json): the exact 16-character build, typed out, which cannot be
// produced by a default, a typo or a different build. The live bucket also needs `--backup`: an upload that overwrites nothing is recoverable, one without a backup is not.
// The older route still works: a tools/models/PUBLISH_PERMISSION.json made by hand for exactly that build (git-ignored) is accepted as before.
//
// Only the owner's own instruction justifies the flag. Automated sessions must not add it on their own, on a button answer, or on an earlier "yes"
// (.claude/hooks/protect-live-bucket.mjs and CLAUDE.md say the same). A restore from a --backup folder (the documented rollback) needs no flag, because it only puts back what was live.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const PERMISSION_FILE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'PUBLISH_PERMISSION.json');
// Private buckets used for tests may be written freely; everything else is treated as live.
export const isTestBucket=name=>/(?:^|-)(?:test|staging|rollbacktest)$/.test(name);

/** A folder written by `upload_overlay.mjs --backup` marks itself; restoring it puts back what the bucket held before. */
export function isRestoreFolder(manifest) {return typeof manifest?.note==='string'&&manifest.note.startsWith('previous bucket content');}

/** Returns {ok:true} or {ok:false, reason}. `build` is the version of the folder being uploaded (null when it has none), `confirmed` the value of
 * --owner-confirmed (or null), `backup` whether a backup folder was given. */
export function checkPublish({bucket,build,manifest,confirmed=null,backup=false,now=new Date(),read=file=>fs.readFileSync(file,'utf8')}) {
  if(isTestBucket(bucket))return {ok:true,why:'test bucket'};
  if(isRestoreFolder(manifest))return {ok:true,why:'restore of a backup'};
  if(confirmed!==null&&confirmed!==undefined) {
    if(!build)return {ok:false,reason:'--owner-confirmed needs a folder with a version.json: this folder has no build version.'};
    if(confirmed!==build)return {ok:false,reason:`--owner-confirmed names build "${confirmed}" but this folder is build ${build}. Type the exact build you mean to publish.`};
    if(!backup)return {ok:false,reason:`"${bucket}" is a live bucket: an owner-confirmed upload needs --backup <folder> so it can be undone.`};
    return {ok:true,why:`owner-confirmed for build ${build}`};
  }
  let grant;
  try {grant=JSON.parse(read(PERMISSION_FILE));} catch {return {ok:false,reason:`"${bucket}" is a live bucket. Add --owner-confirmed <build> --backup <folder> (the exact build of this folder) to publish to it deliberately.`};}
  if(grant.bucket!==bucket)return {ok:false,reason:`the permission file is for bucket "${grant.bucket}", not "${bucket}".`};
  if(!build||grant.version!==build)return {ok:false,reason:`the permission file is for build ${grant.version}, this folder is build ${build||'(unknown)'}.`};
  if(typeof grant.granted_by!=='string'||!grant.granted_by.trim()||typeof grant.agreement!=='string'||!grant.agreement.trim())return {ok:false,reason:'the permission file must name who granted it (granted_by) and where OctoWoW agreed (agreement).'};
  const expires=Date.parse(grant.expires);
  if(!Number.isFinite(expires)||expires<now.getTime())return {ok:false,reason:'the permission has expired or has no valid expires date.'};
  return {ok:true,why:`permitted by ${grant.granted_by}`};
}
