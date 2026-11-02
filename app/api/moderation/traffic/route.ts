import {trafficReport} from '@/lib/traffic';
import {response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const u=new URL(request.url),test=u.searchParams.get('test');if(test!==null&&!['0','1'].includes(test))return response({error:'Invalid test filter.'},400);return response(await trafficReport(request.headers.get('oai-authenticated-user-id')||'',Number(u.searchParams.get('days')||30),test==='1'))}catch(e){return response({error:e instanceof RepositoryError?e.message:'Traffic report unavailable. Please retry.'},e instanceof RepositoryError?e.status:503)}}
