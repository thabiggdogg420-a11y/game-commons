import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectBrief} from '../lib/project-handoff.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('family navigation uses current public domains without adding image requests',()=>{const s=read('app/layout.tsx');for(const host of ['https://free4allhub.com','https://games.free4allhub.com','https://plan.free4allhub.com','https://learn.free4allhub.com'])assert.ok(s.includes(host));assert.match(s,/Free4AllHub family/);assert.doesNotMatch(s,/<img|collection\.jpg/);});
test('Reversi handoff explains matching Web templates, actual output checks and browser limits',()=>{const data=JSON.parse(read('public/projects/index.json'));const p=data.projects.find(p=>p.id==='godot-reversi');const text=p.requirements.join(' ');for(const term of ['4.7.2-stable','web_nothreads_release.zip','web_nothreads_debug.zip','--export-release "Web"','index.wasm','http.server 8000','not file://'])assert.ok(text.includes(term),term);assert.ok(p.cautions.some(s=>s.includes('Browser adaptation readiness is unverified')));assert.match(projectBrief(p.id),/web_nothreads_release\.zip/);assert.equal(data.projects.length,26);assert.equal(p.creator,'Regi Ellis');});
