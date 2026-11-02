// Explicit opt-in fetch of 2 MB public metadata; no credentials or game assets.
import {mkdir,writeFile} from 'node:fs/promises';
import {readPinnedResponse} from '../lib/external-compact.mjs';
const manifest={compactRawBytes:2025219,compactSha256:'e1bff498c5f0f2341e7d06d9cfbe58ee60b203cdd75af76153c6b08397375da8',sourceSha256:'f21714e7bf30bc670e75384db5907f8c66e2363a8e33dc3bc259a3b88e92aa10',rows:6706};
const url='https://free4allhub.com/catalogues/games4free/'+manifest.compactSha256+'.compact.json';
const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Public metadata HTTP '+response.status);
const reader=response.body.getReader(),chunks=[];let size=0;
try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>manifest.compactRawBytes)throw Error('Metadata exceeds pinned byte cap');chunks.push(value)}}finally{await reader.cancel()}
const bytes=Buffer.concat(chunks);await readPinnedResponse(new Response(bytes),manifest);
await mkdir(new URL('../.cache/',import.meta.url),{recursive:true});await writeFile(new URL('../.cache/external-snapshot.json',import.meta.url),bytes);
console.log('Verified public metadata fixture saved in ignored .cache directory.');
