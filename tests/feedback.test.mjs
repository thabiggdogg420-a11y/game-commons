import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {env} from './test-env.mjs';
import {submitFeedback,feedbackQueue,reviewFeedback} from '../lib/feedback.ts';
import {GET as feedbackSession,POST as submitRoute} from '../app/api/feedback/route.ts';
import {GET as queueRoute} from '../app/api/moderation/feedback/route.ts';
import {POST as reviewRoute} from '../app/api/moderation/feedback/[id]/route.ts';
import {restoreAndVerify} from '../scripts/recovery-drill.mjs';
env.MODERATOR_USER_IDS='["reviewer"]';
const input=(id='feedback-submit-0001')=>({submissionId:id,category:'bug',area:'playing',message:'The start button does not respond on my phone.',device:'Test phone, test browser'});
const request=(user,body,origin='https://test')=>new Request('https://test/api/feedback',{method:'POST',headers:{'Content-Type':'application/json',origin,...(user?{'oai-authenticated-user-id':user}:{})},body:JSON.stringify(body)});

test('feedback persists, retries are stable, and identity never appears in receipts or queue',async()=>{
 const data=input(),saved=await submitFeedback(data,'tester');
 assert.equal(saved.status,'new');assert.equal(saved.author,undefined);
 assert.deepEqual(await submitFeedback(data,'tester'),saved);
 await assert.rejects(submitFeedback({...data,message:'A completely different suggestion.'},'tester'),e=>e.status===409);
 const second=await submitFeedback(data,'another-tester');assert.notEqual(saved.id,second.id);
 const queue=await feedbackQueue('reviewer');assert.equal(queue.feedback.find(f=>f.id===saved.id).message,data.message);assert.ok(queue.feedback.every(f=>f.author===undefined));
});
test('invalid feedback and unauthenticated submissions cannot create rows',async()=>{
 const before=(await env.DB.prepare('SELECT count(*) n FROM feedback').first()).n;
 await assert.rejects(submitFeedback(input(),''),e=>e.status===403);
 for(const changes of [{submissionId:'short'},{category:'bad'},{area:'bad'},{message:'tiny'},{message:'x'.repeat(3001)},{device:'x'.repeat(201)},{device:{}}])await assert.rejects(submitFeedback({...input(),...changes},'invalid'),e=>e.status===400);
 assert.equal((await env.DB.prepare('SELECT count(*) n FROM feedback').first()).n,before);
});
test('feedback daily limit is atomic and retries still succeed at the limit',async()=>{
 const first=await submitFeedback(input('feedback-quota-0000'),'limited');
 for(let i=1;i<5;i++)await submitFeedback(input('feedback-quota-000'+i),'limited');
 await assert.rejects(submitFeedback(input('feedback-quota-0005'),'limited'),e=>e.status===429);
 assert.equal((await submitFeedback(input('feedback-quota-0000'),'limited')).id,first.id);
 assert.equal((await env.DB.prepare('SELECT count FROM feedback_usage WHERE id=?').bind('limited:'+new Date().toISOString().slice(0,10)).first()).count,5);
 assert.equal((await env.DB.prepare('SELECT count(*) n FROM feedback WHERE author=?').bind('limited').first()).n,5);
});
test('failed feedback writes roll back the daily allowance',async()=>{
 const original=env.DB.batch;
 env.DB.batch=statements=>original([...statements,env.DB.prepare('INSERT INTO feedback_usage(id,count) VALUES (?,6)').bind('forced-failure')]);
 try{await assert.rejects(submitFeedback(input(),'rollback'))}finally{env.DB.batch=original}
 assert.equal(await env.DB.prepare('SELECT * FROM feedback_usage WHERE id=?').bind('rollback:'+new Date().toISOString().slice(0,10)).first(),null);
 assert.equal((await env.DB.prepare('SELECT count(*) n FROM feedback WHERE author=?').bind('rollback').first()).n,0);
});
test('only moderators can read or review; stale changes fail and reviewed items can reopen',async()=>{
 const saved=await submitFeedback(input(),'private-tester');
 for(const user of ['', 'private-tester','outsider']){
  await assert.rejects(feedbackQueue(user),e=>e.status===403);
  await assert.rejects(reviewFeedback(saved.id,{status:'reviewed',expectedRevision:0},user),e=>e.status===403);
 }
 const reviewed=await reviewFeedback(saved.id,{status:'reviewed',expectedRevision:0},'reviewer');assert.equal(reviewed.revision,1);
 await assert.rejects(reviewFeedback(saved.id,{status:'new',expectedRevision:0},'reviewer'),e=>e.status===409);
 assert.equal((await feedbackQueue('reviewer','new')).feedback.some(f=>f.id===saved.id),false);
 assert.equal((await feedbackQueue('reviewer','reviewed')).feedback.some(f=>f.id===saved.id),true);
 assert.equal((await reviewFeedback(saved.id,{status:'new',expectedRevision:1},'reviewer')).status,'new');
});
test('queue pagination retains tied dates and rejects mismatched filters',async()=>{
 for(let i=0;i<28;i++)await submitFeedback(input(),'pagination-'+i);
 await env.DB.prepare("UPDATE feedback SET created_at='2026-10-19T00:00:00.000Z'").run();
 let cursor,ids=[];do{const page=await feedbackQueue('reviewer','all',cursor);ids.push(...page.feedback.map(f=>f.id));cursor=page.nextCursor}while(cursor);
 assert.equal(ids.length,(await env.DB.prepare('SELECT count(*) n FROM feedback').first()).n);assert.equal(new Set(ids).size,ids.length);
 await assert.rejects(feedbackQueue('reviewer','new',(await feedbackQueue('reviewer','all')).nextCursor),e=>e.status===400);
 await assert.rejects(feedbackQueue('reviewer','all','garbage'),e=>e.status===400);
});
test('HTTP submission, inbox and review enforce authentication and same-origin writes',async()=>{
 assert.equal((await submitRoute(request(null,input()))).status,400);
 assert.equal((await submitRoute(request('http-tester',input(),'https://other.test'))).status,403);
 const result=await submitRoute(request('http-tester',input()));assert.equal(result.status,201);assert.equal(result.headers.get('cache-control'),'no-store');
 const id=(await result.json()).feedback.id,params={params:Promise.resolve({id})};
 for(const user of ['', 'http-tester'])assert.equal((await queueRoute(new Request('https://test/api/moderation/feedback',{headers:{'oai-authenticated-user-id':user}}))).status,403);
 assert.equal((await reviewRoute(request('reviewer',{status:'reviewed',expectedRevision:0},'https://evil.test'),params)).status,403);
 assert.equal((await reviewRoute(request('http-tester',{status:'reviewed',expectedRevision:0}),params)).status,403);
 assert.equal((await reviewRoute(request('reviewer',{status:'reviewed',expectedRevision:0}),params)).status,200);
 assert.equal((await submitRoute(request('http-tester',{message:'invalid'}))).status,400);
});
test('guest feedback needs no account, persists once on retry, and cannot read the inbox',async()=>{
 const session=await feedbackSession(new Request('https://test/api/feedback'));
 assert.equal(session.headers.get('cache-control'),'no-store');
 const setCookie=session.headers.get('set-cookie');
 for(const flag of ['Secure','HttpOnly','SameSite=Strict','Path=/','Max-Age=604800'])assert.ok(setCookie.includes(flag));
 const cookie=setCookie.split(';')[0];
 const guestRequest=(data,origin='https://test')=>new Request('https://test/api/feedback',{method:'POST',headers:{origin,'Content-Type':'application/json',cookie},body:JSON.stringify(data)});
 assert.equal((await feedbackSession(new Request('https://test/api/feedback',{headers:{cookie}}))).headers.get('set-cookie'),null);
 const data=input('guest-feedback-0000');
 const first=await submitRoute(guestRequest(data));assert.equal(first.status,201);
 const saved=await first.json();
 assert.deepEqual(await (await submitRoute(guestRequest(data))).json(),saved);
 assert.equal((await submitRoute(guestRequest({...data,message:'Different message with the same ID.'}))).status,409);
 for(let i=1;i<5;i++)assert.equal((await submitRoute(guestRequest(input('guest-feedback-000'+i)))).status,201);
 assert.equal((await submitRoute(guestRequest(input('guest-feedback-0005')))).status,429);
 assert.deepEqual(await (await submitRoute(guestRequest(data))).json(),saved);
 for(const origin of ['https://evil.test','null',''])assert.equal((await submitRoute(guestRequest(data,origin))).status,403);
 const badCookie=new Request('https://test/api/feedback',{method:'POST',headers:{origin:'https://test','Content-Type':'application/json',cookie:'__Host-gc-feedback=reviewer'},body:JSON.stringify(data)});
 assert.equal((await submitRoute(badCookie)).status,400);
 assert.equal((await queueRoute(new Request('https://test/api/moderation/feedback',{headers:{cookie}}))).status,403);
 const queue=await feedbackQueue('reviewer','all');assert.ok(queue.feedback.some(f=>f.id===saved.feedback.id));
});
test('current recovery format retains feedback and old snapshots remain restorable',async()=>{
 const names=['games','versions','contributor_usage','reports','report_usage','moderation_events','moderation_holds','version_submissions','feedback','feedback_usage'];
 const snapshot={format:'game-commons-recovery-v2',projectId:'test',sourceCommit:'fixture',sources:[],tables:{}};
 for(const name of names){snapshot.tables[name]={columns:(await env.DB.prepare('PRAGMA table_info('+name+')').all()).results.map(c=>c.name),rows:(await env.DB.prepare('SELECT * FROM '+name).all()).results}}
 const root=mkdtempSync(path.join(tmpdir(),'game-commons-feedback-'));
 try{
  const result=restoreAndVerify(snapshot,path.join(root,'current'));assert.ok(result.tables.feedback>0);assert.equal(result.allRowsEqual,true);
  const incomplete=structuredClone(snapshot);delete incomplete.tables.feedback;assert.throws(()=>restoreAndVerify(incomplete,path.join(root,'incomplete')),/every application table/);
  const legacy=structuredClone(snapshot);legacy.format='game-commons-recovery-v1';delete legacy.tables.feedback;delete legacy.tables.feedback_usage;
  assert.equal(restoreAndVerify(legacy,path.join(root,'legacy')).allRowsEqual,true);
 }finally{rmSync(root,{recursive:true,force:true})}
});
