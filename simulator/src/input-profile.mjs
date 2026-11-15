export const defaultBindings=()=>Object.fromEntries(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyA','KeyD','KeyW','KeyS','KeyQ','KeyE','KeyG','KeyF','KeyB','KeyC','KeyR','Space'].map(k=>[k,k]));
export const defaults=()=>({version:1,sensitivity:.7,deadzone:.09,curve:1.4,invertPitch:false,yawAxis:'2',center:[0,0,0,0],bindings:defaultBindings()});
export function validateProfile(value={}){
 const p=defaults(),number=(key,min,max)=>Number.isFinite(value[key])?Math.max(min,Math.min(max,value[key])):p[key];
 p.sensitivity=number('sensitivity',.2,1);p.deadzone=number('deadzone',0,.3);p.curve=number('curve',1,2.5);
 p.invertPitch=value.invertPitch===true;p.yawAxis=['2','3','none'].includes(value.yawAxis)?value.yawAxis:'2';
 if(Array.isArray(value.center))p.center=p.center.map((_,i)=>Number.isFinite(value.center[i])?Math.max(-.4,Math.min(.4,value.center[i])):0);
 if(value.bindings){const used=new Set();let valid=true;for(const key of Object.keys(p.bindings)){const code=value.bindings[key];if(typeof code!=='string'||!(/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space)$/.test(code))||used.has(code)){valid=false;break;}used.add(code);}if(valid)p.bindings={...value.bindings};}return p;
}
export function response(value,profile,axis=0){
 if(!Number.isFinite(value))return 0;const x=Math.max(-1,Math.min(1,value-(profile.center[axis]||0))),a=Math.abs(x);
 return a<=profile.deadzone?0:Math.sign(x)*((a-profile.deadzone)/(1-profile.deadzone))**profile.curve;
}
