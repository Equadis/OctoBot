/* Population-style interactions for every OctoBot time-series chart.
 * Same cursor-anchored zoom, drag pan and Shift+wheel pan as Players online.
 * All limits and zoom math come from the shared chart-data.js calculations.
 */
(() => {
  'use strict';
  const D=window.PopulationData;
  function attach({hit,range,bounds,navigate,hover,leave}){
    if(!D||!hit)throw Error('Chart interaction prerequisites missing');
    let dragging=null;
    const area=()=>hit.getBoundingClientRect();
    const valid=()=> {
      const v=range(),b=bounds();
      return v&&b&&[v.start,v.end,b.floor,b.now].every(Number.isFinite)&&
        v.end>v.start&&b.now>b.floor;
    };
    const move=next=>navigate(next);
    hit.addEventListener('pointerdown',e=>{
      if(e.button!==0||dragging)return;
      dragging={id:e.pointerId,x:e.clientX};
      hit.setPointerCapture(e.pointerId);
      hit.classList.add('is-panning');
      if(leave)leave();
      e.preventDefault();
    });
    hit.addEventListener('pointermove',e=>{
      if(dragging){
        if(e.pointerId!==dragging.id)return;
        const rect=area(),dx=e.clientX-dragging.x;dragging.x=e.clientX;
        if(rect.width>0&&dx!==0&&valid()){
          const view=range(),limits=bounds();
          move(D.panRange(view.start,view.end,-dx/rect.width*(view.end-view.start),limits.floor,limits.now));
        }
      }else if(hover)hover(e);
    });
    const finish=e=>{
      if(!dragging||dragging.id!==e.pointerId)return;
      dragging=null;
      hit.classList.remove('is-panning');
      if(hit.hasPointerCapture(e.pointerId))hit.releasePointerCapture(e.pointerId);
    };
    hit.addEventListener('pointerup',finish);
    hit.addEventListener('pointercancel',finish);
    hit.addEventListener('lostpointercapture',()=>{dragging=null;hit.classList.remove('is-panning');});
    hit.addEventListener('pointerleave',()=>{if(leave)leave();});
    hit.addEventListener('wheel',e=>{
      const rect=area();if(!rect.width||!valid())return;
      e.preventDefault();
      const view=range(),limits=bounds(),unit=e.deltaMode===1?16:e.deltaMode===2?800:1;
      if(e.shiftKey){
        const offset=D.wheelPanOffset(e.deltaX,e.deltaY,unit,view.end-view.start);
        move(D.panRange(view.start,view.end,offset,limits.floor,limits.now));
      }else{
        const ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
        move(D.zoomRange(view.start,view.end,ratio,e.deltaY*unit,limits.floor,limits.now));
      }
    },{passive:false});
  }
  window.OctoChartInteractions={attach};
})();
