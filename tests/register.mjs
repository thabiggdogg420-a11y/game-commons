import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
registerHooks({resolve(specifier,context,next){if(specifier==='cloudflare:workers')return {url:new URL('./test-env.mjs',import.meta.url).href,shortCircuit:true};let p;if(specifier.startsWith('@/'))p=path.join(root,specifier.slice(2));else if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts'))p=path.resolve(path.dirname(fileURLToPath(context.parentURL)),specifier);if(p){for(const candidate of [p+'.ts',path.join(p,'index.ts')])if(existsSync(candidate))return {url:pathToFileURL(candidate).href,shortCircuit:true}}return next(specifier,context)}});
