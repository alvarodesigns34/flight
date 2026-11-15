import {clamp} from './physics.mjs';
export class Input {
 constructor(onAction){
  this.keys=new Set();this.manual={pitch:0,roll:0,yaw:0};this.trimOffset=0;this.onAction=onAction;this.enabled=true;
  const editing=el=>['INPUT','SELECT','TEXTAREA'].includes(el?.tagName)||el?.isContentEditable;
  window.addEventListener('keydown',e=>{
   if(!this.enabled||editing(e.target)||document.querySelector('dialog[open]'))return;
   if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
   this.keys.add(e.code);if(!e.repeat&&['Space','KeyR','KeyC','KeyG','KeyF','KeyB'].includes(e.code))onAction(e.code);
  });
  window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clear());
  for(const button of document.querySelectorAll('[data-input]')){
   button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);this.keys.add(button.dataset.input);});
   for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>this.keys.delete(button.dataset.input));
  }
  const pad=document.getElementById('control-stick');let active=false;
  const move=e=>{if(!active)return;const r=pad.getBoundingClientRect();this.manual.roll=clamp((e.clientX-r.left-r.width/2)/(r.width*.42),-1,1);this.manual.pitch=clamp(-(e.clientY-r.top-r.height/2)/(r.height*.42),-1,1);};
  pad.addEventListener('pointerdown',e=>{e.preventDefault();active=true;pad.setPointerCapture(e.pointerId);move(e);});pad.addEventListener('pointermove',move);
  const release=()=>{active=false;this.manual.roll=0;this.manual.pitch=0;};for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,release);
 }
 clear(){this.keys.clear();this.manual={pitch:0,roll:0,yaw:0};}
 update(c,trim,dt){
  const held=k=>this.keys.has(k)?1:0;
  let roll=this.manual.roll+held('ArrowRight')-held('ArrowLeft'),pitch=this.manual.pitch+held('ArrowUp')-held('ArrowDown'),yaw=this.manual.yaw+held('KeyD')-held('KeyA');
  const gp=navigator.getGamepads?.()?.find(p=>p?.connected);this.gamepad=gp?.id||null;
  if(gp){const dead=x=>Math.abs(x??0)>.09?x:0;roll+=dead(gp.axes[0]);pitch-=dead(gp.axes[1]);yaw+=dead(gp.axes[2]);}
  this.trimOffset=clamp(this.trimOffset+(held('KeyE')-held('KeyQ'))*.04*dt,-.3,.3);
  c.aileron=clamp(roll*.28,-1,1);c.elevator=clamp(trim+this.trimOffset+pitch*.14,-1,1);c.rudder=clamp(yaw*.28,-1,1);
  c.throttle=clamp(c.throttle+(held('KeyW')-held('KeyS'))*.22*dt,0,1);
  this.axes={roll:clamp(roll,-1,1),pitch:clamp(pitch,-1,1),yaw:clamp(yaw,-1,1)};
 }
}
