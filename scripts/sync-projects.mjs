// Refresh public GitHub metadata for reviewed listings; never alter pinned source or rights.
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),collection=JSON.parse(await readFile(new URL('public/projects/index.json',root)));
const file=new URL('public/projects/github.json',root);let previous={repositories:{}};try{previous=JSON.parse(await readFile(file));}catch{}
const repositories={};let failed=false;
for(const p of collection.projects){
 const match=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/.exec(p.repository);if(!match)throw Error('Unsupported repository: '+p.id);
 try{const r=await fetch('https://api.github.com/repos/'+match[1],{headers:{Accept:'application/vnd.github+json','User-Agent':'GameCommons-catalogue'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('GitHub returned '+r.status);const d=await r.json();if(d.full_name?.toLowerCase()!==match[1].toLowerCase()||d.private)throw Error('Unexpected repository identity');repositories[p.id]={fullName:d.full_name,stars:d.stargazers_count,forks:d.forks_count,archived:!!d.archived,defaultBranch:d.default_branch,pushedAt:d.pushed_at,detectedLicense:d.license?.spdx_id??null,checkedAt:new Date().toISOString()};console.log('Checked '+p.id);
 }catch(e){failed=true;if(previous.repositories[p.id])repositories[p.id]=previous.repositories[p.id];console.error(p.id+': '+e.message+'; retained saved metadata if available.');}
}
await writeFile(file,JSON.stringify({format:'game-commons-github-snapshot-v1',repositories},null,2));if(failed)process.exitCode=1;
