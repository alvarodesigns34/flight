/** Original synthesized jet/airflow ambience. No TF30 recording or performance model. */
export class EngineAudio {
 constructor(){this.enabled=false;}
 async toggle(){
  if(!this.context){
   const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=0;this.master.connect(ctx.destination);
   const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);let seed=84,b0=0,b1=0,b2=0;
   for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;const white=seed/2147483648-1;b0=.99765*b0+white*.099046;b1=.963*b1+white*.296516;b2=.57*b2+white*1.05269;data[i]=(b0+b1+b2+white*.1848)*.16;}
   const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;this.jet=ctx.createBiquadFilter();this.jet.type='lowpass';this.jet.frequency.value=300;
   const jetGain=ctx.createGain();jetGain.gain.value=.55;noise.connect(this.jet);this.jet.connect(jetGain);jetGain.connect(this.master);
   this.wind=ctx.createBiquadFilter();this.wind.type='highpass';this.wind.frequency.value=500;this.windGain=ctx.createGain();this.windGain.gain.value=0;noise.connect(this.wind);this.wind.connect(this.windGain);this.windGain.connect(this.master);noise.start();
   this.oscillators=[43,86,129].map((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.value=.025/(i+1);o.connect(g);g.connect(this.master);o.start();return o;});
  }
  await this.context.resume();this.enabled=!this.enabled;return this.enabled;
 }
 update(spool,running,airspeed=0){
  if(!this.context)return;const now=this.context.currentTime;
  this.master.gain.setTargetAtTime(this.enabled&&running?.045+spool*.09:0,now,.15);
  this.jet.frequency.setTargetAtTime(200+spool*1800,now,.3);this.windGain.gain.setTargetAtTime(Math.min(.6,airspeed*airspeed/50000),now,.2);
  this.oscillators.forEach((o,i)=>o.frequency.setTargetAtTime((43+i*43)*(1+spool*.55),now,.25));
 }
}
