import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import markup from '../app/home-markup.ts';
import {externalProjects} from '../lib/project-handoff.ts';
import {externalPlayObservation} from '../lib/external-play-observations.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('homepage leads with real choices and bounded Monolith evidence, not the illustrated future',()=>{
 const p=externalProjects.find(p=>p.id==='monolith'),e=externalPlayObservation(p);assert.ok(e);
 for(const text of [p.title,p.creator,p.playUrl,e.version,'29 Oct 2026','Full match not assessed','No source or remix permission established','Small-window cropping'])assert.ok(markup.includes(text),text);
 assert.ok(markup.indexOf('player-hero')<markup.indexOf('hero-trailer'));
 assert.ok(markup.indexOf('id="how-it-works"')<markup.indexOf('hero-trailer'));
 assert.match(markup,/External play alone is not remix permission/);
 assert.match(markup,/private review—not automatic publication/);
 for(const href of ['/projects#games','/projects#hosted-games','/remix-return','/llms.txt'])assert.ok(markup.includes('href="'+href+'"'));
 assert.doesNotMatch(markup,/Foundry|Claude of Tanks/);
});
test('catalogue keeps critical destination and rights before play while deep evidence remains keyboard accessible',()=>{
 const s=read('app/projects/page.tsx');
 assert.match(s,/<header className="catalogue-new-header"/);
 assert.match(s,/Play at the creator’s site/);assert.match(s,/No source or remix permission established/);
 assert.match(s,/<details className="play-evidence-details"><summary>Full play status/);
 assert.match(s,/play-evidence-line/);assert.match(s,/Source linked; check code and asset terms/);
 assert.match(s,/method="get" action="\/projects#games"/);assert.match(s,/defaultValue=\{q\}/);
 assert.match(s,/<HostedGameCollection records=\{hostedGames\}/);
});
test('responsive and focus rules retain usable touch targets and no mobile horizontal genre rail',()=>{
 const home=read('public/redesign/style.css'),catalogue=read('app/projects/catalogue.css');
 assert.match(home,/player-hero\{grid-template-columns:1fr/);
 assert.match(home,/player-paths\{grid-template-columns:1fr/);
 assert.match(catalogue,/catalogue-genre-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);overflow:visible/);
 assert.match(catalogue,/summary:focus-visible/);assert.match(catalogue,/min-height:46px/);
});
test('mint spotlight explicitly keeps its heading dark and CTA text glyph-independent',()=>{
 assert.match(read('public/redesign/style.css'),/\.monolith-spotlight h2\{color:#16382f;/);
 assert.match(markup,/>Play original at creator’s site<\/a>/);
});

test('intermediate-width hero avoids intrinsic grid overflow without hiding content',()=>{
 const css=read('public/redesign/style.css');
 assert.match(css,/grid-template-columns:minmax\(0,1\.15fr\) minmax\(0,1fr\)/);
 assert.match(css,/\.player-hero> \*\{min-width:0;max-width:100%\}/);
 assert.match(css,/@media\(max-width:1200px\)\{\.commons-home\.commons-home \.player-hero\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.spotlight-play\{white-space:normal;overflow-wrap:anywhere\}/);
 assert.match(css,/max-width:min\(700px,100%\)/);
 assert.doesNotMatch(css,/\.monolith-spotlight\{[^}]*overflow:hidden/);
});

test('published Clanfire remix is discoverable in the existing middle path with bounded credit',()=>{
 const paths=markup.match(/<section class="player-paths wrap"[\s\S]*?<\/section>/)[0];
 assert.equal((paths.match(/<a href=/g)||[]).length,3);
 assert.match(paths,/<a href="\/clanfire"><span class="path-number">02 \/ NEW HOSTED REMIX/);
 for(const text of ['Clanfire Commons Scenarios','Experimental · MIT · Rob Carpenter + Game Commons','local save/reload and recipe review checked','no full victory or quality acceptance'])assert.ok(paths.includes(text),text);
 assert.match(paths,/href="\/projects#games"/);assert.match(paths,/href="#how-it-works"/);
 assert.doesNotMatch(paths,/<img|qualityAccepted/);
});
