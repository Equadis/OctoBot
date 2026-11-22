function plainText(value){
 if(typeof value!=="string"||value.length>1000)return "";
 return value.replace(/\|H[^|]+\|h([^|]+)\|h/gi,"$1").replace(/\|c[0-9a-f]{8}|\|r/gi,"")
  .replace(/[\u0000-\u001f\u007f]/g," ").trim();
}

export function hardcoreDeathAnnouncement(value){
 const text=plainText(value);
 return /^.+? died to .+\.(?: Their last words were: .+)?$/u.test(text)?text:null;
}

export function createHardcoreDeathListener(publish){
 const pending=new Map();
 function finish(name,words){
  const event=pending.get(name);
  if(!event)return;
  clearTimeout(event.timer);
  pending.delete(name);
  publish(words?event.text+" Their last words were: "+words:event.text);
 }
 return {
  receive(line){
   const text=plainText(line);
   const death=/^A tragedy has occurred\. Hardcore character (.+?) \(level \d+\) has fallen to (.+?)\. May this sacrifice not be forgotten\.$/i.exec(text);
   if(death){
    const [,name,cause]=death;
    if(!pending.has(name)){
     const timer=setTimeout(()=>finish(name),2000);
     pending.set(name,{timer,text:name+" died to "+cause+"."});
    }
    return true;
   }
   const lastWords=/^(.+?)['’]s last words:\s*(.+)$/i.exec(text);
   if(!lastWords)return false;
   finish(lastWords[1],lastWords[2]);
   return true;
  },
  flush(){for(const name of pending.keys())finish(name);}
 };
}
