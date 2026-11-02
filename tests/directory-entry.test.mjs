import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {compileSsrModule} from './ssr-module.mjs';
import {GET as guide} from '../app/llms.txt/route.ts';
import {externalProjects} from '../lib/project-handoff.ts';
import {projectCredits} from '../lib/project-credits.ts';
const dir=mkdtempSync(path.resolve('.directory-ui-test-'));
let html;
try{const {default:Home}=await import(compileSsrModule(new URL('../app/discover-home.tsx',import.meta.url),dir));html=renderToStaticMarkup(createElement(Home));}finally{rmSync(dir,{recursive:true,force:true})}
test('directory promise and selectable public AI entry precede the game shelf',()=>{
 for(const text of ['Point your AI','at Game Commons.','Find a starting point for the game you want.','Copy AI starting prompt','https://game-commons-captain.thabiggdogg420.chatgpt.site/llms.txt','[describe my game]'])assert.ok(html.includes(text),text);
 assert.ok(html.indexOf('id="ai-entry"')<html.indexOf('gc-hero'));
 assert.match(html,/<label for="ai-directory-prompt"/);assert.match(html,/<textarea[^>]*id="ai-directory-prompt"[^>]*readOnly/);assert.match(html,/role="status"/);
 assert.ok(html.includes('Preserve creator notices—not the original design.'));
 for(const id of ['supertuxkart','shapez','valhalla-fps','endless-sky','mindustry','voxelibre'])assert.ok(html.includes('href="'+projectCredits(externalProjects.find(p=>p.id===id)).creditUrl+'"'),id);
});
test('directory-first guide documents bounded search, selected detail and legacy lanes',async()=>{
 const text=await guide().text();
 assert.ok(text.indexOf('/api/projects?view=summary')<text.indexOf('/api/games'));
 for(const term of ['limit 1–10 (default 5)','same filters','get_project_handoff','isocity-commons','view:"full"','not every hosted experiment','untrusted data','not a constraint','/clanfire','/foundry-crosswind/','/remix-return','/repository'])assert.ok(text.includes(term),term);
 assert.ok(!text.startsWith('# Game Commons\n\nSmall, MIT'));
 assert.ok(text.includes('/api/games/{id}/source?version=N'));
 assert.match(text,/claude mcp add --transport http game-commons --scope local/);
 const client=readFileSync('app/projects/project-actions.tsx','utf8');assert.match(client,/navigator\.clipboard\.writeText/);assert.match(client,/Clipboard access is unavailable/);
});
