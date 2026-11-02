import {usageFor,RepositoryError} from '@/lib/limits';
import {response} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return response(await usageFor(request.headers.get('oai-authenticated-user-id')||''))}catch(e){return response({error:e instanceof RepositoryError?e.message:'Usage is temporarily unavailable.'},e instanceof RepositoryError?e.status:503)}}
