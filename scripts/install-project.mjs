import {spawn, spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmdirSync, unlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readExecutionProfile} from './execution-profile.mjs';

export const PNPM_VERSION='11.25.0';
export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const inputs=['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','.npmrc'];
export function dependencySnapshot(root){
 return Object.fromEntries(inputs.map(name=>[name,existsSync(path.join(root,name))?createHash('sha256').update(readFileSync(path.join(root,name))).digest('hex'):null]));
}
export function verifyPnpmEntrypoint(entry){
 if(typeof entry!=='string'||!path.isAbsolute(entry)||!lstatSync(entry,{throwIfNoEntry:false})?.isFile())throw Error('Official pnpm run must provide an absolute, regular npm_execpath.');
 const actual=realpathSync(entry);let dir=path.dirname(actual);
 for(let i=0;i<5;i++,dir=path.dirname(dir)){
  const manifest=path.join(dir,'package.json');if(!existsSync(manifest))continue;
  const pkg=JSON.parse(readFileSync(manifest,'utf8'));
  if(pkg.name!=='pnpm'||pkg.version!==PNPM_VERSION)throw Error('Installer requires the pinned pnpm 11.25.0 package entrypoint.');
  const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin?.pnpm;
  if(typeof bin!=='string'||realpathSync(path.resolve(dir,bin))!==actual)throw Error('npm_execpath is not the declared pnpm executable.');
  return actual;
 }
 throw Error('Cannot establish pnpm entrypoint provenance; use the official Sites installer.');
}
function realDirectory(directory){
 const info=lstatSync(directory,{throwIfNoEntry:false});
 if(info&&(!info.isDirectory()||info.isSymbolicLink()))throw Error('Installer runtime paths must be real directories, not links.');
 if(!info)mkdirSync(directory);
}
export function acquireLease(root){
 const runtime=path.join(root,'.sites-runtime');realDirectory(runtime);
 const lease=path.join(runtime,'portable-install.lock');
 try{mkdirSync(lease)}catch(error){if(error.code==='EEXIST')throw Error('Another or interrupted portable install owns the lease; inspect it before retrying.');throw error}
 const token=randomUUID();
 try{writeFileSync(path.join(lease,'owner.json'),JSON.stringify({pid:process.pid,token}),{flag:'wx'})}catch(error){try{rmdirSync(lease)}catch{}throw error}
 let released=false;
 return {runtime,release(){if(released)return;const owner=JSON.parse(readFileSync(path.join(lease,'owner.json'),'utf8'));if(owner.token!==token)throw Error('Install lease ownership changed; preserving it.');unlinkSync(path.join(lease,'owner.json'));rmdirSync(lease);released=true;}};
}
export function portablePlan(root,entry,env=process.env){
 const runtime=path.join(root,'.sites-runtime'),store=path.join(runtime,'pnpm-store');
 return {executable:process.execPath,args:[entry,'install','--frozen-lockfile','--store-dir',store,'--cache-dir',path.join(store,'policy-cache'),'--config.package-import-method=auto'],env:{...env,CI:'true',SITES_PNPM_SHARED_STORE:store,HOME:path.join(runtime,'home'),USERPROFILE:path.join(runtime,'home'),XDG_CACHE_HOME:path.join(runtime,'xdg-cache'),XDG_DATA_HOME:path.join(runtime,'xdg-data'),npm_config_cache:path.join(runtime,'npm-cache'),npm_config_audit:'false',npm_config_fund:'false',npm_config_update_notifier:'false'}};
}
// Do not search npm's lifecycle PATH (which includes project-controlled bins).
export function resolveWindowsTaskkill(env=process.env,fs={lstatSync,realpathSync}){
 const root=env.SystemRoot||env.SYSTEMROOT;
 if(typeof root!=='string'||! /^[A-Za-z]:[\\/]/.test(root)||root.includes('..'))throw Error('Trusted Windows system directory unavailable.');
 const systemRoot=path.win32.normalize(root),exe=path.win32.join(systemRoot,'System32','taskkill.exe');
 for(const target of [systemRoot,path.win32.dirname(exe),exe]){
  const info=fs.lstatSync(target,{throwIfNoEntry:false});
  if(!info||info.isSymbolicLink()||(target===exe?!info.isFile():!info.isDirectory())||path.win32.normalize(fs.realpathSync(target)).toLowerCase()!==target.toLowerCase())throw Error('Trusted Windows taskkill path unavailable.');
 }
 return exe;
}
// Spawn argument arrays only. A timeout/cancel targets only this owned child/tree.
export function runBounded(executable,args,{cwd,env=process.env,timeoutMs=480000,capture=false,platform=process.platform,spawnChild=spawn,killProcess=process.kill,killWindows=spawnSync,resolveTaskkill=resolveWindowsTaskkill}={}){
 return new Promise((resolve,reject)=>{
  let child,exited=false,settled=false,timer,killTimer,output='',reason;
  const signals=['SIGINT','SIGTERM','SIGHUP'];
  const handlers=signals.map(signal=>[signal,()=>stop('cancelled')]);
  function cleanup(){clearTimeout(timer);clearTimeout(killTimer);for(const [s,h] of handlers)process.removeListener(s,h)}
  function finish(error,value){if(settled)return;settled=true;cleanup();error?reject(error):resolve(value)}
  function terminationFailure(){
   // Unconfirmed descendants keep the lease, not this dispatcher's event loop.
   child?.stdout?.destroy?.();child?.unref?.();
   const error=Error('Unable to confirm owned installer termination; lease retained.');error.keepLease=true;finish(error)}
  function stop(why){
   if(settled||reason)return;reason=why;
   // Parent exit is not tree completion (a descendant may still hold stdout).
   // Never target an exited/reusable PID; retain the lease for inspection.
   if(exited)return terminationFailure();
   if(!Number.isSafeInteger(child?.pid)||child.pid<=0)return terminationFailure();
   if(platform==='win32'){
    let taskkill;try{taskkill=resolveTaskkill(env)}catch{return terminationFailure()}
    const killed=killWindows(taskkill,['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',timeout:15000,windowsHide:true,shell:false});
    if(killed.error||killed.status!==0)return terminationFailure();
    killTimer=setTimeout(terminationFailure,15000);
   }else{
    try{killProcess(-child.pid,'SIGTERM')}catch(error){if(error.code!=='ESRCH')return terminationFailure()}
    killTimer=setTimeout(()=>{if(settled)return;if(exited)return terminationFailure();try{killProcess(-child.pid,'SIGKILL')}catch(error){if(error.code!=='ESRCH')return terminationFailure()}killTimer=setTimeout(terminationFailure,15000)},15000);
   }
  }
  try{child=spawnChild(executable,args,{cwd,env,shell:false,windowsHide:true,detached:platform!=='win32',stdio:['ignore',capture?'pipe':'inherit','inherit']})}catch(error){finish(error);return}
  child.once('error',error=>{if(Number.isSafeInteger(child.pid)&&child.pid>0)return terminationFailure();finish(error)});
  child.once('exit',()=>{exited=true;
   // POSIX parent exit/stdio closure cannot prove that its descendants died.
   // Fail closed rather than release the lease or signal a reused process ID.
   if(reason&&platform!=='win32')terminationFailure();
  });
  child.stdout?.on('data',chunk=>{output+=chunk;if(output.length>4096)stop('oversized version output')});
  child.once('close',(code,signal)=>{
   if(reason&&platform!=='win32')return terminationFailure();
   finish(reason?Error(`Installer ${reason}.`):null,{code:code??1,signal,stdout:output});
  });
  for(const [s,h] of handlers)process.on(s,h);
  timer=setTimeout(()=>stop('timed out'),timeoutMs);
 });
}
export async function installPortable({root=projectRoot,env=process.env,runner=runBounded}={}){
 const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
 if(pkg.packageManager!==`pnpm@${PNPM_VERSION}`||!existsSync(path.join(root,'pnpm-lock.yaml')))throw Error('Preserve the pinned pnpm manager and lockfile before installation.');
 const entry=verifyPnpmEntrypoint(env.npm_execpath),lease=acquireLease(root);let retain=false;
 try{
  const before=dependencySnapshot(root);
  for(const name of ['home','pnpm-store','npm-cache','xdg-cache','xdg-data'])realDirectory(path.join(lease.runtime,name));
  realDirectory(path.join(lease.runtime,'pnpm-store','policy-cache'));
  const modules=lstatSync(path.join(root,'node_modules'),{throwIfNoEntry:false});if(modules?.isSymbolicLink())throw Error('node_modules must not be a symlink to another checkout.');
  const plan=portablePlan(root,entry,env);
  const version=await runner(process.execPath,[entry,'--version'],{cwd:root,env:plan.env,timeoutMs:30000,capture:true});
  if(version.code!==0||version.signal||version.stdout.trim()!==PNPM_VERSION)throw Error('Pinned pnpm version verification failed.');
  if(JSON.stringify(before)!==JSON.stringify(dependencySnapshot(root)))throw Error('Dependency inputs changed before installation; stop and inspect before retrying.');
  const result=await runner(plan.executable,plan.args,{cwd:root,env:plan.env,timeoutMs:480000});
  if(JSON.stringify(before)!==JSON.stringify(dependencySnapshot(root)))throw Error('Dependency inputs changed during installation; stop and inspect before retrying.');
  if(result.code!==0||result.signal)throw Error('Frozen pnpm installation failed. No package-manager fallback was attempted.');
  if(!existsSync(path.join(root,'node_modules','vinext','dist','cli.js')))throw Error('Install exited successfully but the Vinext CLI is missing.');
  console.log('Pinned portable pnpm installation complete.');
 }catch(error){retain=error.keepLease===true;throw error}finally{if(!retain)lease.release()}
}
export function managedInstall(env=process.env,profile=readExecutionProfile()){return env.SITES_MANAGED_LINUX_CONTAINER==='1'||profile==='managed-linux'}
export async function main(){
 if(process.argv.length>2)throw Error('Use install:ci without arguments.');
 if(managedInstall()){
  const result=spawnSync('bash',[path.join(projectRoot,'scripts','install-pnpm.sh')],{stdio:'inherit'});
  if(result.error)throw result.error;process.exitCode=result.status??1;return;
 }
 await installPortable();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1});
