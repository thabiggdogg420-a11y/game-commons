import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const base='public/remixes/commons-relay/';
const v1=JSON.parse(read(base+'v1.json')),v2=JSON.parse(read(base+'v2.json'));
test('v2 keeps immutable v1 artifacts and transparently records exact hotfix lineage',()=>{
 assert.equal(v2.version,2);assert.equal(v2.releaseParent.manifest,'/remixes/commons-relay/v1.json');
 for(const field of ['source','runtime'])assert.equal(hash(read('public'+v1[field].url)),v1[field].sha256);
 assert.equal(v2.releaseParent.sourceSha256,v1.source.sha256);assert.equal(v2.releaseParent.runtimeSha256,v1.runtime.sha256);assert.equal(v2.releaseMethod.canonicalRebuild,false);
 const old=gunzipSync(read('public'+v1.runtime.url)).toString();const current=gunzipSync(read('public'+v2.runtime.url)).toString();
 assert.equal(old.split(v2.releaseMethod.before).length,2);assert.equal(current,old.replace(v2.releaseMethod.before,v2.releaseMethod.after));
 assert.match(v2.verification.build,/NOT a canonical dependency rebuild/);
});
test('current player, catalogue, source notices and handoff all point to v2',()=>{
 for(const p of ['app/remix/page.tsx','app/remix/relay-player.tsx','app/llms.txt/route.ts','public/projects/index.json'])assert.ok(read(p).toString().includes('/commons-relay/v2.json'),p);
 for(const p of ['NOTICES.txt','assistant-handoff.txt']){const text=read(base+p).toString();assert.match(text,/commons-relay-source-v2.zip/);assert.match(text,/\/commons-relay\/v2.json/);assert.match(text,/not a canonical dependency rebuild/);assert.match(text,/reproduce-v2-hotfix.mjs/);}
});
