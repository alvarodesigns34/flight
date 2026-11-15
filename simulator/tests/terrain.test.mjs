import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainHeight,groundHeight,WATER_HEIGHT} from '../src/terrain.mjs';
import {Simulation,evaluate,quaternion} from '../src/physics.mjs';
test('runway is flat and continuous, and distant terrain includes coastline and relief',()=>{
 for(const north of [-500,0,1000,3000])for(const east of [-20,0,20])assert.equal(groundHeight(north,east),0);
 assert.ok(terrainHeight(5000,-5500)>300);assert.ok(terrainHeight(40000,40000)<WATER_HEIGHT);
 assert.ok(Math.abs(terrainHeight(5000,-5500)-terrainHeight(5000.1,-5500))<1);
});
test('contact follows the rendered elevation instead of a universal zero-altitude plane',()=>{
 const sim=new Simulation();sim.reset('runway');sim.state[0]=5500;sim.state[1]=5000;
 const h=groundHeight(sim.state[0],sim.state[1]);sim.state[2]=-h-2.05;
 assert.ok(h>300);assert.ok(evaluate(sim.state,sim.controls).groundLoad>0);
 sim.state[2]=-h-10;assert.equal(evaluate(sim.state,sim.controls).groundLoad,0);
 assert.ok(Math.abs(sim.read().heightAboveGround-10)<1e-7);
});
test('coastal starting point has clearance and remains stable above the shared surface',()=>{
 const sim=new Simulation();sim.reset('coastal');
 assert.equal(sim.state[0],-1600);assert.equal(sim.state[1],-9200);assert.ok(sim.read().heightAboveGround>600);
 for(let i=0;i<20*120;i++)sim.step();
 assert.ok(sim.read().heightAboveGround>500);assert.ok(Math.abs(sim.read().altitude-800)<2);assert.ok(Math.abs(sim.read().speed-115)<.5);
});
