import {build} from 'esbuild';
import {copyFileSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
mkdirSync('simulator/dist',{recursive:true});
await build({entryPoints:['simulator/src/main.mjs'],bundle:true,format:'esm',minify:true,outfile:'simulator/dist/app.js',legalComments:'linked'});
writeFileSync('simulator/dist/app.js',readFileSync('simulator/dist/app.js','utf8').replace(/[ \t]+$/gm,''));
copyFileSync('node_modules/three/LICENSE','simulator/assets/THREE-LICENSE.txt');
