import {clamp} from './physics.mjs';
import {defaults,validateProfile,response} from './input-profile.mjs';
export class Input {
 constructor(onAction){
  this.keys=new Set();this.manual={pitch:0,roll:0,yaw:0};this.trimOffset=0;this.onAction=onAction;this.enabled=true;
  try{this.profile=validateProfile(JSON.parse(localStorage.getItem('flight-input-v1')||'{}'));}catch{this.profile=defaults();}
  const editing=el=>['INPUT','SELECT','TEXTAREA'].includes(el?.tagName)||el?.isContentEditable;
  window.addEventListener('keydown',e=>{
   if(!this.enabled||e.ctrlKey||e.metaKey||e.altKey||editing(e.target)||document.querySelector('dialog[open]'))return;
   const code=Object.keys(this.profile.bindings).find(k=>this.profile.bindings[k]===e.code);if(!code)return;e.preventDefault();
   this.keys.add(code);if(!e.repeat&&['Space','KeyR','KeyC','KeyG','KeyF','KeyB'].includes(code))onAction(code);
  });
  window.addEventListener('keyup',e=>{const code=Object.keys(this.profile.bindings).find(k=>this.profile.bindings[k]===e.code);this.keys.delete(code);});window.addEventListener('blur',()=>this.clear());
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
  if(gp){roll+=response(gp.axes[0],this.profile,0);pitch+=(this.profile.invertPitch?1:-1)*response(gp.axes[1],this.profile,1);if(this.profile.yawAxis!=='none')yaw+=response(gp.axes[Number(this.profile.yawAxis)],this.profile,Number(this.profile.yawAxis));}
  this.trimOffset=clamp(this.trimOffset+(held('KeyE')-held('KeyQ'))*.04*dt,-.3,.3);
  const sensitivity=this.profile.sensitivity/.7;
  c.aileron=clamp(roll*.28*sensitivity,-1,1);c.elevator=clamp(trim+this.trimOffset+pitch*.14*sensitivity,-1,1);c.rudder=clamp(yaw*.28*sensitivity,-1,1);
  c.throttle=clamp(c.throttle+(held('KeyW')-held('KeyS'))*.22*dt,0,1);
  this.axes={roll:clamp(roll,-1,1),pitch:clamp(pitch,-1,1),yaw:clamp(yaw,-1,1)};
 }
 saveProfile(value){this.profile=validateProfile(value);try{localStorage.setItem('flight-input-v1',JSON.stringify(this.profile));}catch{/* Private storage can be disabled; current-session settings still work. */}}
 calibrate(){const gp=navigator.getGamepads?.()?.find(p=>p?.connected);if(!gp)return false;this.saveProfile({...this.profile,center:gp.axes.slice(0,4)});return true;}
}
