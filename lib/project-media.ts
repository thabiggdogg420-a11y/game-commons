import {createMediaReader,readPinnedMedia,type MediaReader} from './project-media-codec.mjs';
import {validateMediaRecord,type MediaSummary,type MediaDetail} from './project-media-types';
export const MEDIA_SHA='7cdd3f4b8c2a4da8d9810ce62682e1e2ed271c9401228bbbc2323afae1ae32c6';
export const MEDIA_URL='https://free4allhub.com/catalogues/games4free/media-'+MEDIA_SHA+'.compact.json';
export const mediaSource={url:MEDIA_URL,sha256:MEDIA_SHA};
const manifest={compactRawBytes:1655841,compactSha256:MEDIA_SHA,sourceSha256:'233025f4adcaab67c11cc446bcd3b20bebb95038089208549070f2ae3eef61a0',records:4419};
let cached:{data:unknown;reader:MediaReader}|undefined;const cachedValue=()=>cached;
async function reader():Promise<MediaReader>{if(cached)return cached.reader;const response=await fetch(MEDIA_URL,{redirect:'manual',signal:AbortSignal.timeout(8000)});const prior=cachedValue();if(prior){await response.body?.cancel();return prior.reader;}if(!response.ok)throw Error('Media HTTP '+response.status);const data=await readPinnedMedia(response,manifest,()=>cached?.data);const ready=cachedValue();if(ready)return ready.reader;const value=createMediaReader(data);cached={data,reader:value};return value;}
export async function mediaSummaries(ids:string[]):Promise<Map<string,MediaSummary>>{if(ids.length>24)throw Error('At most24 selected media IDs.');const out=new Map<string,MediaSummary>();try{const r=await reader();for(const x of r.summaries(ids)){if(!x.mediaAvailable)continue;validateMediaRecord({id:x.id,actions:x.primaryAction?[x.primaryAction]:[],images:x.primaryImage?[x.primaryImage]:[]});out.set(x.id,{primaryImage:x.primaryImage??null,primaryAction:x.primaryAction??null,imageCount:x.imageCount??0,actionCount:x.actionCount??0,source:mediaSource})}}catch(e){console.warn('project-media-unavailable',{name:e instanceof Error?e.name:'Unknown',message:e instanceof Error?e.message.slice(0,200):'Unavailable'})}return out;}
export async function mediaFor(id:string):Promise<MediaDetail|null>{try{const r=await reader(),record=r.detail(id);return record?{...validateMediaRecord(record),source:mediaSource}:null}catch(e){console.warn('project-media-unavailable',{name:e instanceof Error?e.name:'Unknown',message:e instanceof Error?e.message.slice(0,200):'Unavailable'});return null;}}

export async function prepareMedia(){try{await reader();return true}catch(e){console.warn('project-media-unavailable',{name:e instanceof Error?e.name:'Unknown',message:e instanceof Error?e.message.slice(0,200):'Unavailable'});return false}}

export const mediaHasImage=(id:string)=>cached?.reader.hasImage(id)??false;
