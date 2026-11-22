import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkPublish,isTestBucket,isRestoreFolder} from '../tools/models/publish_guard.mjs';
import {decide} from '../.claude/hooks/protect-live-bucket.mjs';

const now=new Date('2026-11-22T12:00:00Z');
const grant=(over={})=>JSON.stringify({bucket:'octobot-models',version:'abc123',granted_by:'Owner',agreement:'Discord, 2026-11-20',expires:'2026-12-01T00:00:00Z',...over});
const check=(over={},read)=>checkPublish({bucket:'octobot-models',build:'abc123',manifest:{files:{}},now,read:read||(()=>grant(over)),...(over.__args||{})});

test('test buckets and backup restores pass without a permission file; the live bucket does not',()=>{
  const none=()=>{throw Error('missing');};
  assert.equal(checkPublish({bucket:'octobot-models-rollbacktest',build:'x',manifest:{},now,read:none}).ok,true);
  assert.equal(checkPublish({bucket:'octobot-models-staging',build:'x',manifest:{},now,read:none}).ok,true);
  assert.equal(checkPublish({bucket:'octobot-models',build:'x',manifest:{note:'previous bucket content of every overwritten key'},now,read:none}).ok,true);
  const refused=checkPublish({bucket:'octobot-models',build:'x',manifest:{files:{}},now,read:none});
  assert.equal(refused.ok,false);assert.match(refused.reason,/live bucket.*--owner-confirmed/);
  assert.equal(isTestBucket('octobot-models'),false);assert.equal(isTestBucket('octobot-models-test'),true);assert.equal(isTestBucket('octobot-models-tester'),false);
  assert.equal(isRestoreFolder({}),false);
});

test('a permission is for one bucket and one build, names who granted it and where OctoWoW agreed, and expires',()=>{
  assert.equal(check().ok,true);
  assert.match(checkPublish({bucket:'octobot-models',build:'other',manifest:{},now,read:()=>grant()}).reason,/build abc123, this folder is build other/);
  assert.match(checkPublish({bucket:'octobot-models',build:null,manifest:{},now,read:()=>grant()}).reason,/unknown/);
  assert.match(checkPublish({bucket:'octobot-models',build:'abc123',manifest:{},now,read:()=>grant({bucket:'elsewhere'})}).reason,/bucket "elsewhere"/);
  assert.match(checkPublish({bucket:'octobot-models',build:'abc123',manifest:{},now,read:()=>grant({agreement:''})}).reason,/where OctoWoW agreed/);
  assert.match(checkPublish({bucket:'octobot-models',build:'abc123',manifest:{},now,read:()=>grant({granted_by:' '})}).reason,/who granted/);
  assert.match(checkPublish({bucket:'octobot-models',build:'abc123',manifest:{},now,read:()=>grant({expires:'2026-11-01T00:00:00Z'})}).reason,/expired/);
  assert.match(checkPublish({bucket:'octobot-models',build:'abc123',manifest:{},now,read:()=>'not json'}).reason,/live bucket/);
});

test('an owner-confirmed upload names the exact build and has a backup; anything else is refused without a document',()=>{
  const none=()=>{throw Error('missing');};
  const go=(over={})=>checkPublish({bucket:'octobot-models',build:'e073131f8ed6a1e9',manifest:{files:{}},confirmed:'e073131f8ed6a1e9',backup:true,now,read:none,...over});
  assert.deepEqual(go(),{ok:true,why:'owner-confirmed for build e073131f8ed6a1e9'});
  assert.match(go({confirmed:'99d527b265d60c45'}).reason,/names build "99d527b265d60c45" but this folder is build e073131f8ed6a1e9/);
  assert.match(go({confirmed:''}).reason,/names build ""/,'a bare flag is not a confirmation');
  assert.match(go({backup:false}).reason,/needs --backup/);
  assert.match(go({build:null}).reason,/no build version/);
  assert.match(checkPublish({bucket:'octobot-models',build:'e073131f8ed6a1e9',manifest:{files:{}},now,read:none}).reason,/--owner-confirmed <build> --backup/,'no flag, no upload');
  assert.equal(checkPublish({bucket:'octobot-models',build:'x',manifest:{files:{}},confirmed:null,backup:true,now,read:none}).ok,false);
});

