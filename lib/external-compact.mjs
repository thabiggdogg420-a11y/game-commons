// Data-only compact snapshot codec. No eval, base64, dynamic imports or network.
export const FIELDS=['id','title','creator','genres','platforms','engine','links','access','sourceStatus','licenseClaims','contentRequirement','upstreamStatus','upstreamDevelopment','verification','remixPermission','metadataAttribution','metadataLicense','provenance','freeClaimScope','knownLimitations','contentWarnings','reviewStatus'];
const ARRAY_FIELDS=new Set([3,4,5,9,19,20]);
export function tokens(value){return [...new Set(value.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(s=>s&&s.length<=50))].slice(0,64)}
const fold=x=>x.normalize('NFKC').toLowerCase();
function check(ok,message){if(!ok)throw Error('Compact snapshot: '+message)}
const integer=(n,max)=>Number.isInteger(n)&&n>=0&&n<max;
export function validateCompact(d,{sourceSha,rows=6706,maxStrings=100000,maxArrays=50000,verifyDerived=true}={}){
 check(d&&typeof d==='object'&&!Array.isArray(d),'object required');
 check(Object.keys(d).sort().join(',')==='a,fields,format,index,l,p,q,rows,s,sourceSha','unexpected keys');
 check(d.format==='games4free-compact-v1'&&/^[a-f0-9]{64}$/.test(d.sourceSha)&&(!sourceSha||d.sourceSha===sourceSha),'version/source hash');
 check(JSON.stringify(d.fields)===JSON.stringify(FIELDS),'field contract');
 for(const k of ['s','a','p','q','l','rows','index'])check(Array.isArray(d[k]),'missing array '+k);
 check(d.s.length<=maxStrings&&d.a.length<=maxArrays&&d.p.length<=20000&&d.q.length<=20000&&d.l.length<=rows&&d.rows.length===rows&&d.index.length===rows,'array caps');
 check(d.s.every(v=>typeof v==='string'&&v.length>0&&v.length<=1500&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)),'string bounds');
 const sr=(v,nullable=false)=>integer(v,d.s.length)||(nullable&&v===-1);
 for(const a of d.a)check(Array.isArray(a)&&a.length<=64&&a.every(x=>sr(x)),'array string refs');
 for(const p of d.p)check(Array.isArray(p)&&p.length===4&&p.every((x,i)=>sr(x,i===2)),'provenance refs');
 for(const q of d.q)check(Array.isArray(q)&&q.length>0&&q.length<=10&&q.every(x=>integer(x,d.p.length)),'provenance list refs');
 const url=v=>v===-1||(()=>{try{const u=new URL(d.s[v]);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname.includes('.')&&!/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)&&!u.hostname.endsWith('.local')&&!u.hostname.startsWith('[')}catch{return false}})();
 for(const l of d.l)check(Array.isArray(l)&&l.length===4&&l.every(x=>sr(x,true)&&url(x))&&l.some(x=>x>=0),'link refs/URLs');
 for(const p of d.p)check(d.s[p[0]].length<=100&&url(p[1])&&(p[2]===-1||d.s[p[2]].length<=100)&&d.s[p[3]].length<=40&&Number.isFinite(Date.parse(d.s[p[3]])),'provenance limits');
 const ids=new Set(),nullable=new Set([2,10,11,12]),limits={0:29,1:200,2:200,7:100,8:100,10:100,11:120,12:120,13:100,14:100,15:600,16:100,18:1200,21:120};
 for(let n=0;n<rows;n++){
  const r=d.rows[n];check(Array.isArray(r)&&r.length===FIELDS.length,'row shape');
  for(let i=0;i<r.length;i++){
   const v=r[i];if(i>=18&&v===-2)continue;
   if(ARRAY_FIELDS.has(i)){check(integer(v,d.a.length),'row array ref');const max=i>=19?20:30,len=i>=19?600:120;check(d.a[v].length<=max&&d.a[v].every(t=>d.s[t].length<=len),'row array bounds')}
   else if(i===6)check(integer(v,d.l.length),'row links ref');
   else if(i===17)check(integer(v,d.q.length),'row provenance ref');
   else check(sr(v,nullable.has(i))&&(v<0||d.s[v].length<=limits[i]),'row scalar ref/bound');
  }
  const id=d.s[r[0]];check(/^external-[a-f0-9]{20}$/.test(id)&&!ids.has(id),'ID collision');ids.add(id);
  check(['unknown','free-reported','paid-reported'].includes(d.s[r[7]])&&['source-available-reported','no-source-reported','unknown'].includes(d.s[r[8]]),'access/source enums');
  check(r[10]===-1||['commercial','free','open','swappable'].includes(d.s[r[10]]),'content enum');
  check(d.s[r[13]]==='metadata-only'&&d.s[r[14]]==='not-reviewed','verification/reuse enums');
  const ix=d.index[n];check(Array.isArray(ix)&&ix.length===4&&sr(ix[0])&&integer(ix[1],d.a.length)&&integer(ix[2],d.a.length)&&integer(ix[3],4),'index refs');
  if(!verifyDerived)continue; // Immutable SHA pin authenticates offline index derivation.
  // Validate derived index directly without constructing expanded records.
  const list=c=>d.a[r[c]].map(v=>d.s[v]);
  check(d.s[ix[0]]===fold(d.s[r[1]]),'sort key');
  check(JSON.stringify(d.a[ix[1]].map(v=>d.s[v]))===JSON.stringify(tokens([d.s[r[1]],...list(3),...list(5)].join(' '))),'search token index');
  check(JSON.stringify(d.a[ix[2]].map(v=>d.s[v]))===JSON.stringify(list(3).map(fold)),'genre index');
  const platform=list(4).join(' ').toLowerCase(),flags=Number(/browser|web|html5/.test(platform))+2*Number(/windows|linux|macos|desktop|osx|mac os/.test(platform));check(ix[3]===flags,'platform index');
 }
 return d;
}
export function decodeRow(d,n){
 check(integer(n,d.rows.length),'row index');const r=d.rows[n],out={};
 const str=i=>i===-1?null:d.s[i];
 for(let i=0;i<FIELDS.length;i++){
  const v=r[i];if(v===-2)continue;
  out[FIELDS[i]]=ARRAY_FIELDS.has(i)?d.a[v].map(str):i===6?Object.fromEntries(['official','source','play','download'].map((k,j)=>[k,str(d.l[v][j])])):i===17?d.q[v].map(j=>Object.fromEntries(['catalogue','url','revision','retrievedAt'].map((k,t)=>[k,str(d.p[j][t])]))):str(v);
 }
 return out;
}
export function createReader(d){
 const ids=new Map(d.rows.map((r,i)=>[d.s[r[0]],i]));let expanded=0;
 const expand=i=>{expanded++;return decodeRow(d,i)};
 return {
  stats:()=>({expandedRows:expanded,rows:d.rows.length,detailCacheEntries:0}),
  detail:id=>{check(typeof id==='string'&&id.length<=100,'detail id');const n=ids.get(id);return n===undefined?null:expand(n)},
  page(options={}){
   check(options&&typeof options==='object'&&!Array.isArray(options)&&Object.keys(options).every(k=>['query','platform','genre','content','access','limit','after'].includes(k)),'unknown page option');
   const {query='',platform='all',genre='all',content='all',access='all',limit=12,after=null}=options;
   check(typeof query==='string'&&query.length<=200&&typeof genre==='string'&&genre.length<=100,'query/genre');
   check(['all','browser','desktop'].includes(platform)&&['all','free-open','free','open','unknown','commercial','swappable'].includes(content)&&['all','free-reported','paid-reported','unknown'].includes(access)&&Number.isInteger(limit)&&limit>=1&&limit<=24,'filter/limit');
   const binding=JSON.stringify([query.trim(),platform,genre,content,access]);
   if(after!==null)check(after&&Object.keys(after).sort().join(',')==='binding,id,key,score,sourceSha'&&after.sourceSha===d.sourceSha&&after.binding===binding&&Number.isInteger(after.score)&&after.score>=0&&typeof after.key==='string'&&after.key.length<=200&&typeof after.id==='string'&&ids.has(after.id),'cursor');
   const ts=tokens(query.trim()).slice(0,8),termIds=ts.map(t=>d.s.indexOf(t)),g=d.s.indexOf(fold(genre));let total=0;const best=[];
   const compare=(a,b)=>b.score-a.score||(a.key<b.key?-1:a.key>b.key?1:0)||(a.id<b.id?-1:a.id>b.id?1:0);
   for(let i=0;i<d.rows.length;i++){
    const r=d.rows[i],ix=d.index[i],co=r[10]===-1?'unknown':d.s[r[10]];
    if(content!=='all'&&(content==='free-open'?!['free','open'].includes(co):content!==co))continue;
    if(access!=='all'&&access!==d.s[r[7]])continue;
    if(platform!=='all'&&!(ix[3]&(platform==='browser'?1:2)))continue;
    if(genre!=='all'&&!d.a[ix[2]].includes(g))continue;
    const score=termIds.reduce((n,t)=>n+Number(t>=0&&d.a[ix[1]].includes(t)),0);if(ts.length&&!score)continue;total++;
    const item={n:i,score,key:d.s[ix[0]],id:d.s[r[0]]};if(after&&compare(item,after)<=0)continue;
    // Bounded top-(limit+1), not an expanded all-match list.
    const at=best.findIndex(b=>compare(item,b)<0);if(at<0)best.push(item);else best.splice(at,0,item);if(best.length>limit+1)best.pop();
   }
   const hasMore=best.length>limit,chosen=best.slice(0,limit),last=chosen.at(-1);
   return {total,projects:chosen.map(x=>expand(x.n)),nextCursor:hasMore&&last?{sourceSha:d.sourceSha,binding,score:last.score,key:last.key,id:last.id}:null};
  }
 };
}
export function parseCompact(bytes,{maxBytes,sourceSha,rows=6706,verifyDerived=true}={}){
 check(bytes instanceof Uint8Array&&Number.isInteger(maxBytes)&&maxBytes>0&&bytes.byteLength<=maxBytes,'byte cap');
 // Transport layer must pin/check the compact SHA-256 before calling this parser.
 return validateCompact(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),{sourceSha,rows,verifyDerived});
}

