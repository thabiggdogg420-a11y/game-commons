import {externalSnapshot} from './external-snapshot';
import {sourceProjectDetail} from './project-catalogue';
import {mediaSummaries} from './project-media';
import {projectSignals,type ProjectActivity} from './project-signals';
import {accessCorrections} from './project-corrections';
import type {MediaSummary,MediaAction} from './project-media-types';
export type TopPick={id:string;title:string;genre:string;summary:string;creator:string|null;media:MediaSummary|null;action:MediaAction|null;activity:ProjectActivity;notes:string[];detailUrl:string;selection:{label:string;basis:string;observedAt:string;verification:string}};
export async function topPicks({limit=6}:{limit?:number}={}):Promise<TopPick[]>{
 if(!Number.isInteger(limit)||limit<1||limit>6)throw Error('Choose1–6 approved picks.');
 const signals=await projectSignals();if(!signals)return [];
 const selections=signals.data.carouselSelection.filter(s=>s.selectionApproved&&!accessCorrections.has(s.id)).slice(0,limit),media=await mediaSummaries(selections.map(s=>s.id));
 let external;try{external=await externalSnapshot()}catch{return []}
 const out:TopPick[]=[];
 for(const s of selections){const imported=s.id.startsWith('external-'),p=imported?external.detail(s.id):sourceProjectDetail(s.id);if(!p)continue;const m=media.get(s.id)??null;if(!m?.primaryImage)continue;let action=m?.primaryAction??null;
 // Exact independently reviewed free-download edition, not an inferred source archive.
 if(!action&&s.id==='external-80fa3f53a31a7e03536d')action={kind:'official-download-page',label:'Download now',url:s.officialUrl,platforms:['Desktop','Android'],sourcePage:s.officialUrl,observedAt:s.observedAt,verification:s.verification};
 out.push({id:s.id,title:p.title,genre:'genres' in p?p.genres.join(' / '):'genre' in p?String(p.genre):'Game',summary:s.reason,creator:'creator' in p&&typeof p.creator==='string'?p.creator:null,media:m,action,activity:s.activity,notes:[s.warning],detailUrl:imported?'/api/external-catalogue/'+s.id:'/projects/'+s.id+'/brief',selection:{label:s.label,basis:s.selectionBasis,observedAt:s.observedAt,verification:s.verification}});
 }
 return out;
}
