import {reportQueue} from '@/lib/reports';
import {response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const url=new URL(request.url);return response(await reportQueue(request.headers.get('oai-authenticated-user-id')||'',url.searchParams.get('status')||'open',url.searchParams.get('cursor')||undefined))}catch(e){return response({error:e instanceof RepositoryError?e.message:'Queue unavailable.'},e instanceof RepositoryError?e.status:503)}}
