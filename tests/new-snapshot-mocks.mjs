import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SNAPSHOT_URL} from '../lib/external-snapshot.ts';import {MEDIA_URL} from '../lib/project-media.ts';import {SIGNALS_URL} from '../lib/project-signals.ts';
import {bytes} from './external-fixture.mjs';
import {readPinnedMedia,createMediaReader} from '../lib/project-media-codec.mjs';
const mediaManifest={compactRawBytes:1651251,compactSha256:'e651135b0c22d2ed877e709d3609a7873423d988545528e10e56bf47427f8548',sourceSha256:'65b1e9aa0299e36d3d79681950467e9dce2feec48a6061e1263e850bc81e7ee0',records:4417};
function fixture(variable,name,sha,size){const bytes=readFileSync(process.env[variable]||new URL('../.cache/'+name,import.meta.url));if(bytes.length!==size||createHash('sha256').update(bytes).digest('hex')!==sha)throw Error('Public fixture pin mismatch: '+name);return bytes}
export const mediaBytes=fixture('GC_MEDIA_FIXTURE','media-snapshot.json',mediaManifest.compactSha256,mediaManifest.compactRawBytes);
export const signalsBytes=fixture('GC_SIGNALS_FIXTURE','signals-snapshot.json','6db468ff73c96e06e4fc244a04eed8ab61d579b154d599cef8437935c62cbe09',1588107);
const mediaData=await readPinnedMedia(new Response(mediaBytes),mediaManifest),reader=createMediaReader(mediaData);
export const mediaRecords=mediaData.rows.map(r=>reader.detail(mediaData.strings[r[0]]));
export const signals=JSON.parse(signalsBytes);
export const fixtureBytes=new Map([[SNAPSHOT_URL,bytes],[MEDIA_URL,mediaBytes],[SIGNALS_URL,signalsBytes]]);
export function mockSnapshots(){globalThis.fetch=async(url,options)=>{if(options?.redirect!=='manual')throw Error('Worker fetch must manually reject redirects');const bytes=fixtureBytes.get(String(url));if(!bytes)throw Error('Unexpected test URL');return new Response(bytes)}};
