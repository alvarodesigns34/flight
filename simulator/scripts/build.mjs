import {build} from 'esbuild';
import {copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('simulator/dist',{recursive:true});
await build({entryPoints:['simulator/src/main.mjs'],bundle:true,format:'esm',minify:true,outfile:'simulator/dist/app.js',legalComments:'linked'});
copyFileSync('node_modules/three/LICENSE','simulator/assets/THREE-LICENSE.txt');