// Caller fetches ONLY its reviewed owned immutable URL. This function accepts a
// Response rather than any user-supplied URL. Preallocates one bounded buffer.
export async function readPinnedResponse(response,manifest,completed=()=>null){
 const {compactRawBytes:expected,compactSha256,sourceSha256,rows}=manifest;
 check(Number.isInteger(expected)&&expected>0&&expected<=3*1024*1024&&rows===6706&&/^[a-f0-9]{64}$/.test(compactSha256)&&/^[a-f0-9]{64}$/.test(sourceSha256),'manifest pins/caps');
 check(response.ok&&response.body,'snapshot response');
 const reader=response.body.getReader(),bytes=new Uint8Array(expected);let size=0;
 try{while(true){const part=await reader.read();const ready=completed();if(ready){await reader.cancel();return ready;}if(part.done)break;if(size+part.value.byteLength>expected)throw Error('Compact snapshot: transport byte cap');bytes.set(part.value,size);size+=part.value.byteLength}}catch(e){await reader.cancel();throw e}
 check(size===expected,'transport byte count');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');const ready=completed();if(ready)return ready;check(digest===compactSha256,'transport SHA-256');
 // Full semantic/index derivation is tested offline for this exact immutable SHA.
 // Runtime still validates all dictionary/row refs, lengths, enums and URLs.
 return parseCompact(bytes,{maxBytes:expected,sourceSha:sourceSha256,rows,verifyDerived:false});
}
