import saved from '../public/projects/github.json' with {type:'json'};
import {externalProjects} from './project-handoff';
export type GithubSummary={fullName:string;stars:number;forks:number;archived:boolean;defaultBranch:string;pushedAt:string|null;detectedLicense:string|null;checkedAt:string;repositoryRole?:'general-upstream-not-server-fork'};
export function savedGithub(id:string){const value=(saved.repositories as Record<string,GithubSummary>)[id]??null;return value&&id==='freeciv-web'?{...value,repositoryRole:'general-upstream-not-server-fork' as const}:value}
export function githubRepo(id:string){const p=externalProjects.find(p=>p.id===id);const m=p&&/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/.exec(p.repository??'');return m?.[1]??null}
export async function checkGithub(id:string,fetcher:typeof fetch=fetch){
 const repo=githubRepo(id);if(!repo)return null;
 try{const r=await fetcher('https://api.github.com/repos/'+repo,{headers:{Accept:'application/vnd.github+json','User-Agent':'GameCommons-catalogue'},redirect:'manual',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('GitHub unavailable');const d=await r.json() as Record<string,unknown>;
  if(typeof d.full_name!=='string'||d.full_name.toLowerCase()!==repo.toLowerCase()||d.private!==false||!Number.isSafeInteger(d.stargazers_count)||Number(d.stargazers_count)<0||!Number.isSafeInteger(d.forks_count)||typeof d.default_branch!=='string'||typeof d.archived!=='boolean')throw Error('Invalid repository response');
  const licence=d.license as {spdx_id?:unknown}|null;
  const github:GithubSummary={...(id==='freeciv-web'?{repositoryRole:'general-upstream-not-server-fork' as const}:{}),fullName:d.full_name,stars:Number(d.stargazers_count),forks:Number(d.forks_count),archived:d.archived,defaultBranch:d.default_branch.slice(0,200),pushedAt:typeof d.pushed_at==='string'?d.pushed_at.slice(0,40):null,detectedLicense:typeof licence?.spdx_id==='string'?licence.spdx_id.slice(0,80):null,checkedAt:new Date().toISOString()};
  return {source:'github' as const,github,message:'Repository information checked. The reviewed source commit and asset notices are unchanged.'};
 }catch{return {source:'saved-snapshot' as const,github:savedGithub(id),message:'GitHub is temporarily unavailable or rate limited. Showing saved repository information; play links and remix handoffs still work.'};}
}
