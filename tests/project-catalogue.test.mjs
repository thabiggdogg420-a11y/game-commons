import{test}from'node:test';import assert from'node:assert/strict';
import{sourceProjects,sourceProjectIndex}from'../lib/project-catalogue.ts';
import{checkGithub,githubRepo,savedGithub}from'../lib/github-project.ts';
import{GET as catalogue}from'../app/api/projects/route.ts';
import{GET as brief}from'../app/projects/[id]/brief/route.ts';
import{handleMcp}from'../lib/mcp.ts';
test('catalogue search and platform filters preserve external source and handoff metadata',async()=>{
 assert.equal(sourceProjects('MINDUSTRY')[0].id,'mindustry');assert.equal(sourceProjects('factory Java')[0].id,'shapez');assert.ok(sourceProjects('','browser').every(p=>/browser/i.test(p.platform)));assert.ok(sourceProjects('','desktop').every(p=>!/browser/i.test(p.platform)));assert.equal(sourceProjects('zzzznonexistent2842').length,0);
 const d=await(await catalogue(new Request('https://example.test/api/projects?q=Warzone'))).json();assert.equal(d.total,1);assert.equal(d.hosting,'external');assert.equal(d.projects[0].archiveUrl,null);assert.match(d.projects[0].sourceCompleteness,/submodules/);assert.equal(d.projects[0].handoffUrl,'/projects/warzone2100/brief');
 for(const p of sourceProjectIndex().projects){if(p.commit!==null)assert.match(p.commit,/^[a-f0-9]{40}$/);else {assert.ok(['official-source-unpinned','official-play-link-no-open-license'].includes(p.sourceStatus));assert.equal(p.archiveUrl,null)} if(!('sourceStatus' in p))assert.ok(savedGithub(p.id));}
});
test('GitHub reads only reviewed repositories and rejects identity mismatch without replacing pinned sources',async()=>{
 let calls=0;assert.equal(githubRepo('../../private'),null);assert.equal(await checkGithub('https://evil.test',async()=>{calls++;throw Error()}),null);assert.equal(calls,0);
 const project=sourceProjects('Mindustry')[0],commit=project.commit;
 const result=await checkGithub('mindustry',async(url,options)=>{calls++;assert.equal(url,'https://api.github.com/repos/Anuken/Mindustry');assert.equal(options.redirect,'manual');return Response.json({full_name:'Anuken/Mindustry',private:false,stargazers_count:123,forks_count:7,archived:false,default_branch:'master',pushed_at:'2026-10-19T00:00:00Z',license:{spdx_id:'GPL-3.0'}})});
 assert.equal(result.source,'github');assert.equal(result.github.stars,123);assert.equal(project.commit,commit);
 const wrong=await checkGithub('mindustry',async()=>Response.json({full_name:'someone/else',private:false}));assert.equal(wrong.source,'saved-snapshot');assert.equal(wrong.github.fullName,'Anuken/Mindustry');
});
test('GitHub rate limits and transport failures retain useful saved metadata',async()=>{
 for(const fetcher of [async()=>new Response('rate limited',{status:403}),async()=>{throw Error('offline')}]){const r=await checkGithub('mindustry',fetcher);assert.equal(r.source,'saved-snapshot');assert.ok(r.github.checkedAt);assert.match(r.message,/play links and remix handoffs still work/);}
});
test('custom remix goal travels with downloaded pinned source and cannot exceed the request limit',async()=>{
 const r=await brief(new Request('https://example.test/projects/mindustry/brief?goal='+encodeURIComponent('Make a cooperative defense mission.')),{params:Promise.resolve({id:'mindustry'})});const text=await r.text();assert.match(text,/MY CHANGE REQUEST\nMake a cooperative defense mission/);assert.match(text,/Anuken/);assert.match(text,/GPL-3.0/);
 const long=await brief(new Request('https://example.test/projects/mindustry/brief?goal='+'x'.repeat(501)),{params:Promise.resolve({id:'mindustry'})});assert.equal(long.status,400);
});
test('public MCP discovers external projects and returns source handoffs without granting writes',async()=>{
 async function call(name,args){const r=await handleMcp(new Request('https://example.test/mcp/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}),true);return(await r.json()).result;}
 const search=JSON.parse((await call('search_source_projects',{query:'Mindustry'})).content[0].text);assert.equal(search.projects[0].id,'mindustry');
 const handoff=JSON.parse((await call('get_project_handoff',{id:'mindustry',goal:'A new mission'})).content[0].text);assert.match(handoff.brief,/A new mission/);assert.equal(handoff.project.repository,'https://github.com/Anuken/Mindustry');assert.equal((await call('get_project_handoff',{id:'missing'})).isError,true);assert.equal((await call('get_project_handoff',{id:'mindustry',goal:'x'.repeat(501)})).isError,true);
});
test('commercial-game bridges stay separate from complete reusable game results',()=>{
 const d=sourceProjectIndex('Mario');assert.equal(d.total,0);assert.equal(d.modReferences.projects.length,1);assert.match(d.modReferences.projects[0].requiredGames,/your own/i);assert.match(d.modReferences.scope,/not complete openly licensed games/);assert.equal(sourceProjectIndex('','browser').modReferences.projects.length,0);
});

test('advertised reusable surfaces are discoverable without changing their facts',()=>{
 const hex=sourceProjects('Hex movement and turn order');assert.equal(hex[0].id,'ancient-beast');assert.ok(hex[0].remixSurfaces.includes('Hex movement and turn order'));
 const resource=sourceProjects('resource');assert.ok(resource.some(p=>p.id==='mindustry'&&p.remixSurfaces.includes('Resource production')));
});
test('mixed mechanic requests rank useful partial source bases rather than requiring a single complete match',()=>{
 const factory=sourceProjects('factory automation tower defense');assert.equal(factory[0].id,'mindustry');assert.ok(factory.some(p=>p.id==='shapez'));
 const crossover=sourceProjects('3D ship upgrades and tactical class abilities');
 for(const id of ['endless-sky','tactical-slash'])assert.ok(crossover.some(p=>p.id===id),id);
 assert.equal(crossover[0].id,'tactical-slash');
 for(const p of crossover){if(p.commit)assert.match(p.commit,/^[a-f0-9]{40}$/);else assert.ok(p.sourceStatus);assert.ok(p.verification);assert.ok(p.integrationNote);}
});
test('natural request punctuation and repeated words preserve ranking and platform filters',()=>{
 const ids=(q,platform)=>sourceProjects(q,platform).map(p=>p.id);
 assert.deepEqual(ids('I want a game with factory automation and tower defense'),ids('factory automation tower defense'));
 assert.deepEqual(ids('factory, automation; tower-defense!'),ids('factory automation tower defense'));
 assert.deepEqual(ids('factory factory automation'),ids('factory automation'));
 for(const platform of ['browser','desktop'])for(const p of sourceProjects('3D ship upgrades and tactical class abilities',platform))assert.equal(/browser/i.test(p.platform),platform==='browser');
 assert.deepEqual(ids(''),sourceProjectIndex().projects.map(p=>p.id));
 assert.equal(sourceProjects('zzzznonexistent2842').length,0);
 assert.equal(sourceProjects('factory Java')[0].id,'shapez');
 assert.ok(sourceProjects('tactical').some(p=>p.id==='ancient-beast'));assert.ok(sourceProjects('tactical').some(p=>p.id==='tactical-slash'));
});
test('legacy HTTP and explicit full MCP expose the same ranked source candidates and handoff contract',async()=>{
 const query='factory automation tower defense',expected=sourceProjects(query).map(p=>p.id);
 const http=await(await catalogue(new Request('https://example.test/api/projects?q='+encodeURIComponent(query)))).json();
 const response=await handleMcp(new Request('https://example.test/mcp/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_source_projects',arguments:{query,view:'full'}}})}),true);
 const mcp=JSON.parse((await response.json()).result.content[0].text);
 for(const result of [http,mcp]){assert.deepEqual(result.projects.map(p=>p.id),expected);assert.equal(result.total,expected.length);assert.equal(result.hosting,'external');for(const p of result.projects){assert.equal(p.handoffUrl,'/projects/'+p.id+'/brief');assert.ok(p.sourceUrl.includes(p.commit));}}
});
