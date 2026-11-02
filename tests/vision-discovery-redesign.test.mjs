import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {compileSsrModule} from './ssr-module.mjs';
import {externalProjects} from '../lib/project-handoff.ts';
import {sourceProjects} from '../lib/project-catalogue.ts';
const dir=mkdtempSync(path.resolve('.redesign-test-'));
const {default:Home,directoryBrowse}=await import(compileSsrModule(new URL('../app/discover-home.tsx',import.meta.url),dir));
const catalogueDir=mkdtempSync(path.resolve('.catalogue-redesign-test-'));
const {default:Catalogue}=await import(compileSsrModule(new URL('../app/projects/page.tsx',import.meta.url),catalogueDir));
const render=params=>renderToStaticMarkup(createElement(Home,{params}));
const html=render({});
// No network during source-edition SSR tests. Snapshot integration uses a pinned opt-in fixture.
globalThis.fetch=async()=>new Response(null,{status:503});
rmSync(dir,{recursive:true,force:true});rmSync(catalogueDir,{recursive:true,force:true});
test('directory precedes concept, preserves source-only scope and provides labelled filters',()=>{
 assert.match(readFileSync('app/page.tsx','utf8'),/return <DiscoverHome params=\{params\}/);
 assert.equal(directoryBrowse().total,26);assert.ok(html.indexOf('id="ai-entry"')<html.indexOf('id="directory"'));assert.ok(html.indexOf('class="gc-cards"')<html.indexOf('id="make"'));
 for(const name of ['home-search','home-genre','home-platform','home-stack','home-readiness'])assert.ok(html.includes('for="'+name+'"'));
 assert.match(html,/Images are not bundled/);assert.doesNotMatch(html,/<img\b|Some play observed|Gameplay captures|Clanfire scenarios/);
 assert.match(html,/not a build guarantee/);assert.match(html,/Listing order is editorial/);
});
test('source lanes preserve creator destinations and separate play-only permission',()=>{
 let all='';for(let page=1;page<=directoryBrowse().pages;page++)all+=render({page:String(page)});
 for(const p of externalProjects){assert.ok(all.includes(p.playUrl.replaceAll('&','&amp;')),p.id);assert.ok(all.includes(p.engine.replaceAll('&','&amp;')),p.id)}
 assert.ok(directoryBrowse({lane:'source'}).projects.every(p=>!!p.sourceUrl));assert.ok(directoryBrowse({lane:'play'}).projects.every(p=>!p.sourceUrl));
 const play=render({lane:'play'});assert.match(play,/No source or remix permission established/);assert.doesNotMatch(play,/AI handoff \+ source|Download assistant brief/);
});
test('facets compose, reject unknown options and retain URL state without observed-runtime claims',()=>{
 const x=directoryBrowse({q:'godot',platform:'browser',stack:'godot',readiness:'pinned',gc_test:'1'});
 assert.ok(x.projects.length);assert.ok(x.projects.every(p=>/godot/i.test(p.engine)&&!!p.commit&&/browser/i.test(p.platform)));
 assert.ok(x.href({genre:'puzzle'}).includes('stack=godot'));assert.ok(x.href({genre:'puzzle'}).includes('gc_test=1'));
 assert.equal(directoryBrowse({readiness:'observed'}).readiness,'all');
 assert.equal(directoryBrowse({q:'zzzznonexistent2842'}).projects.length,0);assert.match(render({q:'zzzznonexistent2842'}),/No foundations match/);
 assert.equal(directoryBrowse({q:['bad'],genre:'bad',stack:'bad',readiness:'bad'}).projects.length,directoryBrowse().projects.length);
 assert.equal(directoryBrowse({q:'a'.repeat(500)}).q.length,200);assert.ok(render({q:'<script>alert(1)</script>'}).includes('&lt;script&gt;'));
});
test('web stack recognizes Three.js, Babylon and DOM/SVG engines',()=>{
 const engines=['Three.js','Babylon.js','DOM/SVG','JavaScript'];
 const p=externalProjects.find(p=>p.sourceUrl),original=p.engine;
 try{for(const engine of engines){p.engine=engine;let ids=[];const first=directoryBrowse({stack:'web'});for(let page=1;page<=first.pages;page++)ids.push(...directoryBrowse({stack:'web',page:String(page)}).projects.map(p=>p.id));assert.ok(ids.includes(p.id),engine)}}finally{p.engine=original}
});
test('home and full catalogue pagination are bounded, complete and stable',async()=>{
 const first=directoryBrowse(),seen=[],catalogueIds=[];
 for(let page=1;page<=first.pages;page++){
  const state=directoryBrowse({page:String(page)});assert.ok(state.projects.length<=12);seen.push(...state.projects.map(p=>p.id));assert.ok(!state.href({stack:'godot'}).includes('page='));
  const markup=renderToStaticMarkup(await Catalogue({searchParams:Promise.resolve({page:String(page)})}));const ids=[...markup.matchAll(/class="catalogue-card project-([^"]+)"/g)].map(m=>m[1]);assert.ok(ids.length<=12);catalogueIds.push(...ids);assert.doesNotMatch(markup,/<img\b/);
 }
 assert.deepEqual(seen,sourceProjects().map(p=>p.id));assert.deepEqual(catalogueIds,seen);assert.equal(new Set(seen).size,26);
 assert.equal(directoryBrowse({page:'-3'}).page,1);assert.equal(directoryBrowse({page:'2bad'}).page,1);assert.equal(directoryBrowse({page:'999999'}).page,first.pages);assert.match(html,/aria-label="Directory pages"/);
});
test('responsive, reduced-motion and contrast affordances survive without image URLs',()=>{
 const css=readFileSync('app/discovery.css','utf8');assert.match(css,/@media\(max-width:480px\)/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/:focus-visible\{outline:3px solid #d5ff60/);assert.doesNotMatch(css,/url\(/);
 const lum=h=>h.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 for(const [fg,bg]of [['101113','f4f5f6'],['101113','a6aab2'],['12150c','d5ff60']])assert.ok((lum(bg)+.05)/(lum(fg)+.05)>4.5);
});
