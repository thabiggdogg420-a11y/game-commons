import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('source edition keeps Unciv notes text-only and suppresses duplicate when selected',()=>{const s=readFileSync('app/discover-home.tsx','utf8');assert.ok(s.includes("!slides.some(p=>p.id==='external-80fa3f53a31a7e03536d')"));assert.doesNotMatch(s,/<img\b|screenshot not yet added/);});
