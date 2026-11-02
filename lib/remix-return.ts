import {RepositoryError} from './limits';

// A private review brief in the existing feedback store, never a catalogue entry.
export const REMIX_RETURN_HEADING='REMIX RETURN — PRIVATE CURATOR REVIEW';
function text(value:unknown,label:string,max:number){
 if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u0008\u000b-\u001f]/.test(value))throw new RepositoryError(`${label} is required (up to ${max} characters).`);
 return value.trim();
}
function reference(value:unknown,label:string){
 const raw=text(value,label,300);
 try{
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.username||url.password||!url.hostname.includes('.')||url.hostname.endsWith('.local')||url.hostname==='localhost'||/^\[|^[\d.]+$/.test(url.hostname))throw Error();
  return url.href;
 }catch{throw new RepositoryError(`${label} must be an HTTPS reference without credentials or a local address.`)}
}
function pinned(value:unknown,label:string){
 const revision=text(value,label,100);
 if(/^(main|master|head|latest|develop|development)$/i.test(revision))throw new RepositoryError(`${label} must identify a fixed revision, not a moving branch.`);
 return revision;
}
export function remixReturnFeedback(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new RepositoryError('Include a remix return brief.');
 const input=value as Record<string,unknown>;
 const title=text(input.title,'Remix title',80);
 const source=reference(input.sourceUrl,'Remix source URL');
 const revision=pinned(input.sourceRevision,'Remix commit or immutable release');
 const build=reference(input.buildUrl,'Playable build or release URL');
 if(!Array.isArray(input.parents)||input.parents.length<1||input.parents.length>4)throw new RepositoryError('Include 1–4 pinned parents.');
 const parents=input.parents.map((p:unknown,index:number)=>{
  if(!p||typeof p!=='object'||Array.isArray(p))throw new RepositoryError('Each parent needs source, revision and credit.');
  const parent=p as Record<string,unknown>;
  return `Parent ${index+1}: ${reference(parent.sourceUrl,'Parent source URL')}\nRevision: ${pinned(parent.revision,'Parent commit, archive hash or immutable release')}\nCredit: ${text(parent.credit,'Parent creator credit',200)}`;
 });
 const credits=text(input.credits,'Credits and changes',400);
 const code=text(input.codeTerms,'Code terms and notice locations',300);
 const assets=text(input.assetTerms,'Asset terms and notice locations',300);
 const instructions=text(input.instructions,'Dependencies and reproducible build/run instructions',800);
 const validation=text(input.validation,'Checks performed and remaining gaps',500);
 if(input.rightsConfirmed!==true)throw new RepositoryError('Confirm you may share these references and have recorded the reuse terms.');
 const message=[REMIX_RETURN_HEADING,`Title: ${title}`,`Source: ${source}`,`Source revision: ${revision}`,`Playable build/release: ${build}`,...parents,`Credits and changes: ${credits}`,`Code terms: ${code}`,`Asset terms: ${assets}`,`Build and run: ${instructions}`,`Validation and gaps: ${validation}`,'Contributor confirms sharing rights and recorded reuse terms. Review requested; not approval or publication.'].join('\n\n');
 if(message.length>3000)throw new RepositoryError('Keep the complete remix brief within 3000 characters. Shorten notes and link to full documentation.');
 return {category:'other',area:'remixing',message,device:''};
}
