// Independent HTTP smoke test. No SDK, browser session, or injected user identity.
// The public reader requires no token or visitor identity.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const endpoint='https://game-commons-captain.thabiggdogg420.chatgpt.site/mcp/read';
let id=0;let stage="initialize";
async function rpc(method,params={},notification=false){
 stage=method==='tools/call'?String(params.name):method;
 const r=await fetch(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-11-25'},body:JSON.stringify({jsonrpc:'2.0',...(notification?{}:{id:++id}),method,params})});
 assert.equal(r.status,notification?202:200,`Unexpected HTTP status ${r.status}`);
 if(notification){assert.equal(await r.text(),'');return}
 assert.match(r.headers.get('content-type')||'',/application\/json/);
 const body=await r.json();assert.equal(body.jsonrpc,'2.0');assert.equal(body.id,id);assert.ok(!body.error,'RPC error');return body.result;
}
async function tool(name,args){const result=await rpc('tools/call',{name,arguments:args});assert.ok(!result.isError,`Tool failed: ${name}`);return JSON.parse(result.content[0].text)}
try{
 const init=await rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'game-commons-independent-probe',version:'1.0.0'}});
 assert.equal(init.protocolVersion,'2025-11-25');
 await rpc('notifications/initialized',{},true);
 const list=await rpc('tools/list');assert.deepEqual(list.tools.map(t=>t.name),['search_games','get_game_manifest','get_game_source']);
 const found=await tool('search_games',{query:'rescue',limit:1});assert.ok(found.games.length);
 const manifest=await tool('get_game_manifest',{id:found.games[0].id});
 const source=await tool('get_game_source',{id:found.games[0].id,version:manifest.version});
 const hash=createHash('sha256').update(source.source).digest('hex');assert.equal(hash,manifest.sha256);
 for(const name of ['contribute_game','set_game_visibility'])assert.equal((await rpc('tools/call',{name,arguments:{}})).isError,true);
 assert.equal((await rpc('tools/call',{name:'search_games',arguments:{mine:true}})).isError,true);
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),endpoint,client:'Independent Node HTTP probe (not Claude)',serverVersion:init.serverInfo.version,protocol:init.protocolVersion,tools:list.tools.map(t=>t.name),gameId:found.games[0].id,gameVersion:manifest.version,sha256:hash,sourceHashMatches:true,writeToolsRejected:true,personalCollectionRejected:true},null,2));
}catch(error){const detail=error?.code==='ERR_ASSERTION'?error.message.startsWith('Unexpected HTTP status')?error.message.split('\n')[0]:'Unexpected protocol response':error?.name==='TimeoutError'?'Request timed out':'Connection failed';console.error(`MCP check failed at ${stage}: ${detail}. No credential or response body has been logged.`);process.exitCode=1}
