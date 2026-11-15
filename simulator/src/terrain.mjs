/** Fictional coastal landscape shared by graphics and generic contact physics.
 * Coordinates: east x, south z, height metres. Not real-world navigation data. */
const fract=x=>x-Math.floor(x);
const hash=(x,z)=>fract(Math.sin(x*127.1+z*311.7)*43758.5453);
const smooth=t=>t*t*(3-2*t);
export function noise2(x,z) {
 const ix=Math.floor(x),iz=Math.floor(z),u=smooth(fract(x)),v=smooth(fract(z));
 return (hash(ix,iz)*(1-u)+hash(ix+1,iz)*u)*(1-v)+(hash(ix,iz+1)*(1-u)+hash(ix+1,iz+1)*u)*v;
}
export function fbm(x,z) {let n=0,a=.5;for(let i=0;i<5;i++){n+=a*noise2(x,z);x=x*2.03+13.4;z=z*2.03-7.1;a*=.5;}return n;}
const ramp=(a,b,x)=>smooth(Math.max(0,Math.min(1,(x-a)/(b-a))));
export function terrainHeight(east,south) {
 const x=east,z=south;
 const coast=1-Math.hypot((x-2400)/12500,(z+3500)/16000)+(fbm(x*.00025,z*.00025)-.48)*.30;
 if(coast<-.08)return -45;
 const land=ramp(-.07,.14,coast);
 const ridge=Math.exp(-(((x-5000)/5500)**2)-(((z+5500)/10000)**2));
 const detail=fbm(x*.00065,z*.00065);
 let h=-25+land*(45+ridge*(220+1550*detail)+150*detail*coast);
 const runwayDistance=Math.max(Math.abs(x)/650,Math.abs(z+1300)/2900);
 const airportBlend=ramp(1,1.75,runwayDistance);
 h*=airportBlend;
 return h;
}
export const groundHeight=(north,east)=>terrainHeight(east,-north);
export const WATER_HEIGHT=-16;
