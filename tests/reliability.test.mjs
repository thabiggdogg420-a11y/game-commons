import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveGame,getGame,readSource,manifest,history,setGameVisibility,cataloguePage} from '../lib/repository.ts';
import {usageFor,UPLOAD_LIMITS} from '../lib/limits.ts';
import {env} from './test-env.mjs';
import {GET as sourceEndpoint} from '../app/api/games/[id]/source/route.ts';
import {POST as visibilityEndpoint} from '../app/api/games/[id]/visibility/route.ts';
const input={title:'Reliable flight',description:'A simple flight game testing repository reliability.',creator:'Reliability studio',genre:'Arcade',tags:['reliability'],controls:'Click the button.',source:'<!doctype html><html><body><button>Play</button></body></html>',attribution:'Original test fixture.',rightsConfirmed:true,notes:'First'};

test('withdrawal protects discovery and downloads, preserves descendants, and is reversible',async()=>{
 const parent=await saveGame(input,'withdraw-owner');const before=await readSource(parent.id);
 const child=await saveGame({...input,parentId:parent.id,parentVersion:1},'remix-owner');
 await assert.rejects(setGameVisibility(parent.id,true,'stranger'),/Only the contributor/);
 const hidden=await setGameVisibility(parent.id,true,'withdraw-owner');assert.ok(hidden.withdrawnAt);
 assert.equal((await setGameVisibility(parent.id,true,'withdraw-owner')).withdrawnAt,hidden.withdrawnAt);
 assert.equal(await getGame(parent.id),null);assert.equal(await readSource(parent.id),null);assert.equal(await manifest(parent.id,'https://test'),null);assert.deepEqual(await history(parent.id),[]);
 assert.equal(await readSource(parent.id,1,'withdraw-owner'),before);
 assert.equal((await cataloguePage({query:'reliability',userId:'withdraw-owner'})).games.some(g=>g.id===parent.id),false);
 assert.equal((await cataloguePage({mine:true,userId:'withdraw-owner'})).games[0].id,parent.id);
 assert.equal((await cataloguePage({mine:true,userId:'stranger'})).games.length,0);
 const outsider=await sourceEndpoint(new Request('https://test/source',{headers:{'oai-authenticated-user-id':'stranger'}}),{params:Promise.resolve({id:parent.id})});assert.equal(outsider.status,404);
 const descendant=await manifest(child.id,'https://test');assert.equal(descendant.lineage.parentId,parent.id);
 await saveGame({...input,parentId:parent.id,parentVersion:1,notes:'Retain prior ancestry'},'remix-owner',child.id);
 assert.match(await readSource(child.id),/Based on Reliable flight/);
 const request=new Request('https://test/visibility',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'withdraw-owner'},body:JSON.stringify({withdrawn:false})});
 assert.equal((await visibilityEndpoint(request,{params:Promise.resolve({id:parent.id})})).status,200);
 assert.equal(await readSource(parent.id),before);
 await assert.rejects(setGameVisibility('orbital-drift',true,'withdraw-owner'),/Only the contributor/);
});

test('daily limits include versions, preserve safe retries and isolate accounts',async()=>{
 const firstInput={...input,submissionId:'daily-quota-first-001'};
 const first=await saveGame(firstInput,'daily-owner');
 for(let i=1;i<20;i++)await saveGame({...input,notes:'Version '+i},'daily-owner',first.id);
 assert.equal((await usageFor('daily-owner')).uploadsToday,20);
 await assert.rejects(saveGame(input,'daily-owner'),e=>e.status===429);
 assert.equal((await saveGame(firstInput,'daily-owner')).id,first.id);
 assert.equal((await usageFor('daily-owner')).uploadsToday,20);
 assert.ok(await saveGame(input,'different-owner'));
});

test('simultaneous uploads cannot exceed the final daily slot',async()=>{
 for(let i=0;i<19;i++)await saveGame({...input,title:'Concurrent '+i},'concurrent-owner');
 const results=await Promise.allSettled([saveGame({...input,title:'Concurrent A'},'concurrent-owner'),saveGame({...input,title:'Concurrent B'},'concurrent-owner')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='rejected').reason.status,429);
 assert.equal((await usageFor('concurrent-owner')).uploadsToday,20);
 const counter=await env.DB.prepare('SELECT uploads_today FROM contributor_usage WHERE owner=?').bind('concurrent-owner').first();assert.equal(counter.uploads_today,20);
});

test('total storage counts historical and withdrawn versions',async()=>{
 const game=await saveGame(input,'storage-owner');await setGameVisibility(game.id,true,'storage-owner');
 // Fixture represents an account with historical retained source filling its allowance.
 await env.DB.prepare('UPDATE versions SET bytes=? WHERE game_id=?').bind(UPLOAD_LIMITS.storedBytes,game.id).run();
 await assert.rejects(saveGame(input,'storage-owner'),e=>e.status===429&&/100 MB/.test(e.message));
 assert.equal((await usageFor('storage-owner')).storedBytes,UPLOAD_LIMITS.storedBytes);
});

test('failed persistence rolls back usage and does not create a contribution',async()=>{
 const originalBatch=env.DB.batch;env.DB.batch=async()=>{throw Error('Simulated database failure')};
 try{await assert.rejects(saveGame({...input,submissionId:'failed-persistence-001'},'failure-owner'),e=>e.status===503)}finally{env.DB.batch=originalBatch}
 assert.equal((await usageFor('failure-owner')).uploadsToday,0);
 assert.equal((await cataloguePage({mine:true,userId:'failure-owner'})).games.length,0);
 assert.ok(await saveGame({...input,submissionId:'failed-persistence-001'},'failure-owner'));
});

test('pagination reaches records beyond 500 with no duplicates and stable tied ordering',async()=>{
 const statements=[];for(let i=0;i<505;i++)statements.push(env.DB.prepare('INSERT INTO games (id,owner,title,description,creator,genre,tags,controls,license,attribution,created_at,updated_at,latest_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind('page-'+String(i).padStart(4,'0'),'page-owner','Pagination '+i,'An indexed catalogue fixture for full search.','Fixture','Puzzle','["pagination-fixture"]','Click','MIT','Test fixture','2026-01-01','2026-01-01',1));
 await env.DB.batch(statements);
 const ids=[];let cursor;do{const page=await cataloguePage({query:'pagination-fixture',genre:'Puzzle',limit:60,cursor});ids.push(...page.games.map(g=>g.id));cursor=page.nextCursor;}while(cursor);
 assert.equal(ids.length,505);assert.equal(new Set(ids).size,505);assert.equal(ids[0],'page-0000');assert.equal(ids.at(-1),'page-0504');
 const first=await cataloguePage({query:'pagination-fixture',limit:2});
 await assert.rejects(cataloguePage({query:'different',cursor:first.nextCursor}),/different search/);
 assert.equal((await cataloguePage({query:'pagination-fixture',genre:'Arcade'})).games.length,0);
});

test('bad cursors, page sizes and unauthenticated ownership queries are rejected',async()=>{
 for(const limit of [0,-1,61,1.2,NaN])await assert.rejects(cataloguePage({limit}),/Page size/);
 await assert.rejects(cataloguePage({cursor:'not-json'}),/cursor/);
 await assert.rejects(cataloguePage({cursor:btoa('null')}),/different search/);
 await assert.rejects(cataloguePage({mine:true}),e=>e.status===403);
 await assert.rejects(usageFor(''),e=>e.status===403);
 const page=await cataloguePage({query:"xqz'); DROP TABLE games; --"});assert.equal(page.games.length,0);
 assert.ok((await cataloguePage()).games.length>0);
});
