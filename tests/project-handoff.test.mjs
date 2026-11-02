import {slipstreamWorkflow} from '../lib/slipstream-workflow.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {externalProjects,projectBrief} from '../lib/project-handoff.ts';
import {GET} from '../app/projects/[id]/brief/route.ts';

test('larger-game handoffs preserve upstream identity, exact source and licence boundaries',async()=>{
 assert.ok(externalProjects.length>=8);
 for(const p of externalProjects){
  if(p.commit!==null){assert.match(p.commit,/^[a-f0-9]{40}$/);assert.ok(p.sourceUrl.includes(p.commit))}else{assert.equal(p.archiveUrl,null);if(p.sourceUrl){assert.equal(p.sourceStatus,'official-source-unpinned');assert.match(projectBrief(p.id),/OFFICIAL SOURCE — REVISION NOT PINNED/)}else{assert.equal(p.sourceStatus,'official-play-link-no-open-license');assert.match(projectBrief(p.id),/EXTERNAL PLAY REFERENCE/);}}
  const response=await GET(new Request('https://example.test'),{params:Promise.resolve({id:p.id})});
  assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/attachment/);
  assert.match(response.headers.get('content-type'),/^text\/plain/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  const text=await response.text();
  if(p.id==='slipstream-racing-game'){
   // This curated workflow intentionally has stronger component-specific terms
   // than the old catalogue summary. Assert them, not the obsolete boilerplate.
   for(const value of [p.creator,p.commit,p.sourceUrl,slipstreamWorkflow.archiveSha256,slipstreamWorkflow.codeTerms,slipstreamWorkflow.assetTerms,...slipstreamWorkflow.notices])assert.ok(text.includes(value),p.id+': '+value);
   assert.match(text,/Review code and dependencies before execution/);assert.match(text,/does not upload, execute, approve or publish/);assert.match(text,/does not distribute its private overlay or claim native gameplay acceptance/);
  }else if(!p.sourceUrl){
   for(const value of [p.creator,p.playUrl,p.codeLicense,p.assetLicense,p.verification])assert.ok(text.includes(value),p.id+': '+value);
   assert.match(text,/Do not mirror, copy or remix/);assert.match(text,/not an importable project or remix brief/);assert.doesNotMatch(text,/FIRST REMIX BRIEF|PINNED SOURCE|Make one focused change/);
  }else{
   for(const value of [p.creator,...(p.commit?[p.commit]:[]),p.repository,p.codeLicense,p.assetLicense,p.sourceCompleteness,p.verification,p.firstRemix])assert.ok(text.includes(value),p.id+': '+value);
   assert.match(text,/not an automatic upload/);assert.match(text,/untrusted data/);
  }
 }
 const thrive=externalProjects.find(p=>p.id==='thrive');assert.equal(thrive.archiveUrl,null);assert.match(projectBrief('thrive'),/Git LFS/);
 const kart=externalProjects.find(p=>p.id==='supertuxkart');assert.equal(kart.archiveUrl,null);assert.match(projectBrief('supertuxkart'),/unpinned/);
});

test('unknown handoffs cannot become filenames or downloads',async()=>{
 for(const id of ['missing','../../secrets','x\r\nInjected: header']){assert.equal(projectBrief(id),null);const r=await GET(new Request('https://example.test'),{params:Promise.resolve({id})});assert.equal(r.status,404);assert.equal(r.headers.get('content-disposition'),null);}
});
