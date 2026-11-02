import {test} from 'node:test';
import assert from 'node:assert/strict';
import {externalProjects,projectBrief} from '../lib/project-handoff.ts';
import {sourceProjectIndex} from '../lib/project-catalogue.ts';
import {projectReadiness} from '../lib/project-readiness.ts';
import {githubRepo} from '../lib/github-project.ts';
test('external-only catalogue entry never fabricates source or remix rights',()=>{
 const p=externalProjects.find(p=>p.id==='cruising-bones');assert.ok(p);assert.equal(p.sourceUrl,null);assert.equal(p.repository,null);assert.equal(p.commit,null);assert.equal(githubRepo(p.id),null);
 const r=projectReadiness(p);assert.equal(r.remix.readiness,'external-play-only');assert.equal(r.play.verification,'unverified');assert.match(r.play.verificationLabel,/Creator gameplay media reviewed/);assert.equal(r.runtime.selfHostedVerified,false);
 const b=projectBrief(p.id);assert.match(b,/EXTERNAL PLAY REFERENCE/);assert.match(b,/Do not mirror(?:, copy)? or remix/);assert.doesNotMatch(b,/PINNED SOURCE|FIRST REMIX BRIEF|Make one focused change/);
 const s=sourceProjectIndex('','all','sports');assert.equal(s.total,1);assert.equal(s.categories.find(c=>c.id==='sports').linkedGameCount,1);assert.equal(s.categories.find(c=>c.id==='sports').linkedSourceCount,0);
});
