import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {env} from './test-env.mjs';
import {validateExternalEntry,externalCataloguePage,externalCatalogueEntry,ingestExternalCatalogue} from '../lib/external-catalogue.ts';
import {GET} from '../app/api/external-catalogue/route.ts';
import {POST} from '../app/api/moderation/external-catalogue/route.ts';
import {handleMcp} from '../lib/mcp.ts';
// Synthetic records exercise storage transitions without bundling a historical import.
const dataset=Array.from({length:36},(_,i)=>({id:'external-'+i.toString(16).padStart(20,'0'),title:'Racing example '+i,creator:'Example creator',genres:['Racing'],platforms:['browser','desktop'],engine:['JavaScript'],links:{official:'https://example.org/game/'+i,source:null,play:null,download:null},access:'free-reported',sourceStatus:'unknown',licenseClaims:[],contentRequirement:i%3===0?'commercial':i%3===1?'free':'open',upstreamStatus:null,upstreamDevelopment:null,verification:'metadata-only',remixPermission:'not-reviewed',metadataAttribution:'Synthetic test metadata',metadataLicense:'CC-BY-4.0',provenance:[{catalogue:'Synthetic examples',url:'https://example.org/catalogue',revision:null,retrievedAt:'2026-01-01'}]}));
globalThis.fetch=async()=>new Response(null,{status:503});
env.MODERATOR_USER_IDS='["test-moderator"]';
const generation='catalogue-'+ 'a'.repeat(32);
const ingest=body=>ingestExternalCatalogue({generation,...body},'test-moderator');
async function mcp(name,args={}){const r=await handleMcp(new Request('https://example.test/mcp/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})}),true);return (await r.json()).result}

test('dataset validates and imported permissions cannot masquerade as verified',()=>{
 for(const p of dataset)assert.equal(validateExternalEntry(p),p);
 for(const patch of [{verification:'tested'},{remixPermission:'granted'},{privateEmail:'x@example.com'},{links:{...dataset[0].links,source:'http://127.0.0.1/a'}}])assert.throws(()=>validateExternalEntry({...dataset[0],...patch}));
});
test('empty index is explicit and writes require existing moderator; read endpoint cannot import',async()=>{
 assert.equal((await externalCataloguePage()).available,false);
 await assert.rejects(()=>ingestExternalCatalogue({action:'begin',generation,expected:1},'not-moderator'));
 assert.equal((await POST(new Request('https://example.test/api/moderation/external-catalogue',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}))).status,401);
 assert.equal((await mcp('ingest_external_catalogue',{action:'begin'})).isError,true);
});
test('real imported records stage in bounded idempotent chunks, invisible until complete activation',async()=>{
 await ingest({action:'begin',expected:dataset.length});
 const prepare=env.DB.prepare;let began=[];env.DB.prepare=q=>{began.push(q);return prepare(q)};await ingest({action:'begin',expected:dataset.length});env.DB.prepare=prepare;assert.equal(began.length,1);assert.match(began[0],/^SELECT/);
 const batch=env.DB.batch;let batches=0;env.DB.batch=statements=>{batches++;assert.ok(statements.length<=30);return batch(statements)};
 await ingest({action:'chunk',records:dataset.slice(0,10)});const writes=batches;
 const replay=await ingest({action:'chunk',records:dataset.slice(0,10)});assert.equal(replay.alreadyPresent,10);assert.equal(batches,writes);
 await assert.rejects(()=>ingest({action:'chunk',records:[{...dataset[0],title:'changed'}]}));
 assert.equal((await ingest({action:'status'})).loaded,10);assert.equal((await externalCataloguePage()).available,false);await assert.rejects(()=>ingest({action:'activate'}));
 for(let i=10;i<dataset.length;i+=10)await ingest({action:'chunk',records:dataset.slice(i,i+10)});
 env.DB.batch=batch;assert.equal((await ingest({action:'status'})).loaded,dataset.length);assert.equal((await ingest({action:'activate'})).state,'active');
 await assert.rejects(()=>ingest({action:'chunk',records:dataset.slice(0,1)}));
});
test('default excludes commercial/unknown requirements; full catalogue count is honest',async()=>{
 const page=await externalCataloguePage();assert.equal(page.available,true);assert.equal(page.content,'free-open');assert.equal(page.total,dataset.filter(x=>['free','open'].includes(x.contentRequirement)).length);
 assert.ok(page.projects.every(p=>['free','open'].includes(p.contentRequirement)&&p.verification==='metadata-only'&&p.remixPermission==='not-reviewed'&&p.licenseStatus==='upstream-claims-not-verified'));
 assert.equal((await externalCataloguePage({content:'all'})).total,dataset.length);
 assert.equal((await externalCataloguePage({content:'commercial'})).total,dataset.filter(x=>x.contentRequirement==='commercial').length);
});
test('human HTTP and MCP share exact response, provenance and bounded paging',async()=>{
 const options={query:'racing',content:'all',limit:5};const api=await(await GET(new Request('https://example.test/api/external-catalogue?q=racing&content=all&limit=5'))).json();
 const tool=await mcp('search_external_catalogue',options);assert.ok(!tool.isError);assert.deepEqual(JSON.parse(tool.content[0].text),api);assert.ok(api.projects.length);assert.ok(api.projects.length<=5);
 const detail=await externalCatalogueEntry(api.projects[0].id);assert.equal(detail.project.verification,'metadata-only');assert.ok(detail.project.provenance.length);assert.ok(detail.project.metadataAttribution);
});
test('keyset pages cover all imported IDs exactly once, filters and generations bind cursor',async()=>{
 const ids=[];let cursor;do{const p=await externalCataloguePage({content:'all',limit:24,...(cursor?{cursor}:{})});ids.push(...p.projects.map(x=>x.id));cursor=p.nextCursor;}while(cursor);
 assert.equal(ids.length,dataset.length);assert.equal(new Set(ids).size,dataset.length);
 const p=await externalCataloguePage({limit:1});assert.ok(p.nextCursor);
 for(const changes of [{query:'different'},{platform:'browser'},{content:'all'},{genre:'racing'}])await assert.rejects(()=>externalCataloguePage({limit:1,cursor:p.nextCursor,...changes}));
 await assert.rejects(()=>externalCataloguePage({cursor:'not-valid'}));await assert.rejects(()=>externalCataloguePage({limit:100}));
});
test('existing curated source catalogue fallback still works',async()=>{
 const r=await mcp('search_source_projects',{query:'city'});assert.ok(!r.isError);const p=JSON.parse(r.content[0].text);assert.equal(p.format,'game-commons-source-summary-v1');assert.ok(p.projects.length);assert.ok(!p.projects.some(x=>x.id==='isocity-commons'));
});
test('atomic replacement, stale cursor rejection and explicit rollback retain original catalogue',async()=>{
 const old=await externalCataloguePage({limit:1}),other='catalogue-'+ 'b'.repeat(32),sample=dataset.find(p=>p.contentRequirement==='open');
 await ingestExternalCatalogue({action:'begin',generation:other,expected:1},'test-moderator');
 const batch=env.DB.batch;env.DB.batch=async statements=>batch([...statements,env.DB.prepare('INSERT INTO no_such_table VALUES (1)')]);
 await assert.rejects(()=>ingestExternalCatalogue({action:'chunk',generation:other,records:[sample]},'test-moderator'));env.DB.batch=batch;
 assert.equal((await ingestExternalCatalogue({action:'status',generation:other},'test-moderator')).loaded,0);
 await ingestExternalCatalogue({action:'chunk',generation:other,records:[sample]},'test-moderator');assert.equal((await externalCataloguePage({content:'all'})).total,dataset.length);
 await ingestExternalCatalogue({action:'activate',generation:other},'test-moderator');assert.equal((await externalCataloguePage({content:'all'})).total,1);
 await assert.rejects(()=>externalCataloguePage({cursor:old.nextCursor,limit:1}));
 await ingest({action:'rollback'});assert.equal((await externalCataloguePage({content:'all'})).total,dataset.length);
});
test('query parameter bounds, hostile strings, bounded D1 statements and local storage measurement',async()=>{
 const original=env.DB.prepare;let maxParameters=0,queryCount=0,seen=[];
 env.DB.prepare=q=>{queryCount++;seen.push(q);const st=original(q),bind=st.bind.bind(st);st.bind=(...args)=>{maxParameters=Math.max(maxParameters,args.length);assert.ok(args.length<=100);return bind(...args)};return st;};
 await externalCataloguePage({query:"racing' OR 1=1 --",content:'all',limit:24});assert.ok(queryCount<=3);assert.ok(maxParameters<20);env.DB.prepare=original;
 const terms=await env.DB.prepare('SELECT COUNT(*) AS count FROM external_terms').first(),pages=await env.DB.prepare('PRAGMA page_count').first(),size=await env.DB.prepare('PRAGMA page_size').first();
 const plan=await env.DB.prepare('EXPLAIN QUERY PLAN SELECT id FROM external_terms WHERE generation=? AND term=?').bind(generation,'racing').all();assert.ok(plan.results.some(r=>/INDEX/i.test(r.detail)));
 console.log(JSON.stringify({datasetRecords:dataset.length,defaultFreeOpenReported:dataset.filter(p=>['free','open'].includes(p.contentRequirement)).length,totalTermRowsIncludingRetainedGeneration:terms.count,localSQLiteAllocatedBytes:pages.page_count*size.page_size,searchQueries:queryCount,maxBoundParameters:maxParameters,indexPlan:plan.results.map(r=>r.detail)}));
});
test('actual human section renders same index with honest counts and commercial warnings',async()=>{
 const {compileSsrModule}=await import('./ssr-module.mjs'),{mkdtempSync,rmSync}=await import('node:fs'),{resolve}=await import('node:path'),{renderToStaticMarkup}=await import('react-dom/server');
 const dir=mkdtempSync(resolve('.external-section-test-'));
 try{const {ExternalCatalogueSection}=await import(compileSsrModule(new URL('../components/external-catalogue-section.tsx',import.meta.url),dir));
 const defaultHTML=renderToStaticMarkup(await ExternalCatalogueSection({params:{externalSort:'relevance'},path:'/'}));assert.ok(defaultHTML.includes('matching project listings'));assert.ok(defaultHTML.includes('gc-cards'));assert.ok(defaultHTML.includes('metadata')||defaultHTML.includes('Metadata'));assert.ok(defaultHTML.includes('upstream-reported'));
 const commercial=renderToStaticMarkup(await ExternalCatalogueSection({params:{externalContent:'commercial',externalSort:'relevance'}}));assert.ok(commercial.includes('Requires original commercial game content'));assert.ok(commercial.includes('Metadata licence:'));assert.ok(commercial.includes('https://creativecommons.org/licenses/by/4.0/'));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('concurrent chunks cannot exceed expected count or overwrite same-ID metadata; snapshots bounded',async()=>{
 const original=env.DB.batch;let queue=Promise.resolve();env.DB.batch=statements=>{const result=queue.then(()=>original(statements));queue=result.catch(()=>{});return result};
 const send=(g,body)=>ingestExternalCatalogue({generation:g,...body},'test-moderator');
 try{
  const g='catalogue-'+'d'.repeat(32);await send(g,{action:'begin',expected:1});
  const outcomes=await Promise.allSettled([send(g,{action:'chunk',records:[dataset[0]]}),send(g,{action:'chunk',records:[dataset[1]]})]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal((await send(g,{action:'status'})).loaded,1);await send(g,{action:'activate'});await ingest({action:'rollback'});
  const h='catalogue-'+'e'.repeat(32);await send(h,{action:'begin',expected:1});const changed={...dataset[0],title:dataset[0].title+' changed'};
  const replay=await Promise.allSettled([send(h,{action:'chunk',records:[dataset[0]]}),send(h,{action:'chunk',records:[changed]})]);assert.equal(replay.filter(x=>x.status==='fulfilled').length,1);
  await assert.rejects(()=>send('catalogue-'+'f'.repeat(32),{action:'begin',expected:1}),/Four retained/);
 }finally{env.DB.batch=original}
});
