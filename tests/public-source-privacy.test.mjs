import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,lstatSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceDirectory,sourceProjectIndex} from '../lib/project-catalogue.ts';
import {projectBrief} from '../lib/project-handoff.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const excluded=new Set(['node_modules','.sites-runtime','.wrangler','dist','.git','.vinext','.next']);
function files(dir=root){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{if(excluded.has(entry.name))return [];const p=path.join(dir,entry.name);if(lstatSync(p).isSymbolicLink())return [];return entry.isDirectory()?files(p):[p]})}
test('public source tree contains no deployment identities, private screenshot records, saved reports or nested artifact archives',()=>{
 for(const file of files()){
  if(file===fileURLToPath(import.meta.url))continue;
  const relative=path.relative(root,file);assert(!/\.(zip|tar|gz|7z|sqlite|db)$/i.test(relative),relative);
  assert(!/(?:production-v\d+-receipt|baseline-live-report|production-v\d+-sdk-report|submission)\.json$/i.test(relative),relative);
  const content=readFileSync(file);if(content.includes(0))continue;
  assert(!/(?:appgdep_|appgprj_|libfile_)[A-Za-z0-9_]{8,}|originalImageRetainedPrivately|captureFileSha256|captureObserver|\/workspace\/scratch\/|\/home\/agent\//.test(content.toString('utf8')),relative);
 }
});
test('gallery and curated seeds are empty instead of relabelled internal records',()=>{
 const captures=JSON.parse(readFileSync(path.join(root,'public/gameplay-captures/provenance.json'),'utf8'));
 const curated=JSON.parse(readFileSync(path.join(root,'public/curated-remixes/index.json'),'utf8'));
 assert.deepEqual(captures.records,[]);assert.deepEqual(curated.records,[]);
 assert(!existsSync(path.join(root,'public/foundry-crosswind')));
 assert(!existsSync(path.join(root,'public/projects/art/tactical-slash.webp')));
});
test('external directory remains searchable and paginated without hosted/private evidence records',()=>{
 const index=sourceProjectIndex();assert(index.projects.length>=20);assert.equal(index.hostedProjects.total,0);assert.equal(index.reviewedReturns.total,0);
 let result=sourceDirectory({limit:5});const ids=[];
 for(;;){assert(result.projects.length<=5);ids.push(...result.projects.map(x=>x.id));if(!result.nextCursor)break;result=sourceDirectory({limit:5,cursor:result.nextCursor})}
 assert.equal(ids.length,index.projects.length);assert.equal(new Set(ids).size,ids.length);
 for(const item of index.projects){assert(!('externalPlayEvidence' in item));assert(!('externalPlayObservation' in item));const brief=projectBrief(item.id);assert(brief?.includes(item.creator));assert(brief?.includes(item.sourceUrl||item.playUrl));}
 assert(sourceDirectory({query:'city',limit:5}).projects.length>0);
});
