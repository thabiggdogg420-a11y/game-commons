import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveGame,readSource,manifest} from '../lib/repository.ts';
import {env} from './test-env.mjs';
import {GET as download} from '../app/api/games/[id]/source/route.ts';
import {GET as getManifest} from '../app/api/games/[id]/manifest/route.ts';
import {POST as mcp} from '../app/mcp/route.ts';
const input={title:'Integrity fixture',description:'A source integrity fixture for detecting damaged retained objects.',creator:'QA maker',genre:'Arcade',tags:[],controls:'Click play.',source:'<!doctype html><html><body><button>Play</button></body></html>',attribution:'Original QA fixture.',rightsConfirmed:true};
async function fixture(){const game=await saveGame(input,crypto.randomUUID());const source=await readSource(game.id);const row=await env.DB.prepare('SELECT * FROM versions WHERE game_id=?').bind(game.id).first();return {game,source,row}}
test('equal-length corruption is rejected instead of receiving a new manifest hash',async()=>{
 const {game,source,row}=await fixture();const changed=source.replace('Play','Stop');assert.equal(changed.length,source.length);await env.BUCKET.put(row.object_key,changed);
 await assert.rejects(readSource(game.id),e=>e.status===503&&/integrity/.test(e.message));await assert.rejects(manifest(game.id,'https://test'),e=>e.status===503);
 await env.BUCKET.put(row.object_key,source);assert.equal(await readSource(game.id),source);assert.equal((await manifest(game.id,'https://test')).sha256,row.sha256);
});
test('missing and truncated source fail clearly while retaining metadata',async()=>{
 const {game,source,row}=await fixture();await env.BUCKET.delete(row.object_key);
 await assert.rejects(readSource(game.id),e=>e.status===503&&/retained/.test(e.message));
 await env.BUCKET.put(row.object_key,source.slice(0,-1));await assert.rejects(readSource(game.id),e=>e.status===503);
 assert.equal((await env.DB.prepare('SELECT sha256 FROM versions WHERE game_id=?').bind(game.id).first()).sha256,row.sha256);
});
test('HTTP and assistant responses do not expose corrupted source',async()=>{
 const {game,row}=await fixture();await env.BUCKET.put(row.object_key,'DAMAGED-CONTENT-MARKER');
 const params={params:Promise.resolve({id:game.id})};
 for(const handler of [download,getManifest]){const r=await handler(new Request('https://test/api'),params);assert.equal(r.status,503);assert.ok(!(await r.text()).includes('DAMAGED-CONTENT-MARKER'))}
 const r=await mcp(new Request('https://test/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_game_source',arguments:{id:game.id}}})}));const j=await r.json();assert.equal(j.result.isError,true);assert.ok(!JSON.stringify(j).includes('DAMAGED-CONTENT-MARKER'));
});
test('an earlier intact version remains retrievable when the latest object is damaged',async()=>{
 const {game,source}=await fixture();const row=await env.DB.prepare('SELECT owner FROM games WHERE id=?').bind(game.id).first();
 await saveGame({...input,source:input.source+'<!-- second -->'},row.owner,game.id);
 const latest=await env.DB.prepare('SELECT object_key FROM versions WHERE game_id=? AND number=2').bind(game.id).first();await env.BUCKET.delete(latest.object_key);
 assert.equal(await readSource(game.id,1),source);await assert.rejects(readSource(game.id),e=>e.status===503);
});
