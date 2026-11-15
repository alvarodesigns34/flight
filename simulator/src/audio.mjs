/** An original synthesized ambient engine tone, not a TF30 recording. */
export class EngineAudio {
 constructor(){this.enabled=false;}
 async toggle(){
  if(!this.context) {
   this.context=new AudioContext();this.gain=this.context.createGain();this.gain.gain.value=0;
   const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=600;
   filter.connect(this.gain);this.gain.connect(this.context.destination);
   this.oscillators=[40,81,122].map(f=>{const o=this.context.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(filter);o.start();return o;});
  }
  await this.context.resume();this.enabled=!this.enabled;return this.enabled;
 }
 update(spool,running){
  if(!this.context)return;
  const now=this.context.currentTime;
  this.gain.gain.setTargetAtTime(this.enabled && running ? .008+spool*.018 : 0,now,.1);
  this.oscillators.forEach((o,i)=>o.frequency.setTargetAtTime((40+i*41)*(1+spool*.8),now,.2));
 }
}
