import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {externalImportError} from '../lib/external-import-error.ts';
test('import failures expose fixed safe diagnostics, never raw error details',()=>{
 for(const [message,stage,status,code] of [
 ['Cross-origin writes are not permitted','identity',403,'origin-denied'],
 ['Sign in to contribute','identity',401,'sign-in-required'],
 ['invalid json secret-user','body',400,'invalid-request-body'],
 ['D1_ERROR too many queries secret-user','database',503,'database-limit'],
 ['Cannot perform I/O on behalf of a different request secret-user','database',503,'database-context'],
 ['no such table secret-user','database',503,'database-schema'],
 ['D1_ERROR internal secret-user','database',503,'database-transient'],
 ['secret-user','database',503,'database-unavailable']]){
 const result=externalImportError(new Error(message),stage);assert.equal(result.status,status);assert.equal(result.code,code);assert.ok(!JSON.stringify(result).includes('secret-user'));
 }
});
test('read-only status can restore readiness only for exact complete staging generation',()=>{
 const client=readFileSync(new URL('../app/moderation/external-catalogue/import-client.tsx',import.meta.url),'utf8');
 assert.match(client,/type==='status'&&id===generation&&result.state==='staging'/);
 assert.match(client,/Number.isInteger\(result.loaded\)&&result.loaded===result.expected&&Number\(result.expected\)>0/);
});
test('nested D1 causes retain only allowlisted identifiers and safe categories',()=>{
 const result=externalImportError(new Error('D1_ERROR generic',{cause:new Error('SQLITE_BUSY secret-token SQL INSERT public data')}),'database');assert.equal(result.code,'database-busy');assert.deepEqual(result.causeCodes,['D1_ERROR','SQLITE_BUSY']);assert.doesNotMatch(JSON.stringify(result),/secret-token|INSERT|public data/);
 assert.equal(externalImportError(new Error('D1_ERROR',{cause:new Error('SQLITE_CONSTRAINT unique constraint failed private_email')}),'database').code,'database-constraint');
 const cycle=new Error('D1_ERROR');cycle.cause=cycle;assert.equal(externalImportError(cycle,'database').code,'database-unavailable');
});
