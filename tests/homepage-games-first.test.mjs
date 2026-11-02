import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import markup from '../app/home-markup.ts';
import {sourceProjects} from '../lib/project-catalogue.ts';
test('playable discovery leads the retained captioned concept film and vision',()=>{
 assert.ok(markup.indexOf('id="games"')<markup.indexOf('id="hero-trailer"'));
 assert.ok(markup.indexOf('id="games"')<markup.indexOf('id="vision"'));
 assert.match(markup,/controls playsinline preload="metadata"/);assert.match(markup,/kind="captions"/);assert.match(markup,/not a playable demo/);assert.match(markup,/Read the trailer transcript/);
 for(const path of ['/redesign/assets/game-commons-final-60s.mp4','/redesign/assets/trailer-en.vtt','/redesign/assets/trailer-poster.jpg'])assert.ok(existsSync('public'+path));
 assert.doesNotMatch(markup,/<video[^>]*autoplay/);
});
test('substantial games lead with actual official links and preserved creator credits',()=>{
 for(const name of ['Slipstream','VALHALLA','Veloren','0 A.D.']){const p=sourceProjects(name)[0];assert.equal(p.title,name);assert.ok(markup.includes(p.creator));assert.ok(markup.includes(p.playUrl.replaceAll('&','&amp;')));}
 assert.match(markup,/not play-tested by us/);assert.match(markup,/EXTERNAL DOWNLOAD/);assert.match(markup,/Credits, licences &amp; remix setup/);
 assert.ok(markup.includes('href="/projects"'));
});
test('existing story and playable demo controls remain intact',()=>{
 for(const id of ['story-copy','story-art','inventory','journal','scene-summary','chapter-count','additions','previous-scene','next-scene','media-status'])assert.ok(markup.includes('id="'+id+'"'));
 for(const href of ['/star-circuit','/remix','/feedback','/llms.txt'])assert.ok(markup.includes('href="'+href+'"'));
 assert.equal((markup.match(/class="foundation-card"/g)||[]).length,4);
});
