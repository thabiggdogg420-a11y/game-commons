import {test} from 'node:test';
import assert from 'node:assert/strict';
import {externalProjects,projectBrief} from '../lib/project-handoff.ts';
import {sourceProjectIndex,sourceProjects} from '../lib/project-catalogue.ts';
import {projectReadiness} from '../lib/project-readiness.ts';
import {projectGenres} from '../lib/project-genres.ts';
import {readFileSync} from 'node:fs';
const ids=['slipstream-racing-game','valhalla-fps','veloren','stunt-rally','0-ad'];
const artwork=JSON.parse(readFileSync(new URL('../public/projects/art/credits.json',import.meta.url)));
test('five substantial external listings are unique, native, free-download and source-linked with credited official media where cleared',()=>{
 assert.equal(externalProjects[0].id,ids[0]);
 for(const id of ids){
  const entries=externalProjects.filter(x=>x.id===id);assert.equal(entries.length,1);const p=entries[0];
  assert.match(p.playUrl,/^https:\/\//);assert.match(p.sourceUrl,/^https:\/\//);assert.match(p.platform,/Desktop/);assert.match(p.freeAccess,/Free official download/);
  assert.ok(p.codeLicense);assert.ok(p.assetLicense);assert.ok(p.aiDevelopment);assert.ok(p.verification);assert.ok(projectGenres.some(g=>g.projectIds.includes(id)));
  if(id==='stunt-rally')assert.equal(artwork.images.some(x=>x.id===id),false);else{const image=artwork.images.find(x=>x.id===id);assert.ok(image);assert.ok(image.creator&&image.license&&image.sourceUrl&&image.sha256);assert.match(image.verification,/not a local playtest/)}
  const r=projectReadiness(p);assert.equal(r.play.hosting,'external');assert.equal(r.play.sourceBuildMatchVerified,false);assert.equal(r.remix.localBuildVerified,false);assert.equal(r.quality.status,'unassessed');assert.equal(r.runtime.selfHostedVerified,false);
  assert.equal(sourceProjects(p.title,'browser').some(x=>x.id===id),false);
 }
 assert.equal(externalProjects.filter(x=>x.id==='freeciv-web').length,1);
});
test('unverified pins stay null with honest handoffs; Slipstream preserves pinned mixed-licence source',()=>{
 for(const id of ids.slice(1)){
  const p=externalProjects.find(x=>x.id===id);assert.equal(p.commit,null);assert.equal(p.archiveUrl,null);assert.equal(p.sourceStatus,'official-source-unpinned');
  assert.match(projectBrief(id),/Revision: not pinned/);assert.doesNotMatch(projectBrief(id),/Commit: null/);assert.match(projectReadiness(p).remix.label,/revision and local build unverified/);assert.match(p.aiDevelopment,/not established/);
 }
 const p=externalProjects[0];assert.equal(p.commit,'3baf4ec6ea617861663bcec41bf3fbc13fb65ea2');assert.match(p.assetLicense,/CC BY-SA/);assert.match(p.aiDevelopment,/creator claim/);assert.match(p.verification,/No private playtest or build-validation records are included/);
 assert.match(projectBrief(p.id),/Original: Catalin/);assert.match(projectBrief(p.id),/Original code MIT/);
});
test('discovery categories grow linked counts only, never accepted or hosted counts',()=>{
 const d=sourceProjectIndex();for(const c of d.categories){assert.equal(c.hostedOriginalCount,0);assert.equal(c.qualityAcceptedCount,0)}
 assert.ok(sourceProjectIndex('','desktop','racing').projects.some(x=>x.id==='slipstream-racing-game'));
 assert.ok(sourceProjectIndex('','desktop','fps').projects.some(x=>x.id==='valhalla-fps'));
 assert.ok(sourceProjectIndex('','desktop','strategy').projects.some(x=>x.id==='0-ad'));
});

test('v46 target has preserved original entries plus new reviewed batch and never inherits absent startup or Cinderbelt',()=>{assert.equal(externalProjects.length,26);assert.equal(externalProjects.some(p=>p.id==='cinderbelt'),false);for(const commit of [null,undefined,''])assert.equal(projectReadiness({id:'new-unobserved',commit,platform:'Browser',verification:'',sourceCompleteness:''}).play.verification,'unverified');});
