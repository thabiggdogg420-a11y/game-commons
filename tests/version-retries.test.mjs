import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveGame,history,readSource} from '../lib/repository.ts';
import {usageFor} from '../lib/limits.ts';
import {POST} from '../app/api/games/[id]/versions/route.ts';
import {env} from './test-env.mjs';
const original={title:'Version retry fixture',description:'A playable fixture for verifying safe source version retries.',creator:'QA maker',genre:'Arcade',tags:['qa'],controls:'Click Play.',source:'<!doctype html><html><body><button>Play</button></body></html>',attribution:'Original QA fixture.',rightsConfirmed:true};
const update=(submissionId)=>({...original,submissionId,source:original.source+'<!-- version two -->',notes:'Second source version'});
async function post(id,input,user){return POST(new Request('https://test/api/games/'+id+'/versions',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':user},body:JSON.stringify(input)}),{params:Promise.resolve({id})})}
test('lost HTTP response can be retried without duplicating a version or usage',async()=>{
 const user='http-retry',g=await saveGame(original,user),input=update('version-http-retry-001');
 const first=await post(g.id,input,user);assert.equal(first.status,201); // Discard the response as if the connection was lost.
 const second=await post(g.id,input,user);assert.equal(second.status,201);const {game}=await second.json();
 assert.equal(game.savedVersion,2);assert.equal(game.latestVersion,2);assert.equal((await history(g.id)).length,2);
 assert.equal((await usageFor(user)).uploadsToday,2);assert.match(await readSource(g.id,2),/version two/);
 assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM version_submissions WHERE game_id=?').bind(g.id).first()).n,1);
});
test('version endpoint requires a retry key and rejects reuse with changed content',async()=>{
 const user='conflict-retry',g=await saveGame(original,user),input=update('version-conflict-retry-001');
 assert.equal((await post(g.id,{...input,submissionId:undefined},user)).status,400);
 await saveGame(input,user,g.id);
 for(const change of [{notes:'Different notes'},{source:input.source+'<!-- changed -->'}])assert.equal((await post(g.id,{...input,...change},user)).status,409);
 assert.equal((await history(g.id)).length,2);assert.equal((await usageFor(user)).uploadsToday,2);
});
test('delayed retry identifies the saved version without rolling back later work',async()=>{
 const user='late-retry',g=await saveGame(original,user),input=update('version-late-retry-001');
 await saveGame(input,user,g.id);await saveGame({...input,submissionId:'version-late-retry-002',source:input.source+'<!-- third -->'},user,g.id);
 const retry=await saveGame(input,user,g.id);assert.equal(retry.savedVersion,2);assert.equal(retry.latestVersion,3);
 assert.equal((await history(g.id)).length,3);assert.match(await readSource(g.id),/third/);
});
test('retry keys cannot be reassigned to another game or used to bypass ownership',async()=>{
 const user='scope-retry',g=await saveGame(original,user),other=await saveGame(original,user),input=update('version-scope-retry-001');
 await saveGame(input,user,g.id);await assert.rejects(saveGame(input,user,other.id),e=>e.status===409);
 await assert.rejects(saveGame(input,'outsider',g.id),/Only the contributor/);
 assert.equal((await history(other.id)).length,1);
});
test('an already saved version retries successfully at the daily quota',async()=>{
 const user='quota-retry',g=await saveGame(original,user),input=update('version-quota-retry-001');
 await saveGame(input,user,g.id);
 for(let i=0;i<18;i++)await saveGame({...input,submissionId:'version-quota-fill-'+i,notes:'Fill '+i},user,g.id);
 assert.equal((await usageFor(user)).uploadsToday,20);assert.equal((await saveGame(input,user,g.id)).savedVersion,2);
 assert.equal((await history(g.id)).length,20);assert.equal((await usageFor(user)).uploadsToday,20);
});
test('failed version transaction rolls back the receipt and permits an exact retry',async()=>{
 const user='rollback-retry',g=await saveGame(original,user),input=update('version-rollback-retry-001'),batch=env.DB.batch;
 env.DB.batch=statements=>batch([...statements,env.DB.prepare('INSERT INTO report_usage (id,count) VALUES (?,11)').bind('force-version-failure')]);
 try{await assert.rejects(saveGame(input,user,g.id))}finally{env.DB.batch=batch}
 assert.equal((await history(g.id)).length,1);assert.equal((await usageFor(user)).uploadsToday,1);
 assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM version_submissions WHERE game_id=?').bind(g.id).first()).n,0);
 assert.equal((await saveGame(input,user,g.id)).savedVersion,2);assert.equal((await history(g.id)).length,2);
});
