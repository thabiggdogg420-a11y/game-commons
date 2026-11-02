import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const endpoint = new URL(process.env.GC_MCP_URL || 'https://game-commons-captain.thabiggdogg420.chatgpt.site/mcp/read');
const origin = endpoint.origin;
const client = new Client({name:'game-commons-sdk-acceptance',version:'1.0.0'}, {capabilities:{}});
const requests=[];
const transport = new StreamableHTTPClientTransport(endpoint, {fetch:async(url,init)=>{
 const r=await fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(30000)});
 requests.push({method:init?.method||'GET',status:r.status}); return r;
}});
function unpack(result){assert.ok(!result.isError,JSON.stringify(result));return JSON.parse(result.content.find(c=>c.type==='text').text)}
async function call(name,args){return unpack(await client.callTool({name,arguments:args}))}
try {
 await client.connect(transport);
 const {tools}=await client.listTools();
 const names=tools.map(t=>t.name);
 for(const name of ['search_source_projects','get_project_handoff','search_games','get_game_manifest','get_game_source'])assert.ok(names.includes(name));
 for(const name of ['contribute_game','set_game_visibility'])assert.ok(!names.includes(name));
 assert.ok(tools.every(t=>t.annotations?.readOnlyHint));
 const search=await call('search_source_projects',{query:'city',platform:'all',genre:'all',limit:5});
 assert.ok(search.projects.length,'City discovery returns candidates');
 const first=search.projects[0];
 const detail=await call('get_project_handoff',{id:first.id,goal:'Use this as the starting point for a small city game with different rules.'});
 assert.equal(detail.project.id,first.id); assert.ok(detail.brief);
 const compact=search.format==='game-commons-source-summary-v1';
 if(process.env.REQUIRE_COMPACT==='1')assert.ok(compact,'Compact release must be active');
 if(compact){assert.ok(search.projects.length<=5);assert.equal(search.limit,5);for(const row of search.projects){for(const key of ['id','title','creator','mechanics','runtime','reuse','readiness','detailUrl'])assert.ok(key in row);assert.ok(!('brief' in row));}}
 const http=await fetch(new URL(compact?'/api/projects?q=city&view=summary&limit=5':'/api/projects?q=city',origin),{signal:AbortSignal.timeout(30000)}).then(r=>r.json());
 const httpIds=new Set(http.projects.map(p=>p.id));
 assert.ok(search.projects.every(p=>httpIds.has(p.id)),'MCP candidates match HTTP catalogue');
 let compactChecks=null;
 if(compact){
  assert.deepEqual(search.projects.map(p=>p.id),http.projects.map(p=>p.id));
  const page1=await call('search_source_projects',{limit:1});assert.equal(page1.projects.length,1);assert.ok(page1.nextCursor);
  const page2=await call('search_source_projects',{limit:1,cursor:page1.nextCursor});assert.equal(page2.projects.length,1);assert.notEqual(page1.projects[0].id,page2.projects[0].id);
  assert.equal((await client.callTool({name:'search_source_projects',arguments:{query:'changed-filter',limit:1,cursor:page1.nextCursor}})).isError,true);
  const iso=await call('get_project_handoff',{id:'isocity-commons'});assert.equal(iso.project.id,'isocity-commons');assert.ok(iso.brief);
  const full=await call('search_source_projects',{query:'city',view:'full'});assert.equal(full.format,'game-commons-source-catalogue-v1');
  compactChecks={pagination:true,filterBoundCursor:true,isocityDetail:true,explicitFullFallback:true};
 }
 const unknown=await client.callTool({name:'get_project_handoff',arguments:{id:'no-such-game'}});assert.equal(unknown.isError,true);
 for(const name of ['contribute_game','set_game_visibility'])assert.equal((await client.callTool({name,arguments:{}})).isError,true);
 assert.equal((await client.callTool({name:'search_games',arguments:{mine:true}})).isError,true);
 for(const [headers,status] of [[{'Origin':'https://untrusted.example'},403],[{'MCP-Protocol-Version':'invalid'},400]]){
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...headers},body:JSON.stringify({jsonrpc:'2.0',id:99,method:'ping'}),signal:AbortSignal.timeout(30000)});assert.equal(r.status,status);
 }
 const report={testMode:process.env.GC_TEST_MODE||'live HTTP',transportGuards:true,checkedAt:new Date().toISOString(),endpoint:endpoint.href,client:'Official @modelcontextprotocol/sdk 1.32.2 StreamableHTTPClientTransport (not a Claude session)',server:client.getServerVersion(),tools:names,searchFormat:search.format,searchBytes:Buffer.byteLength(JSON.stringify(search)),searchIds:search.projects.map(p=>p.id),detailId:detail.project.id,detailHasBrief:true,httpCatalogueParity:true,compactChecks,readOnlyGuards:true,requests};
 console.log(JSON.stringify(report,null,2));
} finally {await client.close()}
