import {env} from 'cloudflare:workers';
import {requireModerator} from './moderator';
import {RepositoryError} from './limits';
import {CHANNELS,campaignChannel,type Channel} from './traffic-channels';
export {CHANNELS};
export type {Channel};
export type Attribution={channel:Channel;label:string;day:string;isTest:boolean};
type Visit={id:string;visitor_hash:string;day:string;channel:Channel;is_test:number;created_at:string;last_seen:string};
const cookieName='__Host-gc-traffic';
export function trafficCookie(request:Request){const v=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);return v&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v)?v:null}
export function prepareTraffic(request:Request){return trafficCookie(request)?null:`${cookieName}=${crypto.randomUUID()}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=604800`}
async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(n=>n.toString(16).padStart(2,'0')).join('')}
function attribution(row:Visit):Attribution{return {channel:row.channel,label:CHANNELS[row.channel],day:row.day,isTest:!!row.is_test}}
async function latest(visitor:string){return env.DB!.prepare('SELECT * FROM traffic_visits WHERE visitor_hash=? AND last_seen>=? ORDER BY last_seen DESC,id DESC LIMIT 1').bind(visitor,new Date(Date.now()-7*86400000).toISOString()).first<Visit>()}
export async function recordTraffic(request:Request,input:Record<string,unknown>){
 const cookie=trafficCookie(request);if(!cookie)throw new RepositoryError('Allow the anonymous traffic cookie and retry.',400);
 const visitor=await hash(cookie),prior=await latest(visitor);
 let channel:Channel=campaignChannel(input)||'direct';
 if(channel==='direct'&&input.referrer==='bluesky')channel='bluesky';
 else if(channel==='direct'&&input.referrer==='reddit')channel='reddit_untagged';
 else if(channel==='direct'&&input.referrer==='x')channel='x';
 // Untagged internal navigation retains the most recent campaign for seven days.
 const explicit=channel!=='direct';if(!explicit&&prior)channel=prior.channel;
 const isTest=input.isTest===true||(!explicit&&!!prior?.is_test),now=new Date(Math.max(Date.now(),(Date.parse(prior?.last_seen||'')||0)+1)).toISOString(),day=now.slice(0,10);
 const id=await hash(visitor+':'+day+':'+channel+':'+Number(isTest));
 await env.DB!.batch([
 env.DB!.prepare('DELETE FROM traffic_visits WHERE day<?').bind(new Date(Date.now()-90*86400000).toISOString().slice(0,10)),
 env.DB!.prepare('INSERT INTO traffic_visits(id,visitor_hash,day,channel,is_test,created_at,last_seen) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen').bind(id,visitor,day,channel,Number(isTest),now,now),
 ]);
 return {recorded:true};
}
export async function feedbackAttribution(request:Request):Promise<Attribution|null>{const cookie=trafficCookie(request);if(!cookie)return null;const row=await latest(await hash(cookie));return row?attribution(row):null}
export async function trafficReport(user:string,days=30,isTest=false){
 requireModerator(user);if(![7,30].includes(days))throw new RepositoryError('Choose 7 or 30 days.');
 const since=new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10),start=since+'T00:00:00.000Z';
 const visits=await env.DB!.prepare('SELECT channel,count(*) visits,count(DISTINCT visitor_hash) browsers FROM traffic_visits WHERE day>=? AND is_test=? GROUP BY channel').bind(since,Number(isTest)).all<{channel:Channel;visits:number;browsers:number}>();
 const feedback=await env.DB!.prepare("SELECT coalesce(json_extract(attribution,'$.channel'),'unattributed') channel,count(*) messages FROM feedback WHERE created_at>=? AND coalesce(json_extract(attribution,'$.isTest'),0)=? GROUP BY 1").bind(start,Number(isTest)).all<{channel:string;messages:number}>();
 const rows=[...Object.entries(CHANNELS),['unattributed','Feedback without attribution']].map(([channel,label])=>({channel,label,visits:visits.results.find(v=>v.channel===channel)?.visits??0,browsers:visits.results.find(v=>v.channel===channel)?.browsers??0,feedback:feedback.results.find(v=>v.channel===channel)?.messages??0}));
 return {days,since,isTest,rows,totals:{visits:rows.reduce((n,r)=>n+r.visits,0),feedback:rows.reduce((n,r)=>n+r.feedback,0)},definition:'Daily visits count each browser cookie once per channel per UTC day. Browsers are per-channel cookie estimates, not people; resetting or blocking cookies and bots affect counts. Attribution uses the latest recognised channel in this browser within seven days. Feedback counts messages, not unique testers. Raw visit rows are retained for 90 days; cleanup runs on the next recorded visit.'};
}
