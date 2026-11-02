// Post-build only. Remove unserved, byte-identical generated server CSS copies.
// Served dist/client CSS, source assets, games and ALL migration files stay intact.
import {readFileSync,readdirSync,statSync,unlinkSync,existsSync} from 'node:fs';
import {resolve,join,relative,basename} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(process.argv[2]||'dist'),server=join(root,'server'),client=join(root,'client');
const config=JSON.parse(readFileSync(join(server,'wrangler.json'),'utf8'));
assert.equal(resolve(server,config.assets?.directory||''),client,'Unexpected served asset directory; no dedupe');
assert.ok(Array.isArray(config.rules)&&config.rules.every(r=>r.type==='ESModule'&&r.globs.every(g=>g.endsWith('.js')||g.endsWith('.mjs'))),'Unexpected module rules; no dedupe');
const walk=p=>readdirSync(p).flatMap(n=>{const f=join(p,n);return statSync(f).isDirectory()?walk(f):[f]});
const source=join(server,'_next/static/css');if(!existsSync(source)){console.log(JSON.stringify({removed:[],bytesSaved:0,note:'No duplicate server CSS directory'}));process.exit(0)}
const files=walk(source);assert.ok(files.every(p=>p.endsWith('.css')),'Unexpected generated file type; no dedupe');
const modules=walk(server).filter(p=>/\.(m?js)$/.test(p)),allowed=new Set(['__vite_rsc_assets_manifest.js','vinext-client-assets.js']);
const hash=b=>createHash('sha256').update(b).digest('hex'),proof=[];
for(const path of files){const rel=relative(server,path),copy=join(client,rel),bytes=readFileSync(path);assert.ok(existsSync(copy),'Served CSS counterpart missing');assert.deepEqual(readFileSync(copy),bytes,'Served/server CSS differs');
 for(const mod of modules){const content=readFileSync(mod,'utf8');if(content.includes(basename(path))){assert.ok(allowed.has(basename(mod)),'Unexpected JS reference to server CSS: '+relative(server,mod));assert.ok(content.includes('/'+rel.replaceAll('\\','/')),'Manifest reference is not the served public URL');}}
 proof.push({server:relative(root,path),served:relative(root,copy),bytes:bytes.length,sha256:hash(bytes)});
}
const migrations=join(root,'.openai/drizzle'),before=existsSync(migrations)?walk(migrations).map(p=>[p,hash(readFileSync(p))]):[];
for(const path of files)unlinkSync(path);
for(const [p,digest] of before)assert.equal(hash(readFileSync(p)),digest,'Migration bytes changed');
for(const item of proof)assert.equal(hash(readFileSync(join(root,item.served))),item.sha256,'Served CSS changed');
console.log(JSON.stringify({removed:proof,bytesSaved:proof.reduce((n,p)=>n+p.bytes,0),migrationFilesUnchanged:before.length,servedCopiesPreserved:true},null,2));
