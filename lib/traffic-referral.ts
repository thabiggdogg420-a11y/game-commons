import {normaliseCampaign,referralSource,type Campaign} from './traffic-channels';
type Referral=Campaign&{isTest:boolean;capturedAt:number};
export function referralPayload(search:string,referrer:string,stored:string|null,now=Date.now(),pathname=''){
 const q=new URLSearchParams(search),incoming=normaliseCampaign({source:q.get('utm_source'),medium:q.get('utm_medium'),campaign:q.get('utm_campaign'),content:q.get('utm_content')},pathname);
 let saved:Referral|null=null;
 const channelReferrer=referralSource(referrer);
 if(incoming)saved={...incoming,isTest:q.get('gc_test')==='1',capturedAt:now};
 else if(channelReferrer)saved={source:channelReferrer,medium:channelReferrer==='reddit'?'community':'social',campaign:'beta',content:'',isTest:q.get('gc_test')==='1',capturedAt:now};
 else if(stored){try{const r=JSON.parse(stored);const c=r&&normaliseCampaign(r);if(c&&typeof r.capturedAt==='number'&&r.capturedAt<=now&&now-r.capturedAt<7*86400000&&typeof r.isTest==='boolean')saved={...c,capturedAt:r.capturedAt,isTest:r.isTest};}catch{}}
 if(saved&&q.get('gc_test')==='1')saved={...saved,isTest:true};
 return {saved,payload:{...(saved||{}),referrer:channelReferrer,isTest:q.get('gc_test')==='1'||!!saved?.isTest}};
}
export function feedbackPath(params:Record<string,string|string[]|undefined>,pathname=''){
 const q=new URLSearchParams();for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','gc_test'])if(typeof params[k]==='string')q.set(k,params[k] as string);
 const {saved}=referralPayload('?'+q.toString(),'',null,Date.now(),pathname),next=new URLSearchParams();
 if(saved){next.set('utm_source',saved.source);next.set('utm_medium',saved.medium);next.set('utm_campaign',saved.campaign);if(saved.content)next.set('utm_content',saved.content);}
 if(q.get('gc_test')==='1')next.set('gc_test','1');return '/feedback'+(next.size?'?'+next:'');
}
