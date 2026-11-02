import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalogueBrowse} from '../lib/catalogue-browse.ts';
import {sourceProjects} from '../lib/project-catalogue.ts';
test('filtered discovery does not masquerade unrelated hosted games as search matches',()=>{
 for(const params of [{q:'Slipstream'},{q:'zzzznonexistent2842'},{platform:'desktop'},{platform:'browser'},{genre:'racing'}])assert.equal(catalogueBrowse(params).hasFilters,true);
 for(const params of [{},{q:'   '},{platform:'unknown'},{genre:'unknown'},{q:['Slipstream'],genre:['racing']}])assert.equal(catalogueBrowse(params).hasFilters,false);
 assert.equal(sourceProjects('zzzznonexistent2842').length,0);
 const page=readFileSync(new URL('../app/projects/page.tsx',import.meta.url),'utf8');
 assert.match(page,/hasFilters&&<p className="catalogue-filter-scope"/);
 assert.match(page,/<HostedGameCollection records=\{hostedGames\}/);
 assert.match(page,/!hasFilters&&<section className="mod-reference-section" id="cross-game-mods"/);
 assert.match(page,/action="\/projects#games"/);
});
test('genre changes preserve search/platform while clear and hosted links clear filters and preserve QA attribution',()=>{
 const state=catalogueBrowse({q:'ships & racing',platform:'desktop',genre:'racing',gc_test:'1'});
 assert.equal(state.href('simulation'),'/projects?q=ships+%26+racing&platform=desktop&genre=simulation&gc_test=1#games');
 assert.equal(state.href(),'/projects?q=ships+%26+racing&platform=desktop&gc_test=1#games');
 assert.equal(state.clearHref,'/projects?gc_test=1#games');
 assert.equal(state.hostedHref,'/projects?gc_test=1#hosted-games');
 assert.equal(catalogueBrowse({}).clearHref,'/projects#games');
 assert.equal(catalogueBrowse({}).hostedHref,'/projects#hosted-games');
 assert.equal(catalogueBrowse({q:'a'.repeat(500)}).q.length,200);
});
