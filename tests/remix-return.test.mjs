import {test} from 'node:test';
import assert from 'node:assert/strict';
import {env} from './test-env.mjs';
import {remixReturnFeedback,REMIX_RETURN_HEADING} from '../lib/remix-return.ts';
import {GET,POST} from '../app/api/feedback/route.ts';
import {feedbackQueue,reviewFeedback} from '../lib/feedback.ts';
import {GET as queueRoute} from '../app/api/moderation/feedback/route.ts';
env.MODERATOR_USER_IDS='["reviewer"]';
const fixture=()=>({title:'INTERNAL TEST FIXTURE — not a creator remix',sourceUrl:'https://example.org/fixture/source',sourceRevision:'a'.repeat(40),buildUrl:'https://example.org/fixture/release',parents:[{sourceUrl:'https://example.org/parent-a',revision:'b'.repeat(40),credit:'Fixture author A'},{sourceUrl:'https://example.org/parent-b',revision:'v1.0.0',credit:'Fixture author B'}],credits:'Internal fixture only. Adapted route and combat systems; no independent creator claimed.',codeTerms:'MIT and Apache-2.0; LICENSE and LICENSES/',assetTerms:'CC BY 4.0 test art; credits in NOTICES.txt',instructions:'Node 22; npm ci --ignore-scripts; npm run build; serve dist. All dependencies/assets included.',validation:'Internal integration fixture only. No actual game, fetched source or independent playtest.',rightsConfirmed:true});
const request=(body,cookie,origin='https://test')=>new Request('https://test/api/feedback',{method:'POST',headers:{'content-type':'application/json',origin,...(cookie?{cookie}:{})},body:JSON.stringify(body)});

test('internal remix fixture persists privately with complete lineage and terms, replays once, and review never publishes',async()=>{
 const cookie=(await GET(new Request('https://test/api/feedback'))).headers.get('set-cookie').split(';')[0];
 const before=(await env.DB.prepare('SELECT count(*) n FROM games').first()).n;
 const body={submissionId:'internal-remix-return-0001',remixReturn:fixture(),category:'bug',area:'general',message:'Caller cannot substitute the validated brief.'};
 const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Submission must never fetch source or build URLs')};
 let saved;
 try{
  const first=await POST(request(body,cookie));assert.equal(first.status,201);saved=await first.json();
  assert.deepEqual(await (await POST(request(body,cookie))).json(),saved);
  assert.equal((await POST(request({...body,remixReturn:{...fixture(),sourceRevision:'c'.repeat(40)}},cookie))).status,409);
 }finally{globalThis.fetch=originalFetch}
 const entry=(await feedbackQueue('reviewer')).feedback.find(f=>f.id===saved.feedback.id);
 assert.equal(entry.category,'other');assert.equal(entry.area,'remixing');assert.equal(entry.status,'new');assert.equal(entry.author,undefined);
 for(const value of [REMIX_RETURN_HEADING,'Fixture author A','Fixture author B','MIT and Apache-2.0','CC BY 4.0','npm ci','No actual game'])assert.ok(entry.message.includes(value));
 assert.equal((await queueRoute(new Request('https://test/api/moderation/feedback',{headers:{cookie}}))).status,403);
 await assert.rejects(reviewFeedback(entry.id,{status:'reviewed',expectedRevision:0},'outsider'),e=>e.status===403);
 await reviewFeedback(entry.id,{status:'reviewed',expectedRevision:0},'reviewer');
 assert.equal((await env.DB.prepare('SELECT count(*) n FROM games').first()).n,before);
 assert.equal((await env.DB.prepare('SELECT count FROM feedback_usage WHERE id LIKE ?').bind('guest:%').first()).count,1);
});

test('invalid remix briefs cannot create feedback or consume quota',async()=>{
 const cookie=(await GET(new Request('https://test/api/feedback'))).headers.get('set-cookie').split(';')[0];
 const before=(await env.DB.prepare('SELECT count(*) n FROM feedback').first()).n;
 const invalid=[{parents:[]},{parents:Array(5).fill(fixture().parents[0])},{parents:[{}]},{sourceRevision:'main'},{parents:[{...fixture().parents[0],revision:'HEAD'}]},{credits:''},{codeTerms:''},{assetTerms:''},{instructions:''},{validation:''},{rightsConfirmed:false},{sourceUrl:'javascript:alert(1)'},{buildUrl:'https://user:password@example.org/game'},{sourceUrl:'http://example.org/source'},{sourceUrl:'https://127.0.0.1/source'},{sourceUrl:'https://localhost/source'},{sourceUrl:'https://[::1]/source'},{title:'x'.repeat(81)},{title:'bad\u0000title'},{instructions:'x'.repeat(801)}];
 for(const change of invalid){const result=await POST(request({submissionId:'invalid-remix-return-0001',remixReturn:{...fixture(),...change}},cookie));assert.equal(result.status,400,JSON.stringify(change));}
 const long={...fixture(),parents:Array(4).fill({...fixture().parents[0],credit:'x'.repeat(200)}),instructions:'x'.repeat(800),validation:'x'.repeat(500)};
 assert.throws(()=>remixReturnFeedback(long),/3000 characters/);
 assert.equal((await env.DB.prepare('SELECT count(*) n FROM feedback').first()).n,before);
});

test('remix returns share guest feedback boundaries and five-message allowance',async()=>{
 const cookie=(await GET(new Request('https://test/api/feedback'))).headers.get('set-cookie').split(';')[0];
 const data={submissionId:'remix-shared-limit-0000',remixReturn:fixture()};
 assert.equal((await POST(request(data))).status,400);
 assert.equal((await POST(request(data,cookie,'https://evil.test'))).status,403);
 for(let i=0;i<4;i++)assert.equal((await POST(request({submissionId:'shared-feedback-000'+i,category:'other',area:'general',message:'INTERNAL TEST FIXTURE ordinary feedback.'},cookie))).status,201);
 assert.equal((await POST(request(data,cookie))).status,201);
 assert.equal((await POST(request({...data,submissionId:'remix-shared-limit-0001'},cookie))).status,429);
 assert.equal((await POST(request(data,cookie))).status,201);
});

test('remix persistence failure rolls back and permits the same stable retry',async()=>{
 const cookie=(await GET(new Request('https://test/api/feedback'))).headers.get('set-cookie').split(';')[0];
 const body={submissionId:'remix-rollback-0001',remixReturn:fixture()},original=env.DB.batch;
 env.DB.batch=()=>{throw Error('Internal fixture storage failure')};
 try{assert.equal((await POST(request(body,cookie))).status,503)}finally{env.DB.batch=original}
 assert.equal((await POST(request(body,cookie))).status,201);
});
