import {clamp} from './physics.mjs';
export class Input {
 constructor(onAction) {
  this.keys=new Set();this.onAction=onAction;
  const editing=el=>['INPUT','SELECT','TEXTAREA'].includes(el?.tagName)||el?.isContentEditable;
  window.addEventListener('keydown',e=>{
   if(editing(e.target)||document.querySelector('dialog[open]'))return;
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
   this.keys.add(e.code);
   if(!e.repeat&&['Space','KeyR','KeyC'].includes(e.code))onAction(e.code);
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  window.addEventListener('blur',()=>this.keys.clear());
  for(const button of document.querySelectorAll('[data-input]')) {
   button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.keys.add(button.dataset.input);});
   for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>this.keys.delete(button.dataset.input));
  }
 }
 update(c,trim,dt) {
  const held=k=>this.keys.has(k)?1:0;
  let roll=held('ArrowRight')-held('ArrowLeft'),pitch=held('ArrowUp')-held('ArrowDown'),yaw=held('KeyD')-held('KeyA');
  const gp=navigator.getGamepads?.()?.find(p=>p?.connected);
  if(gp) {const dead=x=>Math.abs(x??0)>.09?x:0;roll+=dead(gp.axes[0]);pitch-=dead(gp.axes[1]);yaw+=dead(gp.axes[2]);}
  c.aileron=clamp(roll*.35,-1,1);c.elevator=clamp(trim+pitch*.18,-1,1);c.rudder=clamp(yaw*.35,-1,1);
  c.throttle=clamp(c.throttle+(held('KeyW')-held('KeyS'))*.25*dt,0,1);
 }
}
