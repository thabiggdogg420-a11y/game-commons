import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GET as guide} from '../app/llms.txt/route.ts';
import {submitFeedback,feedbackQueue} from '../lib/feedback.ts';
import {env} from './test-env.mjs';
env.MODERATOR_USER_IDS='["guidance-reviewer"]';
test('creator guidance names v2 retrieval and separates link-only feedback from full remix return',async()=>{
 const text=await guide().text();
 assert.ok(text.includes('/remixes/star-circuit/v2.json'));assert.ok(text.includes('/remixes/star-circuit/assistant-handoff-v2.txt'));
 assert.match(text,/Share a public link to your edited JSON/);assert.match(text,/Feedback is text-only, limited to 3000 characters, and has no file upload/);
 assert.match(text,/Use \/remix-return for your source\/build references, pinned parents, rights and build\/test notes/);
 const handoff=readFileSync(new URL('../public/remixes/datakin-relay/assistant-handoff.txt',import.meta.url),'utf8');assert.match(handoff,/only have JSON, use \/feedback with its public link/);
});
test('Datakin route plus notes can exceed feedback cap; the documented link-only return persists privately',async()=>{
 const route=readFileSync(new URL('../public/remixes/datakin-relay/relay-challenge.json',import.meta.url),'utf8');
 const message=route+'\nINTERNAL DEVELOPER FIXTURE: '+('Build and test notes. '.repeat(12));assert.ok(message.length>3000);
 const input={submissionId:'guidance-internal-fixture-0001',category:'other',area:'remixing',message,device:''};
 await assert.rejects(submitFeedback(input,'guidance-fixture'),e=>e.status===400&&e.message.includes('3000'));
 const brief='INTERNAL DEVELOPER FIXTURE — JSON-only setup help. Public source: https://example.org/route.json . No playable build yet. Geometry-only change; original credit retained. Not an independent creator return.';
 const saved=await submitFeedback({...input,message:brief},'guidance-fixture');
 const queue=await feedbackQueue('guidance-reviewer');assert.equal(queue.feedback.find(row=>row.id===saved.id).message,brief);assert.equal(saved.status,'new');
});
