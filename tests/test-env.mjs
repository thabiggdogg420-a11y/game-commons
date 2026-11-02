import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
class Statement{constructor(query,args=[]){this.query=query;this.args=args}bind(...args){return new Statement(this.query,args)}async all(){return {success:true,results:sql.prepare(this.query).all(...this.args)}}async raw(){const stmt=sql.prepare(this.query);stmt.setReturnArrays(true);return stmt.all(...this.args)}async run(){const info=sql.prepare(this.query).run(...this.args);return {success:true,results:[],meta:{changes:Number(info.changes),last_row_id:Number(info.lastInsertRowid)}}}async first(){return (await this.all()).results[0]??null}}
const objects=new Map();
export const env={DB:{prepare:q=>new Statement(q),async batch(statements){sql.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}},BUCKET:{async put(k,v){objects.set(k,v)},async get(k){return objects.has(k)?{text:async()=>objects.get(k)}:null},async delete(k){objects.delete(k)}}};
// Tests never reach the public pinned snapshot unless explicitly mocked by a snapshot test.
const originalFetch=globalThis.fetch;globalThis.fetch=(input,init)=>String(input).includes('/catalogues/games4free/')?Promise.reject(new Error('Snapshot not enabled in this test')):originalFetch(input,init);
