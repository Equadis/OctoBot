// Distinguish an undeployed service from an individual unavailable appearance.
export async function requestJson(url,fetcher=fetch){
 const response=await fetcher(url,{signal:AbortSignal.timeout(20000)});
 if(!response.ok){
  let detail;try{detail=await response.json();}catch{}
  if(response.status===404&&detail?.error==='not_found')throw Error('The 3D preview service is not available yet.');
  if(response.status===404)throw Error('This character or appearance is not available in the Classic model library.');
  throw Error('The appearance service is temporarily unavailable. Try reloading the preview.');
 }
 return response.json();
}

// The current viewer consumes native M2 geometry plus the skin mesh indexed by
// its SFID chunk. Validate these critical files before starting the renderer,
// whose internal loader otherwise logs missing files and waits indefinitely.
export function skinIdsFromM2(buffer){
 const view=new DataView(buffer),tag=offset=>String.fromCharCode(...new Uint8Array(buffer,offset,4));
 if(view.byteLength<8||tag(0)!=='MD21')throw Error('The character geometry is not a valid M2 model.');
 for(let offset=0;offset+8<=view.byteLength;){
  const size=view.getUint32(offset+4,true),end=offset+8+size;
  if(end>view.byteLength)throw Error('The character geometry download is incomplete.');
  if(tag(offset)==='SFID'){
   if(size<4||size%4!==0)throw Error('The character model has no valid skin mesh.');
   return Array.from({length:size/4},(_,index)=>view.getUint32(offset+8+4*index,true)).filter(id=>id>0);
  }
  offset=end;
 }
 throw Error('The character model is missing its skin mesh reference.');
}
export async function preloadGeometry(base,modelId,fetcher=fetch){
 if(!Number.isSafeInteger(modelId)||modelId<=0)throw Error('The character metadata has no model geometry.');
 async function binary(path){
  const response=await fetcher(base+path,{signal:AbortSignal.timeout(20000)});
  if(!response.ok){
   let detail;try{detail=await response.json();}catch{}
   if(detail?.error==='not_found')throw Error('The 3D preview service needs an update to load model geometry.');
   throw Error(`The character asset ${path} could not be loaded.`);
  }
  return response.arrayBuffer();
 }
 const buffer=await binary(`m2/${modelId}.m2`),skins=skinIdsFromM2(buffer);
 if(!skins.length)throw Error('The character model has no skin mesh.');
 const skin=await binary(`skin/${skins[0]}.skin`);
 if(skin.byteLength<4||String.fromCharCode(...new Uint8Array(skin,0,4))!=='SKIN')throw Error('The character skin mesh is invalid.');
 return {modelId,skinId:skins[0]};
}
