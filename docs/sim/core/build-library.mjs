import { classDefinition } from './classes.mjs?v=20261201-ui3';
export const BUILDS_PER_CLASS=10;
export const BUILD_LIMIT_MESSAGE='You cannot save any more builds for this class.';
/** Default save name uses character and build name without repeated prefixes. */
export function defaultSaveName(characterName,buildName){
 const character=String(characterName??'').trim(),name=String(buildName??'').trim();
 if(!character)return name.slice(0,80);
 const prefix=character+' – ';
 return name.startsWith(prefix)?name.slice(0,80):(prefix+name.slice(0,Math.max(0,80-prefix.length)));
}
export const MAX_BUILD_BYTES=64000;
export function buildRecord(build,validate,savedAt=new Date().toISOString()){
 const value=validate(build);
 if(new TextEncoder().encode(JSON.stringify(value)).byteLength>MAX_BUILD_BYTES)throw new Error('Build exceeds 64 KB. Export it as JSON.');
 if(typeof savedAt!=='string'||!Number.isFinite(Date.parse(savedAt)))savedAt=new Date().toISOString();
 return {classId:value.classId,name:value.name,savedAt,build:value};
}
function database(name){return new Promise((resolve,reject)=>{
 if(!globalThis.indexedDB){reject(new Error('Browser build storage is unavailable. Export this build instead.'));return;}
 const request=indexedDB.open(name,1);
 request.onupgradeneeded=()=>{const db=request.result;const store=db.createObjectStore('builds',{keyPath:['classId','name']});store.createIndex('classId','classId');db.createObjectStore('meta');};
 request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Close other planner tabs to update browser storage.'));
 request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};
});}
const errorMessage=error=>error?.name==='QuotaExceededError'?new Error('Browser storage is full. Export a backup and remove an old saved build.'):error;
export function buildLibrary(classId,validate,{databaseName='octosim-build-library',legacyValidate=validate}={}){
 classDefinition(classId);let ready;
 async function open(){
  if(!ready)ready=(async()=>{
   const db=await database(databaseName);
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(['builds','meta'],'readwrite'),meta=tx.objectStore('meta');
    const migrated=meta.get(`legacy:${classId}`);
    migrated.onsuccess=()=>{
     if(migrated.result)return;
     // Keep the old localStorage collection untouched as a recovery backup.
     let legacy=[];try{legacy=JSON.parse(localStorage.getItem('octosim.planner.saved.v1')||'[]');}catch{}
     if(!Array.isArray(legacy)){tx.abort();return;}
     const seen=new Set();
     for(const entry of legacy){
      if(entry.build?.classId!==classId||seen.size>=BUILDS_PER_CLASS)continue;
      try{const record=buildRecord(entry.build,legacyValidate,entry.savedAt);if(!seen.has(record.name)){seen.add(record.name);tx.objectStore('builds').put(record);}}catch{}
     }
     meta.put(true,`legacy:${classId}`);
    };
    tx.oncomplete=resolve;tx.onerror=()=>reject(errorMessage(tx.error));tx.onabort=()=>reject(tx.error||new Error('Legacy build migration failed; original saves are unchanged.'));
   });return db;
  })().catch(error=>{ready=null;throw error;});
  return ready;
 }
 async function list(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('builds');const request=tx.objectStore('builds').index('classId').getAll(classId);request.onsuccess=()=>resolve(request.result.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)));request.onerror=()=>reject(request.error);});}
 async function save(build,savedAt){
  const record=buildRecord(build,validate,savedAt);if(record.classId!==classId)throw new Error('Cannot save a build to another class.');
  const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction('builds','readwrite'),store=tx.objectStore('builds');let full=false;
   const existing=store.get([classId,record.name]);existing.onsuccess=()=>{const count=store.index('classId').count(classId);count.onsuccess=()=>{if(!existing.result&&count.result>=BUILDS_PER_CLASS){full=true;tx.abort();}else store.put(record);};};
   tx.oncomplete=()=>resolve(record);tx.onerror=()=>reject(errorMessage(tx.error));tx.onabort=()=>reject(full?new Error(BUILD_LIMIT_MESSAGE):errorMessage(tx.error));
  });
 }
 async function remove(name){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('builds','readwrite');tx.objectStore('builds').delete([classId,name]);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
 async function importBuilds(builds){
  if(!Array.isArray(builds)||builds.length>BUILDS_PER_CLASS)throw new Error(`A class backup can contain at most ${BUILDS_PER_CLASS} builds.`);
  const records=builds.map(build=>buildRecord(build,validate));
  if(records.some(record=>record.classId!==classId))throw new Error('Open the matching class before importing this backup.');
  const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction('builds','readwrite'),store=tx.objectStore('builds');let full=false;
   const keys=store.index('classId').getAllKeys(classId);keys.onsuccess=()=>{
    const names=new Set(keys.result.map(key=>key[1]));for(const record of records)names.add(record.name);
    if(names.size>BUILDS_PER_CLASS){full=true;tx.abort();return;}
    for(const record of records)store.put(record);
   };
   tx.oncomplete=()=>resolve(records.length);tx.onerror=()=>reject(errorMessage(tx.error));tx.onabort=()=>reject(full?new Error(BUILD_LIMIT_MESSAGE):errorMessage(tx.error));
  });
 }
 /** Every saved build, whatever its class. Builds of other classes that still sit only in the old localStorage collection (they move into the database when that class is opened) are listed too, read-only. */
 async function listAll(){
  const db=await open();
  const stored=await new Promise((resolve,reject)=>{const tx=db.transaction(['builds','meta']);const builds=tx.objectStore('builds').getAll(),keys=tx.objectStore('meta').getAllKeys();tx.oncomplete=()=>resolve({records:builds.result,migrated:new Set(keys.result)});tx.onerror=()=>reject(tx.error);});
  const records=[...stored.records];
  let legacy=[];try{legacy=JSON.parse(localStorage.getItem('octosim.planner.saved.v1')||'[]');}catch{}
  if(Array.isArray(legacy)){
   const have=new Set(records.map(record=>record.classId+'|'+record.name));
   for(const entry of legacy){
    const cid=entry?.build?.classId,name=entry?.build?.name;
    if(typeof cid!=='string'||typeof name!=='string'||stored.migrated.has('legacy:'+cid)||have.has(cid+'|'+name))continue;
    try{classDefinition(cid);}catch{continue;}
    have.add(cid+'|'+name);records.push({classId:cid,name,savedAt:typeof entry.savedAt==='string'?entry.savedAt:new Date(0).toISOString(),build:entry.build,legacy:true});
   }
  }
  return records.sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)));
 }
 async function removeFrom(otherClassId,name){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('builds','readwrite');tx.objectStore('builds').delete([otherClassId,name]);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
 async function putRecord(record){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('builds','readwrite');tx.objectStore('builds').put({classId:record.classId,name:record.name,savedAt:record.savedAt,build:record.build});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
 /** Imports builds of other classes. They are only shape-checked here (their talent data is not loaded) and fully validated when loaded in their own planner. */
 async function importForeign(builds){
  const records=builds.map(build=>{
   if(!build||typeof build!=='object')throw new Error('Invalid build in backup.');
   classDefinition(build.classId);
   if(typeof build.name!=='string'||!build.name.trim()||build.name.length>80||!Number.isInteger(build.level))throw new Error('Invalid build in backup.');
   if(new TextEncoder().encode(JSON.stringify(build)).byteLength>MAX_BUILD_BYTES)throw new Error('A build in the backup exceeds 64 KB.');
   return {classId:build.classId,name:build.name,savedAt:new Date().toISOString(),build};
  });
  const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction('builds','readwrite'),store=tx.objectStore('builds');let full=false;
   const all=store.getAll();all.onsuccess=()=>{
    const names=new Map();for(const record of all.result){if(!names.has(record.classId))names.set(record.classId,new Set());names.get(record.classId).add(record.name);}
    for(const record of records){if(!names.has(record.classId))names.set(record.classId,new Set());names.get(record.classId).add(record.name);}
    if([...names.values()].some(set=>set.size>BUILDS_PER_CLASS)){full=true;tx.abort();return;}
    for(const record of records)store.put(record);
   };
   tx.oncomplete=()=>resolve(records.length);tx.onerror=()=>reject(errorMessage(tx.error));tx.onabort=()=>reject(full?new Error(BUILD_LIMIT_MESSAGE):errorMessage(tx.error));
  });
 }
 return {list,listAll,removeFrom,putRecord,importForeign,save,remove,importBuilds,async close(){if(ready)(await ready).close();ready=null;}};
}
