import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('source-only homepage and directory do not render missing raster images',()=>{for(const p of ['app/discover-home.tsx','app/projects/page.tsx'])assert.doesNotMatch(read(p),/<img\b/);assert.match(read('app/projects/page.tsx'),/TEXT-ONLY PREVIEW/);assert.match(read('app/discover-home.tsx'),/Images are not bundled/)});
test('source-only metadata and credit gallery avoid missing media requests',()=>{for(const p of ['app/layout.tsx','app/projects/page.tsx'])assert.doesNotMatch(read(p),/collection\.jpg/);assert.doesNotMatch(read('public/projects/art/credits.html'),/<img\b/);assert.match(read('public/projects/art/credits.html'),/Original image/)});
test('README declares deliberate source-only scope without downloads',()=>{assert.match(read('README.md'),/intentionally includes no raster images/);assert.match(read('README.md'),/no automatic asset download/)});
