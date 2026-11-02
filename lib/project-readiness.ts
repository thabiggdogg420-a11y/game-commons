import {externalPlayObservation} from './external-play-observations';
import {projectPlayEvidence,externalFeatureTestLabel} from './project-play-evidence';
// Classifications of the saved review, not fresh availability checks or quality scores.
// No private startup observations are distributed with this source export.
const observedStartup:Record<string,string>={};
export function projectReadiness(project:{id:string;commit:string|null;platform:string;verification:string;sourceCompleteness:string;requirements?:string[];playUrl?:string;sourceStatus?:string}){
 const observation=projectPlayEvidence(project), externalObservation=externalPlayObservation(project);
 const externalOnly=project.sourceStatus==='official-play-link-no-open-license';
 const browser=/browser/i.test(project.platform),partial=!!project.commit&&observedStartup[project.id]===project.commit;

 return {
  play:{hosting:'external' as const,delivery:browser?'browser':'desktop',label:browser?'Browser at creator’s site':'Desktop download at creator’s site',sourceBuildMatchVerified:false,verification:observation||externalObservation||partial?'partial':'unverified',verificationLabel:externalObservation?externalObservation.label:externalOnly?'Creator gameplay media reviewed; not hands-on play-tested':observation?externalFeatureTestLabel:partial?'Startup partly tested; full playtest pending':project.sourceStatus==='pinned-source-inspected'?'Source inspected; native play not yet tested':['official-source-unpinned','official-source-pinned'].includes(project.sourceStatus??'')?'Not locally play-tested; official external download listed':'Gameplay unverified by Game Commons',evidence:project.verification},
  remix:{lane:'external-project-review',readiness:externalOnly?'external-play-only':'source-review-only',label:externalOnly?'No source or remix permission established':project.commit?'Pinned source; local build unverified':'Official source linked; revision and local build unverified',localBuildVerified:false,automaticImport:false,htmlUploaderCompatible:false,evidence:project.sourceCompleteness},
  quality:{status:'unassessed',label:'No catalogue quality acceptance recorded'},
  runtime:{target:browser?'browser':'native',platform:project.platform,serverDependency:project.id==='freeciv-web'?'required':'unverified',requirements:project.requirements??[],selfHostedVerified:false},
  revival:{status:'unassessed',label:'Revival suitability unassessed; no abandonment claim',evidence:null},
 };
}
