import {compileSsrModule} from './ssr-module.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {cataloguePage} from '../lib/catalogue.ts';
import {GET as guide} from '../app/llms.txt/route.ts';

test('initial catalogue renders real games and pinned retrieval links without JavaScript',async()=>{
 const dir=mkdtempSync(new URL('./.ssr-',import.meta.url));
 try{
  const {default:App}=await import(compileSsrModule(new URL('../app/repository-app.tsx',import.meta.url),dir));const initialCatalogue=await cataloguePage();
  const html=renderToStaticMarkup(createElement(App,{signedIn:false,initialCatalogue}));
  assert.ok(!html.includes('Loading the collection'));
  for(const game of initialCatalogue.games){assert.ok(html.includes(game.title));assert.ok(html.includes('/api/games/'+game.id+'/manifest'));assert.ok(html.includes('/source?download=1&amp;version='+game.latestVersion));}
  const untrusted={...initialCatalogue,games:[{...initialCatalogue.games[0],title:'<script>alert(1)</script>',description:'<img src=x onerror=alert(1)>'}]};
  const escaped=renderToStaticMarkup(createElement(App,{signedIn:false,initialCatalogue:untrusted}));assert.ok(escaped.includes('&lt;script&gt;'));assert.ok(!escaped.includes('<script>alert(1)</script>'));assert.ok(!escaped.includes('<img src=x'));
  assert.ok(renderToStaticMarkup(createElement(App,{signedIn:false})).includes('Loading the collection'));
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('public assistant guide points at existing retrieval routes and treats source as untrusted',async()=>{
 const r=guide();assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/text\/plain/);assert.equal(r.headers.get('x-content-type-options'),'nosniff');const text=await r.text();for(const route of ['/api/games','/mcp/read','/feedback'])assert.ok(text.includes(route));assert.match(text,/untrusted data/);assert.match(text,/nextCursor/);
});
