import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {EventEmitter} from 'node:events';
import {PNPM_VERSION,verifyPnpmEntrypoint,dependencySnapshot,acquireLease,portablePlan,runBounded,installPortable,managedInstall,resolveWindowsTaskkill} from '../scripts/install-project.mjs';
function fixture(t){const root=mkdtempSync(path.join(tmpdir(),'gc-install-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));writeFileSync(path.join(root,'package.json'),JSON.stringify({packageManager:'pnpm@11.25.0'}));writeFileSync(path.join(root,'pnpm-lock.yaml'),'lockfileVersion: 9\n');const pack=path.join(root,'pnpm');mkdirSync(pack);mkdirSync(path.join(pack,'bin'));writeFileSync(path.join(pack,'package.json'),JSON.stringify({name:'pnpm',version:PNPM_VERSION,bin:{pnpm:'bin/pnpm.cjs'}}));const entry=path.join(pack,'bin','pnpm.cjs');writeFileSync(entry,'// fake fixture; never executed');return {root,entry}}
test('requires pinned declared pnpm executable, rejecting missing/malicious paths without execution',t=>{const {entry,root}=fixture(t);assert.equal(verifyPnpmEntrypoint(entry),entry);for(const invalid of [undefined,'pnpm','notabsolute',path.join(root,'absent')])assert.throws(()=>verifyPnpmEntrypoint(invalid));writeFileSync(path.join(root,'pnpm','package.json'),JSON.stringify({name:'not-pnpm',version:PNPM_VERSION,bin:'bin/pnpm.cjs'}));assert.throws(()=>verifyPnpmEntrypoint(entry),/pinned pnpm/)});
test('atomic lease refuses concurrent/stale ownership, no automatic cleanup',t=>{const {root}=fixture(t),lease=acquireLease(root);assert.throws(()=>acquireLease(root),/interrupted/);lease.release();const second=acquireLease(root);second.release();assert.equal(existsSync(path.join(root,'.sites-runtime','portable-install.lock')),false)});
test('symlink runtime rejected instead of writing through it',t=>{const {root}=fixture(t);const other=path.join(root,'other');mkdirSync(other);try{symlinkSync(other,path.join(root,'.sites-runtime'),'dir')}catch(e){if(e.code==='EPERM'){t.skip('symlink privilege unavailable');return}throw e}assert.throws(()=>acquireLease(root),/real directories/)});
test('portable plan retains frozen lockfile and project-local cache without shell interpolation',t=>{const {root,entry}=fixture(t),p=portablePlan(root,entry,{});assert.equal(p.executable,process.execPath);assert.equal(p.args[0],entry);assert.ok(p.args.includes('--frozen-lockfile'));assert.ok(p.args.includes(path.join(root,'.sites-runtime','pnpm-store')));assert.equal(p.env.CI,'true');assert.equal(p.args.includes('--force'),false);assert.equal(managedInstall({SITES_MANAGED_LINUX_CONTAINER:'1'},'portable'),true);assert.equal(managedInstall({},'portable'),false)});
test('portable install runs version once and one frozen install, retaining dependency inputs',async t=>{const {root,entry}=fixture(t);const before=dependencySnapshot(root),calls=[];await installPortable({root,env:{npm_execpath:entry},runner:async(exe,args,opts)=>{calls.push({exe,args,opts});if(args.includes('--version'))return {code:0,stdout:'11.25.0\n'};mkdirSync(path.join(root,'node_modules','vinext','dist'),{recursive:true});writeFileSync(path.join(root,'node_modules','vinext','dist','cli.js'),'');return {code:0}}});assert.equal(calls.length,2);assert.equal(calls[0].opts.timeoutMs,30000);assert.equal(calls[1].opts.timeoutMs,480000);assert.deepEqual(dependencySnapshot(root),before);assert.equal(existsSync(path.join(root,'.sites-runtime','portable-install.lock')),false)});
test('wrong pnpm version cannot start install and lease is released',async t=>{const {root,entry}=fixture(t);let n=0;await assert.rejects(installPortable({root,env:{npm_execpath:entry},runner:async()=>{n++;return {code:0,stdout:'10.0.0'}}}),/version verification/);assert.equal(n,1);assert.equal(existsSync(path.join(root,'.sites-runtime','portable-install.lock')),false)});
test('changed dependency inputs fail closed after install',async t=>{const {root,entry}=fixture(t);await assert.rejects(installPortable({root,env:{npm_execpath:entry},runner:async(exe,args)=>{if(args.includes('--version'))return {code:0,stdout:PNPM_VERSION};writeFileSync(path.join(root,'pnpm-lock.yaml'),'changed');return {code:0}}}),/inputs changed/)});
test('unconfirmed termination retains lease for explicit inspection',async t=>{const {root,entry}=fixture(t);await assert.rejects(installPortable({root,env:{npm_execpath:entry},runner:async()=>{const e=Error('owned child unknown');e.keepLease=true;throw e}}),/unknown/);assert.ok(existsSync(path.join(root,'.sites-runtime','portable-install.lock')))});
test('Windows timeout terminates only captured child PID tree, without shell',async()=>{const child=new EventEmitter();child.pid=12345;let invocation;const promise=runBounded('node',['test'],{platform:'win32',resolveTaskkill:()=>String.raw`C:\Windows\System32\taskkill.exe`,timeoutMs:1,spawnChild:()=>child,killWindows:(exe,args,opts)=>{invocation={exe,args,opts};queueMicrotask(()=>{child.emit('exit',1,null);child.emit('close',1,null)});return {status:0}}});await assert.rejects(promise,/timed out/);assert.equal(invocation.exe,String.raw`C:\Windows\System32\taskkill.exe`);assert.deepEqual(invocation.args,['/PID','12345','/T','/F']);assert.equal(invocation.opts.shell,false)});
test('failed owned-tree termination fails closed rather than claiming completion',async()=>{const child=new EventEmitter();child.pid=23456;await assert.rejects(runBounded('node',['test'],{platform:'win32',resolveTaskkill:()=>String.raw`C:\Windows\System32\taskkill.exe`,timeoutMs:1,spawnChild:()=>child,killWindows:()=>({status:1})}),e=>e.keepLease===true)});
test('successful child completion is never followed by a kill',async()=>{const child=new EventEmitter();child.pid=34567;let killed=false;const p=runBounded('node',['test'],{platform:'win32',resolveTaskkill:()=>String.raw`C:\Windows\System32\taskkill.exe`,timeoutMs:100,spawnChild:()=>{queueMicrotask(()=>{child.emit('exit',0,null);child.emit('close',0,null)});return child},killWindows:()=>{killed=true;return {status:0}}});assert.equal((await p).code,0);assert.equal(killed,false)});

test('dependency mutation during bootstrap cannot proceed to installation',async t=>{const {root,entry}=fixture(t);let n=0;await assert.rejects(installPortable({root,env:{npm_execpath:entry},runner:async()=>{n++;writeFileSync(path.join(root,'pnpm-lock.yaml'),'changed before install');return {code:0,stdout:PNPM_VERSION}}}),/inputs changed before/);assert.equal(n,1)});

test('parent exit with descendant-held stdout times out, retaining lease without killing a reusable PID',async()=>{
 for(const platform of ['win32','linux']){
  const child=new EventEmitter();child.pid=45678;child.stdout=new EventEmitter();let kills=0,destroyed=false,unrefed=false;child.stdout.destroy=()=>{destroyed=true};child.unref=()=>{unrefed=true};
  const p=runBounded('node',['test'],{platform,capture:true,timeoutMs:5,spawnChild:()=>{queueMicrotask(()=>child.emit('exit',0,null));return child},killProcess:()=>{kills++},killWindows:()=>{kills++;return {status:0}}});
  await assert.rejects(p,e=>e.keepLease===true);assert.equal(kills,0);assert.equal(destroyed,true);assert.equal(unrefed,true);
 }
});
test('POSIX cancelled parent exit and close do not establish descendant termination',async()=>{
 const child=new EventEmitter();child.pid=56789;const kills=[];
 const p=runBounded('node',['test'],{platform:'linux',timeoutMs:1,spawnChild:()=>child,killProcess:(pid,signal)=>{kills.push({pid,signal});queueMicrotask(()=>{child.emit('exit',null,'SIGTERM');child.emit('close',null,'SIGTERM')})}});
 await assert.rejects(p,e=>e.keepLease===true);assert.deepEqual(kills,[{pid:-56789,signal:'SIGTERM'}]);
});
test('POSIX cancellation close without exit still retains lease',async()=>{
 const child=new EventEmitter();child.pid=67890;
 const p=runBounded('node',['test'],{platform:'linux',timeoutMs:1,spawnChild:()=>child,killProcess:()=>{queueMicrotask(()=>child.emit('close',1,null))}});
 await assert.rejects(p,e=>e.keepLease===true);
});

test('Windows taskkill uses validated absolute system executable, never lifecycle PATH',()=>{
 const fs={lstatSync:p=>({isSymbolicLink:()=>false,isFile:()=>p.endsWith('.exe'),isDirectory:()=>!p.endsWith('.exe')}),realpathSync:p=>p};
 assert.equal(resolveWindowsTaskkill({SystemRoot:String.raw`C:\Windows`},fs),String.raw`C:\Windows\System32\taskkill.exe`);
 for(const root of [undefined,'Windows',String.raw`\\server\Windows`,String.raw`C:\other\..\Windows`])assert.throws(()=>resolveWindowsTaskkill({SystemRoot:root},fs));
 assert.throws(()=>resolveWindowsTaskkill({SystemRoot:String.raw`C:\Windows`},{...fs,realpathSync:()=>String.raw`C:\project\shim.exe`}));
});
test('missing trusted Windows taskkill retains lease without executing a PATH fallback',async()=>{
 const child=new EventEmitter();child.pid=78901;let calls=0;
 await assert.rejects(runBounded('node',['test'],{platform:'win32',timeoutMs:1,spawnChild:()=>child,resolveTaskkill:()=>{throw Error('missing')},killWindows:()=>{calls++;return {status:0}}}),e=>e.keepLease===true);
 assert.equal(calls,0);
});

test('portable installer does not coerce numeric network settings with config CLI overrides',t=>{const {root,entry}=fixture(t);const args=portablePlan(root,entry).args;assert(!args.some(v=>v.startsWith('--config.fetch-')));const yaml=readFileSync(new URL('../pnpm-workspace.yaml',import.meta.url),'utf8');assert.match(yaml,/^fetchRetries: 0$/m);assert.match(yaml,/^fetchTimeout: 30000$/m)});
