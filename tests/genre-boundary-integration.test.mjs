import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';import {compileSsrModule} from './ssr-module.mjs';import {mockSnapshots} from './new-snapshot-mocks.mjs';
import {GET} from '../app/api/external-catalogue/route.ts';import {handleMcp} from '../lib/mcp.ts';
mockSnapshots();const dir=mkdtempSync(new URL('./.ssr-genre-',import.meta.url));const {ExternalCatalogueSection}=await import(compileSsrModule(new URL('../components/external-catalogue-section.tsx',import.meta.url),dir));process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));
const api=genre=>GET(new Request('https://example.test/api/external-catalogue?content=all&genre='+encodeURIComponent(genre)));
async function mcp(genre){const r=await handleMcp(new Request('https://example.test/mcp/read',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'search_external_catalogue',arguments:{content:'all',genre}}})}),true);return (await r.json()).result;}
test('rendered real catalogue form, HTTP and MCP agree on canonical padded genre',async()=>{
 const html=renderToStaticMarkup(await ExternalCatalogueSection({path:'/',params:{externalGenre:' Puzzle '}}));assert.match(html,/822 matching listings/);assert.match(html,/name="externalGenre"[^>]*value="puzzle"/);assert.ok(html.includes('externalGenre=puzzle'));
 for(const genre of ['puzzle',' Puzzle ','Ｐｕｚｚｌｅ']){const r=await api(genre);assert.equal(r.status,200);assert.equal((await r.json()).total,822);const m=await mcp(genre);assert.ok(!m.isError);assert.equal(JSON.parse(m.content[0].text).total,822);}
 const blank=renderToStaticMarkup(await ExternalCatalogueSection({path:'/',params:{externalGenre:'   '}}));assert.match(blank,/6,706 matching listings/);assert.match(blank,/name="externalGenre"[^>]*value=""/);
});
test('all entry points reject overlong raw and normalized genres, not silently broaden',async()=>{
 for(const genre of [' '.repeat(101),'\ufdfa'.repeat(10)]){assert.ok(genre.length>100||genre.normalize('NFKC').length>100);const r=await api(genre);assert.equal(r.status,400);assert.equal((await mcp(genre)).isError,true);const html=renderToStaticMarkup(await ExternalCatalogueSection({path:'/',params:{externalGenre:genre}}));assert.ok(html.includes('This search expired or is unavailable'));assert.ok(!html.includes('matching listings'));}
});
