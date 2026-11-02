import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';
import {env} from './test-env.mjs';import {recordTraffic,feedbackAttribution,trafficReport} from '../lib/traffic.ts';import {GET as session,POST as visit} from '../app/api/traffic/route.ts';import {GET as report} from '../app/api/moderation/traffic/route.ts';import {GET as feedbackSession,POST as feedbackPost} from '../app/api/feedback/route.ts';import {feedbackQueue} from '../lib/feedback.ts';import {restoreAndVerify} from '../scripts/recovery-drill.mjs';
env.MODERATOR_USER_IDS='["reviewer"]';
const tag={source:'reddit',medium:'community',campaign:'beta',content:'claudeai_showcase'};
const req=(cookie='',body={},origin='https://test')=>new Request('https://test/api/traffic',{method:'POST',headers:{origin,'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
async function cookie(){return (await session(new Request('https://test/api/traffic'))).headers.get('set-cookie').split(';')[0]}
const count=async()=>Number((await env.DB.prepare('SELECT count(*) n FROM traffic_visits').first()).n);

test('anonymous tracking prepares a secure cookie and same-channel reload/retry counts once',async()=>{
 const init=await session(new Request('https://test/api/traffic'));const c=init.headers.get('set-cookie');for(const flag of ['Secure','HttpOnly','SameSite=Strict','Max-Age=604800'])assert.ok(c.includes(flag));const key=c.split(';')[0];assert.equal((await session(new Request('https://test',{headers:{cookie:key}}))).headers.get('set-cookie'),null);
 const before=await count();for(let i=0;i<4;i++)assert.equal((await visit(req(key,tag))).status,200);assert.equal(await count(),before+1);
 const a=await feedbackAttribution(req(key));assert.equal(a.channel,'claudeai_showcase');assert.equal(a.isTest,false);assert.deepEqual(Object.keys(a).sort(),['channel','day','isTest','label']);
});
test('tracker refuses missing/bad cookies, foreign origins and oversized payloads',async()=>{
 const before=await count();assert.equal((await visit(req('',tag))).status,400);assert.equal((await visit(req('__Host-gc-traffic=reviewer',tag))).status,400);
 const c=await cookie();for(const origin of ['https://evil.test','null',''])assert.equal((await visit(req(c,tag,origin))).status,403);
 assert.equal((await visit(req(c,{content:'x'.repeat(3000)}))).status,413);assert.equal(await count(),before);
});
test('navigation retains campaign while a new recognised tagged link changes last-touch attribution',async()=>{
 const c=await cookie();await recordTraffic(req(c),tag);await recordTraffic(req(c),{});assert.equal((await feedbackAttribution(req(c))).channel,'claudeai_showcase');
 await recordTraffic(req(c),{...tag,content:'sideproject'});await recordTraffic(req(c),{});assert.equal((await feedbackAttribution(req(c))).channel,'sideproject');
 await recordTraffic(req(c),tag);assert.equal((await feedbackAttribution(req(c))).channel,'claudeai_showcase');
});
test('unknown tags never persist arbitrary text, referrer paths or private values',async()=>{
 const c=await cookie();await recordTraffic(req(c),{source:'secret@example.test',content:'private message',referrer:'https://reddit.com/private/path',ip:'1.2.3.4',device:'fingerprint'});assert.equal((await feedbackAttribution(req(c))).channel,'direct');
 const rows=await env.DB.prepare('SELECT * FROM traffic_visits').all();const text=JSON.stringify(rows);for(const value of ['secret@example.test','private message','private/path','1.2.3.4','fingerprint'])assert.ok(!text.includes(value));
 const c2=await cookie();await recordTraffic(req(c2),{referrer:'bluesky'});assert.equal((await feedbackAttribution(req(c2))).channel,'bluesky');
});
test('labelled test traffic survives navigation and is excluded from normal reporting',async()=>{
 const c=await cookie();const before=await trafficReport('reviewer',30,false);await recordTraffic(req(c),{...tag,isTest:true});await recordTraffic(req(c),{});assert.equal((await feedbackAttribution(req(c))).isTest,true);
 const normal=await trafficReport('reviewer',30,false),qa=await trafficReport('reviewer',30,true);assert.equal(normal.totals.visits,before.totals.visits);assert.ok(qa.rows.find(r=>r.channel==='claudeai_showcase').visits>=1);
});
test('guest feedback captures server attribution and stable retries cannot reassign it',async()=>{
 const c=await cookie();await recordTraffic(req(c),{...tag,isTest:true});const f=(await feedbackSession(new Request('https://test/api/feedback'))).headers.get('set-cookie').split(';')[0];const body={submissionId:'traffic-feedback-0001',category:'other',area:'general',message:'QA ONLY — attribution acceptance fixture.',attribution:{channel:'bluesky'}};
 const post=()=>feedbackPost(new Request('https://test/api/feedback',{method:'POST',headers:{origin:'https://test','Content-Type':'application/json',cookie:c+'; '+f},body:JSON.stringify(body)}));
 const first=await post();assert.equal(first.status,201);const receipt=await first.json();assert.equal(JSON.stringify(receipt).includes('attribution'),false);
 await recordTraffic(req(c),{...tag,content:'sideproject',isTest:true});assert.deepEqual(await (await post()).json(),receipt);
 const row=(await feedbackQueue('reviewer','all')).feedback.find(r=>r.id===receipt.feedback.id);assert.equal(row.attribution.channel,'claudeai_showcase');assert.equal(row.attribution.isTest,true);assert.equal(row.author,undefined);
 const qa=await trafficReport('reviewer',30,true);assert.ok(qa.rows.find(r=>r.channel==='claudeai_showcase').feedback>=1);assert.equal((await trafficReport('reviewer',30,false)).rows.find(r=>r.channel==='claudeai_showcase').feedback,0);
});
test('private report denies anonymous and ordinary users without exposing hashes',async()=>{
 for(const user of ['', 'tester'])assert.equal((await report(new Request('https://test/api/moderation/traffic',{headers:{'oai-authenticated-user-id':user}}))).status,403);
 const result=await report(new Request('https://test/api/moderation/traffic?days=7',{headers:{'oai-authenticated-user-id':'reviewer'}}));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');const text=await result.text();assert.ok(!text.includes('visitor_hash'));assert.ok(text.includes('daily')||text.includes('Daily'));
 assert.equal((await report(new Request('https://test/api/moderation/traffic?days=900',{headers:{'oai-authenticated-user-id':'reviewer'}}))).status,400);
});
test('retention deletes old visit rows, expires old attribution and keeps current rows',async()=>{
 const c=await cookie();await recordTraffic(req(c),tag);const row=await env.DB.prepare('SELECT * FROM traffic_visits ORDER BY last_seen DESC LIMIT 1').first();await env.DB.prepare('UPDATE traffic_visits SET day=?,last_seen=? WHERE id=?').bind('2020-01-01','2020-01-01T00:00:00.000Z',row.id).run();assert.equal(await feedbackAttribution(req(c)),null);await recordTraffic(req(c),{});assert.equal(await env.DB.prepare('SELECT * FROM traffic_visits WHERE id=?').bind(row.id).first(),null);assert.equal((await feedbackAttribution(req(c))).channel,'direct');
});
test('failed traffic transaction rolls back and an exact retry counts once',async()=>{
 const c=await cookie(),before=await count(),original=env.DB.batch;env.DB.batch=statements=>original([...statements,env.DB.prepare('INSERT INTO traffic_visits(id) VALUES (?)').bind('invalid')]);try{assert.equal((await visit(req(c,tag))).status,503)}finally{env.DB.batch=original}assert.equal(await count(),before);assert.equal((await visit(req(c,tag))).status,200);assert.equal(await count(),before+1);
});
test('v3 recovery preserves traffic and attribution; pre-attribution v2 remains supported',async()=>{
 const names=['games','versions','contributor_usage','reports','report_usage','moderation_events','moderation_holds','version_submissions','feedback','feedback_usage','traffic_visits'],snapshot={format:'game-commons-recovery-v3',tables:{},sources:[]};for(const name of names)snapshot.tables[name]={columns:(await env.DB.prepare('PRAGMA table_info('+name+')').all()).results.map(r=>r.name),rows:(await env.DB.prepare('SELECT * FROM '+name).all()).results};const root=mkdtempSync(path.join(tmpdir(),'gc-traffic-'));
 try{const restored=restoreAndVerify(snapshot,path.join(root,'v3'));assert.equal(restored.allRowsEqual,true);assert.ok(restored.tables.traffic_visits>0);const old=structuredClone(snapshot);old.format='game-commons-recovery-v2';delete old.tables.traffic_visits;old.tables.feedback.columns=old.tables.feedback.columns.filter(c=>c!=='attribution');old.tables.feedback.rows.forEach(r=>delete r.attribution);assert.equal(restoreAndVerify(old,path.join(root,'v2')).allRowsEqual,true);const broken=structuredClone(snapshot);delete broken.tables.traffic_visits;assert.throws(()=>restoreAndVerify(broken,path.join(root,'bad')),/every application table/)}finally{rmSync(root,{recursive:true,force:true})}
});
import {referralPayload} from '../lib/traffic-referral.ts';
test('campaign capture survives stripped URLs and aborted navigation, and new post wins over prior tag',()=>{
 const now=Date.now(),first=referralPayload('?utm_source=reddit&utm_medium=community&utm_campaign=beta&utm_content=claudeai_showcase&gc_test=1','',null,now);
 assert.equal(first.payload.content,'claudeai_showcase');const navigated=referralPayload('?game=demo','https://test/',JSON.stringify(first.saved),now+1);assert.equal(navigated.payload.content,'claudeai_showcase');assert.equal(navigated.payload.isTest,true);
 const second=referralPayload('?utm_source=reddit&utm_medium=community&utm_campaign=beta&utm_content=sideproject&gc_test=1','',JSON.stringify(first.saved),now+2);assert.equal(second.payload.content,'sideproject');
 const form=referralPayload('','https://test/',JSON.stringify(second.saved),now+3);assert.equal(form.payload.content,'sideproject');assert.equal(form.payload.isTest,true);
 const real=referralPayload('?utm_source=reddit&utm_medium=community&utm_campaign=beta&utm_content=sideproject','',JSON.stringify(second.saved),now+4);assert.equal(real.payload.isTest,false);const qa=referralPayload('?gc_test=1','',JSON.stringify(real.saved),now+5);assert.equal(referralPayload('','',JSON.stringify(qa.saved),now+6).payload.isTest,true);
});
test('client referral capture rejects unknown, expired, future and malformed stored campaigns',()=>{
 const now=Date.now(),valid={source:'reddit',medium:'community',campaign:'beta',content:'sideproject',capturedAt:now,isTest:false};
 for(const stored of ['not json','null',JSON.stringify({...valid,capturedAt:now-8*86400000}),JSON.stringify({...valid,capturedAt:now+1}),JSON.stringify({...valid,source:'private@example.test'})])assert.equal(referralPayload('','',stored,now).saved,null);
 const data=referralPayload('?utm_source=private@example.test&utm_content=private','https://www.reddit.com/private/path',null,now);assert.equal(data.saved.content,'');assert.equal(data.saved.source,'reddit');assert.equal(data.payload.referrer,'reddit');assert.ok(!JSON.stringify(data).includes('private'));
});
import {feedbackPath} from '../lib/traffic-referral.ts';
test('server-rendered feedback link retains the tagged post even before JavaScript loads',()=>{
 const path=feedbackPath({utm_source:'reddit',utm_medium:'community',utm_campaign:'beta',utm_content:'sideproject',gc_test:'1',game:'demo',private:'never forward'}),url=new URL(path,'https://test');
 assert.equal(url.pathname,'/feedback');assert.equal(url.searchParams.get('utm_content'),'sideproject');assert.equal(url.searchParams.get('gc_test'),'1');assert.ok(!path.includes('private'));assert.ok(!path.includes('game='));
 assert.equal(feedbackPath({utm_source:'private@example.test',utm_content:'secret'}),'/feedback');assert.equal(feedbackPath({gc_test:'1'}),'/feedback?gc_test=1');
});
import vm from 'node:vm';import ts from 'typescript';import {readFileSync} from 'node:fs';
test('a persistent client layout tracks a newly tagged post instead of reusing its earlier promise',async()=>{
 const calls=[],storage=new Map(),exports={},window={location:{pathname:'/',search:'?utm_source=reddit&utm_medium=community&utm_campaign=beta&utm_content=claudeai_showcase&gc_test=1'}};
 const code=ts.transpileModule(readFileSync(new URL('../app/traffic-tracker.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:name=>name==='react'?{useEffect(){}}:{referralPayload},window,document:{referrer:''},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},AbortSignal,fetch:async(url,options)=>{if(options.method==='POST')calls.push(JSON.parse(options.body));return {ok:true}}});
 assert.equal(await exports.trackTraffic(),true);window.location.search='?utm_source=reddit&utm_medium=community&utm_campaign=beta&utm_content=sideproject&gc_test=1';assert.equal(await exports.trackTraffic(),true);assert.equal(calls.length,2);assert.equal(calls[1].content,'sideproject');window.location.search='';await exports.trackTraffic();assert.equal(calls.at(-1).content,'sideproject');
});
import {DatabaseSync} from 'node:sqlite';import {readdirSync} from 'node:fs';
test('new recruitment posts retain distinct source labels through guest feedback and reporting',async()=>{
 for(const [source,medium,content,channel] of [['reddit','community','claudegamedev','claudegamedev'],['bluesky','social','claude_remix','bluesky_demo']]){
 const c=await cookie(),payload=referralPayload('?'+new URLSearchParams({utm_source:source,utm_medium:medium,utm_campaign:'beta',utm_content:content,gc_test:'1'}),'',null).payload;
 assert.equal(payload.content,content);assert.equal((await visit(req(c,payload))).status,200);assert.equal((await feedbackAttribution(req(c))).channel,channel);
 const f=(await feedbackSession(new Request('https://test/api/feedback'))).headers.get('set-cookie').split(';')[0];const r=await feedbackPost(new Request('https://test/api/feedback',{method:'POST',headers:{origin:'https://test','Content-Type':'application/json',cookie:c+'; '+f},body:JSON.stringify({submissionId:'new-cohort-feedback-'+channel.replaceAll('_','-'),category:'other',area:'general',message:'QA ONLY — new recruitment post attribution.'})}));assert.equal(r.status,201);
 const row=(await trafficReport('reviewer',30,true)).rows.find(x=>x.channel===channel);assert.equal(row.visits,1);assert.equal(row.feedback,1);
 }
});
test('channel migration preserves every existing traffic value with foreign keys enabled',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');const dir=new URL('../drizzle/',import.meta.url);for(const name of readdirSync(dir).filter(n=>n.endsWith('.sql')&&n<'0006').sort())db.exec(readFileSync(new URL(name,dir),'utf8'));
 db.prepare('INSERT INTO traffic_visits VALUES (?,?,?,?,?,?,?)').run('prior-id','prior-visitor','2026-10-19','sideproject',0,'2026-10-19T00:00:00Z','2026-10-19T01:00:00Z');const before=db.prepare('SELECT * FROM traffic_visits').all();db.exec(readFileSync(new URL('0006_cute_leech.sql',dir),'utf8'));assert.deepEqual(db.prepare('SELECT * FROM traffic_visits').all(),before);assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 for(const channel of ['claudegamedev','bluesky_demo'])db.prepare('INSERT INTO traffic_visits VALUES (?,?,?,?,?,?,?)').run(channel,'test-visitor','2026-10-19',channel,1,'2026-10-19T00:00:00Z','2026-10-19T00:00:00Z');assert.throws(()=>db.prepare('INSERT INTO traffic_visits VALUES (?,?,?,?,?,?,?)').run('bad','v','2026-10-19','unknown',0,'x','x'));db.close();
});

import {CHANNELS,campaignChannel} from '../lib/traffic-channels.ts';
const publishedCampaigns=[
 ['reddit','community','vision','/','reddit_vision'],['bluesky','social','vision','/','bluesky_vision'],['x','social','vision','/','x_vision'],
 ['reddit','community','claudeai_showcase','/','claudeai_showcase'],['reddit','community','sideproject','/','sideproject'],['reddit','community','claudegamedev','/','claudegamedev'],
 ['reddit','community','chatgpt_demo','/','chatgpt_demo'],['reddit','community','aigamedev_demo','/godot','aigamedev_demo'],['reddit','community','alphaandbetausers','/godot','alphaandbetausers'],['reddit','community','claudecode_showcase','/godot','claudecode_showcase'],['reddit','community','creator_outreach','/godot','creator_outreach'],
 ['bluesky','social','tester_post','/','bluesky_tester'],['bluesky','social','claude_remix','/','bluesky_demo'],['bluesky','social','claude_remix','/godot','bluesky_godot'],['x','social','launch','/godot','x_launch'],
];
test('every published campaign survives entry, reload, feedback link and guest feedback persistence',async()=>{
 for(const [source,medium,content,landing,channel] of publishedCampaigns){
  const search='?'+new URLSearchParams({utm_source:source,utm_medium:medium,utm_campaign:'beta',utm_content:content,gc_test:'1'});
  const first=referralPayload(search,'',null,Date.now(),landing);
  assert.equal(campaignChannel(first.payload),channel);
  const form=feedbackPath(Object.fromEntries(new URLSearchParams(search)),landing);
  assert.equal(campaignChannel(referralPayload(new URL(form,'https://test').search,'',null).payload),channel);
  const c=await cookie();assert.equal((await visit(req(c,first.payload))).status,200);
  const reload=referralPayload('','https://test/godot',JSON.stringify(first.saved));await visit(req(c,reload.payload));
  assert.equal((await feedbackAttribution(req(c))).channel,channel);
  const f=(await feedbackSession(new Request('https://test/api/feedback'))).headers.get('set-cookie').split(';')[0];
  const result=await feedbackPost(new Request('https://test/api/feedback',{method:'POST',headers:{origin:'https://test','Content-Type':'application/json',cookie:c+'; '+f},body:JSON.stringify({submissionId:'campaign-matrix-'+channel.replaceAll('_','-'),category:'other',area:'general',message:'QA ONLY — complete published campaign attribution matrix.'})}));
  assert.equal(result.status,201,channel);const receipt=await result.json();
  const row=await env.DB.prepare('SELECT attribution FROM feedback WHERE id=?').bind(receipt.feedback.id).first();
  assert.equal(JSON.parse(row.attribution).channel,channel);assert.equal(JSON.parse(row.attribution).isTest,true);
  assert.ok((await trafficReport('reviewer',30,true)).rows.find(r=>r.channel===channel).feedback>=1);
 }
});
test('platform fallbacks, twitter alias and external last touch preserve only public labels',()=>{
 for(const [referrer,source] of [['https://old.reddit.com/r/private','reddit'],['https://bsky.app/profile/example','bluesky'],['https://t.co/secret','x'],['https://mobile.twitter.com/example','x'],['https://x.com/a/status/1','x']]){
  const old=referralPayload('?utm_source=reddit&utm_campaign=beta&utm_content=sideproject','',null);
  const next=referralPayload('',referrer,JSON.stringify(old.saved));assert.equal(next.saved.source,source);assert.equal(next.saved.content,'');assert.ok(!JSON.stringify(next).includes('/private'));
 }
 assert.equal(campaignChannel(referralPayload('?utm_source=twitter&utm_campaign=beta&utm_content=launch','',null).payload),'x_launch');
 assert.equal(referralPayload('','https://notreddit.com/',null).saved,null);
 const unknown=referralPayload('?utm_source=x&utm_campaign=beta&utm_content=private@email.test','',null);assert.equal(unknown.saved.content,'');assert.ok(!JSON.stringify(unknown).includes('private@'));
 const now=Date.now(),stored=JSON.stringify({source:'reddit',campaign:'beta',medium:'secret',content:'sideproject',isTest:false,capturedAt:now,private:'never store'});assert.ok(!JSON.stringify(referralPayload('','',stored,now)).includes('secret'));
});
test('expanded channel migration keeps all prior rows, foreign keys, indexes and registry channels',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');const dir=new URL('../drizzle/',import.meta.url);
 for(const name of readdirSync(dir).filter(n=>n.endsWith('.sql')&&n<'0007').sort())db.exec(readFileSync(new URL(name,dir),'utf8'));
 db.prepare('INSERT INTO traffic_visits VALUES (?,?,?,?,?,?,?)').run('old','visitor','2026-10-19','bluesky_demo',0,'a','b');
 const before=db.prepare('SELECT * FROM traffic_visits').all();db.exec(readFileSync(new URL('0007_fuzzy_cardiac.sql',dir),'utf8'));assert.deepEqual(db.prepare('SELECT * FROM traffic_visits').all(),before);assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
 db.exec(readFileSync(new URL('0008_glorious_maximus.sql',dir),'utf8'));assert.deepEqual(db.prepare('SELECT * FROM traffic_visits').all(),before);
 db.exec(readFileSync(new URL('0009_brown_the_initiative.sql',dir),'utf8'));assert.deepEqual(db.prepare('SELECT * FROM traffic_visits').all(),before);for(const channel of Object.keys(CHANNELS))db.prepare('INSERT INTO traffic_visits VALUES (?,?,?,?,?,?,?)').run(channel,'v','2026-10-19',channel,1,'a','b');
 assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='index' AND name LIKE 'traffic_visits_%'").get().n,2);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);db.close();
});

test('published vision films retain distinct platform attribution through feedback, reload and QA reporting',async()=>{
 const films=[['youtube','evolution_film','youtube_evolution'],['youtube','aaa_continuity_trailer','youtube_crossover'],['youtube','concept_trailer','youtube_crossover'],['x','evolution_film','x_evolution'],['x','aaa_film','x_crossover'],['bluesky','evolution_film','bluesky_evolution'],['bluesky','aaa_film','bluesky_crossover'],['reddit','aigaming_films','reddit_aigaming_films'],['reddit','indiedev_film','reddit_indiedev_film']];
 const before=(await trafficReport('reviewer',30,false)).totals.visits;
 for(const [source,content,channel] of films){
  const query={utm_source:source,utm_campaign:'games_never_die',utm_content:content,gc_test:'1'};
  const first=referralPayload('?'+new URLSearchParams(query),'',null);
  assert.equal(campaignChannel(first.payload),channel);
  const feedbackURL=new URL(feedbackPath(query),'https://test');
  assert.equal(campaignChannel(referralPayload(feedbackURL.search,'',null).payload),channel);
  const c=await cookie();assert.equal((await visit(req(c,first.payload))).status,200);
  await visit(req(c,referralPayload('','https://test/',JSON.stringify(first.saved)).payload));
  assert.equal((await feedbackAttribution(req(c))).channel,channel);
  assert.equal((await feedbackAttribution(req(c))).isTest,true);
  const f=(await feedbackSession(new Request('https://test/api/feedback'))).headers.get('set-cookie').split(';')[0];
  const result=await feedbackPost(new Request('https://test/api/feedback',{method:'POST',headers:{origin:'https://test','Content-Type':'application/json',cookie:c+'; '+f},body:JSON.stringify({submissionId:('film-matrix-'+source+'-'+content).replaceAll('_','-'),category:'other',area:'general',message:'QA ONLY — film attribution persistence.'})}));
  assert.equal(result.status,201);const receipt=await result.json();
  const row=await env.DB.prepare('SELECT attribution FROM feedback WHERE id=?').bind(receipt.feedback.id).first();
  assert.equal(JSON.parse(row.attribution).channel,channel);
  assert.ok((await trafficReport('reviewer',30,true)).rows.find(r=>r.channel===channel).visits>=1);
 }
 assert.equal((await trafficReport('reviewer',30,false)).totals.visits,before);
 for(const content of ['private@example.test','__proto__','constructor'])assert.equal(campaignChannel({source:'x',campaign:'games_never_die',content}),null);
 for(const source of ['x','bluesky','reddit'])assert.equal(campaignChannel({source,campaign:'games_never_die',content:'platform_slug_launch'}),source+'_vision');
 assert.equal(campaignChannel({source:'reddit',campaign:'games_never_die',content:'aigamedev_handoff'}),'aigamedev_demo');
});
