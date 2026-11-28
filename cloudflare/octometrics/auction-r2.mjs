export const AUCTION_HOUR=3600000;
export const SLOT_GRACE=15000;
export const MAX_SCAN_MS=AUCTION_HOUR-60000;
export const MAX_BODY_BYTES=24*1024*1024;
export const MAX_OBJECT_BYTES=12*1024*1024;
export const prefix=realm=>'auction/v1/'+(realm==="N'Zoth"?'nzoth':'yshaarj')+'/';

export class AuctionError extends Error {
 constructor(message,status=400){super(message);this.status=status;}
}
async function readBytes(stream,maximum){
 const reader=stream.getReader();
 let length=0;
 const chunks=[];
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   length+=value.byteLength;
   if(length>maximum){await reader.cancel();throw new AuctionError('auction payload exceeds byte limit',413);}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const result=new Uint8Array(length);
 let offset=0;
 for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}
 return result;
}
export async function readJson(body,encoding,maximum=MAX_OBJECT_BYTES){
 if(!body)throw new AuctionError('auction payload missing');
 if(encoding&&encoding!=='gzip')throw new AuctionError('unsupported auction encoding',415);
 const raw=encoding==='gzip'?body.pipeThrough(new DecompressionStream('gzip')):body;
 try{
  return JSON.parse(new TextDecoder().decode(await readBytes(raw,maximum)));
 }catch(error){
  if(error instanceof AuctionError)throw error;
  throw new AuctionError('invalid auction JSON');
 }
}
export async function getJson(bucket,key){
 const object=await bucket.get(key);
 if(!object)return null;
 return {etag:object.etag,value:await readJson(object.body,object.httpMetadata?.contentEncoding)};
}
export async function requireJson(bucket,key){
 const object=await getJson(bucket,key);
 if(!object)throw new AuctionError('auction snapshot component unavailable',503);
 return object.value;
}
export async function putJson(bucket,key,value,options={}){
 return bucket.put(key,JSON.stringify(value),{httpMetadata:{contentType:'application/json'},...options});
}
export async function putGzip(bucket,key,value,maximum=MAX_OBJECT_BYTES){
 const raw=JSON.stringify(value);
 const bytes=new TextEncoder().encode(raw);
 if(bytes.byteLength>maximum)throw new AuctionError('auction snapshot partition exceeds byte limit',503);
 const gzip=new Response(bytes).body.pipeThrough(new CompressionStream('gzip'));
 const packed=await readBytes(gzip,maximum);
 await bucket.put(key,packed,{httpMetadata:{contentType:'application/json',contentEncoding:'gzip'}});
 return packed.byteLength;
}
export const compareAndPut=(bucket,key,etag,value)=>putJson(bucket,key,value,{
 onlyIf:etag?{etagMatches:etag}:new Headers({'If-None-Match':'*'})
});
