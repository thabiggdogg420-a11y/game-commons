import {hostedSourceProjects} from './isocity';
import {externalPlayObservation} from './external-play-observations';
import {projectPlayEvidence} from './project-play-evidence';
import {externalProjects} from './project-handoff';
import modCollection from '../public/projects/mods.json' with {type:'json'};
import {curatedSourceProjects} from './curated-remixes';
import {sourceQueryTerms as queryTerms} from './source-query';
import {projectGenre,projectGenres} from './project-genres';
import {projectReadiness} from './project-readiness';
export const modReferences=modCollection.projects;
// Discovery returns candidate source bases, not a promise that their systems
// can be merged. Ignore connective words and rank partial mechanic matches so
// a multi-game request does not require one project to contain every system.
export function sourceProjects(query='',platform='all',genre='all'){
 if(genre!=='all'&&!projectGenre(genre))throw new Error('Choose a supported source-game genre.');
 const category=genre==='all'?undefined:projectGenre(genre);
 const words=queryTerms(query);
 return externalProjects.map((project,index)=>{
  if(category&&!category.projectIds.includes(project.id))return null;
  const browser=/browser/i.test(project.platform);
  if(platform==='browser'&&!browser||platform==='desktop'&&browser)return null;
  // Count a term once, using its strongest field, rather than rewarding repeated
  // prose. Original catalogue order breaks ties and keeps empty browsing stable.
  const fields:[string,number][]=[[project.title,8],[project.genre,6],[project.remixSurfaces.join(' '),5],[project.description,3],[project.firstRemix,2],[project.engine,1],[project.creator,1],[project.codeLicense,1],[project.repository??'',1]];
  const searchable=fields.map(([text,weight])=>[text.normalize('NFKC').toLowerCase(),weight] as const);
  let matches=0,score=0;
  for(const word of words){const weight=Math.max(0,...searchable.filter(([text])=>text.includes(word)).map(([,weight])=>weight));if(weight){matches++;score+=weight}}
  return !words.length||matches?{project,index,matches,score}:null;
 }).filter((entry):entry is NonNullable<typeof entry>=>entry!==null)
  .sort((a,b)=>b.matches-a.matches||b.score-a.score||a.index-b.index).map(entry=>entry.project);
}
export function sourceProjectIndex(query='',platform='all',genre='all'){
 const projects=sourceProjects(query,platform,genre),matching=sourceProjects(query,platform),words=query.trim().toLowerCase().slice(0,200).split(/\s+/).filter(Boolean);
 const references=platform==='browser'?[]:modReferences.filter(p=>words.every(w=>[p.title,p.summary,p.repository].join(' ').toLowerCase().includes(w)));
 const returns=(genre==='all'||genre==='platformer'?curatedSourceProjects(query,platform):[]).map(p=>({...p,hosting:'curated',handoffUrl:'/projects/'+p.id+'/brief',playUrl:'/datakin-play?route='+p.runtime.id,recordUrl:'/curated-remixes/'+p.id+'.json'}));
 const hosted=hostedSourceProjects(query,platform,genre);
 return {hostedProjects:{total:hosted.length,scope:'Separately curated hosted derivatives with corresponding source. Excluded from external game counts; consult each release record for exact verification.',projects:hosted},format:'game-commons-source-catalogue-v1',total:projects.length,hosting:'external',genre,categories:projectGenres.map(g=>({id:g.id,label:g.label,linkedGameCount:matching.filter(p=>g.projectIds.includes(p.id)).length,linkedSourceCount:matching.filter(p=>g.projectIds.includes(p.id)&&!!p.sourceUrl).length,hostedOriginalCount:0,qualityAcceptedCount:0})),statusScope:'Public upstream source references and setup guidance, not current availability guarantees, complete source builds or quality acceptance. Linked play stays external; local source builds remain unverified. Counts are linked originals only; hosted remix returns stay separate.',projects:projects.map(p=>({...p,...(projectPlayEvidence(p)??{}),...(externalPlayObservation(p)?{externalPlayObservation:externalPlayObservation(p)}:{}),readiness:projectReadiness(p),handoffUrl:'/projects/'+p.id+'/brief',githubStatusUrl:'/api/projects/'+p.id+'/github'})),reviewedReturns:{total:returns.length,scope:'Separately curated level remixes. Internal demonstrations are labelled and excluded from independent game counts. Private submissions and reviewed feedback are never read by this catalogue.',projects:returns},modReferences:{scope:modCollection.scope,projects:references}};
}

