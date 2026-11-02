import {createReader,readPinnedResponse,type CompactReader} from './external-compact.mjs';
// Reviewed owned immutable metadata only; never a caller-provided URL.
export const SNAPSHOT_SHA='e1bff498c5f0f2341e7d06d9cfbe58ee60b203cdd75af76153c6b08397375da8';
export const SNAPSHOT_URL='https://free4allhub.com/catalogues/games4free/'+SNAPSHOT_SHA+'.compact.json';
export const SNAPSHOT_GENERATION='snapshot-'+SNAPSHOT_SHA;
const manifest={compactRawBytes:2025219,compactSha256:SNAPSHOT_SHA,sourceSha256:'f21714e7bf30bc670e75384db5907f8c66e2363a8e33dc3bc259a3b88e92aa10',rows:6706};
let cached:{data:unknown;reader:CompactReader}|undefined;
const cachedValue=()=>cached;
export async function externalSnapshot():Promise<CompactReader>{
 if(cached)return cached.reader;let phase='fetch';try{
 const response=await fetch(SNAPSHOT_URL,{redirect:'manual',signal:AbortSignal.timeout(8000)});
 const ready=cachedValue();if(ready){await response.body?.cancel();return ready.reader;}
 if(!response.ok)throw Error('Snapshot HTTP '+response.status);
 const declared=response.headers.get('content-length'),encoding=response.headers.get('content-encoding');if((!encoding||encoding==='identity')&&declared!==null&&Number(declared)!==manifest.compactRawBytes)throw Error('Compact snapshot: transport byte count');
 phase='read-verify-parse';const data=await readPinnedResponse(response,manifest,()=>cached?.data);
 const completed=cachedValue();if(completed)return completed.reader;
 const reader=createReader(data);cached={data,reader};return reader;
 }catch(e){if(e instanceof Error)Object.assign(e,{snapshotPhase:phase});throw e;}
}
export const snapshotSource={backend:'pinned-public-compact-snapshot',url:SNAPSHOT_URL,sha256:SNAPSHOT_SHA,sourceSha256:manifest.sourceSha256,records:manifest.rows,metadataOnly:true};
export function snapshotFailure(error:unknown){const message=error instanceof Error?error.message:'',name=error instanceof Error?error.name:'';if(name==='TimeoutError'||name==='AbortError')return 'snapshot-timeout';if(/^Snapshot HTTP [1-5][0-9]{2}$/.test(message))return message.toLowerCase().replaceAll(' ','-');if(message.includes('transport byte'))return 'snapshot-size';if(message.includes('transport SHA-256'))return 'snapshot-digest';if(message.startsWith('Compact snapshot:'))return 'snapshot-validation';if(name==='TypeError')return 'snapshot-network-or-runtime';return 'snapshot-unavailable';}
// Only this fixed public credential-free asset; no request headers/body/stack/identity.
export function snapshotDiagnostic(error:unknown){if(!(error instanceof Error))return {phase:'unknown',name:'Unknown',message:'Non-error throw'};const phase=(error as Error&{snapshotPhase?:string}).snapshotPhase;return {phase:phase&&['fetch','read-verify-parse'].includes(phase)?phase:'unknown',name:error.name.slice(0,60),message:error.message.slice(0,200)}}
