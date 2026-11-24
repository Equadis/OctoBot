/* Race dropdown with a portrait to the left of each race, built the same way as the Dressing Room's background picker:
 * the native <select> stays as the source of truth (hidden), and a button plus a list of options sits beside it.
 * Whatever sets select.value (the user, a restored build, a class change) only has to call sync(). */
import {raceIconUrl} from './race-icons.mjs?v=20261201-ui3';

function portraits(doc,race,iconFor){
  const wrap=doc.createElement('span');wrap.className='rp-faces';
  for(const sex of ['male']){   // one portrait per race keeps the selector narrow
    const url=iconFor(race,sex),image=doc.createElement(url?'img':'span');
    if(url){image.src=url;image.alt='';image.loading='lazy';image.width=20;image.height=20;}
    else image.className='rp-blank';
    wrap.append(image);
  }
  return wrap;
}
function row(doc,race,iconFor){
  const frag=doc.createDocumentFragment();
  const label=doc.createElement('span');label.className='rp-label';label.textContent=race;
  frag.append(portraits(doc,race,iconFor),label);
  return frag;
}
/* The same dropdown serves any list of choices with an icon each (seals, auras, stances, pets, professions...): pass a label and
 * iconFor(value) returning an image URL, or nothing for entries without an icon (they keep a blank slot so labels stay aligned). */
export function setupRacePicker(doc,select,onChoose=()=>{},{label:fieldLabel='Race',iconFor=race=>raceIconUrl(race,'male')}={}){
  select.classList.add('rp-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const wrap=doc.createElement('div');wrap.className='rp-picker';
  const button=doc.createElement('button');button.type='button';button.className='rp-button';
  button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',fieldLabel);
  const list=doc.createElement('div');list.className='rp-list';list.setAttribute('role','listbox');list.hidden=true;
  wrap.append(button,list);select.after(wrap);
  const rows=()=>[...list.querySelectorAll('.rp-option')];
  const close=(focus)=>{list.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();};
  const open=()=>{
    list.hidden=false;button.setAttribute('aria-expanded','true');
    // Open upwards when there is no room below, like the Dressing Room's picker.
    const box=button.getBoundingClientRect();wrap.classList.toggle('up',box.bottom+list.offsetHeight+8>(doc.defaultView?.innerHeight||0)&&box.top>list.offsetHeight);
    (rows().find(r=>r.getAttribute('aria-selected')==='true')||rows()[0])?.focus();
  };
  const choose=race=>{select.value=race;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close(true);onChoose(race);};
  function sync(){
    const race=select.value;
    button.replaceChildren(row(doc,race,iconFor),Object.assign(doc.createElement('span'),{className:'rp-caret',textContent:'▾'}));
    list.replaceChildren(...[...select.options].map(o=>{
      const item=doc.createElement('button');item.type='button';item.className='rp-option';item.setAttribute('role','option');
      item.setAttribute('aria-selected',String(o.value===race));item.append(row(doc,o.value,iconFor));
      item.addEventListener('click',()=>choose(o.value));return item;
    }));
  }
  button.addEventListener('click',()=>list.hidden?open():close(false));
  list.addEventListener('keydown',e=>{
    const items=rows(),i=items.indexOf(doc.activeElement);
    if(e.key==='Escape'){e.preventDefault();close(true);}
    else if(e.key==='ArrowDown'){e.preventDefault();items[Math.min(items.length-1,i+1)]?.focus();}
    else if(e.key==='ArrowUp'){e.preventDefault();items[Math.max(0,i-1)]?.focus();}
  });
  button.addEventListener('keydown',e=>{if((e.key==='ArrowDown'||e.key==='ArrowUp')&&list.hidden){e.preventDefault();open();}});
  doc.addEventListener('click',e=>{if(!wrap.contains(e.target))close(false);});
  select.addEventListener('change',sync);
  sync();
  return {sync,wrap,button,list};
}
export const setupIconSelect=(doc,select,{label,iconFor,onChoose}={})=>setupRacePicker(doc,select,onChoose,{label,iconFor});
