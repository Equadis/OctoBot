// Brings the items on the 3D model in line with the outfit, in place (no model reload).
//
// The viewer's wv(slot) only drops the item from its table. Which parts of the character are visible (hair, face, ears, and on the Goblin the head
// itself) is recomputed from the character's customisation and the worn items only when items are set, so a removal with nothing to add left
// everything the removed helm had hidden still hidden: take the hood off and the head stayed missing until another item was equipped.
// After any removal the items are therefore set again, with an empty list if nothing is being added, which makes the viewer recompute from scratch.

/** What has to change: slots to clear, and [slot, display] pairs to put on. Unchanged slots appear in neither list. */
export function planGearChanges(applied,next){
 const remove=[...applied].filter(([slot,display])=>next.get(slot)!==display).map(([slot])=>slot);
 const add=[...next].filter(([slot,display])=>applied.get(slot)!==display);
 return {remove,add};
}

/** Applies the changes to a live actor. Returns what was removed and added. */
export function applyGearChanges(actor,applied,next){
 const {remove,add}=planGearChanges(applied,next);
 for(const slot of remove){try{actor.wv(slot);}catch{}}
 if(add.length||remove.length)actor.setItems(add.map(([slot,display])=>({slot,display,visual:0})));
 return {removed:remove,added:add.map(([slot])=>slot)};
}
