import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {saveGame,listGames,readSource,history,manifest,getGame} from '../lib/repository.ts';
import {POST as mcp} from '../app/mcp/route.ts';
import {POST as upload} from '../app/api/games/route.ts';
import {GET as sourceEndpoint} from '../app/api/games/[id]/source/route.ts';
const input={title:'Test flight',description:'A simple space game for verifying the repository handoff.',creator:'Test contributor',genre:'Arcade',tags:['space','testing'],controls:'Click start.',source:'<!doctype html><html><body><button>Start</button></body></html>',attribution:'Original test code, no assets.',rightsConfirmed:true,notes:'Initial'};
test('upload, discover, manifest, download, version, and credited remix round trip',async()=>{
const created=await saveGame(input,'owner');assert.ok(created?.id);assert.equal(created.latestVersion,1);
assert.equal((await listGames('testing'))[0].id,created.id);
assert.equal((await getGame(created.id,'owner')).canEdit,true);assert.equal((await getGame(created.id,'other')).canEdit,false);
const source=await readSource(created.id);assert.match(source,/MIT License/);
const m=await manifest(created.id,'https://example.test');assert.equal(m.sha256,createHash('sha256').update(source).digest('hex'));
const download=await sourceEndpoint(new Request('https://example.test/api/source?download=1'),{params:Promise.resolve({id:created.id})});assert.match(download.headers.get('Content-Disposition'),/attachment/);assert.equal(await download.text(),source);
await assert.rejects(saveGame(input,'other',created.id),/Only the contributor/);
await saveGame({...input,source:input.source+'<!-- version 2 -->',notes:'Second'},'owner',created.id);assert.equal((await history(created.id)).length,2);assert.equal(await readSource(created.id,1),source);assert.match(await readSource(created.id,2),/version 2/);
const remix=await saveGame({...input,title:'Remixed flight',parentId:created.id,parentVersion:1},'other');assert.equal(remix.parentVersion,1);assert.match(remix.attribution,/Based on Test flight/);assert.match(await readSource(remix.id),/Test contributor/);
});
test('all starter download hashes match manifests',async()=>{for(const id of ['orbital-drift','signal-garden','pocket-orchard']){const m=await manifest(id,'https://example.test');const r=await sourceEndpoint(new Request('https://example.test?download=1'),{params:Promise.resolve({id})});assert.equal(m.sha256,createHash('sha256').update(await r.text()).digest('hex'));}});
test('HTTP upload requires identity',async()=>assert.equal((await upload(new Request('https://example.test/api/games',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}))).status,403));
test('MCP discovers, lists, searches and retrieves',async()=>{async function call(method,params={}){const r=await mcp(new Request('https://example.test/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}));return r.json()}assert.ok((await call('server/discover')).result.supportedVersions.length);assert.equal((await call('tools/list')).result.tools.length,9);const r=await call('tools/call',{name:'search_games',arguments:{query:'farming'}});assert.equal(JSON.parse(r.result.content[0].text).games[0].id,'pocket-orchard');const s=await call('tools/call',{name:'get_game_source',arguments:{id:'signal-garden'}});assert.match(JSON.parse(s.result.content[0].text).source,/Signal Garden/);assert.equal((await call('tools/call',{name:'get_game_manifest',arguments:{id:'missing'}})).result.isError,true)});

async function tool(name,args,user='assistant-owner',origin){
 const headers={'Content-Type':'application/json'};if(user)headers['oai-authenticated-user-id']=user;if(origin)headers.origin=origin;
 const r=await mcp(new Request('https://example.test/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:7,method:'tools/call',params:{name,arguments:args}})}));
 return (await r.json()).result;
}
test('assistant contributes a pinned remix, retries safely, then retrieves identical source',async()=>{
 const original=JSON.parse((await tool('get_game_source',{id:'orbital-drift',version:1})).content[0].text);
 const args={...input,submissionId:'round-trip-remix-001',title:'Assistant remix',parentId:original.game.id,parentVersion:original.version,source:original.source+'<!-- modified by test -->'};
 const first=await tool('contribute_game',args);assert.ok(!first.isError);
 const saved=JSON.parse(first.content[0].text);assert.equal(saved.game.parentVersion,1);
 const retry=JSON.parse((await tool('contribute_game',args)).content[0].text);assert.equal(retry.game.id,saved.game.id);
 assert.equal((await history(saved.game.id)).length,1);
 const returned=JSON.parse((await tool('get_game_source',{id:saved.game.id})).content[0].text);
 assert.match(returned.source,/modified by test/);assert.match(returned.source,/Copyright \(c\) 2026 Game Commons/);
 assert.equal(returned.sha256,createHash('sha256').update(returned.source).digest('hex'));
 const conflict=await tool('contribute_game',{...args,title:'Different remix'});assert.equal(conflict.isError,true);assert.match(conflict.content[0].text,/different content/);
 const other=JSON.parse((await tool('contribute_game',args,'second-owner')).content[0].text);assert.notEqual(other.game.id,saved.game.id);
});
test('assistant write rejects missing identity, missing rights and invalid parents',async()=>{
 const args={...input,submissionId:'permissions-test-01'};
 for(const [payload,user,origin] of [[args,null],[{...args,rightsConfirmed:false},'owner'],[{...args,parentId:'orbital-drift'},'owner'],[{...args,parentId:'orbital-drift',parentVersion:999},'owner']])assert.equal((await tool('contribute_game',payload,user,origin)).isError,true);
});
test('remix without copied source still receives all ancestor copyright notices',async()=>{
 const parent=await saveGame({...input,creator:'Original Maker'},'ancestor-owner');
 const child=await saveGame({...input,creator:'Second Maker',parentId:parent.id,parentVersion:1},'child-owner');
 const grandchild=await saveGame({...input,creator:'Third Maker',parentId:child.id,parentVersion:1},'third-owner');
 const source=await readSource(grandchild.id);for(const name of ['Original Maker','Second Maker','Third Maker'])assert.ok(source.includes('Copyright (c) 2026 '+name));
});
test('MCP rejects invalid version numbers and supports manifest version pins',async()=>{
 for(const version of [0,-1,1.5,'1'])assert.equal((await tool('get_game_source',{id:'orbital-drift',version})).isError,true);
 assert.equal((await tool('get_game_manifest',{id:'orbital-drift',version:2})).isError,true);
 const m=JSON.parse((await tool('get_game_manifest',{id:'orbital-drift',version:1})).content[0].text);assert.equal(m.version,1);
});
