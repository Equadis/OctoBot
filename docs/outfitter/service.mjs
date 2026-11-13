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
