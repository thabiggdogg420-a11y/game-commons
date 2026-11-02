import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';import vm from 'node:vm';
const root=new URL('../public/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('../public/remixes/commons-relay/v2.json',import.meta.url)));const hash=b=>createHash('sha256').update(b).digest('hex');
test('playable relay payload and complete source retain exact hashes and upstream lineage',()=>{
 for(const item of [manifest.runtime,manifest.source]){const data=readFileSync(new URL('.'+item.url,root));assert.equal(data.length,item.bytes);assert.equal(hash(data),item.sha256);}
 assert.equal(manifest.parent.commit,'d37961462eb91f97e81710ede456346148cd2522');assert.equal(manifest.parent.archiveSha256,'f2bf77ec699efe4b67f9758c0cf57c73fcf82590dca01f4babda3ebc86a96c29');assert.match(manifest.codeLicense,/AGPL/);assert.match(manifest.assetLicense,/CC BY-SA/);
 const notices=readFileSync(new URL('../public/remixes/commons-relay/NOTICES.txt',import.meta.url),'utf8');assert.match(notices,/Freezing Moon/);assert.match(notices,/Dread Knight/);assert.match(notices,/not an official release/);
});
test('embedded game is valid JavaScript and needs no network or same-origin privilege',()=>{
 const decoded=gunzipSync(readFileSync(new URL('.'+manifest.runtime.url,root)));assert.equal(hash(decoded),manifest.runtime.htmlSha256);assert.equal(decoded.length,manifest.runtime.htmlBytes);const html=decoded.toString();
 const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];assert.match(csp,/default-src 'none'/);assert.match(csp,/connect-src data:/);assert.match(csp,/worker-src 'none'/);assert.match(csp,/frame-src 'none'/);assert.ok(!csp.includes('https:'));assert.ok(!html.includes('navigator.serviceWorker.getRegistrations'));
 assert.ok(!/<script\b[^>]*\bsrc=/.test(html));const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);new vm.Script(scripts[0][1]);
 const player=readFileSync(new URL('../app/remix/relay-player.tsx',import.meta.url),'utf8');assert.match(player,/sandbox="allow-scripts"/);assert.ok(!player.includes('allow-same-origin'));assert.match(player,/event\.source!==frame\.current\?\.contentWindow/);assert.match(player,/htmlSha256/);
});
