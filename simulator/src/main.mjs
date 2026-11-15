import {Simulation,csvHeader,clamp} from './physics.mjs';
import {FlightRenderer} from './renderer.mjs';
import {Input} from './input.mjs';
import {EngineAudio} from './audio.mjs';
const $=id=>document.getElementById(id),sim=new Simulation(),audio=new EngineAudio();
let uiTime=0,lastRead,physicsMs=0;
let renderer,running=false,ready=false,tab='flight',trimElevator=sim.controls.elevator,last=performance.now(),frames=0,frameTime=0;
const cameraModes=['orbit','chase','pilot'];
function play(){
 if(!ready||tab!=='flight')return;running=!running;renderer.dirty=true;document.body.classList.toggle('running',running);if(running){document.body.classList.remove('settings-open');$('settings-toggle').setAttribute('aria-expanded','false');}
 $('play').innerHTML=running?'<span class="pause-symbol"></span> Pausar vuelo':'<span class="play-symbol"></span> Continuar vuelo';$('flight-status').textContent=running?'EN VUELO':'EN PAUSA';
}
function sync(){for(const id of ['throttle','sweep','flaps'])$(id).value=Math.round(sim.controls[id]*100);$('gear').checked=sim.controls.gear===1;$('brake').checked=sim.controls.brake===1;$('wind').value=0;$('gust').value=0;$('rudder').value=0;}
function center(){input.clear();input.trimOffset=0;input.axes={pitch:0,roll:0,yaw:0};$('rudder').value=0;sim.controls.elevator=trimElevator;sim.controls.aileron=sim.controls.rudder=0;}
function reset(){
 if(running)play();lastRead=null;sim.reset($('scenario').value);trimElevator=sim.controls.elevator;center();sync();renderer?.setMode(renderer.mode);$('play').innerHTML='<span class="play-symbol"></span> Iniciar vuelo';
}
function setCamera(mode){renderer.setMode(mode);document.body.classList.toggle('pilot-mode',mode==='pilot'&&tab==='flight');document.querySelectorAll('[data-camera]').forEach(b=>b.classList.toggle('active',b.dataset.camera===mode));}
function toggle(id){$(id).checked=!$(id).checked;sim.controls[id]=$(id).checked?1:0;}
const input=new Input(code=>{
 if(code==='Space')play();if(code==='KeyR')reset();if(code==='KeyC')setCamera(cameraModes[(cameraModes.indexOf(renderer.mode)+1)%3]);
 if(code==='KeyG')toggle('gear');if(code==='KeyB')toggle('brake');if(code==='KeyF'){sim.controls.flaps=sim.controls.flaps>.1?0:.5;$('flaps').value=sim.controls.flaps*100;}
});
async function setTab(value){
 if(value===tab&&ready)return;if(running)play();tab=value;input.enabled=value==='flight';input.clear();document.body.dataset.tab=tab;const route=new URL(location.href);route.hash=tab==='model'?'modelo':'';history.replaceState(null,'',route);
 for(const el of document.querySelectorAll('.model-only'))el.hidden=tab!=='model';
 for(const el of document.querySelectorAll('.tabs [data-tab]')){el.setAttribute('aria-selected',el.dataset.tab===tab);el.tabIndex=el.dataset.tab===tab?0:-1;}
 document.body.classList.toggle('pilot-mode',tab==='flight'&&renderer.mode==='pilot');renderer.setTab(tab);
 if(tab==='model'){renderer.renderer.toneMappingExposure=Number($('exposure').value)/100;await selectEdition();}
}
async function selectEdition(){
 const selected=$('model-version').value;$('model-version').disabled=true;$('asset-progress').hidden=false;
 try{await renderer.selectModel(selected);const evolved=selected==='evolved';$('edition-label').textContent=evolved?'EDICIÓN EVOLUCIONADA':'GEOMETRÍA ORIGINAL ÍNTEGRA';$('original-stats').textContent=(evolved?renderer.evolvedMetadata.triangles:renderer.metadata.source_evaluated_triangles).toLocaleString('es-ES')+' triángulos · todos los interiores';}
 catch(error){$('asset-progress').textContent='No se pudo abrir el modelo: '+error.message;console.error(error);return;}
 finally{$('model-version').disabled=false;}
 $('asset-progress').hidden=true;
}
$('model-version').onchange=selectEdition;
$('settings-toggle').onclick=()=>{const opened=document.body.classList.toggle('settings-open');$('settings-toggle').setAttribute('aria-expanded',opened);renderer.dirty=true;};
$('touch-throttle').oninput=()=>{sim.controls.throttle=Number($('touch-throttle').value)/100;uiTime=0;};
$('gust').oninput=()=>sim.gustStrength=Number($('gust').value);
$('technical-toggle').onclick=()=>{$('technical').hidden=!$('technical').hidden;$('technical-toggle').setAttribute('aria-pressed',!$('technical').hidden);};
$('export-diagnostics').onclick=()=>{const data={capturedAt:new Date().toISOString(),scope:'Generic educational dynamics; browser CPU timing, GPU time unavailable',...window.flightLab},url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='flight-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const keyLabel=code=>({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Space:'Espacio'}[code]||code.replace(/^(Key|Digit)/,''));
const actions={ArrowUp:'Morro arriba',ArrowDown:'Morro abajo',ArrowLeft:'Alabear izquierda',ArrowRight:'Alabear derecha',KeyA:'Guiñada izquierda',KeyD:'Guiñada derecha',KeyW:'Más potencia',KeyS:'Menos potencia',KeyQ:'Trim abajo',KeyE:'Trim arriba',KeyG:'Tren',KeyF:'Flaps',KeyB:'Freno',KeyC:'Cámara',KeyR:'Reiniciar',Space:'Pausa'};let binding=null;
for(const [code,label] of Object.entries(actions)){const row=document.createElement('label');row.textContent=label;const b=document.createElement('button');b.type='button';b.dataset.binding=code;b.textContent=keyLabel(input.profile.bindings[code]);b.onclick=()=>{binding=code;$('binding-status').textContent='Pulsa una tecla para «'+label+'». Escape cancela.';};row.append(b);$('key-bindings').append(row);}
window.addEventListener('keydown',e=>{
 if(!binding||!$('controls-dialog').open)return;e.preventDefault();e.stopImmediatePropagation();
 if(e.code==='Escape'){binding=null;$('binding-status').textContent='Asignación cancelada.';return;}
 if(e.ctrlKey||e.metaKey||e.altKey||!(/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space)$/.test(e.code)))return;
 const bindings={...input.profile.bindings},other=Object.keys(bindings).find(k=>bindings[k]===e.code);if(other)bindings[other]=bindings[binding];bindings[binding]=e.code;input.saveProfile({...input.profile,bindings});binding=null;syncProfile();$('binding-status').textContent='Asignación guardada.';
},true);
$('controls-dialog').addEventListener('close',()=>{binding=null;input.clear();});
function syncProfile(){for(const b of document.querySelectorAll('[data-binding]'))b.textContent=keyLabel(input.profile.bindings[b.dataset.binding]);for(const [id,key,scale] of [['sensitivity','sensitivity',100],['deadzone','deadzone',100],['response-curve','curve',100]]){$(id).value=input.profile[key]*scale;$(id+'-value').textContent=key==='curve'?input.profile[key].toFixed(2).replace('.',','):Math.round(input.profile[key]*100)+'%';}$('invert-pitch').checked=input.profile.invertPitch;$('yaw-axis').value=input.profile.yawAxis;}
for(const id of ['sensitivity','deadzone','response-curve','invert-pitch','yaw-axis'])$(id).oninput=()=>{input.saveProfile({...input.profile,sensitivity:Number($('sensitivity').value)/100,deadzone:Number($('deadzone').value)/100,curve:Number($('response-curve').value)/100,invertPitch:$('invert-pitch').checked,yawAxis:$('yaw-axis').value});syncProfile();};
$('input-settings').onclick=()=>{if(running)play();input.clear();syncProfile();$('controls-dialog').showModal();};
$('close-controls').onclick=()=>$('controls-dialog').close();$('restore-controls').onclick=()=>{input.saveProfile({});syncProfile();};
$('calibrate').onclick=()=>$('calibration-status').textContent=input.calibrate()?'Centro guardado. Los ejes vuelven a cero en reposo.':'No se detecta un gamepad conectado.';
for(const button of document.querySelectorAll('.tabs [data-tab]'))button.onclick=()=>setTab(button.dataset.tab);
document.querySelector('.tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.code)){e.preventDefault();setTab(e.code==='Home'?'flight':e.code==='End'?'model':tab==='flight'?'model':'flight');$('tab-'+tab).focus();}});
$('focus-view').onclick=()=>{const focused=document.body.classList.toggle('focus-mode');$('focus-view').setAttribute('aria-pressed',focused);$('focus-view').textContent=focused?'Mostrar paneles':'Vista limpia';renderer.resize();};
$('play').onclick=play;$('reset').onclick=reset;$('scenario').onchange=reset;$('center-controls').onclick=center;
for(const id of ['throttle','sweep','flaps'])$(id).oninput=()=>sim.controls[id]=Number($(id).value)/100;
for(const id of ['gear','brake'])$(id).onchange=()=>sim.controls[id]=$(id).checked?1:0;
$('wind').oninput=()=>sim.wind=[0,Number($('wind').value),0];$('rudder').oninput=()=>input.manual.yaw=Number($('rudder').value)/100;
$('trim-down').onclick=()=>input.trimOffset=clamp(input.trimOffset-.01,-.3,.3);$('trim-up').onclick=()=>input.trimOffset=clamp(input.trimOffset+.01,-.3,.3);
$('daylight').onchange=()=>renderer.setLight($('daylight').value);$('quality').onchange=()=>renderer.setQuality($('quality').value);
for(const b of document.querySelectorAll('[data-camera]'))b.onclick=()=>setCamera(b.dataset.camera);
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>{renderer.preset(b.dataset.preset,true);document.querySelectorAll('[data-preset]').forEach(x=>x.classList.toggle('active',x===b));};
$('cutaway').onchange=()=>renderer.cutaway($('cutaway').value);$('auto-rotate').onchange=()=>renderer.setRotate($('auto-rotate').checked);$('wireframe').onchange=()=>renderer.setWireframe($('wireframe').checked);
$('exposure').oninput=()=>{renderer.renderer.toneMappingExposure=Number($('exposure').value)/100;$('exposure-value').textContent=(Number($('exposure').value)/100).toFixed(2).replace('.',',');};
for(const id of ['help','about'])$(id).onclick=()=>{if(running)play();input.clear();$('info').showModal();};$('close-info').onclick=()=>$('info').close();
$('sound').onclick=$('sound-settings').onclick=async()=>{try{const enabled=await audio.toggle();$('sound').setAttribute('aria-pressed',enabled);$('sound').textContent=$('sound-settings').textContent=`Sonido ${enabled?'ON':'OFF'}`;}catch{$('sound').textContent='Audio no disponible';}};
$('export').onclick=()=>{
 const blob=new Blob([csvHeader+'\n'+sim.telemetry.map(r=>r.join(',')).join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tomcat-telemetry.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)play();last=performance.now();});
function instruments(){
 const r=sim.read(),c=sim.controls,deg=180/Math.PI;
 $('touch-throttle').value=c.throttle*100;$('touch-power-value').textContent=Math.round(c.throttle*100)+'%';$('gust-value').textContent=sim.gustStrength+' m/s';
 $('speed').textContent=Math.round(r.speed*1.943844);$('altitude').textContent=Math.round(r.altitude*3.28084).toLocaleString('es-ES');
 $('climb').textContent=(r.verticalSpeed>=0?'+':'')+Math.round(r.verticalSpeed*196.8504);$('heading').textContent=String(Math.round((r.angles[2]*deg+360)%360)%360).padStart(3,'0')+'°';
 $('clearance').textContent=Math.round(r.heightAboveGround).toLocaleString('es-ES');$('load').textContent=r.loadFactor.toFixed(2)+'g';$('fuel').textContent=Math.round(sim.state[14]).toLocaleString('es-ES')+' kg';
 $('timer').textContent=`T + ${String(Math.floor(sim.time/60)).padStart(2,'0')}:${String(Math.floor(sim.time%60)).padStart(2,'0')}`;
 $('throttle-value').textContent=Math.round(c.throttle*100)+'%';$('throttle').value=c.throttle*100;$('sweep-value').textContent=c.sweep===0?'Extendida':Math.round(c.sweep*100)+'%';$('flaps-value').textContent=Math.round(c.flaps*100)+'%';$('wind-value').textContent=sim.wind[1]+' m/s';
 $('trim-value').textContent=(input.trimOffset>=0?'+':'')+Math.round(input.trimOffset*100)+'%';const axes=input.axes||{roll:0,pitch:0};$('stick-knob').style.transform=`translate(${axes.roll*26}px,${-axes.pitch*26}px)`;
 $('input-device').textContent=input.gamepad?'Mando conectado · '+input.gamepad.slice(0,24):'Teclado + mando en pantalla';
 if(running){$('gear').checked=c.gear>.5;$('flight-status').textContent=sim.time<sim.gearNoticeUntil?'CONTACTO · TREN MANTENIDO':r.groundLoad>100?'EN TIERRA':r.heightAboveGround<60?'CERCA DEL TERRENO':Math.abs(r.alpha)>.35?'ÁNGULO ELEVADO':(r.speed>220||r.altitude>6000)?'FUERA DE RANGO':'EN VUELO';}
 const ctx=$('attitude').getContext('2d');ctx.clearRect(0,0,168,120);ctx.save();ctx.beginPath();ctx.arc(84,60,48,0,Math.PI*2);ctx.clip();ctx.translate(84,60);ctx.rotate(-r.angles[0]);ctx.translate(0,r.angles[1]*115);ctx.fillStyle='#678d9d';ctx.fillRect(-300,-300,600,300);ctx.fillStyle='#6d7359';ctx.fillRect(-300,0,600,300);ctx.strokeStyle='#e5eee3';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-300,0);ctx.lineTo(300,0);ctx.stroke();for(let i=-3;i<=3;i++)if(i){ctx.beginPath();ctx.moveTo(-12,i*19);ctx.lineTo(12,i*19);ctx.stroke();}ctx.restore();ctx.strokeStyle='#d8e9b2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(49,60);ctx.lineTo(72,60);ctx.lineTo(84,66);ctx.lineTo(96,60);ctx.lineTo(119,60);ctx.stroke();ctx.strokeStyle='#b1cbd266';ctx.lineWidth=1;ctx.beginPath();ctx.arc(84,60,48,0,Math.PI*2);ctx.stroke();
 return r;
}
function frame(now){
 const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.1);last=now;
 try{
  const physicsStart=performance.now();if(running&&tab==='flight'){input.update(sim.controls,trimElevator,Math.min(elapsed,.25));sim.advance(elapsed);}physicsMs=performance.now()-physicsStart;
  if(!lastRead||now-uiTime>=50){lastRead=instruments();uiTime=now;}const r=lastRead;audio.update(sim.state[13],running&&tab==='flight',r.speed);const renderedBefore=renderer.renderedFrames;renderer.update(sim,dt,running);frames+=renderer.renderedFrames-renderedBefore;frameTime+=elapsed;
  if(frameTime>=1){$('performance').textContent=!running&&(!renderer.autoRotate||renderer.reducedMotion)?'Vista en reposo · '+(tab==='model'?'modelo íntegro':renderer.quality):`${frames/frameTime<10?(frames/frameTime).toFixed(1):Math.round(frames/frameTime)} FPS · ${renderer.quality}`;frames=0;frameTime=0;}
  window.flightLab={ready,time:sim.time,running,camera:renderer.mode,tab,airspeed:r.speed,altitude:r.altitude,angles:[...r.angles],controls:{...sim.controls},appliedControls:{...sim.applied},physicsCpuMs:physicsMs,droppedTime:sim.droppedTime,position:sim.state.slice(0,3),contacts:r.contactData,meshCount:renderer.renderer.info.render.calls,triangles:renderer.renderer.info.render.triangles,...renderer.diagnostics()};
  if(!$('technical').hidden)$('technical-values').textContent=`Física: ${physicsMs.toFixed(2)} ms CPU\nEnvío de render: ${(renderer.frameStats.cpuSubmitMs||0).toFixed(2)} ms CPU\nGPU: sin medición fiable\nLlamadas: ${renderer.frameStats.calls||0}\nTriángulos por fotograma: ${(renderer.frameStats.triangles||0).toLocaleString('es-ES')}\nTerreno: ${renderer.landscape.terrainRings.triangles.toLocaleString('es-ES')} tri\nPaso físico: 120 Hz\nTiempo descartado: ${sim.droppedTime.toFixed(2)} s\nTren aplicado: ${Math.round(sim.applied.gear*100)}%\nFlaps aplicados: ${Math.round(sim.applied.flaps*100)}%`;
 }catch(error){if(running)play();$('flight-status').textContent=error.message;$('flight-status').classList.add('error');console.error(error);}
 requestAnimationFrame(frame);
}
try{
 renderer=new FlightRenderer($('viewport'));const preference=new URLSearchParams(location.search).get('quality');if(['ultra','high','light'].includes(preference)){$('quality').value=preference;renderer.quality=preference;}
 await renderer.load(message=>$('load-progress').textContent=message);ready=true;reset();$('original-stats').textContent=renderer.metadata.source_evaluated_triangles.toLocaleString('es-ES')+' triángulos · todos los interiores';$('loading').remove();$('play').disabled=false;
 if(location.hash==='#modelo')await setTab('model');requestAnimationFrame(frame);
}catch(error){$('load-progress').textContent='No se pudo abrir el visor: '+error.message;const retry=document.createElement('button');retry.textContent='Reintentar';retry.onclick=()=>location.reload();$('loading').appendChild(retry);console.error(error);}
