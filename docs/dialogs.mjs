// Shared dialog behaviour: a close button (data-close="<dialog id>"), a click on the backdrop, and Escape (native <dialog>).
// Closing a modal <dialog> removes its backdrop and gives the page its scrolling and focus back.
export function wireDialogs(root=document){
  for(const button of root.querySelectorAll('[data-close]')){
    if(button.dataset.closeWired)continue;button.dataset.closeWired='1';
    button.addEventListener('click',()=>(root.getElementById?root:document).getElementById(button.dataset.close)?.close());
  }
  for(const dialog of root.querySelectorAll('dialog')){
    if(dialog.dataset.backdropWired||dialog.hasAttribute('data-no-backdrop-close'))continue;dialog.dataset.backdropWired='1';
    // The backdrop is the dialog element itself, so a click whose target is the dialog but lies outside its box was on the backdrop.
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const box=dialog.getBoundingClientRect();
      if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
    });
  }
}
