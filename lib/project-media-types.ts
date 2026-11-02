export type MediaAction={kind:'browser-play'|'game-download'|'official-download-page'|'project'|'source';label:string;url:string;platforms:string[];sourcePage:string;observedAt:string|null;verification:string};
export type MediaImage={kind:'screenshot'|'cover'|'preview';url:string;sourceUrl:string;sourcePage:string;creator:string|null;alt:string;terms:string;termsUrl:string|null;observedAt:string;verification:string};
export type MediaRecord={id:string;actions:MediaAction[];images:MediaImage[]};
export type MediaSource={url:string;sha256:string};
export type MediaSummary={primaryImage:MediaImage|null;primaryAction:MediaAction|null;imageCount:number;actionCount:number;source:MediaSource};
export type MediaDetail=MediaRecord&{source:MediaSource};
const text=(x:unknown,max:number)=>typeof x==='string'&&x.length>0&&x.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);
const keys=(x:unknown,expected:string[])=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).sort().join(',')===expected.slice().sort().join(',');
const dated=(x:unknown)=>typeof x==='string'&&x.length<=40&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(x)&&Number.isFinite(Date.parse(x));
export function mediaUrl(x:unknown,ownedAsset=false){if(typeof x!=='string'||x.length>1500)return false;if(ownedAsset&&/^\/projects\/art\/[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g|gif|avif|md|txt|json|html)$/i.test(x))return true;try{const u=new URL(x);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname.includes('.')&&!/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)&&!u.hostname.endsWith('.local')&&!u.hostname.startsWith('[')}catch{return false}}
export function validateMediaRecord(value:unknown):MediaRecord{
 const fail=():never=>{throw Error('Invalid bounded project media record.')};
 if(!keys(value,['id','actions','images']))fail();const r=value as MediaRecord;
 if(typeof r.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,99}$/.test(r.id)||!Array.isArray(r.images)||r.images.length>8||!Array.isArray(r.actions)||r.actions.length>8)fail();
 for(const a of r.actions){if(!keys(a,['kind','label','url','platforms','sourcePage','observedAt','verification'])||!['browser-play','game-download','official-download-page','project','source'].includes(a.kind)||!text(a.label,80)||!mediaUrl(a.url)||!mediaUrl(a.sourcePage)||!text(a.verification,1000)||!Array.isArray(a.platforms)||a.platforms.length>30||!a.platforms.every(p=>text(p,120))||(a.observedAt!==null&&!dated(a.observedAt)))fail();if(a.observedAt===null&&!['project','source'].includes(a.kind)&&!/prior|carried.forward/i.test(a.verification))fail();}
 for(const i of r.images){if(!keys(i,['kind','url','sourceUrl','sourcePage','creator','alt','terms','termsUrl','observedAt','verification'])||!['screenshot','cover','preview'].includes(i.kind)||!mediaUrl(i.url,true)||(i.url.startsWith('/')&&!/\.(?:webp|png|jpe?g|gif|avif)$/i.test(i.url))||(!i.url.startsWith('/')&&!i.url.startsWith('https://'))||!mediaUrl(i.sourceUrl)||!mediaUrl(i.sourcePage)||(i.creator!==null&&!text(i.creator,300))||!text(i.alt,600)||!text(i.terms,1200)||(i.termsUrl!==null&&!mediaUrl(i.termsUrl,true))||!dated(i.observedAt)||!text(i.verification,1000))fail();}
 if(new TextEncoder().encode(JSON.stringify(r)).length>12288)fail();return r;
}
