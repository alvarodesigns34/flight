import {Simulation,csvHeader,clamp} from './physics.mjs';
import {FlightRenderer} from './renderer.mjs';
import {Input} from './input.mjs';
import {EngineAudio} from './audio.mjs';
const $=id=>document.getElementById(id),sim=new Simulation(),audio=new EngineAudio();
let renderer,running=false,ready=false,trimElevator=sim.controls.elevator,last=performance.now(),frames=0,frameTime=0;
const cameraModes=['orbit','chase','pilot'];
function play(){if(!ready)return;running=!running;document.body.classList.toggle('running',running);$('play').innerHTML=running?'Pausar vuelo <span>Ⅱ</span>':'Continuar vuelo <span>›</span>';$('flight-status').textContent=running?'EN VUELO':'EN PAUSA';}
function sync(){for(const id of ['throttle','sweep','flaps'])$(id).value=Math.round(sim.controls[id]*100);$('gear').checked=sim.controls.gear===1;$('brake').checked=sim.controls.brake===1;$('wind').value=0;}
function reset(){sim.reset($('scenario').value);trimElevator=sim.controls.elevator;sync();renderer?.setMode(renderer.mode);if(running)play();$('play').innerHTML='Iniciar vuelo <span>›</span>';}
const input=new Input(code=>{if(code==='Space')play();if(code==='KeyR')reset();if(code==='KeyC')setCamera(cameraModes[(cameraModes.indexOf(renderer.mode)+1)%3]);});
function setCamera(mode){renderer.setMode(mode);document.querySelectorAll('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===mode));}
$('play').onclick=play;$('reset').onclick=reset;$('scenario').onchange=reset;
for(const id of ['throttle','sweep','flaps'])$(id).oninput=()=>sim.controls[id]=Number($(id).value)/100;
for(const id of ['gear','brake'])$(id).onchange=()=>sim.controls[id]=$(id).checked?1:0;
$('wind').oninput=()=>sim.wind=[0,Number($('wind').value),0];
for(const b of document.querySelectorAll('[data-camera]'))b.onclick=()=>setCamera(b.dataset.camera);
for(const id of ['help','about'])$(id).onclick=()=>{if(running)play();input.keys.clear();$('info').showModal();};
$('close-info').onclick=()=>$('info').close();
$('sound').onclick=async()=>{try{const enabled=await audio.toggle();$('sound').setAttribute('aria-pressed',enabled);$('sound').innerHTML=`Sonido <span>${enabled?'ON':'OFF'}</span>`;}catch{$('sound').textContent='Audio no disponible';}};
$('export').onclick=()=>{
 const blob=new Blob([csvHeader+'\n'+sim.telemetry.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tomcat-telemetry.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)play();last=performance.now();});
function instruments(){
 const r=sim.read(),c=sim.controls,deg=180/Math.PI;
 $('speed').textContent=Math.round(r.speed*1.943844);$('altitude').textContent=Math.round(r.altitude*3.28084).toLocaleString('es-ES');
 $('climb').textContent=(r.verticalSpeed>=0?'+':'')+Math.round(r.verticalSpeed*196.8504);$('heading').textContent=String(Math.round((r.angles[2]*deg+360)%360)).padStart(3,'0')+'°';
 $('load').textContent=r.loadFactor.toFixed(2)+' g';$('fuel').textContent=Math.round(sim.state[14]).toLocaleString('es-ES')+' kg';
 $('timer').textContent=`T + ${String(Math.floor(sim.time/60)).padStart(2,'0')}:${String(Math.floor(sim.time%60)).padStart(2,'0')}`;
 $('throttle-value').textContent=Math.round(c.throttle*100)+'%';$('throttle').value=c.throttle*100;
 $('sweep-value').textContent=c.sweep===0?'Extendida':Math.round(c.sweep*100)+'%';$('flaps-value').textContent=Math.round(c.flaps*100)+'%';$('wind-value').textContent=sim.wind[1]+' m/s';
 if(running)$('flight-status').textContent=r.groundLoad>100?'EN TIERRA':Math.abs(r.alpha)>.35?'ÁNGULO ELEVADO':(r.speed>220||r.altitude>6000)?'FUERA DE RANGO':'EN VUELO';
 const ctx=$('attitude').getContext('2d'),w=140,h=100;ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.arc(70,50,40,0,Math.PI*2);ctx.clip();ctx.translate(70,50);ctx.rotate(-r.angles[0]);ctx.translate(0,r.angles[1]*100);ctx.fillStyle='#9eb7be';ctx.fillRect(-200,-300,400,300);ctx.fillStyle='#9d9c7d';ctx.fillRect(-200,0,400,300);ctx.strokeStyle='#f6f5e9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-200,0);ctx.lineTo(200,0);ctx.stroke();for(let i=-3;i<=3;i++)if(i){ctx.beginPath();ctx.moveTo(-12,i*17);ctx.lineTo(12,i*17);ctx.stroke();}ctx.restore();ctx.strokeStyle='#203c41';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(40,50);ctx.lineTo(60,50);ctx.lineTo(70,55);ctx.lineTo(80,50);ctx.lineTo(100,50);ctx.stroke();ctx.lineWidth=1;ctx.beginPath();ctx.arc(70,50,40,0,Math.PI*2);ctx.stroke();
 return r;
}
function frame(now){
 const dt=Math.max(0,Math.min((now-last)/1000,1));last=now;
 try {
  if(running){input.update(sim.controls,trimElevator,Math.min(dt,.25));sim.advance(dt);}
  const r=instruments();audio.update(sim.state[13],running);renderer.update(sim,dt);
  frames++;frameTime+=dt;if(frameTime>1){$('performance').textContent=`${Math.round(frames/frameTime)} FPS · 120 Hz`;frames=0;frameTime=0;}
  // Public, read-only diagnostic snapshot for reproducible browser tests.
  window.flightLab={ready,time:sim.time,running,camera:renderer.mode,airspeed:r.speed,altitude:r.altitude,angles:[...r.angles],controls:{...sim.controls},meshCount:renderer.renderer.info.render.calls,triangles:renderer.renderer.info.render.triangles};
 }catch(error){running=false;document.body.classList.remove('running');$('flight-status').textContent=error.message;$('flight-status').classList.add('error');$('play').innerHTML='Continuar vuelo <span>›</span>';console.error(error);}
 requestAnimationFrame(frame);
}
try {
 renderer=new FlightRenderer($('viewport'));await renderer.load(n=>$('load-progress').textContent=`Cargando geometría y materiales… ${n}%`);
 ready=true;sync();$('loading').remove();$('play').disabled=false;requestAnimationFrame(frame);
}catch(error){$('load-progress').textContent='No se pudo abrir el visor. Usa Python 3 y un navegador con WebGL 2. '+error.message;$('loading').classList.add('error');console.error(error);}
