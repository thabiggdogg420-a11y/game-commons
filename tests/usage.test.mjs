import {test} from 'node:test';import assert from 'node:assert/strict';
import {env} from './test-env.mjs';import {POST} from '../app/api/usage/route.ts';import {createUsageSender} from '../lib/usage-client.mjs';
const req=(data,origin='https://test',headers={})=>new Request('https://test/api/usage',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:typeof data==='string'?data:JSON.stringify(data)});
test('aggregate endpoint writes only day,event,count and rejects identifiers/extras/foreign bodies',async()=>{
 for(const body of [{event:'landing',id:'private'},{event:'bad'},[],null,{event:'start',message:'private'}])assert.notEqual((await POST(req(body))).status,202);
 assert.equal((await POST(req({event:'landing'},'https://evil'))).status,403);
 assert.equal((await POST(req('x'.repeat(65)))).status,413);
 assert.equal((await POST(req({event:'landing'},'https://test',{'content-type':'text/plain'}))).status,415);
 assert.equal((await POST(req({event:'landing'}))).status,202);
 const rows=(await env.DB.prepare('SELECT * FROM usage_daily').all()).results;
 assert.deepEqual(Object.keys(rows[0]).sort(),['count','day','event']);assert.equal(rows[0].count,1);
});
test('retention removes expired aggregate days, caps values and handles DB failure',async()=>{
 await env.DB.prepare("INSERT INTO usage_daily VALUES('2000-01-01','start',2)").run();
 const day=new Date().toISOString().slice(0,10);await env.DB.prepare('INSERT INTO usage_daily VALUES(?,?,?)').bind(day,'start',9999).run();
 for(let i=0;i<3;i++)assert.equal((await POST(req({event:'start'}))).status,202);
 assert.equal((await env.DB.prepare("SELECT count FROM usage_daily WHERE event='start'").first()).count,10000);
 assert.equal((await env.DB.prepare("SELECT * FROM usage_daily WHERE day='2000-01-01'").all()).results.length,0);
 const saved=env.DB;env.DB={batch(){throw Error('private failure')}};try{const r=await POST(req({event:'complete'}));assert.equal(r.status,503);assert.equal(await r.text(),'{}');}finally{env.DB=saved;}
});
test('in-memory once/event, QA excluded, no credentials/referrer/content and failure never escapes',async()=>{
 const calls=[];const record=createUsageSender((...args)=>{calls.push(args);return Promise.resolve()});
 for(let i=0;i<100;i++)record('start');record('landing');record('complete');record('evil');assert.equal(calls.length,3);
 for(const [url,options] of calls){assert.equal(url,'/api/usage');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.deepEqual(Object.keys(JSON.parse(options.body)),['event']);}
 createUsageSender(()=>{throw Error('should not run')},true)('landing');
 const failed=createUsageSender(()=>{throw Error('network')});assert.doesNotThrow(()=>failed('landing'));failed('landing');
 const rejected=createUsageSender(()=>Promise.reject(Error('offline')));rejected('start');await new Promise(r=>setTimeout(r,0));
});

test('static Foundry actual script excludes QA and dedupes downloads with no identifiers',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');const calls=[],handlers={};const location={search:'?measurement_test=1',href:'https://test/foundry-crosswind/',origin:'https://test'};
 const context={location,URL,Set,fetch:(...x)=>{calls.push(x);return Promise.resolve()},document:{addEventListener:(n,fn)=>handlers[n]=fn}};
 runInNewContext(readFileSync('public/usage-counter.js','utf8'),context);assert.equal(calls.length,0);
 location.search='';const a={href:'https://test/foundry-crosswind/source.zip',hasAttribute:()=>false};const e={target:{closest:()=>a}};for(let i=0;i<10;i++)handlers.click(e);assert.equal(calls.length,1);assert.deepEqual(JSON.parse(calls[0][1].body),{event:'start'});
 location.search='?gc_test=1';handlers.click(e);assert.match(a.href,/measurement_test=1/);assert.equal(calls.length,1);

});
test('React tracker rechecks QA query after non-QA initialization',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');const ts=await import('typescript');let source=readFileSync('app/usage-tracker.tsx','utf8').replace(/^import .*;$/gm,'').replace('export default function','function').replace('export function','function');source=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const calls=[],location={search:'',pathname:'/'},context={window:{},location,URLSearchParams,createUsageSender,fetch:(...x)=>{calls.push(x);return Promise.resolve()},useEffect:()=>{}};
 runInNewContext(source+';recordUsage("landing");',context);assert.equal(calls.length,1);location.search='?measurement_test=1';runInNewContext('recordUsage("start");recordUsage("complete");',context);assert.equal(calls.length,1);
});
