import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {compileSsrModule} from './ssr-module.mjs';
import {createReader} from '../lib/external-compact.mjs';
import {normalizeGenre} from '../lib/external-facets.mjs';
const dir=mkdtempSync(new URL('./.ssr-search-',import.meta.url));
const {CommonsNav,headerSearchFields}=await import(compileSsrModule(new URL('../app/discover-home.tsx',import.meta.url),dir));
process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));
const fields=html=>Object.fromEntries([...html.matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)].map(m=>[m[1],m[2]]));
test('real header form preserves catalogue constraints and resets pagination, not filters',()=>{
 const params={externalPlatform:'browser',externalAccess:'free-reported',externalEngine:'godot',externalContent:'all',externalSort:'recommended',externalGenre:' Puzzle ',externalCursor:'old-page',page:'4'};
 const html=renderToStaticMarkup(createElement(CommonsNav,{query:'new query',params}));
 assert.deepEqual(fields(html),{externalPlatform:'browser',externalEngine:'godot',externalContent:'all',externalAccess:'free-reported',externalSort:'recommended',externalGenre:'puzzle'});
 assert.match(html,/name="externalQ"/);assert.ok(!html.includes('old-page'));assert.ok(!html.includes('name="page"'));
});
test('real curated header retains source lane, engine, genre, readiness and browser constraints',()=>{
 const params={platform:'browser',genre:'puzzle',lane:'source',stack:'godot',readiness:'pinned',page:'3',gc_test:'1'};
 const html=renderToStaticMarkup(createElement(CommonsNav,{curated:true,query:'blocks',params}));
 assert.deepEqual(fields(html),{collection:'curated',platform:'browser',genre:'puzzle',lane:'source',stack:'godot',readiness:'pinned',gc_test:'1'});assert.match(html,/name="q"/);assert.ok(!html.includes('name="page"'));
});
test('header ignores unknown, array, oversized and invalid filter inputs',()=>{
 assert.deepEqual(headerSearchFields({externalPlatform:'bogus',externalAccess:['free-reported'],externalEngine:'javascript:bad',externalGenre:'x'.repeat(101),externalSort:'bogus',externalCursor:'bad',unrelated:'secret'}),{});
 assert.deepEqual(headerSearchFields({lane:'bad',stack:['godot'],platform:'bad',genre:'bad',readiness:'bad'},true),{collection:'curated',platform:'all',genre:'all',lane:'all',stack:'all',readiness:'all'});
});
import {bytes} from './external-fixture.mjs';
const reader=createReader(JSON.parse(bytes));
test('actual snapshot genre tolerates surrounding whitespace/case/NFKC; blank means all',()=>{
 const base=reader.page({genre:'puzzle'});assert.equal(base.total,822);
 for(const genre of ['Puzzle',' Puzzle ','\tPUZZLE\n','Ｐｕｚｚｌｅ'])assert.deepEqual(reader.page({genre}),base);
 assert.deepEqual(reader.page({genre:'   '}),reader.page({genre:'all'}));assert.equal(normalizeGenre('  '),'all');
});
test('snapshot cursor binds canonical genre but rejects a genuinely changed genre',()=>{
 const first=reader.page({genre:' Puzzle ',limit:3});const next=reader.page({genre:'puzzle',limit:3,after:first.nextCursor});assert.equal(next.total,822);assert.ok(next.projects.every(p=>!first.projects.some(x=>x.id===p.id)));
 assert.throws(()=>reader.page({genre:'action',after:first.nextCursor}),/cursor/);assert.throws(()=>reader.page({genre:42}),/query\/genre/);assert.throws(()=>reader.page({genre:' '.repeat(101)}),/query\/genre/);
});