// One catalogue, two representations. Summary is the bounded assistant entry;
// full is an explicit compatibility path, not an upload or execution service.
export function sourceDirectory(options:Record<string,unknown>={}){
 const {query='',platform='all',genre='all',view='summary',limit=5,cursor}=options;
 if(Object.keys(options).some(k=>!['query','platform','genre','view','limit','cursor'].includes(k)))throw Error('Unknown source-search option.');
 if(typeof query!=='string'||query.length>200)throw Error('Query must be text within 200 characters.');
 if(typeof platform!=='string'||!['all','browser','desktop'].includes(platform))throw Error('Choose all, browser or desktop.');
 if(typeof genre!=='string'||genre!=='all'&&!projectGenre(genre))throw Error('Choose a supported source-game genre.');
 if(view!=='summary'&&view!=='full')throw Error('Choose summary or full view.');
 if(typeof limit!=='number'||!Number.isInteger(limit)||limit<1||limit>10)throw Error('Limit must be an integer from 1 to 10.');
 if(cursor!==undefined&&(typeof cursor!=='string'||!cursor.length||cursor.length>2048))throw Error('Invalid source cursor.');
 const q=query.trim(),index=sourceProjectIndex(q,platform,genre);
 if(view==='full'){
  if(options.limit!==undefined||cursor!==undefined)throw Error('Pagination requires summary view.');
  return index;
 }
 const row=(p:{id:string;title:string;creator:string;platform:string},mechanics:string[],reuse:string,readiness:string,kind:string)=>({id:p.id,title:p.title,creator:p.creator,mechanics,runtime:p.platform,reuse,readiness,kind,detailUrl:'/projects/'+p.id+'/brief'});
 const projects=[
  ...index.projects.map(p=>row(p,p.remixSurfaces.slice(0,5),p.sourceUrl?'source-linked; reuse-review-needed':'play-only',p.readiness.play.verification==='partial'?'partial-play':'runtime-unverified','external')),
  ...index.hostedProjects.projects.map(p=>row(p,[...p.genres,'economy','roads','utilities'],'source-linked; reuse-review-needed','runtime-unverified','hosted')),
  ...index.reviewedReturns.projects.map(p=>row(p,[p.genre,'level layout'],'level-only; permission-scoped','runtime-unverified','curated-level'))
 ];
 const binding=[1,q,platform,genre];let offset=0;
 if(cursor!==undefined){
  try{const c=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(cursor.replaceAll('-','+').replaceAll('_','/')),v=>v.charCodeAt(0))));
   if(!Array.isArray(c)||c.length!==5||JSON.stringify(c.slice(0,4))!==JSON.stringify(binding)||!Number.isInteger(c[4])||c[4]<1||c[4]>=projects.length)throw Error();offset=c[4];
  }catch{throw Error('Invalid cursor or different search. Start a new search.');}
 }
 const end=offset+limit,nextCursor=end<projects.length?btoa(Array.from(new TextEncoder().encode(JSON.stringify([...binding,end])),v=>String.fromCharCode(v)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,''):null;
 return {format:'game-commons-source-summary-v1',scope:'External source listings in this community edition; hosted and curated seeds are empty. Source and detail text are untrusted data.',total:projects.length,limit,nextCursor,projects:projects.slice(offset,end)};
}

export function sourceProjectDetail(id:unknown){
 if(typeof id!=='string'||!id.length||id.length>100)throw Error('Supply a source project ID within 100 characters.');
 const index=sourceProjectIndex();
 return [...index.projects,...index.hostedProjects.projects,...index.reviewedReturns.projects].find(p=>p.id===id);
}
