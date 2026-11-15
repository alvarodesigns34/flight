import {Simulation,trim,rk4,norm,csvHeader,evaluate} from '../src/physics.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('simulator/evidence',{recursive:true});
const results={generated_at:new Date().toISOString(),model:'Generic educational parameters; no real F-14 performance calibration',scenarios:{}};
for(const scenario of ['cruise','approach','runway']) {
 const sim=new Simulation();sim.reset(scenario);const initial=[...sim.state];
 let maxQuaternionError=0,maxAltitudeChange=0,maxSpeedChange=0;
 for(let i=0;i<60*120;i++) {
  sim.step();maxQuaternionError=Math.max(maxQuaternionError,Math.abs(norm(sim.state.slice(6,10))-1));
  maxAltitudeChange=Math.max(maxAltitudeChange,Math.abs(sim.state[2]-initial[2]));maxSpeedChange=Math.max(maxSpeedChange,Math.abs(sim.read().speed-norm(initial.slice(3,6))));
 }
 results.scenarios[scenario]={duration_s:sim.time,initial_state:initial,final_state:sim.state,maxQuaternionError,maxAltitudeChange_m:maxAltitudeChange,maxSpeedChange_mps:maxSpeedChange,final:summarize(sim.read())};
 writeFileSync(`simulator/evidence/${scenario}.csv`,csvHeader+'\n'+sim.telemetry.map(r=>r.join(',')).join('\n')+'\n');
}
function summarize(r){return {airspeed_mps:r.speed,altitude_m:r.altitude,verticalSpeed_mps:r.verticalSpeed,mass_kg:r.mass,groundLoad_N:r.groundLoad,force_N:r.force,moment_Nm:r.moment};}
const t=trim(),c={...t.controls,elevator:t.controls.elevator+.05},states={};
for(const hz of [60,120,240,480]) {let y=[...t.state];for(let i=0;i<hz*2;i++)y=rk4(y,1/hz,c);states[hz]=y;}
results.convergence=Object.fromEntries([60,120,240].map(hz=>[hz,norm(states[hz].slice(0,6).map((v,i)=>v-states[480][i]))]));
results.trimResidual={force_N:norm(evaluate(t.state,t.controls).force),moment_Nm:norm(evaluate(t.state,t.controls).moment)};
writeFileSync('simulator/evidence/validation.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
