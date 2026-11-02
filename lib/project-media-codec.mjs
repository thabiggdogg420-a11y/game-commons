// Data-only media sidecar: shared strings, object shapes and acyclic nodes.
// No executable data, eval, base64 transform, network or expanded detail cache.
const check=(ok,msg)=>{if(!ok)throw Error('Media snapshot: '+msg)};
export function decodeValue(d,ref,depth=0){check(depth<=12,'depth');if(ref===-1)return null;if(ref>=0)return d.strings[ref];const n=d.nodes[-3-ref],values=n.slice(1).map(x=>decodeValue(d,x,depth+1));return n[0]===-1?values:Object.fromEntries(d.shapes[n[0]].map((k,i)=>[k,values[i]]))}
export function validateMediaCompact(d,{sourceSha,count}={}){
 check(d&&typeof d==='object'&&!Array.isArray(d)&&Object.keys(d).sort().join(',')==='format,nodes,rows,shapes,sourceSha,strings','format keys');
 check(d.format==='games4free-media-compact-v1'&&/^[a-f0-9]{64}$/.test(d.sourceSha)&&(!sourceSha||d.sourceSha===sourceSha),'format/hash');
 for(const k of ['strings','shapes','nodes','rows'])check(Array.isArray(d[k]),'array '+k);
 check(d.rows.length<=7000&&(!count||count===d.rows.length)&&d.strings.length<=200000&&d.nodes.length<=100000&&d.shapes.length<=100,'caps');
 check(d.strings.every(s=>typeof s==='string'&&s.length<=3000&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s)),'string bounds');
 for(const s of d.shapes)check(Array.isArray(s)&&s.length<=30&&new Set(s).size===s.length&&s.every(k=>typeof k==='string'&&/^[a-zA-Z][a-zA-Z0-9]*$/.test(k)&&k.length<=60&&!['constructor','prototype','__proto__'].includes(k)),'shape');
 const ref=(r,bound)=>Number.isInteger(r)&&(r===-1||(r>=0&&r<d.strings.length)||(r<=-3&&-3-r<bound));
 const depth=[];
 d.nodes.forEach((n,i)=>{check(Array.isArray(n)&&n.length<=40&&Number.isInteger(n[0])&&(n[0]===-1||n[0]>=0&&n[0]<d.shapes.length&&n.length===d.shapes[n[0]].length+1)&&n.slice(1).every(r=>ref(r,i)),'acyclic node refs');depth[i]=1+Math.max(0,...n.slice(1).filter(r=>r<=-3).map(r=>depth[-3-r]));check(depth[i]<=12,'node depth')});
 const ids=new Set();for(const r of d.rows){check(Array.isArray(r)&&r.length===6&&r.slice(0,4).every(v=>ref(v,d.nodes.length))&&r[0]>=0&&r[1]<=-3&&r.slice(4).every(v=>Number.isInteger(v)&&v>=0&&v<=8),'row');const id=d.strings[r[0]];check(/^(external-[a-f0-9]{20}|[a-z0-9][a-z0-9-]{0,99})$/.test(id)&&!ids.has(id),'id');ids.add(id)}
 return d;
}
export function createMediaReader(d){const index=new Map(d.rows.map(r=>[d.strings[r[0]],r]));let detailExpansions=0,summaryExpansions=0;return {
 detail(id){const r=index.get(id);if(!r)return null;detailExpansions++;return decodeValue(d,r[1])},
 summaries(ids){check(Array.isArray(ids)&&ids.length<=24&&ids.every(v=>typeof v==='string'&&v.length<=100),'summary IDs limit');return ids.map(id=>{const r=index.get(id);if(!r)return {id,mediaAvailable:false};summaryExpansions++;return {id,mediaAvailable:true,primaryAction:decodeValue(d,r[2]),primaryImage:decodeValue(d,r[3]),actionCount:r[4],imageCount:r[5]}})},
 stats(){return {detailExpansions,summaryExpansions,detailCacheEntries:0,records:index.size}}
}}
export async function readPinnedMedia(response,m,completed=()=>null){
 const size=m.compactRawBytes;check(Number.isInteger(size)&&size>0&&size<=8*1024*1024&&/^[a-f0-9]{64}$/.test(m.compactSha256),'manifest byte/hash pin');check(response.ok&&response.body,'response');
 const bytes=new Uint8Array(size),reader=response.body.getReader();let used=0;try{while(true){const p=await reader.read();const ready=completed();if(ready){await reader.cancel();return ready;}if(p.done)break;if(used+p.value.length>size)throw Error('Media snapshot: transport size');bytes.set(p.value,used);used+=p.value.length}}catch(e){await reader.cancel();throw e}check(used===size,'transport length');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');const ready=completed();if(ready)return ready;check(hash===m.compactSha256,'transport SHA');
 return validateMediaCompact(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),{sourceSha:m.sourceSha256,count:m.records});
}
