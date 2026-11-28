// Documented shared Rogue/Druid target-banked combo-point behaviour.
// Source: https://octowow.st/rogue# (Combo Points on Target Change).
// Cap and gains are caller-supplied; this module does not model refunds/procs.
export class ComboPointBank{
 #owner=null;#points=0;#cap;#validate;
 constructor({cap,initialTarget=null,initialPoints=0,validateTarget=()=>true}){
  if(!Number.isSafeInteger(cap)||cap<1)throw new Error('Explicit positive combo point cap required');
  if(typeof validateTarget!=='function')throw new Error('Target validator required');
  this.#cap=cap;this.#validate=validateTarget;
  if(!Number.isSafeInteger(initialPoints)||initialPoints<0||initialPoints>cap)throw new Error('Invalid starting combo points');
  if(initialPoints>0){this.#check(initialTarget);this.#owner=initialTarget;this.#points=initialPoints;}
 }
 #check(id){if(typeof id!=='string'||!id||!this.#validate(id))throw new Error('Unknown combo point target');}
 points(targetId){this.#check(targetId);return targetId===this.#owner?this.#points:0;}
 gain(targetId,amount){this.#check(targetId);if(!Number.isSafeInteger(amount)||amount<0)throw new Error('Invalid combo point gain');if(amount===0)return this.points(targetId);
  if(this.#owner!==targetId){this.#owner=targetId;this.#points=0;}this.#points=Math.min(this.#cap,this.#points+amount);return this.#points;}
 spend(targetId,amount){this.#check(targetId);const available=this.points(targetId);if(amount==='all')amount=available;if(!Number.isSafeInteger(amount)||amount<1||amount>available)throw new Error('Insufficient combo points on target');this.#points-=amount;if(!this.#points)this.#owner=null;return amount;}
 snapshot(){return {targetId:this.#owner,points:this.#points,cap:this.#cap};}
}
