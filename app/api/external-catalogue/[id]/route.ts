import {externalCatalogueEntry} from '@/lib/external-catalogue';
import {response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{const entry=await externalCatalogueEntry((await params).id);return entry?response(entry):response({error:'External listing not found.'},404)}catch(e){return response({error:e instanceof RepositoryError?e.message:'External index unavailable.'},e instanceof RepositoryError?e.status:503)}}
