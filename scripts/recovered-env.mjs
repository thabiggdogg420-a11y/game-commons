// Read-only adapters for exercising real application reads after an offline restore.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=process.env.GAME_COMMONS_RECOVERY_DIRECTORY;
if(!root)throw Error('An isolated recovery directory is required');
const db=new DatabaseSync(path.join(root,'database.sqlite'),{readOnly:true});
class Statement{
 constructor(query,args=[]){this.query=query;this.args=args}
 bind(...args){return new Statement(this.query,args)}
 async all(){return {success:true,results:db.prepare(this.query).all(...this.args)}}
 async raw(){const statement=db.prepare(this.query);statement.setReturnArrays(true);return statement.all(...this.args)}
 async first(){return (await this.all()).results[0]??null}
}
export const env={DB:{prepare:query=>new Statement(query)},BUCKET:{async get(key){if(!/^games\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.html$/.test(key))throw Error('Unsafe recovered object key');const filename=path.join(root,'objects',key);return existsSync(filename)?{text:async()=>readFileSync(filename,'utf8')}:null}}};
