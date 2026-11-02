import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST,GET} from '../app/mcp/read/route.ts';
import {POST as full} from '../app/mcp/route.ts';
import {saveGame,setGameVisibility} from '../lib/repository.ts';
const request=(body,headers={})=>new Request('https://example.test/mcp/read',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const rpc=(method,params={})=>({jsonrpc:'2.0',id:1,method,params});
async function call(name,args={},headers={}){return (await (await POST(request(rpc('tools/call',{name,arguments:args}),headers))).json()).result}
test('reader exposes only catalogue and source tools, without personal collections',async()=>{
 const result=(await (await POST(request(rpc('tools/list')))).json()).result;
 assert.deepEqual(result.tools.map(t=>t.name),['search_external_catalogue','get_external_catalogue_entry','search_source_projects','get_project_handoff','search_games','get_game_manifest','get_game_source']);
 assert.equal(result.tools[0].inputSchema.properties.mine,undefined);
 for(const name of ['contribute_game','set_game_visibility'])assert.equal((await call(name,{}, {'oai-authenticated-user-id':'owner'})).isError,true);
 assert.equal((await call('search_games',{mine:true},{'oai-authenticated-user-id':'owner'})).isError,true);
 assert.ok(JSON.parse((await call('get_game_source',{id:'orbital-drift',version:1})).content[0].text).sha256);
});
test('reader never inherits owner access to withdrawn source',async()=>{
 const game=await saveGame({title:'Hidden reader fixture',description:'A fixture for read-only access to withdrawn source.',creator:'Test',genre:'Arcade',tags:[],controls:'Click play.',source:'<!doctype html><html><body>Test</body></html>',attribution:'Original fixture.',rightsConfirmed:true},'owner');
 await setGameVisibility(game.id,true,'owner');
 for(const name of ['get_game_source','get_game_manifest'])assert.equal((await call(name,{id:game.id},{'oai-authenticated-user-id':'owner'})).isError,true);
 const visible=await full(request(rpc('tools/call',{name:'get_game_source',arguments:{id:game.id}}),{'oai-authenticated-user-id':'owner'}));
 assert.ok(!(await visible.json()).result.isError);
});
test('protocol negotiation supports independent HTTP clients and rejects invalid version headers',async()=>{
 for(const version of ['2026-07-28','2025-11-25','2025-06-18','2025-03-26'])assert.equal((await (await POST(request(rpc('initialize',{protocolVersion:version})))).json()).result.protocolVersion,version);
 assert.equal((await (await POST(request(rpc('initialize',{protocolVersion:'future'})))).json()).result.protocolVersion,'2025-11-25');
 assert.equal((await POST(request(rpc('ping'),{'MCP-Protocol-Version':'invalid'}))).status,400);
 assert.equal((await GET(new Request('https://example.test/mcp/read'))).status,405);
});
test('all MCP methods reject foreign origins and accept same-origin requests',async()=>{
 for(const handler of [POST,full]){
  assert.equal((await handler(request(rpc('tools/list'),{origin:'https://evil.test'}))).status,403);
  assert.equal((await handler(request(rpc('tools/list'),{origin:'https://example.test'}))).status,200);
 }
 assert.equal((await GET(new Request('https://example.test/mcp/read',{headers:{origin:'null'}}))).status,403);
});
test('notifications return empty 202 and cannot execute tools',async()=>{
 for(const method of ['notifications/initialized','notifications/cancelled','tools/call']){
  const r=await POST(request({jsonrpc:'2.0',method,params:{name:'contribute_game'}}));assert.equal(r.status,202);assert.equal(await r.text(),'');
 }
});
test('invalid RPC envelopes and arguments fail cleanly',async()=>{
 for(const body of [{method:'ping',id:1},{jsonrpc:'2.0',method:1,id:1},rpc('ping',[]),{...rpc('ping'),id:{}}])assert.equal((await POST(request(body))).status,400);
 assert.equal((await call('search_games',[])).isError,true);
 const r=await POST(new Request('https://example.test/mcp/read',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}));assert.equal((await r.json()).error.code,-32700);
});

test("MCP display names reflect Games4Free while tool identities remain stable",async()=>{const init=rpc("initialize",{protocolVersion:"2025-11-25"});assert.equal((await (await POST(request(init))).json()).result.serverInfo.name,"Games4Free Reader");assert.equal((await (await full(request(init))).json()).result.serverInfo.name,"Games4Free");});
