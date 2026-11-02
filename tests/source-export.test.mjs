import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GET} from '../app/datakin-runtime/mgba.js/route.ts';
test('source-only export fails explicitly for omitted optional emulator instead of bundling absent binary',async()=>{const response=GET();assert.equal(response.status,503);assert.match(await response.text(),/not included/);assert.equal(response.headers.get('Cache-Control'),'no-store')});
test('hosting config keeps local bindings without a production site identity',()=>{const config=JSON.parse(readFileSync(new URL('../.openai/hosting.json',import.meta.url),'utf8'));assert.equal(config.d1,'DB');assert.equal(config.r2,'BUCKET');assert(!('project_id' in config))});
