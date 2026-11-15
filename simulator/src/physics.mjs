import {groundHeight,terrainSample,WATER_HEIGHT} from './terrain.mjs';
import { parameters as P } from './parameters.mjs';
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const scale=(a,s)=>a.map(x=>x*s);
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const norm=a=>Math.hypot(...a);
export const qmul=(a,b)=>[a[0]*b[0]-dot(a.slice(1),b.slice(1)),a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
export const conjugate=q=>[q[0],-q[1],-q[2],-q[3]];
export const rotate=(q,v)=>qmul(qmul(q,[0,...v]),conjugate(q)).slice(1);
export function quaternion(roll=0,pitch=0,yaw=0) {
  return qmul(qmul([Math.cos(yaw/2),0,0,Math.sin(yaw/2)],[Math.cos(pitch/2),0,Math.sin(pitch/2),0]),[Math.cos(roll/2),Math.sin(roll/2),0,0]);
}
export function euler(q) {
  const [w,x,y,z]=q;
  return [Math.atan2(2*(w*x+y*z),1-2*(x*x+y*y)),Math.asin(clamp(2*(w*y-z*x),-1,1)),Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z))];
}
/** Dry ISA troposphere and isothermal lower stratosphere; altitude in metres MSL. */
export function atmosphere(altitude) {
  const h=clamp(altitude,0,20000), T=288.15-.0065*Math.min(h,11000);
  const pressure=h<=11000 ? 101325*(T/288.15)**5.25588 : 22632.06*Math.exp(-P.gravity*(h-11000)/(287.05287*T));
  return {temperature:T,pressure,density:pressure/(287.05287*T),soundSpeed:Math.sqrt(1.4*287.05287*T)};
}
export function aeroCoefficients(alpha,beta,config={}) {
  const sweep=clamp(config.sweep??0,0,1), flaps=clamp(config.flaps??0,0,1);
  const linear=P.cl0 + P.clMaxIncrement*Math.tanh(P.clAlpha*(1-.3*sweep)*alpha/P.clMaxIncrement)+.35*flaps;
  const t=clamp((Math.abs(alpha)-.35)/.35,0,1),blend=t*t*(3-2*t);
  const cl=linear*(1-blend)+1.1*Math.sin(2*alpha)*blend;
  const cd=P.cd0+P.inducedDrag*(1+.5*sweep)*cl*cl+.8*Math.sin(alpha)**2+.35*beta*beta+.04*flaps+.025*(config.gear??0);
  return {cl,cd,cy:P.cyBeta*beta};
}
export const defaultControls=()=>({elevator:0,aileron:0,rudder:0,throttle:0.5,sweep:0,flaps:0,gear:0,brake:0});
export function sanitizeControls(c) {
  const out=defaultControls();
  for(const key of Object.keys(out)) {
    const value=c[key]??out[key];
    if(!Number.isFinite(value))throw new TypeError('Nonfinite control: '+key);
    out[key]=clamp(value,['elevator','aileron','rudder'].includes(key)?-1:0,1);
  }
  return out;
}
// State: [N,E,D, vN,vE,vD, qw,qx,qy,qz, p,q,r, spool, fuel].
export function evaluate(y,controls,wind=[0,0,0]) {
  if(y.length!==15||y.some(x=>!Number.isFinite(x))||norm(y.slice(6,10))<1e-10)throw new TypeError('Invalid rigid-body state');
  if(wind.length!==3||wind.some(x=>!Number.isFinite(x)))throw new TypeError('Invalid wind vector');
  const c=sanitizeControls(controls), mass=P.dryMass+Math.max(0,y[14]);
  const q=scale(y.slice(6,10),1/norm(y.slice(6,10))), rates=y.slice(10,13);
  const velocity=add(y.slice(3,6),scale(wind,-1)), bodyV=rotate(conjugate(q),velocity);
  const speed=norm(bodyV), safeSpeed=Math.max(speed,5);
  const alpha=Math.atan2(bodyV[2],bodyV[0]), beta=speed>1e-9?Math.asin(clamp(bodyV[1]/speed,-1,1)):0;
  const air=atmosphere(-y[2]), dynamicPressure=.5*air.density*speed*speed;
  const cf=aeroCoefficients(alpha,beta,c), L=dynamicPressure*P.area*cf.cl, D=dynamicPressure*P.area*cf.cd;
  // Lift is perpendicular to the body XZ airspeed projection; drag always opposes airspeed.
  const force=add(speed>1e-9?scale(bodyV,-D/speed):[0,0,0],[L*Math.sin(alpha),dynamicPressure*P.area*cf.cy,-L*Math.cos(alpha)]);
  const thrust=Math.max(0,y[14])>0 ? P.maxThrust*clamp(y[13],0,1)*Math.min(1,air.density/1.225)**.7 : 0;
  force[0]+=thrust;
  const span=P.span*(1-.35*c.sweep), phat=rates[0]*span/(2*safeSpeed), qhat=rates[1]*P.chord/(2*safeSpeed), rhat=rates[2]*span/(2*safeSpeed);
  let moment=[dynamicPressure*P.area*span*(P.clAileron*c.aileron+P.clP*phat+P.clBeta*beta),dynamicPressure*P.area*P.chord*(P.cm0+P.cmAlpha*alpha+P.cmElevator*c.elevator+P.cmQ*qhat),dynamicPressure*P.area*span*(P.cnBeta*beta+P.cnRudder*c.rudder+P.cnR*rhat)];
  let worldForce=add(rotate(q,force),[0,0,mass*P.gravity]), groundLoad=0;
  const contacts=c.gear>.95?P.contacts:[[0,0,.9]],contactData=[];
  for(const [index,contact] of contacts.entries()) {
    const arm=rotate(q,contact),sample=terrainSample(y[1]+arm[1],-y[0]-arm[0]);
    const surface=Math.max(WATER_HEIGHT,sample.height),up=sample.height<WATER_HEIGHT?[0,0,-1]:sample.normal;
    const depth=(y[2]+arm[2]+surface)*(-up[2]);
    if(depth<=0){contactData.push({index,compression:0,load:0});continue;}
    const pointV=add(y.slice(3,6),rotate(q,cross(rates,contact)));
    const normal=Math.max(0,P.spring*depth-P.damper*dot(pointV,up));
    // Roll and lateral friction live in the actual surface tangent plane.
    const bodyForward=rotate(q,[1,0,0]),projected=add(bodyForward,scale(up,-dot(bodyForward,up)));
    const forward=scale(projected,1/Math.max(1e-9,norm(projected))),right=cross(forward,up);
    const mu=P.contactFriction+.55*c.brake;
    let friction=add(scale(forward,-mu*Math.tanh(dot(pointV,forward)/.5)),scale(right,-.65*Math.tanh(dot(pointV,right)/.5)));
    // Friction ellipse prevents diagonally combined forces exceeding the bound.
    const magnitude=norm(friction);if(magnitude>.8)friction=scale(friction,.8/magnitude);
    const f=scale(add(up,friction),normal);
    contactData.push({index,compression:depth,load:normal,normal:[...up],point:[y[0]+arm[0],y[1]+arm[1],y[2]+arm[2]]});
    groundLoad+=normal;worldForce=add(worldForce,f);
    moment=add(moment,cross(contact,rotate(conjugate(q),f)));
  }
  const inertia=P.inertia.map(x=>x*mass/22000), angularMomentum=rates.map((x,i)=>x*inertia[i]);
  const angularAcceleration=add(moment,scale(cross(rates,angularMomentum),-1)).map((x,i)=>x/inertia[i]);
  const qdot=scale(qmul(q,[0,...rates]),.5);
  const derivative=[...y.slice(3,6),...scale(worldForce,1/mass),...qdot,...angularAcceleration,(c.throttle-y[13])/P.spoolSeconds,-thrust*P.fuelPerNewtonSecond];
  return {derivative,speed,alpha,beta,...air,mach:speed/air.soundSpeed,mass,thrust,lift:L,drag:D,groundLoad,contactData,loadFactor:(L+groundLoad)/(mass*P.gravity),force:worldForce,moment};
}
export function rk4(y,h,c,wind=[0,0,0]) {
  if(!Number.isFinite(h)||h<=0||h>1/30)throw new RangeError('Invalid integrator step');
  const k1=evaluate(y,c,wind).derivative;
  const k2=evaluate(add(y,scale(k1,h/2)),c,wind).derivative;
  const k3=evaluate(add(y,scale(k2,h/2)),c,wind).derivative;
  const k4=evaluate(add(y,scale(k3,h)),c,wind).derivative;
  const out=y.map((v,i)=>v+h/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]));
  out.splice(6,4,...scale(out.slice(6,10),1/norm(out.slice(6,10))));
  out[13]=clamp(out[13],0,1);out[14]=Math.max(0,out[14]);
  if(out.some(x=>!Number.isFinite(x)))throw new Error('Simulation diverged; reset the scenario.');
  return out;
}
/** Solve generic straight/level equilibrium, never claim real-aircraft trim. */
export function trim(speed=120,altitude=1500,config={}) {
  if(speed<65||speed>220||altitude<50||altitude>6000)throw new RangeError('Trim scenario outside educational range');
  const density=atmosphere(altitude).density, qS=.5*density*speed*speed*P.area;
  const mass=P.dryMass+P.initialFuel;
  let lo=-.05,hi=.30;
  for(let i=0;i<70;i++) {
    const a=(lo+hi)/2, cf=aeroCoefficients(a,0,config);
    const vertical=qS*(cf.cl+cf.cd*Math.tan(a));
    if(vertical<mass*P.gravity)lo=a;else hi=a;
  }
  const alpha=(lo+hi)/2,cf=aeroCoefficients(alpha,0,config), thrust=qS*cf.cd/Math.cos(alpha);
  const controls={...defaultControls(),...config,elevator:-(P.cm0+P.cmAlpha*alpha)/P.cmElevator,throttle:thrust/(P.maxThrust*Math.min(1,density/1.225)**.7)};
  if(controls.throttle>1||Math.abs(controls.elevator)>1)throw new RangeError('No trim in control range');
  const state=[0,0,-altitude,speed,0,0,...quaternion(0,alpha,0),0,0,0,controls.throttle,P.initialFuel];
  const residual=evaluate(state,controls);
  if(norm(residual.force)>1e-4||norm(residual.moment)>1e-4)throw new RangeError('No trim solution for this configuration');
  return {state,controls,alpha};
}
export class Simulation {
  constructor(){this.reset('cruise');}
  reset(scenario='cruise') {
    const result=trim(scenario==='coastal'?115:scenario==='approach'?90:120,scenario==='coastal'?800:scenario==='approach'?450:1500,scenario==='approach'?{gear:1,flaps:.5}:{});
    this.state=result.state;this.controls=result.controls;this.time=0;this.accumulator=0;this.droppedTime=0;this.wind=[0,0,0];this.stopped=false;
    if(scenario==='runway') {this.state=[0,0,-2.05,0,0,0,...quaternion(),0,0,0,0,P.initialFuel];this.controls={...defaultControls(),throttle:0,gear:1,brake:1};}
    if(scenario==='coastal'){this.state[0]=-1600;this.state[1]=-9200;}
    this.applied={...this.controls};this.gustStrength=0;this.actualWind=[...this.wind];this.gearNoticeUntil=0;
    this.previousState=[...this.state];
    this.initial={state:[...this.state],controls:{...this.controls},scenario};
    this.telemetry=[];this.nextSample=0;
  }
  step(h=1/120) {
    if(!Number.isFinite(h)||h<=0||h>1/60)throw new RangeError('Physics step must be in (0, 1/60]');
    const targets=sanitizeControls(this.controls);
    // Educational ground interlock: do not fold load-bearing supports through
    // the runway. A fresh command can be given once airborne.
    if(targets.gear<.5&&this.applied.gear>.95&&evaluate(this.state,this.applied,this.wind).groundLoad>1000){targets.gear=this.controls.gear=1;this.gearNoticeUntil=this.time+3;}
    for(const key of Object.keys(targets)){
      const rate={gear:.2,flaps:.25,sweep:.12,brake:3}[key]??2.5;
      const lag=['elevator','aileron','rudder'].includes(key)?1-Math.exp(-h/.10):1;
      this.applied[key]+=clamp((targets[key]-this.applied[key])*lag,-rate*h,rate*h);
    }
    this.actualWind=this.wind.map((w,i)=>w+this.gustStrength*(.6*Math.sin(this.time*(.71+i*.13)+i*2)+.25*Math.sin(this.time*(1.83+i*.21)+i)));
    this.previousState=this.state;
    this.state=rk4(this.state,h,this.applied,this.actualWind);this.time+=h;
    if(this.time>=this.nextSample) {
      const t=this.read();this.telemetry.push([this.time,...this.state,t.speed,t.alpha,t.loadFactor,...Object.values(this.controls),...this.actualWind,...Object.values(this.applied),...t.force,...t.moment,this.droppedTime]);
      if(this.telemetry.length>18000)this.telemetry.shift();this.nextSample=this.time+.1-1e-9;
    }
  }
  advance(frameSeconds) {
    if(!Number.isFinite(frameSeconds)||frameSeconds<0)throw new RangeError('Invalid frame interval');
    const dt=Math.min(frameSeconds,.25);this.droppedTime+=frameSeconds-dt;this.accumulator+=dt;
    while(this.accumulator+1e-12>=1/120){this.step();this.accumulator-=1/120;}
  }
  read(){return {...evaluate(this.state,this.applied,this.time>0?this.actualWind:this.wind),angles:euler(this.state.slice(6,10)),altitude:-this.state[2],verticalSpeed:-this.state[5],terrainAltitude:Math.max(WATER_HEIGHT,groundHeight(this.state[0],this.state[1])),heightAboveGround:-this.state[2]-Math.max(WATER_HEIGHT,groundHeight(this.state[0],this.state[1]))};}
}
export const csvHeader='time_s,north_m,east_m,down_m,vn_mps,ve_mps,vd_mps,qw,qx,qy,qz,p_rad_s,q_rad_s,r_rad_s,spool,fuel_kg,airspeed_mps,alpha_rad,load_factor,elevator,aileron,rudder,throttle,sweep,flaps,gear,brake,wind_n_mps,wind_e_mps,wind_d_mps,applied_elevator,applied_aileron,applied_rudder,applied_throttle,applied_sweep,applied_flaps,applied_gear,applied_brake,force_n_N,force_e_N,force_d_N,moment_x_Nm,moment_y_Nm,moment_z_Nm,dropped_time_s';
