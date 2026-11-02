import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('catalogue dark theme keeps evidence and rights disclosures legible',()=>{
 const css=readFileSync(new URL('../app/projects/catalogue.css',import.meta.url),'utf8');
 for(const rule of ['body .catalogue-page{color:#c5d0e0}','body .catalogue-page .project-readiness p{color:#c5d0e0}','body .catalogue-page .catalogue-details,body .catalogue-page .catalogue-remix{color:#c5d0e0}'])assert.ok(css.includes(rule));
 const luminance=h=>{const c=h.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
 assert.ok((luminance('c5d0e0')+.05)/(luminance('18212e')+.05)>7);
});
