// Explicit opt-in public metadata fixtures only. No credentials or image/game assets.
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const pins=[
 ['external-snapshot.json','e1bff498c5f0f2341e7d06d9cfbe58ee60b203cdd75af76153c6b08397375da8',2025219,'','.compact.json'],
 ['media-snapshot.json','7cdd3f4b8c2a4da8d9810ce62682e1e2ed271c9401228bbbc2323afae1ae32c6',1655841,'media-','.compact.json'],
 ['signals-snapshot.json','6db468ff73c96e06e4fc244a04eed8ab61d579b154d599cef8437935c62cbe09',1588107,'','.signals.json']
];
await mkdir(new URL('../.cache/',import.meta.url),{recursive:true});
for(const [name,sha,size,prefix,suffix]of pins){
 const url='https://free4allhub.com/catalogues/games4free/'+prefix+sha+suffix;
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});if(!response.ok||!response.body)throw Error('Public metadata HTTP '+response.status);
 const reader=response.body.getReader(),chunks=[];let used=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;used+=value.length;if(used>size)throw Error('Metadata exceeds pinned byte cap');chunks.push(value)}}finally{await reader.cancel()}
 const bytes=Buffer.concat(chunks);if(bytes.length!==size||createHash('sha256').update(bytes).digest('hex')!==sha)throw Error('Metadata pin mismatch');
 await writeFile(new URL('../.cache/'+name,import.meta.url),bytes);
 console.log('Verified public metadata fixture saved: '+name);
}
