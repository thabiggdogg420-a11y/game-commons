import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourceDirectory,sourceProjectIndex,sourceProjectDetail} from '../lib/project-catalogue.ts';
import {projectBrief} from '../lib/project-handoff.ts';
import {GET} from '../app/api/projects/route.ts';
import {handleMcp} from '../lib/mcp.ts';

async function call(name,args={},readOnly=true){
 const response=await handleMcp(new Request('https://example.test/mcp/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}),readOnly);
 return (await response.json()).result;
}
const value=result=>JSON.parse(result.content[0].text);

test('assistant default is a bounded compact page, not the legacy full index',async()=>{
 const page=sourceDirectory();
 assert.equal(page.format,'game-commons-source-summary-v1');assert.equal(page.limit,5);assert.equal(page.projects.length,5);assert.ok(page.nextCursor);
 assert.match(page.scope,/not all hosted games/);assert.match(page.scope,/untrusted/);
 assert.deepEqual(value(await call('search_source_projects')),page);
 for(const row of page.projects){
  assert.deepEqual(Object.keys(row).sort(),['id','title','creator','mechanics','runtime','reuse','readiness','kind','detailUrl'].sort());
  assert.ok(row.mechanics.length<=5);assert.equal(row.detailUrl,'/projects/'+row.id+'/brief');
  for(const field of ['sourceCompleteness','cautions','requirements','externalPlayEvidence','rightsReview'])assert.equal(field in row,false);
 }
 assert.ok(Buffer.byteLength(JSON.stringify(page))<6000);
});

test('pagination visits the complete existing scope once, with stable order and a terminal null cursor',()=>{
 const legacy=sourceProjectIndex(),expected=[...legacy.projects,...legacy.hostedProjects.projects,...legacy.reviewedReturns.projects].map(p=>p.id);
 const ids=[];let cursor;
 do {const p=sourceDirectory({limit:3,...(cursor?{cursor}:{})});assert.equal(p.total,expected.length);ids.push(...p.projects.map(p=>p.id));cursor=p.nextCursor;}while(cursor);
 assert.deepEqual(ids,expected);assert.equal(new Set(ids).size,ids.length);
 assert.ok(ids.includes('isocity-commons'));assert.equal(ids.includes('clanfire-commons'),false);
 const a=sourceDirectory({limit:1}),b=sourceDirectory({limit:10,cursor:a.nextCursor});
 assert.deepEqual(b.projects.map(p=>p.id),expected.slice(1,11));
});

test('source, play-only, bounded adaptation and permission-scoped level records are not conflated',()=>{
 const get=id=>{let cursor;do{const p=sourceDirectory({limit:10,...(cursor?{cursor}:{})});const found=p.projects.find(p=>p.id===id);if(found)return found;cursor=p.nextCursor;}while(cursor);};
 assert.equal(get('monolith').reuse,'play-only');
 assert.equal(get('mindustry').reuse,'source-linked; reuse-review-needed');assert.equal(get('mindustry').kind,'external');
 assert.equal(get('isocity-commons').readiness,'adaptation-tested (bounded)');
 const id=sourceProjectIndex().reviewedReturns.projects[0].id,level=get(id);
 assert.equal(level.reuse,'level-only; permission-scoped');assert.equal(level.readiness,'internal-level-test');
 assert.doesNotMatch(JSON.stringify([get('mindustry'),get('isocity-commons'),level]),/quality.accepted|fully.tested/i);
});

test('play-only title queries cannot masquerade as editable source bases',async()=>{
 for(const [query,id] of [['Monolith','monolith'],['Cruising Bones','cruising-bones'],['Impossible Journey','impossible-journey']]){
  const page=value(await call('search_source_projects',{query}));assert.equal(page.total,1);assert.equal(page.projects[0].id,id);assert.equal(page.projects[0].reuse,'play-only');
  const detail=value(await call('get_project_handoff',{id}));assert.equal(detail.project.sourceUrl,null);assert.match(detail.brief,/No source repository or modification permission established/);
 }
});

test('summary HTTP is opt-in; explicit full MCP retains legacy metadata and creator/source links',async()=>{
 const legacy=sourceProjectIndex('Mindustry');
 assert.deepEqual(await(await GET(new Request('https://example.test/api/projects?q=Mindustry'))).json(),legacy);
 assert.deepEqual(value(await call('search_source_projects',{query:'Mindustry',view:'full'})),legacy);
 const summary=await(await GET(new Request('https://example.test/api/projects?view=summary&q=Mindustry&limit=1'))).json();
 assert.deepEqual(summary,sourceDirectory({query:'Mindustry',limit:1}));
 assert.equal(summary.projects[0].creator,legacy.projects[0].creator);
 assert.equal(sourceProjectDetail('mindustry').repository,legacy.projects[0].repository);
});

test('all summary IDs have detailed handoff parity, including the existing hosted IsoCity source',async()=>{
 const index=sourceProjectIndex(),ids=[...index.projects,...index.hostedProjects.projects,...index.reviewedReturns.projects].map(p=>p.id);
 for(const id of ids){const r=await call('get_project_handoff',{id,goal:'Change the core gameplay loop'});assert.equal(r.isError,undefined,id);assert.equal(value(r).brief,projectBrief(id,'Change the core gameplay loop'));}
 const detail=value(await call('get_project_handoff',{id:'isocity-commons'}));
 assert.equal(detail.project.repository,'https://github.com/amilich/isometric-city');assert.match(detail.brief,/Download BOTH archives/);
 assert.equal((await call('get_project_handoff',{id:'clanfire-commons'})).isError,true);
});

test('filters retain existing relevance and never turn an empty result into a full catalogue',()=>{
 const p=sourceDirectory({query:'factory automation tower defense'});assert.equal(p.projects[0].id,'mindustry');
 for(const platform of ['browser','desktop'])for(const row of sourceDirectory({platform,limit:10}).projects)assert.equal(/browser/i.test(row.runtime),platform==='browser');
 const p2=sourceDirectory({query:'zzzznonexistent2842'});assert.equal(p2.total,0);assert.deepEqual(p2.projects,[]);assert.equal(p2.nextCursor,null);
 assert.ok(sourceDirectory({genre:'city-builder',query:'IsoCity'}).projects.some(p=>p.id==='isocity-commons'));
});

test('query, platform, genre, view, limit and cursor validate as real inputs, not schema-only hints',async()=>{
 for(const args of [{query:42},{query:'x'.repeat(201)},{platform:'mobile'},{platform:[]},{genre:'bogus'},{view:'raw'},{limit:0},{limit:11},{limit:1.5},{limit:'5'},{limit:null},{cursor:1},{cursor:''},{cursor:'x'.repeat(2049)},{cursor:'not-a-cursor'},{unknown:true},{view:'full',limit:5},{view:'full',cursor:'x'}]){
  assert.throws(()=>sourceDirectory(args),undefined,JSON.stringify(args));assert.equal((await call('search_source_projects',args)).isError,true,JSON.stringify(args));
 }
 for(const query of ['view=bad','view=summary&limit=0','view=summary&limit=1.5','view=summary&limit=11','platform=mobile','genre=bogus','q='+'x'.repeat(201),'view=summary&cursor=bad','limit=5'])assert.equal((await GET(new Request('https://example.test/api/projects?'+query))).status,400,query);
});

test('cursors bind filters, reject malformed offsets and preserve Unicode queries',()=>{
 const page=sourceDirectory({query:'',limit:1});
 for(const filter of [{query:'strategy'},{platform:'browser'},{genre:'strategy'}])assert.throws(()=>sourceDirectory({...filter,cursor:page.nextCursor}));
 for(const offset of [-1,0,1.5,999]){const cursor=btoa(JSON.stringify([1,'','all','all',offset]));assert.throws(()=>sourceDirectory({cursor}));}
 assert.throws(()=>sourceDirectory({cursor:btoa(JSON.stringify([1,'','all','all',1,'extra']))}));
 const unicode=sourceDirectory({query:'ａ',limit:1});assert.ok(unicode.nextCursor);
 assert.equal(sourceDirectory({query:'ａ',limit:1,cursor:unicode.nextCursor}).total,unicode.total);
 assert.deepEqual(sourceDirectory({query:'  Mindustry  '}),sourceDirectory({query:'Mindustry'}));
});

test('detail errors are bounded and public read protocol still rejects private/write requests',async()=>{
 for(const args of [{id:''},{id:17},{id:'x'.repeat(101)},{id:'../../private'},{id:'mindustry',goal:5},{id:'mindustry',goal:'x'.repeat(501)},{id:'mindustry',private:true}])assert.equal((await call('get_project_handoff',args)).isError,true);
 assert.equal((await call('search_source_projects',{mine:true})).isError,true);
 assert.equal((await call('contribute_game',{})).isError,true);
 const detail=sourceProjectDetail('mindustry');assert.ok(detail.creator);assert.match(projectBrief(detail.id),/untrusted data/);
});