const bash=command=>({tool_name:'Bash',tool_input:{command},cwd:'C:/repo'});
test('the hook blocks raw live-bucket writes and Worker changes without the owner confirming, and allows everything else',()=>{
  const no={permitted:false};
  for(const c of ['npx wrangler r2 object put "octobot-models/textures/1.webp" --file x --remote','cd cloudflare/population && npx wrangler r2 object delete octobot-models/helms.json --remote','wrangler r2 bucket delete octobot-models'])
    assert.match(decide(bash(c),no),/live bucket/,c);
  for(const c of ['cd cloudflare/population && npx wrangler deploy','npx --yes wrangler rollback 2f969ef2 -y --config cloudflare/population/wrangler.toml'])
    assert.match(decide(bash(c),no),/live Worker/,c);
  for(const c of ['npx wrangler r2 object put "octobot-models-rollbacktest/a" --file x --remote','npx wrangler r2 object get octobot-models/version.json --remote --pipe','npx wrangler deployments list',
                  'node tools/models/upload_overlay.mjs out octobot-models --backup b','git status','npx wrangler r2 bucket create octobot-models-rollbacktest'])
    assert.equal(decide(bash(c),no),null,c);
  assert.equal(decide(bash('npx wrangler r2 object put "octobot-models/a" --file x --remote'),{permitted:true}),null);
  // the owner's deliberate confirmation names a 16-character build; a partial, a missing or a word is not one
  for(const c of ['OCTOBOT_OWNER_CONFIRMED=e073131f8ed6a1e9 npx wrangler deploy','cd cloudflare/population && OCTOBOT_OWNER_CONFIRMED=e073131f8ed6a1e9 npx wrangler deploy',
                  '$env:OCTOBOT_OWNER_CONFIRMED="e073131f8ed6a1e9"; npx wrangler deploy','OCTOBOT_OWNER_CONFIRMED=e073131f8ed6a1e9 npx wrangler r2 object put "octobot-models/a" --file x --remote'])
    assert.equal(decide(bash(c),no),null,c);
  for(const c of ['cd cloudflare/population && OCTOBOT_OWNER_CONFIRMED=yes npx wrangler deploy','cd cloudflare/population && OCTOBOT_OWNER_CONFIRMED=e073131f npx wrangler deploy','cd cloudflare/population && OCTOBOT_OWNER_CONFIRMED= npx wrangler deploy','cd cloudflare/population && XOCTOBOT_OWNER_CONFIRMED=e073131f8ed6a1e9 npx wrangler deploy','cd cloudflare/population && OCTOBOT_OWNER_CONFIRMED=e073131f8ed6a1e9aa npx wrangler deploy'])
    assert.match(decide(bash(c),no),/owner's confirmation/,c);
});

test('nobody but the owner writes the hand-made permission file, and the confirmation marker does not unlock that',()=>{
  const any={permitted:true};
  for(const tool of ['Write','Edit','MultiEdit'])assert.match(decide({tool_name:tool,tool_input:{file_path:'C:\repo\tools\models\PUBLISH_PERMISSION.json'}},any),/owner/);
  assert.equal(decide({tool_name:'Write',tool_input:{file_path:'C:\repo\tools\models\notes.md'}},any),null);
  for(const c of ['echo {} > tools/models/PUBLISH_PERMISSION.json','cp a tools/models/PUBLISH_PERMISSION.json','Set-Content tools/models/PUBLISH_PERMISSION.json "{}"'])assert.match(decide(bash(c),any),/permission file/,c);
  assert.equal(decide(bash('cat tools/models/PUBLISH_PERMISSION.json'),any),null);
  assert.equal(decide({tool_name:'Read',tool_input:{file_path:'x'}},any),null);
});
