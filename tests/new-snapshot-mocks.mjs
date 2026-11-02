import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SNAPSHOT_URL} from '../lib/external-snapshot.ts';import {MEDIA_URL} from '../lib/project-media.ts';import {SIGNALS_URL} from '../lib/project-signals.ts';
import {bytes} from './external-fixture.mjs';
import {readPinnedMedia,createMediaReader} from '../lib/project-media-codec.mjs';
const mediaManifest={compactRawBytes:1655841,compactSha256:'7cdd3f4b8c2a4da8d9810ce62682e1e2ed271c9401228bbbc2323afae1ae32c6',sourceSha256:'233025f4adcaab67c11cc446bcd3b20bebb95038089208549070f2ae3eef61a0',records:4419};
function fixture(variable,name,sha,size){const bytes=readFileSync(process.env[variable]||new URL('../.cache/'+name,import.meta.url));if(bytes.length!==size||createHash('sha256').update(bytes).digest('hex')!==sha)throw Error('Public fixture pin mismatch: '+name);return bytes}
export const mediaBytes=fixture('GC_MEDIA_FIXTURE','media-snapshot.json',mediaManifest.compactSha256,mediaManifest.compactRawBytes);
export const signalsBytes=fixture('GC_SIGNALS_FIXTURE','signals-snapshot.json','6db468ff73c96e06e4fc244a04eed8ab61d579b154d599cef8437935c62cbe09',1588107);
const mediaData=await readPinnedMedia(new Response(mediaBytes),mediaManifest),reader=createMediaReader(mediaData);
export const mediaRecords=mediaData.rows.map(r=>reader.detail(mediaData.strings[r[0]]));
export const signals=JSON.parse(signalsBytes);
export const fixtureBytes=new Map([[SNAPSHOT_URL,bytes],[MEDIA_URL,mediaBytes],[SIGNALS_URL,signalsBytes]]);
export function mockSnapshots(){globalThis.fetch=async(url,options)=>{if(options?.redirect!=='manual')throw Error('Worker fetch must manually reject redirects');const bytes=fixtureBytes.get(String(url));if(!bytes)throw Error('Unexpected test URL');return new Response(bytes)}};
