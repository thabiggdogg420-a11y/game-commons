import {ingestExternalCatalogue} from '@/lib/external-catalogue';
import {response,readBody,mutationUser} from '@/lib/http';
import {requireModerator} from '@/lib/moderator';
import {RepositoryError} from '@/lib/limits';
import {externalImportError} from '@/lib/external-import-error';
export const dynamic='force-dynamic';
export async function POST(request:Request){let stage:'identity'|'body'|'database'='identity';let action='unread';try{const user=mutationUser(request);requireModerator(user);stage='body';const body=await readBody(request);action=typeof body.action==='string'&&['begin','chunk','status','activate','rollback'].includes(body.action)?body.action:'invalid';stage='database';return response(await ingestExternalCatalogue(body,user))}catch(e){if(e instanceof RepositoryError)return response({error:e.message,code:e.status===403?'moderator-required':'import-validation',stage},e.status);const diagnostic=externalImportError(e,stage);console.warn('external-catalogue-import',{code:diagnostic.code,stage,action,causeCodes:diagnostic.causeCodes??[]});return response({error:diagnostic.error,code:diagnostic.code,stage,action,causeCodes:diagnostic.causeCodes??[]},diagnostic.status)}}
