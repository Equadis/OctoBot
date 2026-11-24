// Shared by the Auction House and Gear Planner: names that do not fit their box pan sideways instead of wrapping.
// Markup: <span class="ah-name-clip"><span class="ah-name-text">Name</span></span> (animation lives in site-theme.css).
export function measureScrollingNames(root=document){
 for(const clip of root.querySelectorAll('.ah-name-clip')){
  const text=clip.firstElementChild;if(!text)continue;
  const overflow=Math.max(0,text.scrollWidth-clip.clientWidth);
  clip.classList.toggle('ah-scroll-name',overflow>2);
  clip.style.setProperty('--name-distance',overflow+'px');
  clip.style.setProperty('--name-duration',Math.max(7,Math.min(24,5+overflow/22))+'s');
 }
}
export function scheduleScrollingNames(root=document){if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>measureScrollingNames(root));}
