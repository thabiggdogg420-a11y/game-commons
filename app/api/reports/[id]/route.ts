import {readReport} from '@/lib/reports';
import {response} from '@/lib/http';
import {RepositoryError} from '@/lib/limits';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{return response({report:await readReport((await params).id,request.headers.get('oai-authenticated-user-id')||'')})}catch(e){return response({error:e instanceof RepositoryError?e.message:'Report unavailable.'},e instanceof RepositoryError?e.status:503)}}
