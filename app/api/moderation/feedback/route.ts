import {feedbackQueue} from '@/lib/feedback';
import {response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const url=new URL(request.url);return response(await feedbackQueue(request.headers.get('oai-authenticated-user-id')||'',url.searchParams.get('status')||'new',url.searchParams.get('cursor')||undefined))}
 catch(e){return response({error:e instanceof RepositoryError?e.message:'Feedback inbox unavailable.'},e instanceof RepositoryError?e.status:503)}
}
