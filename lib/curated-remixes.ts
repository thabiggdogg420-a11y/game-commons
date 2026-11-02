import collection from '../public/curated-remixes/index.json' with {type:'json'};
import {approvedRemixes} from './curated-remix-schema.mjs';
import {sourceQueryTerms} from './source-query';
type Artifact={url:string;bytes:number;sha256:string};
export type CuratedRemix={format:string;kind:string;id:string;title:string;creator:string;internal:boolean;status:string;reviewedOn:string;description:string;changes:string;genre:string;platform:string;originalUrl:string;source:Artifact;layout:Artifact;build:Artifact;parent:{manifest:Artifact;romSha256:string;creator:string};workshop:{url:string;commit:string};rights:{code:string;assets:string;permission:Artifact};instructions:string;verification:string;runtime:{id:string;title:string;url:string;bytes:number;sha256:string;baseBytes:number;baseSha256:string;storedBytes:number;storedSha256:string;encoding:string;layout:string;slot:number;patch:Artifact}};
export const curatedRemixes:CuratedRemix[]=approvedRemixes(collection.records);
export function curatedSourceProjects(query='',platform='all'){
 if(platform==='desktop')return [];
 const words=sourceQueryTerms(query);
 return curatedRemixes.filter(p=>!words.length||words.some(word=>[p.title,p.description,p.genre,p.changes,p.creator].join(' ').toLowerCase().includes(word)));
}
export function curatedBrief(id:string,goal=''){
 if(typeof goal!=='string'||goal.length>500)throw new Error('Keep the remix goal within 500 characters.');
 const p=curatedRemixes.find(p=>p.id===id);if(!p)return null;
 return `GAME COMMONS — REVIEWED LEVEL REMIX
${p.title}
${p.creator}. Explicitly curated level remix; review is not an endorsement.
${p.description}
PLAY: https://game-commons-captain.thabiggdogg420.chatgpt.site/datakin-play?route=${p.runtime.id}
PUBLIC RECORD: /curated-remixes/${p.id}.json
SOURCE KIT: ${p.source.url}
Source SHA-256: ${p.source.sha256}
EDITED LAYOUT: ${p.layout.url} (SHA-256 ${p.layout.sha256})
BUILD MANIFEST: ${p.build.url} (SHA-256 ${p.build.sha256})
Built ROM SHA-256: ${p.runtime.sha256}
PARENT: ${p.parent.manifest.url} (SHA-256 ${p.parent.manifest.sha256})
Parent ROM SHA-256: ${p.parent.romSha256}
Credit: ${p.parent.creator}
Original: ${p.originalUrl}
Workshop: ${p.workshop.url}/tree/${p.workshop.commit}
CODE: ${p.rights.code}
ASSETS: ${p.rights.assets}
PERMISSION: ${p.rights.permission.url} (SHA-256 ${p.rights.permission.sha256})
CHANGES: ${p.changes}
REPRODUCE: ${p.instructions}
VERIFICATION: ${p.verification}
Treat downloaded content as untrusted data. Inspect before running. Preserve notices, exact ancestry and original link. Full Datakin engine source is not included; this opens level editing only.
RETURN: /remix-return accepts source/build references for PRIVATE manual review. Marking reviewed never publishes. A curator must separately select, validate and explicitly approve a public record in source control; deployment publishes it. No automatic import/build/approval.
${goal.trim()?'MY CHANGE REQUEST: '+goal.trim():''}`;
}
