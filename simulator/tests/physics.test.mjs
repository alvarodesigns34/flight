import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,atmosphere,rotate,quaternion,trim,evaluate,norm,aeroCoefficients,rk4} from '../src/physics.mjs';
const seconds=(s,n)=>{for(let i=0;i<Math.round(n*120);i++)s.step();return s.read();};
test('SI atmosphere at sea level and tropopause, continuous layers',()=>{
 assert.ok(Math.abs(atmosphere(0).density-1.225)<.001);
 assert.ok(Math.abs(atmosphere(11000).pressure-22632)<2);
 assert.ok(Math.abs(atmosphere(11000).density-atmosphere(11000.001).density)<1e-6);
 assert.ok(atmosphere(6000).density<atmosphere(1500).density);
});
test('body forward and pitch/roll signs map to NED',()=>{
 assert.deepEqual(rotate(quaternion(),[1,0,0]),[1,0,0]);
 assert.ok(rotate(quaternion(0,.1),[1,0,0])[2]<0);
 assert.ok(rotate(quaternion(.1),[0,1,0])[2]>0);
 assert.ok(rotate(quaternion(0,0,.1),[1,0,0])[1]>0);
});
test('trim solves forces and moments over three configurations',()=>{
 for(const [v,h,c] of [[120,1500,{}],[90,450,{gear:1,flaps:.5}],[150,3000,{sweep:.7}]]) {
 const t=trim(v,h,c),r=evaluate(t.state,t.controls);
 assert.ok(norm(r.force)<1e-4);assert.ok(norm(r.moment)<1e-4);
 }
});
test('straight and level remains close for 60 seconds with fuel burn',()=>{
 const s=new Simulation(),start=[...s.state];seconds(s,60);
 assert.ok(Math.abs(s.state[2]-start[2])<5);assert.ok(Math.abs(s.read().speed-120)<1);
 assert.ok(s.state[14]<start[14]);assert.ok(Math.abs(norm(s.state.slice(6,10))-1)<1e-12);
});
test('elevator, aileron and rudder produce the documented angular signs',()=>{
 for(const [control,index] of [['elevator',11],['aileron',10],['rudder',12]]) {
 const s=new Simulation();s.controls[control]+=.15;s.step();assert.ok(s.state[index]>0,control);
 }
});
test('throttle increases energy relative to idle and spool responds gradually',()=>{
 const hi=new Simulation(),lo=new Simulation();hi.controls.throttle=1;lo.controls.throttle=0;
 const before=hi.state[13];hi.step();assert.ok(hi.state[13]>before&&hi.state[13]<1);
 seconds(hi,10);seconds(lo,10);
 const energy=s=>.5*s.read().speed**2+9.80665*s.read().altitude;
 assert.ok(energy(hi)>energy(lo));
});
test('airspeed uses relative wind, including crosswind and tailwind',()=>{
 const s=new Simulation();s.wind=[20,0,0];assert.ok(Math.abs(s.read().speed-100)<1e-8);
 s.wind=[0,20,0];assert.ok(s.read().beta<0);
});
test('configuration drag and estimated sweep response change forces',()=>{
 const base=aeroCoefficients(.1,0,{}),landing=aeroCoefficients(.1,0,{gear:1,flaps:1}),swept=aeroCoefficients(.1,0,{sweep:1});
 assert.ok(landing.cd>base.cd);assert.ok(landing.cl>base.cl);assert.ok(swept.cl<base.cl);
});
test('RK4 convergence under control perturbation',()=>{
 const initial=trim(),c={...initial.controls,elevator:initial.controls.elevator+.05};
 const integrate=h=>{let y=[...initial.state];for(let i=0;i<Math.round(2/h);i++)y=rk4(y,h,c);return y;};
 const fine=integrate(1/480),a=integrate(1/60),b=integrate(1/120);
 const error=y=>norm(y.slice(0,6).map((v,i)=>v-fine[i]));
 assert.ok(error(b)<error(a)/8);assert.ok(error(b)<1e-5);
});
test('frame rate independence at 30, 60 and 144 Hz',()=>{
 const result=[];for(const fps of [30,60,144]) {const s=new Simulation();for(let i=0;i<fps*3;i++)s.advance(1/fps);result.push(s.state);}
 for(const state of result)assert.ok(norm(state.map((v,i)=>v-result[0][i]))<1e-8);
 const s=new Simulation();s.advance(5);assert.ok(s.time<.251);assert.equal(s.droppedTime,4.75);
});
test('runway suspension settles; brakes remove kinetic energy',()=>{
 const s=new Simulation();s.reset('runway');seconds(s,15);
 assert.ok(s.read().altitude>1.5&&s.read().altitude<2.3);assert.ok(Math.abs(s.state[5])<.03);
 s.state[3]=10;const e=.5*s.state[3]**2;seconds(s,3);assert.ok(.5*s.state[3]**2<e);
});
test('zero airspeed, fuel exhaustion and invalid controls remain explicit',()=>{
 const s=new Simulation();s.reset('runway');assert.equal(s.read().speed,0);
 s.state[14]=0;assert.equal(s.read().thrust,0);s.step();assert.equal(s.state[14],0);
 s.controls.elevator=NaN;assert.throws(()=>s.step());assert.throws(()=>trim(10));
});
