// Markup: <span class="ah-name-clip"><span class="ah-name-text">Name</span></span>.
const HOVER_PAN_PIXELS_PER_SECOND = 36;
export function measureScrollingNames(root=document){
 let range;
 for(const clip of root.querySelectorAll('.ah-name-clip')){
  const text=clip.firstElementChild;if(!text)continue;
  if(clip.closest('[data-name-pan="hover"]')){
   // Measure the full text run inside the element that draws the ellipsis.
   range ??= (root.ownerDocument || root).createRange();
   range.selectNodeContents(text);
   const width=clip.getBoundingClientRect().width;
   const overflow=width>0?Math.max(0,range.getBoundingClientRect().width-width):0;
   clip.classList.toggle('hover-scroll-name',overflow>0);
   clip.style.setProperty('--name-distance',overflow+'px');
   clip.style.setProperty('--name-duration',overflow/HOVER_PAN_PIXELS_PER_SECOND+'s');
   continue;
  }
  const overflow=Math.max(0,text.scrollWidth-clip.clientWidth);
  clip.classList.toggle('ah-scroll-name',overflow>2);
  clip.style.setProperty('--name-distance',overflow+'px');
  clip.style.setProperty('--name-duration',Math.max(7,Math.min(24,5+overflow/22))+'s');
 }
}
export function scheduleScrollingNames(root=document){if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>measureScrollingNames(root));}
