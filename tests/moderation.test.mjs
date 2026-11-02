import {test} from 'node:test';
import assert from 'node:assert/strict';
import {env} from './test-env.mjs';
import {submitReport,readReport,reportQueue,reviewReport,reportAudit} from '../lib/reports.ts';
import {isModerator} from '../lib/moderator.ts';
import {saveGame,getGame,readSource,manifest,history,cataloguePage,setGameVisibility} from '../lib/repository.ts';
import {POST as reportEndpoint} from '../app/api/games/[id]/reports/route.ts';
import {POST as reviewEndpoint,GET as auditEndpoint} from '../app/api/moderation/reports/[id]/route.ts';
import {GET as receiptEndpoint} from '../app/api/reports/[id]/route.ts';
import {POST as readerMcp} from '../app/mcp/read/route.ts';
const reportInput=(id='report-submit-test-001')=>({submissionId:id,category:'broken',details:'The game stops responding after the start button is pressed.',version:1});
const upload={title:'Moderation fixture',description:'A self-contained fixture for testing creator moderation.',creator:'Test maker',genre:'Arcade',tags:['moderation'],controls:'Click play.',source:'<!doctype html><html><body><button>Play</button></body></html>',attribution:'Original test fixture.',rightsConfirmed:true};
const decision=(action,expectedRevision=0)=>({action,note:'Decision based on the reported reproducible behaviour.',expectedRevision});
env.MODERATOR_USER_IDS=JSON.stringify(['moderator']);
test('moderator permissions fail closed and require exact site identity',()=>{
 assert.equal(isModerator('moderator'),true);assert.equal(isModerator('other'),false);assert.equal(isModerator(),false);
 for(const value of ['', 'broken', '{}','["moderator",1]']){env.MODERATOR_USER_IDS=value;assert.equal(isModerator('moderator'),false)}env.MODERATOR_USER_IDS='["moderator"]';
});
test('reports are private, replay-safe, and never auto-hide a game',async()=>{
 const input=reportInput(),r=await submitReport('orbital-drift',input,'reporter');
 assert.equal(r.status,'open');assert.equal(r.reporter,undefined);
 assert.equal((await submitReport('orbital-drift',input,'reporter')).id,r.id);
 await assert.rejects(submitReport('orbital-drift',{...input,details:'A different issue with different content.'},'reporter'),e=>e.status===409);
 await assert.rejects(readReport(r.id,'stranger'),e=>e.status===404);
 await assert.rejects(readReport(r.id,''),e=>e.status===403);
 await assert.rejects(reportQueue('stranger'),e=>e.status===403);
 await assert.rejects(reportAudit(r.id,'stranger'),e=>e.status===403);
 await assert.rejects(reviewReport(r.id,decision('hold'),'stranger'),e=>e.status===403);
 assert.ok(await getGame('orbital-drift'));assert.equal((await readReport(r.id,'reporter')).details,input.details);
});
test('report validation and daily quota reject abuse without losing retries',async()=>{
 for(const changed of [{category:'fake'},{details:'short'},{version:0},{version:2},{submissionId:'short'}])await assert.rejects(submitReport('signal-garden',{...reportInput(),...changed},'invalid'));
 await assert.rejects(submitReport('missing',reportInput(),'invalid'),e=>e.status===404);
 await assert.rejects(submitReport('orbital-drift',reportInput(),''),e=>e.status===403);
 const first=await submitReport('signal-garden',reportInput('quota-report-test-00'),'quota');
 for(let i=1;i<10;i++)await submitReport('signal-garden',reportInput('quota-report-test-0'+i),'quota');
 await assert.rejects(submitReport('signal-garden',reportInput('quota-report-test-10'),'quota'),e=>e.status===429);
 assert.equal((await submitReport('signal-garden',reportInput('quota-report-test-00'),'quota')).id,first.id);
 assert.equal((await env.DB.prepare('SELECT count FROM report_usage WHERE id=?').bind('quota:'+new Date().toISOString().slice(0,10)).first()).count,10);
});
test('holds block catalogue, source, manifests, history and MCP while retaining creator source',async()=>{
 const game=await saveGame(upload,'creator'),original=await readSource(game.id);
 const report=await submitReport(game.id,reportInput('hold-report-test-001'),'holder');
 const held=await reviewReport(report.id,decision('hold'),'moderator');assert.equal(held.revision,1);
 assert.equal(await getGame(game.id),null);assert.equal(await readSource(game.id),null);assert.equal(await manifest(game.id,'https://test'),null);assert.deepEqual(await history(game.id),[]);
 assert.equal((await cataloguePage({query:'moderation'})).games.some(g=>g.id===game.id),false);
 assert.equal((await cataloguePage({mine:true,userId:'creator'})).games.find(g=>g.id===game.id).moderatedAt!==null,true);
 assert.equal(await readSource(game.id,1,'creator'),original);
 for(const name of ['get_game_source','get_game_manifest']){const r=await readerMcp(new Request('https://test/mcp/read',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'creator'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:{id:game.id}}})}));assert.equal((await r.json()).result.isError,true)}
 await setGameVisibility(game.id,false,'creator');await saveGame({...upload,source:upload.source+'<!-- new -->'},'creator',game.id);assert.equal(await getGame(game.id),null);
 await setGameVisibility(game.id,true,'creator');await reviewReport(report.id,decision('release',1),'moderator');assert.equal(await getGame(game.id),null);
 await setGameVisibility(game.id,false,'creator');assert.ok(await getGame(game.id));
 assert.equal((await reportAudit(report.id,'moderator')).length,2);
 assert.equal((await readReport(report.id,'holder')).revision,2);
});
test('starter holds enforce the same source and search restrictions',async()=>{
 const r=await submitReport('pocket-orchard',reportInput('starter-hold-test-001'),'starter-reporter');
 await reviewReport(r.id,decision('hold'),'moderator');
 assert.equal(await readSource('pocket-orchard'),null);assert.equal(await manifest('pocket-orchard','https://test'),null);
 assert.equal((await cataloguePage({query:'farming'})).games.length,0);
 await reviewReport(r.id,decision('release',1),'moderator');assert.ok(await readSource('pocket-orchard'));
});
test('stale decisions cannot change holds or append audit events',async()=>{
 const r=await submitReport('orbital-drift',reportInput('stale-review-test-001'),'stale-reporter');
 await reviewReport(r.id,decision('hold'),'moderator');
 await assert.rejects(reviewReport(r.id,decision('release',0),'moderator'),e=>e.status===409);
 assert.equal(await getGame('orbital-drift'),null);assert.equal((await reportAudit(r.id,'moderator')).length,1);
 await reviewReport(r.id,decision('dismiss',1),'moderator');assert.equal(await getGame('orbital-drift'),null);
 const second=await submitReport('signal-garden',reportInput('other-release-test-001'),'other-reporter');
 await assert.rejects(reviewReport(second.id,decision('release'),'moderator'),e=>e.status===409);
 assert.equal((await readReport(second.id,'other-reporter')).revision,0);assert.equal((await reportAudit(second.id,'moderator')).length,0);
 await reviewReport(r.id,decision('release',2),'moderator');
});
test('a report cannot release another report’s hold on the same game',async()=>{
 const a=await submitReport('orbital-drift',reportInput('competing-hold-test-a'),'competing-a');
 const b=await submitReport('orbital-drift',reportInput('competing-hold-test-b'),'competing-b');
 await reviewReport(a.id,decision('hold'),'moderator');await reviewReport(b.id,decision('hold'),'moderator');
 await assert.rejects(reviewReport(a.id,decision('release',1),'moderator'),e=>e.status===409);
 assert.equal((await reportAudit(a.id,'moderator')).length,1);assert.equal(await getGame('orbital-drift'),null);
 await reviewReport(b.id,decision('release',1),'moderator');assert.ok(await getGame('orbital-drift'));
});
test('queue paginates tied timestamps without leaking reporter identities',async()=>{
 for(let i=0;i<32;i++)await submitReport('signal-garden',reportInput('queue-report-test-'+i.toString().padStart(3,'0')),'queue-person-'+i);
 let cursor,seen=[];do{const page=await reportQueue('moderator','all',cursor);assert.ok(page.reports.every(r=>r.reporter===undefined));seen.push(...page.reports.map(r=>r.id));cursor=page.nextCursor}while(cursor);
 const count=await env.DB.prepare('SELECT count(*) AS n FROM reports').first();assert.equal(seen.length,count.n);assert.equal(new Set(seen).size,seen.length);
 await assert.rejects(reportQueue('moderator','open','invalid'));
 const first=await reportQueue('moderator','all');await assert.rejects(reportQueue('moderator','open',first.nextCursor));
});
test('HTTP report and review enforce identity, origin, role and receipt ownership',async()=>{
 const req=(user,origin,body=reportInput('http-report-test-001'))=>new Request('https://test/api',{method:'POST',headers:{'Content-Type':'application/json',...(user?{'oai-authenticated-user-id':user}:{}),...(origin?{origin}:{})},body:JSON.stringify(body)});
 const params={params:Promise.resolve({id:'orbital-drift'})};
 assert.equal((await reportEndpoint(req(null),params)).status,403);assert.equal((await reportEndpoint(req('user','https://evil.test'),params)).status,403);
 const saved=await reportEndpoint(req('http-reporter'),params);assert.equal(saved.status,201);const id=(await saved.json()).report.id;const rp={params:Promise.resolve({id})};
 assert.equal((await receiptEndpoint(new Request('https://test/api',{headers:{'oai-authenticated-user-id':'outsider'}}),rp)).status,404);
 assert.equal((await auditEndpoint(new Request('https://test/api'),rp)).status,403);
 assert.equal((await reviewEndpoint(req('outsider',null,decision('hold')),rp)).status,403);
 assert.equal((await reviewEndpoint(req('moderator','https://evil.test',decision('hold')),rp)).status,403);
 assert.equal((await reviewEndpoint(req('moderator',null,decision('dismiss')),rp)).status,200);
});
test('mine response carries only the authenticated account identity',async()=>{
 assert.deepEqual((await cataloguePage({mine:true,userId:'creator'})).account,{userId:'creator',moderator:false});
 assert.equal((await cataloguePage({userId:'creator'})).account,undefined);
});

test('a failed moderation transaction rolls back hold and audit together',async()=>{
 const r=await submitReport('signal-garden',reportInput('rollback-hold-test-001'),'rollback-reporter');
 const original=env.DB.batch;
 env.DB.batch=statements=>original([...statements,env.DB.prepare('INSERT INTO report_usage (id,count) VALUES (?,11)').bind('forced-failure')]);
 try{await assert.rejects(reviewReport(r.id,decision('hold'),'moderator'))}finally{env.DB.batch=original}
 assert.ok(await getGame('signal-garden'));assert.equal((await reportAudit(r.id,'moderator')).length,0);assert.equal((await readReport(r.id,'rollback-reporter')).revision,0);
});
