import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,readFileSync,mkdirSync} from 'node:fs';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {compileSsrModule} from './ssr-module.mjs';import {externalProjects,projectBrief} from '../lib/project-handoff.ts';import {reversiExample} from '../lib/reversi-example.ts';import {mockSnapshots} from './new-snapshot-mocks.mjs';mockSnapshots();
const dir=mkdtempSync(new URL('./.ssr-reversi-',import.meta.url));process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));
let moduleIndex=0;const compile=entry=>{const sub=dir+'/entry-'+moduleIndex++;mkdirSync(sub);return compileSsrModule(entry,sub)};
const {ReversiExample}=await import(compile(new URL('../components/reversi-example.tsx',import.meta.url)));
const {default:Home}=await import(compile(new URL('../app/discover-home.tsx',import.meta.url)));
const {CuratedSearchMatches}=await import(compile(new URL('../components/featured-games.tsx',import.meta.url)));
const {default:Projects}=await import(compile(new URL('../app/projects/page.tsx',import.meta.url)));
const markup=()=>renderToStaticMarkup(createElement(ReversiExample,{projectId:'godot-reversi'}));
test('separate example exposes exact live play, pinned source and private return without relabelling original',()=>{
 const html=markup();for(const value of [reversiExample.playUrl,reversiExample.sourceUrl,'href="/remix-return"','Assistant-authored','not an outside creator contribution','Two Players','12','Unlimited is the default','manual private review','not automatic publication','Regi Ellis','Kenney','SIL OFL','Godot engine'])assert.ok(html.includes(value),value);
 for(const limit of ['CPU','24/unlimited','mobile touch','keyboard-only','audio','full network'])assert.ok(html.includes(limit));
 assert.equal(renderToStaticMarkup(createElement(ReversiExample,{projectId:'mindustry'})),'');
 const original=externalProjects.find(p=>p.id==='godot-reversi');assert.equal(original.playUrl,'https://regiellis.github.io/godot-reversi/');assert.equal(externalProjects.length,26);assert.equal(externalProjects.filter(p=>p.id==='godot-reversi').length,1);
});
test('main search and curated original both show remix links beside separate original',()=>{
 for(const element of [createElement(CuratedSearchMatches,{query:'reversi'}),createElement(Home,{params:{collection:'curated',q:'reversi'}})]){const html=renderToStaticMarkup(element);assert.ok(html.includes('https://regiellis.github.io/godot-reversi/'));assert.ok(html.includes(reversiExample.playUrl));assert.equal((html.match(/aria-label="Separate Reversi remix example"/g)||[]).length,1);assert.ok(html.includes(reversiExample.sourceUrl));}
 const unrelated=renderToStaticMarkup(createElement(CuratedSearchMatches,{query:'mindustry'}));assert.ok(!unrelated.includes(reversiExample.playUrl));
});
test('full existing project guide exposes the complete bounded handoff without needing a new route',async()=>{
 const html=renderToStaticMarkup(await Projects({searchParams:Promise.resolve({q:'Reversi'})}));assert.ok(html.includes(reversiExample.playUrl));assert.ok(html.includes('https://regiellis.github.io/godot-reversi/'));assert.ok(html.includes('Return your own remix for private review'));assert.ok(html.includes('26 independent games'));
});
test('assistant brief retains original/source ancestry and adds separate remix and return limits',()=>{
 const brief=projectBrief('godot-reversi');for(const value of [reversiExample.playUrl,reversiExample.sourceUrl,reversiExample.parentCommit,'SEPARATE PLAYABLE REMIX EXAMPLE','Private curator review only','Do not submit the assistant example as your own work','Hub wrapper hosting is separate'])assert.ok(brief.includes(value),value);assert.ok(!projectBrief('mindustry').includes(reversiExample.playUrl));
});
test('integration adds no remote runtime, iframe, storage or new upload path',()=>{
 const source=readFileSync('components/reversi-example.tsx','utf8');assert.doesNotMatch(source,/<iframe|<script|fetch\(|localStorage|<form/);assert.equal(reversiExample.returnUrl,'/remix-return');
});
