// Offline preparation only: no network, production writes or credentials.
// Usage: node scripts/prepare-external-import.mjs catalogue.jsonl output-directory
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Input JSONL and output directory required.');
const bytes=readFileSync(input),rows=bytes.toString('utf8').split('\n').filter(Boolean).map(s=>JSON.parse(s));
if(rows.length<1||rows.length>20000||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Invalid count or duplicate IDs.');
const sha256=createHash('sha256').update(bytes).digest('hex'),generation='catalogue-'+sha256.slice(0,32),dir=resolve(output);mkdirSync(dir,{recursive:true});
const save=(file,value)=>writeFileSync(join(dir,file),JSON.stringify(value)+'\n');
save('00000-begin.json',{action:'begin',generation,expected:rows.length});
for(let i=0;i<rows.length;i+=10)save(String(i/10+1).padStart(5,'0')+'-chunk.json',{action:'chunk',generation,records:rows.slice(i,i+10)});
save('activate-after-review.json',{action:'activate',generation});save('status.json',{action:'status',generation});
save('manifest.json',{generation,sha256,expected:rows.length,chunks:Math.ceil(rows.length/10),endpoint:'/api/moderation/external-catalogue',instructions:'Existing authenticated moderator only. Stage chunks, inspect status/count and samples, then explicitly approve activation. Do not spoof identity headers. These files are not migrations or Site build assets.'});
console.log(JSON.stringify({generation,expected:rows.length,chunks:Math.ceil(rows.length/10),dir}));
