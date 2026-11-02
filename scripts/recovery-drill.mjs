// Offline restore drill only. Never connects to or writes a hosted database.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,writeFileSync,mkdirSync,existsSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const originalTables=['games','versions','contributor_usage','reports','report_usage','moderation_events','moderation_holds','version_submissions'];
function tableNames(snapshot){
 assert.ok(['game-commons-recovery-v1','game-commons-recovery-v2','game-commons-recovery-v3'].includes(snapshot.format),'Unknown snapshot format');
 return snapshot.format==='game-commons-recovery-v3'?[...originalTables,'feedback','feedback_usage','traffic_visits']:snapshot.format==='game-commons-recovery-v2'?[...originalTables,'feedback','feedback_usage']:originalTables;
}
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
const canonical=rows=>rows.map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))))).sort().join('\n');
function inspect(snapshot){
 const tables=tableNames(snapshot);
 assert.deepEqual(Object.keys(snapshot.tables).sort(),[...tables].sort(),'Snapshot must include every application table');
 const objects=new Map();
 for(const item of snapshot.sources){
  assert.match(item.objectKey,/^games\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.html$/,'Unsafe object key');
  assert.equal(typeof item.source,'string');assert.ok(!objects.has(item.objectKey),'Duplicate object key');objects.set(item.objectKey,item);
 }
 const versions=snapshot.tables.versions.rows;
 assert.equal(objects.size,versions.length,'Missing or extra source objects');
 for(const version of versions){
  assert.equal(version.id,version.game_id+':'+version.number,'Inconsistent version ID');
  assert.ok(Number.isSafeInteger(version.number)&&version.number>0,'Invalid version number');
  assert.match(version.sha256,/^[a-f0-9]{64}$/,'Invalid saved hash');
  const object=objects.get(version.object_key);assert.ok(object,'Missing version object');
  assert.equal(object.gameId,version.game_id);assert.equal(object.number,version.number);
  assert.equal(Buffer.byteLength(object.source),version.bytes,'Source byte length mismatch');
  assert.equal(sha(object.source),version.sha256,'Source hash mismatch');
 }
 for(const game of snapshot.tables.games.rows){
  const retained=versions.filter(v=>v.game_id===game.id).sort((a,b)=>a.number-b.number);
  assert.equal(retained.length,game.latest_version,'Missing retained version');
  assert.deepEqual(retained.map(v=>v.number),Array.from({length:game.latest_version},(_,i)=>i+1),'Version history has gaps');
 }
 return objects;
}
export function restoreAndVerify(snapshot,destination){
 const objects=inspect(snapshot),tables=tableNames(snapshot);assert.ok(!existsSync(destination),'Restore destination must not exist');
 mkdirSync(destination,{recursive:true,mode:0o700});const db=new DatabaseSync(path.join(destination,'database.sqlite'));
 try{
  db.exec('PRAGMA foreign_keys=ON');
  const journal=JSON.parse(readFileSync(path.join(root,'drizzle/meta/_journal.json'),'utf8'));
  for(const entry of journal.entries){assert.match(entry.tag,/^[a-zA-Z0-9_]+$/);db.exec(readFileSync(path.join(root,'drizzle',entry.tag+'.sql'),'utf8'))}
  db.exec('BEGIN');
  try{for(const table of tables){
   const item=snapshot.tables[table];let columns=db.prepare('PRAGMA table_info("'+table+'")').all().map(c=>c.name);
   // v2 predates optional feedback attribution; every other column is still required.
   if(snapshot.format==='game-commons-recovery-v2'&&table==='feedback'&&!item.columns.includes('attribution'))columns=columns.filter(c=>c!=='attribution');
   assert.deepEqual([...item.columns].sort(),[...columns].sort(),'Column mismatch: '+table);
   const statement=db.prepare('INSERT INTO "'+table+'" ('+columns.map(c=>'"'+c+'"').join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')');
   for(const row of item.rows){assert.deepEqual(Object.keys(row).sort(),[...columns].sort(),'Incomplete row');statement.run(...columns.map(c=>row[c]))}
  }db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[],'Foreign key failure');
  assert.equal(Object.values(db.prepare('PRAGMA integrity_check').get())[0],'ok');
  const counts={};for(const table of tables){const columns=snapshot.tables[table].columns;const rows=db.prepare('SELECT '+columns.map(c=>'"'+c+'"').join(',')+' FROM "'+table+'"').all();assert.equal(canonical(rows),canonical(snapshot.tables[table].rows),'Restored table differs: '+table);counts[table]=rows.length}
  for(const [key,object] of objects){const target=path.join(destination,'objects',key);mkdirSync(path.dirname(target),{recursive:true,mode:0o700});writeFileSync(target,object.source,{mode:0o600,flag:'wx'});assert.equal(sha(readFileSync(target)),sha(object.source))}
  return {checkedAt:new Date().toISOString(),mode:'isolated local SQLite and filesystem object restore',projectId:snapshot.projectId,sourceCommit:snapshot.sourceCommit,tables:counts,restoredSourceObjects:objects.size,allRowsEqual:true,allSourceHashesMatch:true,foreignKeysValid:true,databaseIntegrity:'ok',productionRestorePerformed:false,limitations:['Capture was stable across two reads, not a transactionally frozen production snapshot.','Empty production tables restore as empty; their populated-data behaviour is covered separately by integration tests.','No hosted D1/R2 import or failover capability has been verified.','Environment secrets, access grants, platform metadata and unreferenced R2 objects are not included.']};
 }catch(e){db.close();rmSync(destination,{recursive:true,force:true});throw e}finally{try{db.close()}catch{}}
}
export function corruptionChecks(snapshot){
 assert.ok(snapshot.sources.length,'Need source data for corruption checks');
 const broken=structuredClone(snapshot);broken.sources[0].source+='damage';assert.throws(()=>inspect(broken));
 const missing=structuredClone(snapshot);missing.sources.pop();assert.throws(()=>inspect(missing));
 const altered=structuredClone(snapshot);const text=altered.sources[0].source;altered.sources[0].source=(text[0]==='X'?'Y':'X')+text.slice(1);assert.throws(()=>inspect(altered));
 return {truncatedOrExtendedSourceRejected:true,missingSourceRejected:true,equalLengthCorruptionRejected:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [input,destination]=process.argv.slice(2);assert.ok(input&&destination,'Usage: node scripts/recovery-drill.mjs snapshot.json NEW_RESTORE_DIRECTORY');
  const bytes=readFileSync(input);assert.ok(bytes.length<=32*1024*1024,'This bounded drill accepts at most 32 MB');const snapshot=JSON.parse(bytes);
  const result={...restoreAndVerify(snapshot,path.resolve(destination)),snapshotSha256:sha(bytes),negativeChecks:corruptionChecks(snapshot)};console.log(JSON.stringify(result,null,2));
 }catch(error){console.error('Recovery drill failed: '+(error instanceof Error?error.message:'Unknown failure'));process.exitCode=1}
}
